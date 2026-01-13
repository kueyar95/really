import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel } from '../../persistence/entities/channel.entity';
import { ChatHistory } from '../../../clients/entities/chat-history.entity';
import { IMessage, IProcessedMessage } from '../interfaces/message.interface';
import { WhatsAppGateway } from '../../infrastructure/gateway/whatsapp.gateway';
import { FunnelsService } from '../../../funnels/services/funnels.service';
import { FunnelChannel } from '../../../funnels/entities/funnel-channel.entity';
import { OpenAIService } from '../../../ai/services/openai.service';
import { ClientsService } from '../../../clients/services/clients.service';
import { Client } from '../../../clients/entities/client.entity';

@Injectable()
export class MessageProcessorService {
  private readonly logger = new Logger('MessageProcessorService');
  
  // Cola de procesamiento por cliente para evitar race conditions
  private processingQueues: Map<string, Promise<void>> = new Map();

  constructor(
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    private readonly clientsService: ClientsService,
    @InjectRepository(ChatHistory)
    private readonly chatHistoryRepository: Repository<ChatHistory>,
    private readonly whatsappGateway: WhatsAppGateway,
    private readonly funnelsService: FunnelsService,
    private readonly openaiService: OpenAIService,
    @InjectRepository(FunnelChannel)
    private readonly funnelChannelRepository: Repository<FunnelChannel>,
  ) {}

  async processIncomingMessage(
    channel: Channel,
    message: IMessage,
    contactInfo?: { name?: string }
  ): Promise<void> {
    // Crear clave única por canal + remitente para encolar mensajes
    const queueKey = `${channel.id}_${message.metadata.from}`;
    
    // Obtener la promesa anterior en la cola (si existe)
    const previousProcess = this.processingQueues.get(queueKey) || Promise.resolve();
    
    if (this.processingQueues.has(queueKey)) {
      //this.logger.log(`⏳ Mensaje en cola para ${message.metadata.from} (esperando mensaje anterior)`);
    }
    
    // Crear nueva promesa que espera a que termine la anterior
    const currentProcess = previousProcess
      .then(() => this._processMessageSequentially(channel, message, contactInfo))
      .catch((error) => {
        this.logger.error(`Error en cola de procesamiento para ${queueKey}:`, error);
      })
      .finally(() => {
        // Limpiar la cola si es la última promesa
        if (this.processingQueues.get(queueKey) === currentProcess) {
          this.processingQueues.delete(queueKey);
        }
      });
    
    // Guardar la promesa actual en la cola
    this.processingQueues.set(queueKey, currentProcess);
    
    return currentProcess;
  }

  private async _processMessageSequentially(
    channel: Channel,
    message: IMessage,
    contactInfo?: { name?: string }
  ): Promise<void> {
    this.logger.debug(`📨 [MessageProcessor] === INICIO PROCESAMIENTO DE MENSAJE ===`);
    this.logger.debug(`📨 [MessageProcessor] Mensaje: "${message.message}"`);
    this.logger.debug(`📨 [MessageProcessor] De: ${message.metadata.from} → Canal: ${channel.number} (${channel.id})`);
    this.logger.debug(`📨 [MessageProcessor] Tipo: ${message.metadata.type}, CompanyId: ${channel.companyId}`);

    if (!channel.companyId) {
      this.logger.error(`❌ [MessageProcessor] CRITICAL: channel ${channel.id} no tiene companyId. No se puede procesar el mensaje.`);
      return;
    }

    try {
      // 1. Buscar o crear cliente (ahora company-scoped)
      this.logger.debug(`👤 [MessageProcessor] Buscando cliente con teléfono ${message.metadata.from} para compañía ${channel.companyId}...`);
      
      const clientDefaults = {
        name: contactInfo?.name || `WhatsApp ${message.metadata.from}`,
        email: '',
        data: {},
      };
      
      let client = await this.clientsService.findOrCreateByPhoneAndCompany(
        message.metadata.from,
        channel.companyId,
        clientDefaults
      );
      this.logger.debug(`✅ [MessageProcessor] Cliente obtenido/creado (ID: ${client.id}) para compañía ${channel.companyId}`);

      // Actualizar nombre si es necesario y diferente
      if (contactInfo?.name && client.name !== contactInfo.name) {
        this.logger.debug(`👤 [MessageProcessor] Actualizando nombre del cliente: ${client.name} -> ${contactInfo.name}`);
        await this.clientsService.update(client.id, { name: contactInfo.name });
        client.name = contactInfo.name;
      }

      // 2. Emitir mensaje procesado al frontend
      const processedMessage: IProcessedMessage = {
        id: message.metadata.messageId,
        timestamp: message.metadata.timestamp,
        createdAt: new Date(),
        from: message.metadata.from,
        to: channel.number,
        body: message.message,
        type: message.metadata.type,
        clientId: client.id,
        hasMedia: message.metadata.hasMedia,
        mediaUrl: message.metadata.mediaUrl,
      };

      if (message.metadata.type === 'audio') {
        // Obtener el accessToken si está disponible en los metadata del mensaje
        const accessToken = message.metadata.accessToken;
        const transcription = await this.openaiService.transcribeAudio(message.metadata.mediaUrl, accessToken);
        processedMessage.body = `[Transcripción de audio]: ${transcription}`;
      }

      // 3. Guardar mensaje en historial
      this.logger.debug(`📝 [MessageProcessor] Guardando mensaje en historial...`);
      await this.chatHistoryRepository.save({
        channelId: channel.id,
        clientId: client.id,
        direction: message.direction,
        message: processedMessage.body,
        metadata: message.metadata,
        createdAt: new Date()
      });
      this.logger.debug(`✅ [MessageProcessor] Mensaje guardado en historial`);

      this.whatsappGateway.emitMessage(
        channel.companyId,
        channel.id,
        processedMessage,
        channel.type
      );
      this.logger.debug(`📡 [MessageProcessor] Evento WebSocket emitido`);

      // 4. Procesar en funnel si existe
      // Buscar el FunnelChannel específico para este canal
      this.logger.debug(`🎯 [MessageProcessor] Buscando FunnelChannel para canal ${channel.id}...`);
      let funnelChannel = await this.funnelChannelRepository.findOne({
        where: {
          channelId: channel.id,
          isActive: true
        },
        relations: ['funnel'],
      });

      // Si no existe, intentar auto-crear el vínculo con un funnel activo de la compañía
      if (!funnelChannel) {
        try {
          this.logger.debug(`⚠️ [MessageProcessor] FunnelChannel no encontrado. Intentando crear vínculo automático...`);
          const funnels = await this.funnelsService.findByCompany(channel.companyId);
          const activeFunnel = (funnels || []).find((f: any) => f.isActive) || (funnels || [])[0];

          if (activeFunnel?.id) {
            const existingLink = await this.funnelChannelRepository.findOne({
              where: { channelId: channel.id, funnelId: activeFunnel.id },
            });

            if (!existingLink) {
              // Desactivar otros FunnelChannels activos para este canal
              await this.funnelChannelRepository.update(
                { channelId: channel.id, isActive: true },
                { isActive: false }
              );
              
              await this.funnelChannelRepository.save({
                channelId: channel.id,
                funnelId: activeFunnel.id,
                isActive: true,
              } as any);
              this.logger.debug(`✅ [MessageProcessor] FunnelChannel creado para funnel=${activeFunnel.id} y channel=${channel.id}`);
            }

            funnelChannel = await this.funnelChannelRepository.findOne({
              where: { channelId: channel.id, isActive: true },
              relations: ['funnel'],
            });
          } else {
            this.logger.warn(`⚠️ [MessageProcessor] No hay funnels disponibles para la compañía; no se puede crear FunnelChannel automáticamente.`);
          }
        } catch (autoLinkErr) {
          this.logger.error(`❌ [MessageProcessor] Error intentando auto-crear FunnelChannel: ${(autoLinkErr as any).message}`);
        }
      }

      // Si el funnel no tiene flag isActive definido, asumimos activo por compatibilidad
      const isFunnelActive = funnelChannel && (funnelChannel.funnel?.isActive !== false);
      if (isFunnelActive) {
        this.logger.debug(`🎯 [MessageProcessor] FunnelChannel encontrado (${funnelChannel.id}) para funnel ${funnelChannel.funnel.name}`);

        const chatHistory = await this.chatHistoryRepository.find({
          where: {
            clientId: client.id,
            channelId: channel.id
          },
          order: {
            createdAt: 'DESC'
          },
          take: 16
        });

        this.logger.debug(`📜 [MessageProcessor] Historial obtenido: ${chatHistory.length} mensajes`);

        // Invertir el orden (más antiguo primero) y excluir el mensaje actual (el primero en DESC)
        // que ya está siendo procesado en este turno
        const historyForBot = chatHistory
          .slice(1) // Excluir el mensaje actual que acabamos de guardar
          .reverse() // Invertir para tener orden cronológico (más antiguo → más reciente)
          .map(ch => ({
            role: ch.direction === 'inbound' ? 'user' : 'assistant',
            content: ch.message
          }));

        this.logger.debug(`📜 [MessageProcessor] Historial preparado para bot: ${historyForBot.length} mensajes`);
        this.logger.debug(`🔄 [MessageProcessor] Delegando procesamiento al funnel...`);

        await this.funnelsService.processIncomingMessage({
          funnelChannelId: funnelChannel.id,
          clientId: client.id,
          message: processedMessage.body,
          chatHistory: historyForBot,
          channelNumber: channel.number
        });

        this.logger.debug(`✅ [MessageProcessor] Procesamiento del funnel completado`);
      } else {
        this.logger.debug(`⚠️ [MessageProcessor] No hay funnel activo, mensaje no será procesado por bot`);
      }

      this.logger.debug(`✅ [MessageProcessor] Mensaje procesado exitosamente`);
      this.logger.debug(`📨 [MessageProcessor] === FIN PROCESAMIENTO DE MENSAJE ===`);
    } catch (error) {
      this.logger.error(`❌ [MessageProcessor] Error procesando mensaje para canal ${channel.id}: ${(error as any).message}`);
      this.logger.error(`❌ [MessageProcessor] Stack: ${(error as any).stack}`);
      throw error;
    }
  }
}
