import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientStage } from '../../clients/entities/client-stage.entity';
import { ChatHistory } from '../../clients/entities/chat-history.entity';
import { OpenAIService } from '../../ai/services/openai.service';
import { ChannelsService } from '../../channels/channels.service';
import { WhatsAppGateway } from '../../channels/infrastructure/gateway/whatsapp.gateway';
import { FunctionsService } from '../../functions/functions.service';
import { ChatCompletionTool } from 'openai/resources/chat/completions';
import { EmailService } from '../../email/email.service';
import { MedilinkTools } from '../../ai-bots/tools/medilink.tools';
import { ChannelType } from '../../channels/core/types/channel.types';
import { MedilinkIntegration, MedilinkIntegrationStatus } from '../../integrations/medilink/entities/medilink-integration.entity';

interface ProcessMessageInput {
  message: string;
  chatHistory: { role: string; content: string }[];
  clientStage: ClientStage;
  channelNumber: string;
}

interface ProcessMessageResult {
  updatedClientStage: ClientStage;
  botResponse: string | null;
}

@Injectable()
export class BotMessageProcessorService {
  private readonly logger = new Logger(BotMessageProcessorService.name);

  constructor(
    @InjectRepository(ClientStage)
    private readonly clientStageRepository: Repository<ClientStage>,
    @InjectRepository(ChatHistory)
    private readonly chatHistoryRepository: Repository<ChatHistory>,
    @InjectRepository(MedilinkIntegration)
    private readonly medilinkIntegrationRepo: Repository<MedilinkIntegration>,
    private readonly openAIService: OpenAIService,
    @Inject(forwardRef(() => ChannelsService))
    private readonly channelsService: ChannelsService,
    @Inject(forwardRef(() => WhatsAppGateway))
    private readonly whatsappGateway: WhatsAppGateway,
    @Inject(forwardRef(() => FunctionsService))
    private readonly functionsService: FunctionsService,
    private readonly emailService: EmailService,
    private readonly medilinkTools: MedilinkTools,
  ) {}

  async processMessage(input: ProcessMessageInput): Promise<ProcessMessageResult> {
    const { message, chatHistory, clientStage, channelNumber } = input;
    const oldStageId = clientStage.stageId;

    this.logger.log(`🤖 [Bot] Mensaje: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}" | Stage: ${clientStage.stageId}`);

    try {
      // 1. Ejecutar el agente con tools y procesar respuesta
      const { updatedClientStage, botResponse } = await this.executeAgentWithTools(
        message,
        chatHistory,
        clientStage
      );

      this.logger.debug(`📤 [Bot] processMessage: botResponse recibido = ${botResponse ? `"${botResponse.substring(0, 50)}..." (${botResponse.length} chars)` : 'null/undefined'}`);

      if (botResponse) {
        this.logger.debug(`📤 [Bot] processMessage: Llamando handleBotResponse...`);
        await this.handleBotResponse(
          botResponse,
          updatedClientStage,
          oldStageId,
          channelNumber
        );
        this.logger.debug(`📤 [Bot] processMessage: handleBotResponse completado`);
      } else {
        this.logger.warn(`⚠️ [Bot] processMessage terminó sin botResponse. updatedClientStage=${updatedClientStage.id}, stageId=${updatedClientStage.stageId}`);
      }
      
      return {
        updatedClientStage,
        botResponse
      };

    } catch (error) {
      this.logger.error(`❌ [Bot] Error procesando mensaje: ${error.message}`);
      this.logger.error(`❌ [Bot] Stack: ${error.stack}`);
      throw error;
    }
  }

  private async executeAgentWithTools(
    message: string,
    chatHistory: { role: string; content: string }[],
    clientStage: ClientStage,
    depth: number = 0
  ): Promise<{
    updatedClientStage: ClientStage;
    botResponse: string | null;
  }> {
    // Inicio de ejecución del agente (solo log si es recursión)
    if (depth > 0) {
      this.logger.debug(`🔄 [Bot] Recursión nivel ${depth}`);
    }

    if (depth > 3) {
      this.logger.warn('⚠️ [Bot] Máxima profundidad de recursión alcanzada');
      return { updatedClientStage: clientStage, botResponse: null };
    }
    try {
      // 1. Preparar tools si hay funciones disponibles
      let tools: ChatCompletionTool[] = [];
      let useMedilinkTools = false;
      
      // Verificar si es un funnel de Medilink de varias formas
      const funnelName = clientStage.funnelChannel?.funnel?.name?.toLowerCase() || '';
      const stageName = clientStage.stage?.name?.toLowerCase() || '';
      const companyId = clientStage.funnelChannel?.funnel?.companyId;
      
      // Verificación de integración Medilink (solo log si hay problema)
      
      // Detectar si es Medilink por el nombre del funnel, stage
      const isMedilinkFunnel = funnelName.includes('medilink') || 
                                funnelName.includes('healthcare') ||
                                funnelName.includes('creasalud') ||
                                stageName.includes('medilink') ||
                                stageName.includes('healthcare');
      
      // isMedilinkFunnel calculado
      
      // Verificar si la compañía tiene integración de Medilink (sin importar el estado)
      let hasMedilinkIntegration = false;
      if (companyId) {
        try {
          // Buscando integración Medilink
          const medilinkIntegration = await this.medilinkIntegrationRepo.findOne({
            where: { companyId }
          });
          hasMedilinkIntegration = !!medilinkIntegration;
          
          if (medilinkIntegration) {
            this.logger.log(`✅ [Bot] Medilink integrado (Status: ${medilinkIntegration.status})`);
          } else {
            // Intentar buscar todas las integraciones para debugging
            const allIntegrations = await this.medilinkIntegrationRepo.find({
              select: ['id', 'companyId', 'status', 'baseUrl']
            });
            this.logger.log(`🔍 [Bot] Total integraciones en BD: ${allIntegrations.length}`);
            allIntegrations.forEach(integration => {
              this.logger.log(`   - CompanyId: ${integration.companyId}, Status: ${integration.status}`);
            });
            this.logger.warn(`❌ [Bot] Integración Medilink NO encontrada para companyId: ${companyId}`);
          }
        } catch (error) {
          this.logger.error(`❌ [Bot] Error verificando integración Medilink: ${error.message}`);
          this.logger.error(`❌ [Bot] Stack: ${error.stack}`);
        }
      } else {
        this.logger.warn(`⚠️ [Bot] No se pudo obtener companyId del clientStage`);
        this.logger.warn(`⚠️ [Bot] clientStage.funnelChannel: ${!!clientStage.funnelChannel}`);
        this.logger.warn(`⚠️ [Bot] clientStage.funnelChannel?.funnel: ${!!clientStage.funnelChannel?.funnel}`);
      }
      
      // Incluir herramientas de Medilink SOLO si:
      // 1. Tiene integración de Medilink configurada (REQUERIDO)
      // 2. Y además es un funnel de Medilink/healthcare/creasalud O no hay funciones configuradas
      // Esto evita cargar herramientas que fallarán si no hay integración
      const shouldUseMedilinkTools = hasMedilinkIntegration && 
                                      (isMedilinkFunnel || !clientStage.stage.bot?.botFunctions?.length);
      
      // Advertencia si es funnel de Medilink pero no hay integración
      if (isMedilinkFunnel && !hasMedilinkIntegration) {
        this.logger.warn(`⚠️ [Bot] Funnel de Medilink detectado pero NO hay integración configurada para compañía ${companyId}. Las herramientas de Medilink no estarán disponibles.`);
      }
      
      // shouldUseMedilinkTools: ${shouldUseMedilinkTools}
      
      if (shouldUseMedilinkTools) {
        // Usar las tools de Medilink
        const medilinkTools = this.medilinkTools.getTools() as ChatCompletionTool[];
        this.logger.debug(`📊 [Bot] Tools Medilink: ${medilinkTools.length} disponibles`);
        tools = medilinkTools;
        useMedilinkTools = true;
        
        // SIEMPRE combinar con funciones de BD si existen
        if (clientStage.stage.bot?.botFunctions?.length > 0) {
          const availableFunctions = clientStage.stage.bot.botFunctions
            .filter(bf => bf.isActive)
            .map(bf => bf.function);

          this.logger.debug(`📊 [Bot] Combinando ${availableFunctions.length} funciones BD + Medilink`);
          const dbTools = availableFunctions.map(fn => ({
            type: "function" as const,
            function: {
              name: fn.external_name,
              description: fn.description,
              parameters: fn.parameters as any
            }
          }));
          
          // Combinar ambas: Medilink tools + funciones de BD
          tools = [...medilinkTools, ...dbTools];
          // Tools combinadas: ${tools.length} total
        }
      } else if (clientStage.stage.bot?.botFunctions?.length > 0) {
        // Usar solo funciones de la base de datos para otros funnels
        const availableFunctions = clientStage.stage.bot.botFunctions
          .filter(bf => bf.isActive)
          .map(bf => bf.function);

        this.logger.debug(`📊 [Bot] Tools BD: ${availableFunctions.length} funciones`);
        tools = availableFunctions.map(fn => ({
          type: "function" as const,
          function: {
            name: fn.external_name,
            description: fn.description,
            parameters: fn.parameters as any
          }
        }));
      }
      
      // Configuración: Funnel="${funnelName}", Stage="${stageName}", Tools=${tools.length}
      
      // Log para debugging
      //this.logger.log(`🔍 Funnel: "${funnelName}", Stage: "${stageName}", UseMedilink: ${useMedilinkTools}, Tools: ${tools.length}`);

      // 2. Preparar reemplazos de placeholders con info de la compañía
      const companyName = clientStage.funnelChannel?.funnel?.company?.name || 'la clínica';
      //this.logger.log(`🏢 Nombre de la compañía: "${companyName}"`);
      //this.logger.log(`🔗 Company cargada: ${!!clientStage.funnelChannel?.funnel?.company}`);
      
      const placeholderReplacements = {
        'NOMBRE DE LA CLÍNICA': companyName,
        'NOMBRE DE LA BARBERIA': companyName,
        'NOMBRE DEL NEGOCIO': companyName,
        'nombre de la clínica': companyName,
      };

      // 3. Llamar al agente con o sin tools
      const agentResponse = await this.openAIService.agentWithTools(
        message,
        chatHistory,
        clientStage.stage.bot,
        tools,
        undefined, // toolsContext
        placeholderReplacements
      );

      // Si no hay tool calls, retornar respuesta directa
      if (!agentResponse.tool_calls?.length) {
        // Bot respondió sin herramientas
        
        return {
          updatedClientStage: clientStage,
          botResponse: agentResponse.content
        };
      }

      // 3. Procesar los tool calls si existen
      this.logger.log(`🔧 [Bot] Ejecutando: ${agentResponse.tool_calls.map(tc => tc.function.name).join(', ')}`);
      const { updatedStage, results, shouldContinue, stopChaining } = await this.processToolCalls(
        agentResponse.tool_calls,
        clientStage.stage.bot.botFunctions || [],
        clientStage,
        chatHistory,
        useMedilinkTools
      );
      // Resultados: ${results.length}, continuar: ${shouldContinue}

      // Si hubo cambio de stage, intentar obtener respuesta final antes de continuar
      if (shouldContinue) {
        this.logger.log(`🔄 [Bot] Cambio de stage detectado`);
        
        // SIEMPRE intentar obtener respuesta final con los resultados antes de cambiar de stage
        if (results.length > 0 && clientStage.stage.bot) {
          try {
            // Obteniendo respuesta final antes del cambio de stage
            
            const finalResponse = await this.openAIService.agentWithTools(
              message,
              chatHistory,
              clientStage.stage.bot,
              tools,
              {
                assistantMessage: {
                  role: "assistant",
                  content: agentResponse.content || '',
                  tool_calls: agentResponse.tool_calls
                },
                toolResults: results
              },
              placeholderReplacements
            );

            // Si hay respuesta, usarla antes de continuar
            if (finalResponse.content) {
              // Respuesta obtenida antes del cambio de stage
              // Continuar con el nuevo stage pero devolver la respuesta obtenida
              const continuationResult = await this.handleStageContinuation(
                message,
                chatHistory,
                updatedStage,
                depth
              );
              
              // Si el nuevo stage no generó respuesta, usar la que obtuvimos antes del cambio
              if (!continuationResult.botResponse && finalResponse.content) {
                // Usando respuesta previa (nuevo stage sin bot)
                return {
                  updatedClientStage: continuationResult.updatedClientStage,
                  botResponse: finalResponse.content
                };
              }
              
              // Si el nuevo stage también generó respuesta, usar la del nuevo stage (más reciente)
              if (continuationResult.botResponse) {
                // Nuevo stage generó respuesta
                return continuationResult;
              }
              
              // Si no hay respuesta del nuevo stage pero sí del anterior, usar la anterior
              return {
                updatedClientStage: continuationResult.updatedClientStage,
                botResponse: finalResponse.content
              };
            } else {
              this.logger.warn(`⚠️ [Bot] No se obtuvo contenido en la respuesta final antes del cambio de stage`);
            }
          } catch (error) {
            this.logger.error(`❌ [Bot] Error obteniendo respuesta final antes del cambio de stage: ${error.message}`);
            this.logger.error(`❌ [Bot] Stack: ${error.stack}`);
          }
        } else {
          this.logger.warn(`⚠️ [Bot] No se puede obtener respuesta final: results.length=${results.length}, tieneBot=${!!clientStage.stage.bot}`);
        }
        
        // Si no se pudo obtener respuesta, continuar normalmente (puede que el nuevo stage tenga bot)
        // Continuando con nuevo stage
        return this.handleStageContinuation(
          message,
          chatHistory,
          updatedStage,
          depth
        );
      }

      // 4. Solo obtener respuesta final si NO hubo cambio de stage
      if (results.length > 0) {
        // Obteniendo respuesta final con resultados

        let currentStage = updatedStage;

        if (!currentStage.stage.bot) {
          this.logger.warn('⚠️ Stage actual no tiene bot configurado para generar respuesta final.');
          return {
            updatedClientStage: currentStage,
            botResponse: agentResponse.content
          };
        }

        // Si se detectó una acción terminal en la primera llamada, generar respuesta final y salir
        if (stopChaining) {
          this.logger.log('🛑 [Bot] Acción terminal detectada en primera llamada. Generando respuesta final sin encadenamiento.');
          
          const finalResponse = await this.openAIService.agentWithTools(
            message,
            chatHistory,
            currentStage.stage.bot,
            tools,
            {
              assistantMessage: {
                role: "assistant",
                content: agentResponse.content,
                tool_calls: agentResponse.tool_calls
              },
              toolResults: results
            },
            placeholderReplacements
          );
          
          // Validar que haya contenido
          this.logger.log(`🛑 [Bot] Respuesta final generada: "${finalResponse.content?.substring(0, 100) || 'VACÍA'}..."`);
          this.logger.log(`🛑 [Bot] Longitud del contenido: ${finalResponse.content?.length || 0}`);
          
          if (!finalResponse.content || finalResponse.content.trim().length === 0) {
            // Fallback si OpenAI devuelve vacío por alguna razón
            this.logger.warn('⚠️ [Bot] OpenAI devolvió contenido vacío tras acción terminal. Usando mensaje genérico.');
            
            // Intentar extraer información de los resultados para crear un mensaje útil
            let fallbackMessage = "He procesado tu solicitud. ¿Necesitas algo más?";
            
            try {
              // Si hay resultados, intentar extraer información útil
              if (results.length > 0) {
                const firstResult = JSON.parse(results[0].content);
                if (firstResult.success && firstResult.data) {
                  if (firstResult.data.professionals && Array.isArray(firstResult.data.professionals)) {
                    const count = firstResult.data.professionals.length;
                    fallbackMessage = `He encontrado ${count} profesional${count > 1 ? 'es' : ''} disponible${count > 1 ? 's' : ''}. ¿Te gustaría que te muestre más detalles?`;
                  } else if (firstResult.data.slots && Array.isArray(firstResult.data.slots)) {
                    const count = firstResult.data.slots.length;
                    fallbackMessage = `He encontrado ${count} horario${count > 1 ? 's' : ''} disponible${count > 1 ? 's' : ''}. ¿Cuál prefieres?`;
                  } else if (firstResult.data.message) {
                    fallbackMessage = firstResult.data.message;
                  }
                }
              }
            } catch (error) {
              this.logger.warn(`⚠️ [Bot] Error al intentar extraer mensaje del resultado: ${error.message}`);
            }
            
            return {
              updatedClientStage: currentStage,
              botResponse: fallbackMessage
            };
          }
          
          return {
            updatedClientStage: currentStage,
            botResponse: finalResponse.content
          };
        }

        let currentResponse = await this.openAIService.agentWithTools(
          message,
          chatHistory,
          currentStage.stage.bot,
          tools,
          {
            assistantMessage: {
              role: "assistant",
              content: agentResponse.content,
              tool_calls: agentResponse.tool_calls
            },
            toolResults: results
          },
          placeholderReplacements
        );

        const maxChainingDepth = 5;
        let chainingDepth = 0;
        let chainingInterrupted = false;

        while (currentResponse.tool_calls?.length && chainingDepth < maxChainingDepth) {
          chainingDepth += 1;
          this.logger.log(`🔗 [Bot] Encadenamiento ${chainingDepth}/${maxChainingDepth}: ${currentResponse.tool_calls.map(tc => tc.function.name).join(', ')}`);

          const {
            updatedStage: chainedStage,
            results: chainedResults,
            shouldContinue: chainedShouldContinue,
            stopChaining: chainedStopChaining
          } = await this.processToolCalls(
            currentResponse.tool_calls,
            currentStage.stage.bot?.botFunctions || [],
            currentStage,
            chatHistory,
            useMedilinkTools
          );

          // Evaluar si detener el encadenamiento por acción terminal
          if (chainedStopChaining) {
            this.logger.log('🛑 [Bot] Deteniendo encadenamiento por acción terminal.');
            
            // Ejecutamos una última vez a OpenAI con los resultados para que genere el mensaje de confirmación,
            // pero ya no procesaremos más tool_calls después de esto
            currentStage = chainedStage;
            
            currentResponse = await this.openAIService.agentWithTools(
              message,
              chatHistory,
              currentStage.stage.bot,
              tools,
              {
                assistantMessage: {
                  role: "assistant",
                  content: currentResponse.content,
                  tool_calls: currentResponse.tool_calls
                },
                toolResults: chainedResults
              },
              placeholderReplacements
            );
            
            // Romper el bucle manualmente
            break;
          }

          if (chainedShouldContinue) {
            return this.handleStageContinuation(
              message,
              chatHistory,
              chainedStage,
              depth
            );
          }

          if (!chainedResults.length) {
            this.logger.warn('⚠️ No se obtuvieron resultados de las herramientas encadenadas');
            chainingInterrupted = true;
            break;
          }

          currentStage = chainedStage;

          if (!currentStage.stage.bot) {
            this.logger.warn('⚠️ Stage resultante del encadenamiento no tiene bot configurado. Deteniendo encadenamiento.');
            chainingInterrupted = true;
            break;
          }

          currentResponse = await this.openAIService.agentWithTools(
            message,
            chatHistory,
            currentStage.stage.bot,
            tools,
            {
              assistantMessage: {
                role: "assistant",
                content: currentResponse.content,
                tool_calls: currentResponse.tool_calls
              },
              toolResults: chainedResults
            },
            placeholderReplacements
          );
        }

        if (currentResponse.tool_calls?.length && chainingDepth >= maxChainingDepth) {
          this.logger.warn(`⚠️ Máximo de niveles de encadenamiento (${maxChainingDepth}) alcanzado. Deteniendo ejecución adicional.`);
          this.logger.warn(`⚠️ Aún quedan tool calls sin procesar: ${currentResponse.tool_calls.map(tc => tc.function.name).join(', ')}`);
          this.logger.warn(`⚠️ Contenido de la respuesta: "${currentResponse.content}"`);
        } else if (currentResponse.tool_calls?.length && chainingInterrupted) {
          this.logger.warn('⚠️ El encadenamiento se interrumpió antes de procesar todas las tool calls.');
        } else {
          // Bot decidió NO encadenar más herramientas
        }

        return {
          updatedClientStage: currentStage,
          botResponse: currentResponse.content
        };
      }

      // Si no hay resultados, retornar la respuesta original
      return {
        updatedClientStage: updatedStage,
        botResponse: agentResponse.content
      };

    } catch (error) {
      this.logger.error(`❌ Error en executeAgentWithTools: ${error.message}`);
      return {
        updatedClientStage: clientStage,
        botResponse: `Lo siento, ocurrió un error: ${error.message}`
      };
    }
  }

  private async processToolCalls(
    toolCalls: any[],
    botFunctions: any[],
    clientStage: ClientStage,
    chatHistory: { role: string; content: string }[],
    useMedilinkTools: boolean = false
  ): Promise<{
    updatedStage: ClientStage;
    results: any[];
    shouldContinue?: boolean;
    stopChaining?: boolean;
  }> {
    // Procesando ${toolCalls.length} tool calls
    
    // Log de debugging para ver datos persistidos previamente
    if (clientStage.data?.medilink) {
      // Datos Medilink persistidos disponibles
    }
    
    const results = [];
    let updatedStage = clientStage;
    let shouldContinue = false;
    let stopChaining = false;
    
    // Verificar si es un funnel de Medilink (misma lógica que en executeAgentWithTools)
    const funnelName = clientStage.funnelChannel?.funnel?.name?.toLowerCase() || '';
    const stageName = clientStage.stage?.name?.toLowerCase() || '';
    const isMedilinkFunnel = funnelName.includes('medilink') || 
                              funnelName.includes('healthcare') ||
                              funnelName.includes('creasalud') ||
                              stageName.includes('medilink') ||
                              stageName.includes('healthcare') ||
                              !clientStage.stage.bot?.botFunctions?.length;
    
    // Usar Medilink tools si el flag está activo O si es un funnel de Medilink
    const shouldUseMedilink = useMedilinkTools || isMedilinkFunnel;
    // ProcessToolCalls - UseMedilink: ${shouldUseMedilink}
    
    for (const toolCall of toolCalls) {
      // Tool: ${toolCall.function.name}
      
      try {
        let result;
        
        // Verificar si es una herramienta de Medilink
        const medilinkToolNames = ['list_branches', 'list_services', 'list_professionals', 'get_available_slots', 
                                    'create_appointment', 'schedule_appointment', 'reschedule_appointment', 
                                    'cancel_appointment', 'get_patient_appointments', 'search_patient'];
        const isMedilinkTool = medilinkToolNames.includes(toolCall.function.name);
        
        if (shouldUseMedilink && isMedilinkTool) {
          // Usar tools de Medilink directamente
          const args = JSON.parse(toolCall.function.arguments);
          
          // Construir contexto completo para Medilink
          // Asegurar que el teléfono esté en formato E.164
          const clientPhone = clientStage.client.phone;
          const phoneE164 = clientPhone?.startsWith('+') ? clientPhone : `+${clientPhone}`;
          //this.logger.log(`🔍 updatedStage: `);
          const stageData = updatedStage.data ?? clientStage.data ?? {};
          const context = {
            companyId: clientStage.funnelChannel.funnel.companyId,
            clientId: clientStage.clientId,
            channelId: clientStage.funnelChannel.channelId,
            currentStage: 'INTAKE' as any, // Default stage
            patientData: {
              phoneE164: phoneE164,
              name: clientStage.client.name,
            },
            // Incluir datos adicionales del contexto si existen
            ...stageData,
            chatHistory,
          };

          const toolName = toolCall.function.name;

          // LIMPIEZA AL LISTAR PROFESIONALES (debe estar antes de la lógica de agendamiento)
          if (toolName === 'list_professionals') {
            if (updatedStage.data?.medilink) {
              this.logger.log('🧹 [Bot] Limpiando profesional seleccionado previo para nueva búsqueda');
              updatedStage.data.medilink.selectedProfessionalId = null;
              // No borramos branchId porque el usuario suele seguir en la misma sucursal
            }
          }

          // LÓGICA UNIFICADA PARA TODAS LAS TOOLS DE AGENDAMIENTO
          if (['get_available_slots', 'create_appointment', 'schedule_appointment', 'reschedule_appointment'].includes(toolName)) {
            const persistedData = updatedStage.data?.medilink || {};

            // 1. LÓGICA DE PROFESSIONAL ID (Modo Estricto - Rechaza Alucinaciones)
            if (args.professionalId) {
              let finalProfessionalId = args.professionalId;
              const list = persistedData.lastListedProfessionals || [];

              // A. Verificar si es un ID válido de la lista reciente (búsqueda exacta)
              const matchById = list.find(
                p => p.id.toString() === args.professionalId.toString()
              );

              if (matchById) {
                // Es un cambio válido y consciente
                if (persistedData.selectedProfessionalId !== args.professionalId) {
                  this.logger.log(`🔄 [Bot] Cambio de profesional aceptado: ${persistedData.selectedProfessionalId} -> ${args.professionalId}`);
                }
                finalProfessionalId = args.professionalId;
                persistedData.selectedProfessionalId = finalProfessionalId;
                
                // Si el profesional tiene branchId en la lista y no se proporcionó uno, usarlo automáticamente
                if ((matchById as any).branchId && !args.branchId) {
                  args.branchId = (matchById as any).branchId;
                  this.logger.log(`🔄 [Bot] Usando branchId ${args.branchId} del profesional encontrado en la lista`);
                }
              } 
              else {
                // B. Verificar si es un ÍNDICE
                const index = parseInt(args.professionalId, 10);
                if (!isNaN(index) && index > 0 && index <= list.length) {
                  const matchByIndex = list[index - 1];
                  this.logger.warn(`⚠️ [Bot] CORRECCIÓN DE ÍNDICE: ${index} -> ID ${matchByIndex.id}`);
                  finalProfessionalId = matchByIndex.id.toString();
                  args.professionalId = finalProfessionalId;
                  persistedData.selectedProfessionalId = finalProfessionalId;
                  
                  // Si el profesional tiene branchId en la lista, también actualizarlo automáticamente
                  if ((matchByIndex as any).branchId && !args.branchId) {
                    args.branchId = (matchByIndex as any).branchId;
                    this.logger.log(`🔄 [Bot] También actualizando branchId a ${args.branchId} desde la lista de profesionales`);
                  }
                } 
                else {
                  // C. CASO CRÍTICO: El ID es nuevo y NO está en la lista.
                  // Si ya tenemos uno seleccionado, ASUMIMOS QUE ES UNA ALUCINACIÓN y forzamos el anterior.
                  if (persistedData.selectedProfessionalId) {
                    this.logger.warn(`⛔ [Bot] RECHAZANDO ALUCINACIÓN: El LLM intentó usar ID ${args.professionalId} (no listado). Forzando ID persistido: ${persistedData.selectedProfessionalId}`);
                    finalProfessionalId = persistedData.selectedProfessionalId;
                    args.professionalId = finalProfessionalId; // Sobrescribimos el argumento
                    persistedData.selectedProfessionalId = finalProfessionalId;
                  } else {
                    // No tenemos nada mejor, dejamos pasar (riesgoso pero necesario si es primer mensaje)
                    this.logger.warn(`⚠️ [Bot] Aceptando ID ${args.professionalId} aunque no esté en lista (no hay ID persistido previo)`);
                    persistedData.selectedProfessionalId = finalProfessionalId;
                  }
                }
              }
            } 
            else if (persistedData.selectedProfessionalId) {
              // Si el LLM no mandó ID, inyectamos el persistido
              this.logger.debug(`📥 [Bot] Inyectando ID persistido: ${persistedData.selectedProfessionalId}`);
              args.professionalId = persistedData.selectedProfessionalId;
            }

            // 2. LÓGICA DE BRANCH ID (Crucial para corregir errores de sucursal)
            if (args.branchId) {
              // Si el LLM explícitamente manda una sucursal (ej: cambiando de 2 a 1), ACTUALIZAMOS la persistencia
              if (persistedData.selectedBranchId && persistedData.selectedBranchId !== args.branchId) {
                this.logger.log(`🔄 [Bot] Actualizando contexto: Sucursal cambió de ${persistedData.selectedBranchId} a ${args.branchId}`);
              }
              persistedData.selectedBranchId = args.branchId;
            } 
            else if (persistedData.selectedBranchId) {
              // Si falta branchId, usamos el persistido
              args.branchId = persistedData.selectedBranchId;
            }

            // Guardar cambios inmediatamente
            updatedStage.data.medilink = persistedData;

            // 3. LÓGICA ESPECÍFICA PARA create_appointment y schedule_appointment (completar datos faltantes)
            if (toolName === 'schedule_appointment' || toolName === 'create_appointment') {
              // Completar automáticamente los datos faltantes usando los datos persistidos y del cliente
              
              // Usar fecha y hora de los últimos slots si están disponibles
              if (!args.dateYmd && !args.date_ymd && !args.date && persistedData.selectedDateYmd) {
                args.dateYmd = persistedData.selectedDateYmd;
              } else if (!args.dateYmd && !args.date_ymd && !args.date && persistedData.lastSlotsByDate) {
                // Si no hay fecha seleccionada, usar la primera fecha con slots disponibles
                const firstDate = Object.keys(persistedData.lastSlotsByDate)[0];
                if (firstDate) {
                  args.dateYmd = firstDate;
                }
              }
              
              // Si hay una hora mencionada en el mensaje del usuario, extraerla
              // Pero si no, usar la primera hora disponible del día seleccionado
              if (!args.timeHhmm && !args.time_hhmm && !args.time && persistedData.lastSlotsByDate && args.dateYmd) {
                const slotsForDate = persistedData.lastSlotsByDate[args.dateYmd];
                if (Array.isArray(slotsForDate) && slotsForDate.length > 0) {
                  // Buscar en el historial del chat si el usuario mencionó una hora específica
                  const lastUserMessage = chatHistory.filter(m => m.role === 'user').pop()?.content || '';
                  const timeMatch = lastUserMessage.match(/(\d{1,2}):(\d{2})|(\d{1,2})\s*(?:am|pm|AM|PM)/i);
                  
                  if (timeMatch) {
                    // Extraer hora mencionada
                    let hour = parseInt(timeMatch[1] || timeMatch[3] || '0');
                    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
                    const isPM = /pm/i.test(timeMatch[0]);
                    
                    if (isPM && hour < 12) hour += 12;
                    if (!isPM && hour === 12) hour = 0;
                    
                    const timeStr = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                    if (slotsForDate.includes(timeStr)) {
                      args.timeHhmm = timeStr;
                      this.logger.debug(`📝 [Bot] Agregando hora mencionada por usuario: ${args.timeHhmm}`);
                    }
                  }
                  
                  // Si no se encontró hora en el mensaje, usar la primera disponible
                  if (!args.timeHhmm && !args.time_hhmm && !args.time) {
                    args.timeHhmm = slotsForDate[0];
                    this.logger.debug(`📝 [Bot] Agregando primera hora disponible: ${args.timeHhmm}`);
                  }
                }
              }
              
              // Completar datos del paciente desde el cliente si no están en args
              if (!args.patientData && !args.patient_data && !args.patient) {
                args.patientData = {
                  name: clientStage.client.name?.split(' ')[0] || 'Paciente',
                  lastName: clientStage.client.name?.split(' ').slice(1).join(' ') || '',
                  email: clientStage.client.email || '',
                  phoneE164: phoneE164,
                };
                this.logger.debug(`📝 [Bot] Agregando datos del paciente desde cliente: ${args.patientData.name} ${args.patientData.lastName}`);
              } else {
                // Si hay patientData pero falta email o phone, completarlos
                const patientData = args.patientData || args.patient_data || args.patient || {};
                if (!patientData.email && clientStage.client.email) {
                  patientData.email = clientStage.client.email;
                }
                if (!patientData.phoneE164 && !patientData.phone_e164) {
                  patientData.phoneE164 = phoneE164;
                }
                args.patientData = patientData;
              }
              
              // Agregar phoneE164 directamente si no está
              if (!args.phoneE164 && !args.phone_e164) {
                args.phoneE164 = phoneE164;
              }
              
              // Args finales preparados para ${toolName}
            }
          }
          
          result = await this.medilinkTools.executeTool(toolCall.function.name, args, context.companyId);
          if (!result.success) {
            this.logger.warn(`⚠️ [Bot] ${toolCall.function.name} falló: ${result.error}`);
          }

          // Detectar acciones terminales exitosas y detener el encadenamiento
          // toolName ya está declarado arriba en la línea 563
          // Herramientas de lectura: detienen el encadenamiento para forzar respuesta al usuario
          const terminalReadTools = ['get_available_slots', 'list_professionals', 'get_patient_appointments'];
          // Herramientas de escritura: detienen el encadenamiento y limpian contexto tras agendamiento
          const terminalWriteTools = ['create_appointment', 'schedule_appointment', 'reschedule_appointment', 'cancel_appointment'];

          if ([...terminalReadTools, ...terminalWriteTools].includes(toolName)) {
            if (result.success) {
              this.logger.log(`🛑 [Bot] Acción terminal detectada (${toolName}). Deteniendo encadenamiento para forzar respuesta.`);
              stopChaining = true;

              // Solo limpiamos contexto si fue una escritura (agendamiento exitoso)
              if (terminalWriteTools.includes(toolName) && updatedStage.data?.medilink) {
                const currentData = updatedStage.data || {};
                const medilinkData = currentData.medilink || {};
                
                this.logger.log('🧹 [Bot] Limpiando contexto tras agendamiento exitoso');
                medilinkData.selectedProfessionalId = null;
                medilinkData.selectedBranchId = null;
                medilinkData.lastSlotsByDate = null;
                medilinkData.selectedDateYmd = null;
                medilinkData.lastSlotsProfessionalId = null;
                medilinkData.lastSlotsBranchId = null;

                updatedStage.data = {
                  ...currentData,
                  medilink: medilinkData,
                };
              }
            }
          }

          // Persistir selecciones útiles en clientStage.data para encadenamiento robusto
          try {
            const currentData = updatedStage.data || {};
            const medilinkData = currentData.medilink || {};
            
            //this.logger.log(`🔄 ANTES de persistir - currentData:`, JSON.stringify(currentData, null, 2));

            const toStringId = (value: any): string | undefined => {
              if (value === null || value === undefined) {
                return undefined;
              }
              const str = String(value).trim();
              return str.length > 0 ? str : undefined;
            };
            const isNumericId = (value?: string): value is string => !!value && /^\d+$/.test(value);

            // Solo persistir si el usuario pasó branchId en args (significa que está seleccionando)
            const argBranchId = toStringId(args.branchId);
            if (isNumericId(argBranchId)) {
              medilinkData.selectedBranchId = argBranchId;
              this.logger.log(`💾 Persistiendo branchId: ${argBranchId} (tool: ${toolCall.function.name})`);
            }

            // Solo persistir si el usuario pasó professionalId en args
            const argProfessionalId = toStringId(args.professionalId);
            if (isNumericId(argProfessionalId)) {
              medilinkData.selectedProfessionalId = argProfessionalId;
              this.logger.log(`💾 Persistiendo professionalId: ${argProfessionalId} (tool: ${toolCall.function.name})`);
            }
            // Guardar fecha si hay rango puntual
            if (args.startDate && args.endDate && args.startDate === args.endDate) {
              medilinkData.selectedDateYmd = args.startDate;
            }
            if (args.dateYmd) {
              medilinkData.selectedDateYmd = args.dateYmd;
            }

            // Si se consultaron slots, guardar también los últimos slots por fecha
            if (toolCall.function.name === 'get_available_slots' && Array.isArray(result?.data?.slots)) {
              const byDate = (result.data.slots as any[]).reduce((acc: any, s: any) => {
                acc[s.date] = acc[s.date] || [];
                acc[s.date].push(s.time);
                return acc;
              }, {});
              medilinkData.lastSlotsByDate = byDate;
              // Persistir también a qué profesional y sucursal pertenecen los últimos slots mostrados
              if (isNumericId(argProfessionalId)) {
                medilinkData.lastSlotsProfessionalId = argProfessionalId;
              }
              if (isNumericId(argBranchId)) {
                medilinkData.lastSlotsBranchId = argBranchId;
              }
              this.logger.log(`💾 Persistiendo contexto de slots: professionalId=${medilinkData.lastSlotsProfessionalId}, branchId=${medilinkData.lastSlotsBranchId}`);
            }

            // Si list_professionals devolvió profesionales, guardar la lista para referencia futura
            if (toolCall.function.name === 'list_professionals' && Array.isArray(result?.data?.professionals)) {
              const profs = result.data.professionals as Array<{ 
                id: string | number; 
                fullName?: string; 
                name?: string; 
                lastName?: string;
                branchId?: string;
                branchName?: string;
              }>;
              
              // Guardar todos los profesionales listados para referencia (incluyendo sucursal)
              medilinkData.lastListedProfessionals = profs.map(p => ({
                id: String(p.id),
                fullName: p.fullName || `${p.name || ''} ${p.lastName || ''}`.trim(),
                branchId: p.branchId ? String(p.branchId) : undefined,
                branchName: p.branchName,
              }));
              
              // Si hay un único profesional, fijar selección automáticamente
              if (profs.length === 1) {
                const soleId = String(profs[0].id);
                if (isNumericId(soleId)) {
                  medilinkData.selectedProfessionalId = soleId;
                  // Persistiendo professionalId automáticamente (coincidencia única)
                }
              } else if (profs.length > 1) {
                // Si hay múltiples profesionales, guardar la lista pero no seleccionar uno automáticamente
                // El usuario mencionará el nombre y se buscará en esta lista
                // Persistiendo ${profs.length} profesionales listados
              }
            }
            
            // Si get_available_slots se llama con un professionalId que no está en la lista persistida,
            // intentar buscar el profesional correcto por nombre en el historial del chat
            if (toolCall.function.name === 'get_available_slots' && 
                medilinkData.lastListedProfessionals && 
                Array.isArray(medilinkData.lastListedProfessionals)) {
              const requestedId = String(args.professionalId);
              const listedProfs = medilinkData.lastListedProfessionals as Array<{ id: string; fullName: string }>;
              
              // Verificar si el ID solicitado está en la lista de profesionales listados
              const foundInList = listedProfs.some(p => p.id === requestedId);
              
              if (!foundInList && listedProfs.length > 0) {
                // El ID no está en la lista, buscar en el historial del chat el nombre mencionado
                const lastUserMessage = chatHistory.filter(m => m.role === 'user').pop()?.content || '';
                this.logger.debug(`🔍 [Bot] ID ${requestedId} no está en la lista de profesionales listados. Buscando por nombre en: "${lastUserMessage}"`);
                
                // Buscar profesional por nombre en la lista
                const matchingProf = listedProfs.find(p => {
                  const fullNameLower = p.fullName.toLowerCase();
                  const messageLower = lastUserMessage.toLowerCase();
                  // Buscar si el nombre del profesional está mencionado en el mensaje
                  return fullNameLower.split(' ').some(namePart => 
                    namePart.length > 3 && messageLower.includes(namePart)
                  );
                });
                
                if (matchingProf) {
                  const oldId = args.professionalId;
                  args.professionalId = matchingProf.id;
                  medilinkData.selectedProfessionalId = matchingProf.id;
                  this.logger.warn(`⚠️ [Bot] Corrigiendo professionalId por búsqueda de nombre: ${oldId} → ${matchingProf.id} (${matchingProf.fullName})`);
                } else if (listedProfs.length === 1) {
                  // Si solo hay un profesional en la lista, usarlo
                  const oldId = args.professionalId;
                  args.professionalId = listedProfs[0].id;
                  medilinkData.selectedProfessionalId = listedProfs[0].id;
                  this.logger.warn(`⚠️ [Bot] Corrigiendo professionalId usando único profesional listado: ${oldId} → ${listedProfs[0].id} (${listedProfs[0].fullName})`);
                }
              }
            }

            updatedStage.data = {
              ...currentData,
              medilink: medilinkData,
            };
            clientStage.data = updatedStage.data;
            
            // Log de debugging para ver qué se está persistiendo
            //this.logger.log(`📦 Datos persistidos en clientStage.data.medilink:`, JSON.stringify(medilinkData, null, 2));
            
            await this.clientStageRepository.save(updatedStage);
          } catch (persistErr) {
            this.logger.warn(`No se pudieron persistir selecciones de Medilink: ${persistErr.message}`);
          }
        } else {
          // Usar funciones de la base de datos para otros funnels
          const botFunction = botFunctions.find(bf => bf.function.external_name === toolCall.function.name);

          if (!botFunction || !botFunction.isActive) {
            this.logger.warn(`⚠️ Función ${toolCall.function.name} no encontrada o inactiva`);
            results.push({
              tool_call_id: toolCall.id,
              content: JSON.stringify({ success: false, error: 'Función no disponible' })
            });
            continue;
          }

          result = await this.functionsService.executeFunction(
            botFunction.function.id,
            JSON.parse(toolCall.function.arguments),
            {
              companyId: clientStage.stage.bot.companyId,
              clientId: clientStage.clientId,
              stageId: clientStage.stageId,
              funnelId: clientStage.funnelChannel.funnelId,
              chatHistory,
              contextData: botFunction.contextData
            }
          );
        }

        ////this.logger.log(`✅ Resultado de ${toolCall.function.name}:`, result);

        results.push({
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });

        // Si hubo cambio de stage
        if (result.data?.newStageId && result.data.newStageId !== clientStage.stageId) {
          //this.logger.log(`🔄 Cambio de stage detectado: ${result.data.newStageId}`);
          updatedStage = await this.reloadClientStage(clientStage.id);
          shouldContinue = true;
        }
      } catch (error) {
        this.logger.error(`❌ Error ejecutando ${toolCall.function.name}:`, error);
        results.push({
          tool_call_id: toolCall.id,
          content: JSON.stringify({ success: false, error: error.message })
        });
      }
    }

    this.logger.debug(`📊 [Bot] Resultados procesados: ${results.length}`);
    return { updatedStage, results, shouldContinue, stopChaining };
  }

  private async handleStageContinuation(
    message: string,
    chatHistory: { role: string; content: string }[],
    updatedStage: ClientStage,
    depth: number
  ): Promise<{ updatedClientStage: ClientStage; botResponse: string | null }> {
    this.logger.debug(`🔄 [Bot] Continuando con nuevo bot en stage ${updatedStage.stageId}...`);

    if (!updatedStage.stage.bot) {
      this.logger.warn(`⚠️ [Bot] No hay bot asociado al stage "${updatedStage.stage.name}" (ID: ${updatedStage.stageId})`);
      this.logger.warn(`⚠️ [Bot] El cliente ha sido movido a un stage sin bot. Verificando si se debe notificar...`);

      if (updatedStage.stage.notificationEmails && updatedStage.stage.notificationEmails.length > 0) {
        try {
          for (const email of updatedStage.stage.notificationEmails) {
            await this.emailService.sendEmail({
              to: email,
              subject: `Nuevo Lead en Etapa sin Bot: ${updatedStage.stage.name}`,
              bodyText: `El cliente ${updatedStage.client.name} (Tel: ${updatedStage.client.phone}) ha pasado a la etapa '${updatedStage.stage.name}' (que no tiene bot asignado) en el funnel '${updatedStage.funnelChannel.funnel.name}'.\nEsto podría requerir atención humana. Por favor, revisa la plataforma para continuar la conversación.`,
              bodyHtml: `<p>El cliente <strong>${updatedStage.client.name}</strong> (Tel: ${updatedStage.client.phone}) ha pasado a la etapa <strong>${updatedStage.stage.name}</strong> (que no tiene bot asignado) en el funnel <strong>${updatedStage.funnelChannel.funnel.name}</strong>.</p><p>Esto podría requerir atención humana. Por favor, revisa la plataforma para continuar la conversación.</p>`
            });
            this.logger.debug(`📧 [Bot] Correo de notificación enviado para el cliente ${updatedStage.client.name} en la etapa ${updatedStage.stage.name}`);
          }
        } catch (emailError) {
          this.logger.error(`❌ [Bot] Error al enviar correo de notificación para la etapa ${updatedStage.stage.name}: ${emailError.message}`);
        }
      }

      this.logger.warn(`⚠️ [Bot] No se generará respuesta porque el stage no tiene bot configurado`);
      return {
        updatedClientStage: updatedStage,
        botResponse: null
      };
    }

    return this.executeAgentWithTools(
      message,
      chatHistory,
      updatedStage,
      depth + 1
    );
  }

  private async reloadClientStage(clientStageId: string): Promise<ClientStage> {
    const updatedStage = await this.clientStageRepository.findOne({
      where: { id: clientStageId },
      relations: [
        'client',
        'stage',
        'stage.bot',
        'stage.bot.botFunctions',
        'stage.bot.botFunctions.function',
        'funnelChannel',
        'funnelChannel.funnel',
        'funnelChannel.funnel.company'
      ]
    });

    if (!updatedStage) {
      throw new Error('Error al recargar ClientStage después del cambio de stage');
    }

    return updatedStage;
  }

  private async handleBotResponse(
    botResponse: string,
    clientStage: ClientStage,
    oldStageId: string,
    channelNumber: string
  ): Promise<void> {
    this.logger.debug(`📤 [Bot] Manejo de respuesta del bot`);
    this.logger.debug(`📤 [Bot] Cliente: ${clientStage.clientId}, Stage: ${oldStageId} -> ${clientStage.stageId}`);
    this.logger.debug(`📤 [Bot] botResponse recibido en handleBotResponse: "${botResponse?.substring(0, 100) || 'null'}..." (longitud: ${botResponse?.length || 0})`);
    
    if (!botResponse || botResponse.trim().length === 0) {
      this.logger.error(`❌ [Bot] handleBotResponse recibió botResponse vacío o null. No se puede procesar.`);
      throw new Error('botResponse está vacío o es null en handleBotResponse');
    }
    
    // Limpiar formato del mensaje
    const cleanedResponse = this.cleanResponseFormat(botResponse);
    this.logger.debug(`📤 [Bot] Respuesta limpiada: "${cleanedResponse.substring(0, 100)}..." (longitud: ${cleanedResponse.length})`);

    // Guardar en historial y enviar respuesta
    this.logger.debug(`📤 [Bot] Guardando respuesta en historial...`);
    const botResponseHistory = await this.saveBotResponseToHistory(
      cleanedResponse,
      clientStage,
      oldStageId
    );
    this.logger.debug(`📤 [Bot] Respuesta guardada en historial: ${botResponseHistory.id}`);

    // Enviar mensaje a través del canal
    this.logger.debug(`📤 [Bot] Enviando respuesta a través del canal...`);
    await this.sendResponseThroughChannel(
      cleanedResponse,
      clientStage,
      botResponseHistory,
      channelNumber
    );
    this.logger.debug(`✅ [Bot] Respuesta enviada exitosamente a través del canal`);
  }

  private cleanResponseFormat(response: string): string {
    return response
      .replace(/\*\*/g, '*')
      .replace(/#/g, '')
      .replace(/--/g, '-');
  }

  private async saveBotResponseToHistory(
    response: string,
    clientStage: ClientStage,
    oldStageId: string
  ): Promise<ChatHistory> {
    this.logger.debug(`💾 [Bot] Guardando respuesta en historial`);
    this.logger.debug(`💾 [Bot] Stage: ${clientStage.stageId}, Bot: ${clientStage.stage?.bot?.id || 'null'}`);
    
    return await this.chatHistoryRepository.save({
      channelId: clientStage.funnelChannel.channelId,
      clientId: clientStage.clientId,
      direction: 'outbound',
      message: response,
      createdAt: new Date(),
      metadata: {
        botId: clientStage.stage?.bot?.id || null,
        stageId: clientStage.stageId,
        previousStageId: oldStageId !== clientStage.stageId ? oldStageId : undefined
      }
    });
  }

  private async sendResponseThroughChannel(
    response: string,
    clientStage: ClientStage,
    botResponseHistory: ChatHistory,
    channelNumber: string
  ): Promise<void> {
    try {
      this.logger.debug(`📨 [Bot] Enviando respuesta a ${clientStage.client.phone} a través del canal ${clientStage.funnelChannel.channelId}`);
      this.logger.debug(`📨 [Bot] Longitud de respuesta: ${response?.length || 0} caracteres`);
      this.logger.debug(`📨 [Bot] Previsualización: "${response?.substring(0, 100) || 'null'}..."`);
      
      const botId = clientStage.stage?.bot?.id || null;
      this.logger.debug(`📨 [Bot] Bot ID: ${botId || 'null (stage sin bot)'}`);
      
      if (!response || response.trim().length === 0) {
        this.logger.error(`❌ [Bot] sendResponseThroughChannel recibió respuesta vacía. No se puede enviar.`);
        throw new Error('Response está vacío o es null en sendResponseThroughChannel');
      }
      
      // Enviar mensaje con flag isBot para que el strategy sepa que no debe guardarlo
      this.logger.debug(`📨 [Bot] Llamando a channelsService.sendMessage...`);
      await this.channelsService.sendMessage(
        clientStage.funnelChannel.channelId,
        {
          to: clientStage.client.phone,
          message: response,
          metadata: {
            isBot: true,
            botId: botId,
            timestamp: Date.now(),
            type: 'text'
          }
        }
      );
      this.logger.debug(`✅ [Bot] Mensaje enviado exitosamente`);

      // Emitir evento de respuesta del bot usando el mismo formato que los mensajes normales
      const botMessage = {
        id: String(botResponseHistory.id),
        timestamp: new Date().getTime(),
        createdAt: new Date(),
        from: channelNumber,
        to: clientStage.client.phone,
        body: response,
        hasMedia: false,
        type: 'text',
        direction: 'outbound',
        clientId: clientStage.client.id,
        channelId: clientStage.funnelChannel.channelId,
        metadata: {
          isBot: true,
          botId: botId,
          timestamp: Date.now(),
          type: 'text'
        }
      };

      // Emitir como mensaje normal (para que aparezca en la lista de mensajes)
      // Usar el tipo del canal si está cargado, o WHATSAPP_WEB como valor por defecto
      const channelType = clientStage.funnelChannel.channel?.type || ChannelType.WHATSAPP_WEB;
      this.logger.debug(`📡 [Bot] Emitiendo eventos WebSocket...`);
      
      this.whatsappGateway.emitMessage(
        clientStage.funnelChannel.funnel.companyId,
        clientStage.funnelChannel.channelId,
        botMessage,
        channelType
      );

      // También emitir como bot_response (para compatibilidad)
      this.whatsappGateway.emitToCompany(
        clientStage.funnelChannel.funnel.companyId,
        'bot_response',
        botMessage
      );
      
      this.logger.debug(`📡 [Bot] Eventos WebSocket emitidos (message y bot_response)`);
      this.logger.debug(`✅ [Bot] sendResponseThroughChannel completado exitosamente`);
    } catch (error) {
      this.logger.error(`❌ [Bot] Error enviando respuesta del bot: ${error.message}`);
      this.logger.error(`❌ [Bot] Stack: ${error.stack}`);
      throw error;
    }
  }

  private async updateClientStageState(
    clientStage: ClientStage,
    message: string,
    botResponse: string
  ): Promise<void> {
    clientStage.lastInteraction = new Date();
    clientStage.data = {
      ...clientStage.data,
      lastMessage: message,
      lastResponse: botResponse,
    };

    await this.clientStageRepository.save(clientStage);
  }
}