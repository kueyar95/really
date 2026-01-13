import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { PromptBlock } from '../../ai-bots/entities/ai-bot.entity';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Interfaces para las tools
export interface ToolCallResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface AgentResponse {
  content: string | null;
  tool_calls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] | null;
}

export interface FunctionCallResult {
  updatedStageId: string | null;
  functionResponse: Record<string, any>;
}

export interface AssistantMessage {
  role: "assistant";
  content: string | null;
  tool_calls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[];
}

@Injectable()
export class OpenAIService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger('OpenAIService');

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_KEY
    });
  }

  /**
   * Reemplaza placeholders en un texto con valores reales
   */
  private replacePlaceholders(text: string, replacements: Record<string, string>): string {
    let result = text;
    for (const [placeholder, value] of Object.entries(replacements)) {
      const regex = new RegExp(`\\[${placeholder}\\]`, 'g');
      result = result.replace(regex, value || placeholder);
    }
    return result;
  }

  async classifyMessage(message: string, history: string[], stages: any[]): Promise<number> {
    //this.logger.log(`Clasificando mensaje: ${message}`);

    try {
      const stageOptions = stages.map(stage => `${stage.id}: ${stage.name} - ${stage.description || ''}`).join('\n');

      const completion = await this.openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `Eres un asistente experto en clasificar mensajes de clientes.
                     Tu tarea es determinar a qué categoría (stage) corresponde el mensaje del usuario.
                     Debes responder SOLO con el ID del stage más apropiado.`
          },
          {
            role: "user",
            content: `
              Opciones de stages disponibles:
              ${stageOptions}

              Historial de la conversación:
              ${history.join('\n')}

              Nuevo mensaje: "${message}"

              ¿A qué stage corresponde este mensaje? Responde solo con el ID.`
          },
        ],
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 10,
      });

      const stageId = parseInt(completion.choices[0]?.message?.content || "0");
      //this.logger.log(`Mensaje clasificado en stage: ${stageId}`);
      return stageId;

    } catch (error) {
      this.logger.error('Error clasificando mensaje:', error);
      throw new Error("Error al clasificar el mensaje con IA");
    }
  }

  async processHistory(history: { role: string; content: string }[]): Promise<{
    email: string;
    startDate: Date;
    endDate: Date;
  }> {
    try {
      const systemPrompt = `Eres un asistente experto en analizar conversaciones y extraer información clave.
Tu tarea es analizar el historial de la conversación y extraer:
1. El correo electrónico del cliente (si está presente)
2. La fecha y hora de la cita acordada

IMPORTANTE:
- Debes responder ÚNICAMENTE con un objeto JSON válido
- La fecha debe estar en formato ISO (YYYY-MM-DDTHH:mm:ss)
- Si no encuentras algún dato, devuelve null
- NO uses formato markdown ni backticks
- Cuando se mencionen días de la semana (ej: "viernes"), debes calcular la fecha del próximo viernes desde la fecha actual
- Si se menciona una hora específica, úsala. Si no, usa 15:00 como hora por defecto
- El formato de respuesta debe ser:
{
  "email": string | null,
  "startDate": string | null  // Fecha ISO
}`;

      // Formatear el historial para mejor comprensión
      const formattedHistory = history.map(msg =>
        `${msg.role.toUpperCase()}: ${msg.content}`
      ).join('\n');

      const currentDate = new Date();
      const userPrompt = `Fecha actual: ${currentDate.toISOString()}

Analiza el siguiente historial de conversación y extrae la información de la cita:

${formattedHistory}

Recuerda:
- Si se menciona "viernes", calcula la fecha del próximo viernes desde la fecha actual proporcionada
- Busca un correo electrónico válido en el formato usuario@dominio.com
- Si no encuentras algún dato, devuelve null

Responde solo con el JSON solicitado.`;

      //this.logger.log('🔍 Analizando historial con fecha actual:', currentDate.toISOString());
      //this.logger.log('📝 Historial formateado:', formattedHistory);

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 150,
        response_format: { type: "json_object" }
      });

      const responseText = completion.choices[0].message.content;

      // Limpiar y parsear la respuesta
      const cleanResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
      let parsedResponse;

      try {
        parsedResponse = JSON.parse(cleanResponse);
        //this.logger.log('✅ Respuesta parseada:', parsedResponse);
      } catch (parseError) {
        this.logger.error(`Error parseando respuesta JSON: ${parseError.message}`);
        throw new Error('Error al parsear la respuesta del modelo');
      }

      // Validar y estructurar la respuesta
      const startDate = parsedResponse.startDate ? new Date(parsedResponse.startDate) : new Date();
      const endDate = new Date(startDate.getTime() + 30 * 60000); // Sumamos 30 minutos

      const result = {
        email: parsedResponse.email || null,
        startDate,
        endDate
      };

      //this.logger.log('📅 Datos de la cita procesados:', result);

      return result;
    } catch (error) {
      this.logger.error('Error procesando historial:', error);
      throw new Error('Error al procesar el historial de la conversación');
    }
  }

  async agentWithTools(
    message: string,
    history: { role: string; content: string }[],
    botConfig: {
      sysPrompt: PromptBlock[];
      mainConfig: Record<string, any>;
      steps: any[];
    },
    tools: ChatCompletionTool[],
    toolsContext?: {
      assistantMessage: ChatCompletionMessageParam;
      toolResults: { tool_call_id: string; content: string }[];
    },
    placeholderReplacements?: Record<string, string>
  ): Promise<AgentResponse> {
    const startTime = Date.now();
    //this.logger.debug(`🤖 [OpenAI] === INICIO agentWithTools ===`);
    //this.logger.debug(`🤖 [OpenAI] Mensaje: "${message}"`);
    //this.logger.debug(`🤖 [OpenAI] Historial: ${history.length} mensajes`);
    //this.logger.debug(`🤖 [OpenAI] Herramientas disponibles: ${tools.length}`);
    //this.logger.debug(`🤖 [OpenAI] Modo: ${toolsContext ? 'Respuesta a tool calls' : 'Llamada inicial'}`);
    //this.logger.debug(`🤖 [OpenAI] API Key configurada: ${!!process.env.OPENAI_KEY ? 'Sí' : 'NO'}`);

    try {
      // Validar que botConfig y sus propiedades existan
      if (!botConfig) {
        this.logger.warn('⚠️ No se proporcionó configuración del bot');
        botConfig = {
          sysPrompt: [{
            block_identifier: "default",
            block_content: "Eres un asistente virtual.",
          }],
          mainConfig: {},
          steps: []
        };
      }

      // Convertir el array de bloques en un string formateado
      const date = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });
      
      // Aplicar reemplazos de placeholders si están disponibles
      const processedBlocks = placeholderReplacements 
        ? botConfig.sysPrompt.map(block => ({
            ...block,
            block_content: this.replacePlaceholders(block.block_content, placeholderReplacements)
          }))
        : botConfig.sysPrompt;
      
      const systemPrompt = processedBlocks
        .map(block => `[${block.block_identifier}]\n${block.block_content}`)
        .join('\n\n') + 
        (botConfig.steps ? '\n\n' + botConfig.steps.map(step => JSON.stringify(step)).join('\n') : '') +
        `\n\nFecha actual: ${date}`;

      // Formatear mensajes para OpenAI
      const messages: ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...history.map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content
        }))
      ];

      // Si estamos en modo de respuesta a tool calls
      if (toolsContext) {
        //this.logger.debug(`🔄 [OpenAI] Procesando respuesta a tool calls previos`);
        //this.logger.debug(`🔄 [OpenAI] Tool results disponibles: ${toolsContext.toolResults.length}`);
        
        // IMPORTANTE: Agregar el mensaje del usuario ANTES del assistantMessage
        // Esto es necesario porque el mensaje actual fue excluido del history (slice(1) en message-processor)
        // para evitar duplicados en la primera llamada, pero debe estar presente en la segunda llamada
        // para que OpenAI tenga el contexto completo de la conversación
        //this.logger.debug(`📨 [OpenAI] Agregando mensaje del usuario al contexto: "${message}"`);
        messages.push({ role: "user", content: message });
        
        messages.push(toolsContext.assistantMessage);
        
        // Agregar los resultados de las herramientas
        toolsContext.toolResults.forEach(result => {
          //this.logger.log(`📎 Agregando resultado para tool_call_id: ${result.tool_call_id}`);
          messages.push({
            role: "tool",
            tool_call_id: result.tool_call_id,
            content: result.content
          } as ChatCompletionMessageParam);
        });
        
        // Agregar instrucción adicional para guiar el encadenamiento
        messages.push({
          role: "system",
          content: `INSTRUCCIÓN CRÍTICA DE ENCADENAMIENTO:

Acabas de recibir resultados de herramientas. Analiza si la solicitud original del usuario YA ESTÁ COMPLETA o si FALTA ejecutar más herramientas.

REGLAS DE ENCADENAMIENTO:
1. Si obtuviste lista de profesionales (list_professionals) y el usuario pidió HORARIOS → Llama INMEDIATAMENTE a get_available_slots
2. Si obtuviste horarios (get_available_slots) → Muestra los resultados al usuario, NO preguntes si quiere verlos
3. Si obtuviste sucursales (list_branches) y el usuario pidió HORARIOS de un profesional → Llama a list_professionals, luego get_available_slots

PROHIBIDO:
- Responder "voy a consultar" sin ejecutar la herramienta
- Responder "un momento" sin ejecutar la herramienta  
- Decir "permíteme buscar" sin ejecutar la herramienta
- Preguntar al usuario si quiere ver información que YA deberías haber consultado

CORRECTO:
- Ejecutar las herramientas necesarias en ESTE MISMO TURNO
- Mostrar los resultados completos al usuario una vez obtenidos`
        } as ChatCompletionMessageParam);
      } else {
        // Agregar el mensaje actual del usuario solo cuando NO estamos procesando tool results
        messages.push({ role: "user", content: message });
      }

      //this.logger.debug(`📤 [OpenAI] Enviando solicitud a OpenAI...`);
      
      // Log detallado de los mensajes
      //this.logger.debug(`📋 [OpenAI] Mensajes a enviar (${messages.length} mensajes):`);
      messages.forEach((msg, idx) => {
        if (msg.role === 'tool') {
          const toolMsg = msg as any;
          const contentPreview = toolMsg.content?.substring(0, 200) || '';
          //this.logger.debug(`  ${idx}: [role: tool] tool_call_id: ${toolMsg.tool_call_id}, content: ${contentPreview}...`);
        } else if (msg.role === 'system') {
          const content = (msg as any).content || '';
          const preview = content.length > 200 ? content.substring(0, 200) + '...' : content;
          //this.logger.debug(`  ${idx}: [role: system] ${preview}`);
        } else {
          const content = (msg as any).content || '';
          const preview = content.length > 100 ? content.substring(0, 100) + '...' : content;
          //this.logger.debug(`  ${idx}: [role: ${msg.role}] ${preview}`);
        }
      });
      
      const completionOptions: any = {
        model: "gpt-4.1",
        messages,
        temperature: 0.5,
        max_tokens: 400,
      };

      // Agregar tools si hay alguna disponible
      if (tools.length > 0) {
        //this.logger.debug(`🔧 [OpenAI] Agregando ${tools.length} herramientas a la solicitud`);
        //this.logger.debug(`🔧 [OpenAI] Herramientas: ${tools.map(t => t.function?.name || 'unknown').join(', ')}`);
        completionOptions.tools = tools;
        
        // Si estamos procesando resultados de herramientas anteriores, 
        // permitir que OpenAI elija si necesita más herramientas (encadenamiento)
        if (toolsContext) {
          //this.logger.debug(`🔗 [OpenAI] Modo encadenamiento: OpenAI puede usar herramientas adicionales`);
          completionOptions.tool_choice = "auto";
        } else {
          completionOptions.tool_choice = "auto";
        }
      }

      //this.logger.debug(`⚙️ [OpenAI] Configuración de la solicitud:`);
      //this.logger.debug(`   Modelo: ${completionOptions.model}`);
      //this.logger.debug(`   Temperature: ${completionOptions.temperature}`);
      //this.logger.debug(`   Max tokens: ${completionOptions.max_tokens}`);
      //this.logger.debug(`   Tool choice: ${completionOptions.tool_choice || 'none'}`);
      //this.logger.debug(`   Número de mensajes: ${messages.length}`);

      const requestStartTime = Date.now();
      let completion;
      try {
        completion = await this.openai.chat.completions.create(completionOptions);
        const requestDuration = Date.now() - requestStartTime;
        //this.logger.debug(`✅ [OpenAI] Solicitud completada en ${requestDuration}ms`);
      } catch (apiError: any) {
        const requestDuration = Date.now() - requestStartTime;
        this.logger.error(`❌ [OpenAI] Error en la solicitud a OpenAI después de ${requestDuration}ms`);
        this.logger.error(`❌ [OpenAI] Tipo de error: ${apiError?.constructor?.name || 'Unknown'}`);
        this.logger.error(`❌ [OpenAI] Mensaje: ${apiError?.message || 'Sin mensaje'}`);
        this.logger.error(`❌ [OpenAI] Status: ${apiError?.status || 'N/A'}`);
        this.logger.error(`❌ [OpenAI] Code: ${apiError?.code || 'N/A'}`);
        if (apiError?.response) {
          this.logger.error(`❌ [OpenAI] Response data: ${JSON.stringify(apiError.response.data, null, 2)}`);
        }
        throw apiError;
      }

      const responseMessage = completion.choices[0].message;
      const totalDuration = Date.now() - startTime;

      //this.logger.debug(`📥 [OpenAI] Respuesta recibida de OpenAI (${totalDuration}ms total):`);
      //this.logger.debug(`   Content: ${responseMessage.content ? `"${responseMessage.content}"` : 'null'}`);
      //this.logger.debug(`   Tool calls: ${responseMessage.tool_calls ? responseMessage.tool_calls.map(tc => `${tc.function.name}(${tc.id})`).join(', ') : 'ninguno'}`);
      
      // Log de uso de tokens si está disponible
      if (completion.usage) {
        //this.logger.debug(`📊 [OpenAI] Uso de tokens:`);
        //this.logger.debug(`   Prompt tokens: ${completion.usage.prompt_tokens}`);
        //this.logger.debug(`   Completion tokens: ${completion.usage.completion_tokens}`);
        //this.logger.debug(`   Total tokens: ${completion.usage.total_tokens}`);
      }

      // Log detallado de tool calls si existen
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        //this.logger.debug(`🔧 [OpenAI] Detalles de tool calls:`);
        responseMessage.tool_calls.forEach((tc, idx) => {
          const argsPreview = tc.function.arguments.length > 200 
            ? tc.function.arguments.substring(0, 200) + '...' 
            : tc.function.arguments;
          //this.logger.debug(`   ${idx + 1}. ${tc.function.name} (id: ${tc.id})`);
          //this.logger.debug(`      Args: ${argsPreview}`);
        });
      }

      const result = {
        content: responseMessage.content,
        tool_calls: responseMessage.tool_calls || null
      };

      //this.logger.debug(`✅ [OpenAI] === FIN agentWithTools (${Date.now() - startTime}ms) ===`);
      return result;

    } catch (error: any) {
      const totalDuration = Date.now() - startTime;
      this.logger.error(`❌ [OpenAI] Error en agentWithTools después de ${totalDuration}ms`);
      this.logger.error(`❌ [OpenAI] Tipo de error: ${error?.constructor?.name || 'Unknown'}`);
      this.logger.error(`❌ [OpenAI] Mensaje: ${error?.message || 'Sin mensaje'}`);
      this.logger.error(`❌ [OpenAI] Stack: ${error?.stack || 'Sin stack trace'}`);
      
      if (error?.response) {
        this.logger.error(`❌ [OpenAI] Response status: ${error.response.status}`);
        this.logger.error(`❌ [OpenAI] Response data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
      
      throw new Error(`Error al procesar el mensaje con herramientas: ${error?.message || 'Error desconocido'}`);
    }
  }

  /**
   * Method specifically for the try-chat functionality
   * This keeps the try-chat logic separate from the main agentWithTools method
   */
  async tryChat(
    message: string,
    chatHistory: { role: string; content: string }[],
    systemPrompt: string,
    botConfig: {
      model: string;
      maxTokens: number;
      temperature: number;
    }
  ): Promise<AgentResponse> {
    //this.logger.log('=== INICIO tryChat ===');
    //this.logger.log(`Mensaje recibido: "${message}"`);
    //this.logger.log(`Historial: ${chatHistory.length} mensajes`);
    //this.logger.log(`Modelo: ${botConfig.model}, MaxTokens: ${botConfig.maxTokens}, Temperature: ${botConfig.temperature}`);

    try {
      // Format the system prompt
      const formattedSystemPrompt = `[default]\n${systemPrompt}`;

      // Format messages for OpenAI
      const messages: ChatCompletionMessageParam[] = [
        { role: "system", content: formattedSystemPrompt },
        ...chatHistory.map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content
        })),
        { role: "user", content: message }
      ];

      //this.logger.log('📤 Enviando solicitud a OpenAI...');
      
      // Make the API call to OpenAI
      const completion = await this.openai.chat.completions.create({
        model: botConfig.model,
        messages,
        temperature: botConfig.temperature,
        max_tokens: botConfig.maxTokens,
      });

      //this.logger.log('✅ Respuesta recibida de OpenAI');

      // Extract the response
      const response = completion.choices[0]?.message;
      
      return {
        content: response?.content || null,
        tool_calls: response?.tool_calls || null
      };
    } catch (error) {
      this.logger.error('Error en tryChat:', error);
      throw new Error('Error al procesar la solicitud de chat');
    }
  }

  private estimateTokens(text: string): number {
    // Estimación aproximada: 1 token ≈ 4 caracteres en promedio
    return Math.ceil(text.length / 4);
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1_000_000) * 0.15;  // $0.15 por 1M tokens
    const outputCost = (outputTokens / 1_000_000) * 0.60; // $0.60 por 1M tokens
    return inputCost + outputCost;
  }

  async webScrapingCompletion(messages: { role: string; content: string }[]): Promise<string> {
    try {
      // Calcular tokens de entrada
      const inputTokens = messages.reduce((acc, msg) => acc + this.estimateTokens(msg.content), 0);

      // Determinar si necesitamos respuesta JSON basado en el contenido del mensaje del sistema
      const systemMessage = messages[0].content;
      const needsJsonResponse = systemMessage.includes('JSON') || 
                               systemMessage.includes('json_object') ||
                               systemMessage.includes('TEMPLATE_FILL');

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4.1",
        messages: messages.map(msg => ({
          role: msg.role as "system" | "user" | "assistant",
          content: msg.content
        })),
        temperature: 0.3,
        max_tokens: 4000,
        ...(needsJsonResponse ? { response_format: { type: "json_object" } } : {})
      });
      
      //this.logger.log('Respuesta de OpenAI:', completion.choices[0].message.content);
      const response = completion.choices[0].message.content || '';
      
      // Calcular tokens de salida y costos
      const outputTokens = this.estimateTokens(response);
      const cost = this.calculateCost(inputTokens, outputTokens);

      //this.logger.log('💰 Tokens y Costos:');
      //this.logger.log(`- Input: ${inputTokens} tokens`);
      //this.logger.log(`- Output: ${outputTokens} tokens`);
      //this.logger.log(`- Costo: $${cost.toFixed(4)}`);

      return response;
    } catch (error) {
      this.logger.error('Error en webScrapingCompletion:', error);
      throw new Error("Error al procesar el contenido web con OpenAI: " + error.message);
    }
  }

  async transcribeAudio(audioUrl: string, accessToken?: string): Promise<string> {
    try {
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Configurar headers si hay accessToken
      const headers: any = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      // Descargar el archivo
      const response = await axios({
        method: 'GET',
        url: audioUrl,
        responseType: 'arraybuffer',
        headers: headers
      });

      // WhatsApp usa OGG por defecto para notas de voz
      const tempFile = path.join(tempDir, `audio-${Date.now()}.ogg`);
      fs.writeFileSync(tempFile, response.data);

      try {
        // Transcribir el audio
        const transcription = await this.openai.audio.transcriptions.create({
          file: fs.createReadStream(tempFile),
          model: "whisper-1",
        });

        // Limpiar archivo temporal
        fs.unlinkSync(tempFile);

        return transcription.text;
      } catch (error) {
        // Limpiar archivo temporal en caso de error
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
        throw error;
      }
    } catch (error) {
      this.logger.error('Error transcribiendo audio:', error?.message || error);
      throw new Error('Error al transcribir el audio');
    }
  }
}
