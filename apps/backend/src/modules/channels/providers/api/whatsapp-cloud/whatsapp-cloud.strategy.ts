// whatsapp-cloud.strategy.ts - CORREGIDO
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel } from '../../../persistence/entities/channel.entity';
import { IAPIChannelStrategy } from '../../../core/interfaces/channel.interface';
import { ChannelStatus, ChannelType, MessageDirection } from '../../../core/types/channel.types';
import { WhatsAppCloudService } from './whatsapp-cloud.service';
import { WhatsAppCloudConfig } from './whatsapp-cloud.types';
import { MessageProcessorService } from '../../../core/services/message-processor.service';
import { IMessage } from '../../../core/interfaces/message.interface';
import { WhatsAppGateway } from '../../../infrastructure/gateway/whatsapp.gateway';
import { ChatHistory } from '../../../../clients/entities/chat-history.entity';
import { ClientsService } from '../../../../clients/services/clients.service';

@Injectable()
export class WhatsAppCloudStrategy implements IAPIChannelStrategy {
  private readonly logger = new Logger('WhatsAppCloudStrategy');
  private normalizeMsisdn(v?: string): string {
    return (v || '').replace(/[^0-9]/g, '');
  }
  constructor(
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    @InjectRepository(ChatHistory)
    private readonly chatHistoryRepository: Repository<ChatHistory>,
    private readonly whatsappCloudService: WhatsAppCloudService,
    private readonly messageProcessor: MessageProcessorService,
    private readonly whatsappGateway: WhatsAppGateway,
    private readonly clientsService: ClientsService,
  ) { }

  // En whatsapp-cloud.strategy.ts - Reemplaza el método configure

  async configure(config: WhatsAppCloudConfig): Promise<void> {
    try {
      const isValid = await this.whatsappCloudService.verifyConnection(config);
      if (!isValid) {
        throw new Error('No se pudo verificar la conexión con WhatsApp Cloud');
      }

      // Buscar canal existente SOLO por phoneNumberId exacto
      let channel = null;

      if (config.phoneNumberId) {
        channel = await this.channelRepository
          .createQueryBuilder('channel')
          .where('channel.type = :type', { type: ChannelType.WHATSAPP_CLOUD })
          .andWhere('channel.company_id = :companyId', { companyId: config.companyId })
          .andWhere(
            `(channel.connectionConfig ->> 'phoneNumberId') = :phoneNumberId`,
            { phoneNumberId: config.phoneNumberId }
          )
          .getOne();
      }

      if (!channel) {
        // Crear nuevo canal si no existe uno con el mismo phoneNumberId
        channel = this.channelRepository.create({
          companyId: config.companyId,
          type: ChannelType.WHATSAPP_CLOUD,
          status: ChannelStatus.ACTIVE,
          connectionConfig: config,
          number: config.displayPhoneNumber || config.phoneNumberId,
          name: `WhatsApp Cloud ${config.displayPhoneNumber || config.phoneNumberId || new Date().toISOString().substring(0, 19)}`,
          metadata: {
            phoneNumberId: config.phoneNumberId,
            createdAt: new Date().toISOString()
          }
        });
      } else {
        // Actualizar solo el canal que coincide exactamente
        channel.connectionConfig = config;
        channel.status = ChannelStatus.ACTIVE;
        channel.number = config.displayPhoneNumber || config.phoneNumberId;
        channel.name = `WhatsApp Cloud ${config.displayPhoneNumber || config.phoneNumberId}`;
        channel.metadata = {
          ...channel.metadata,
          phoneNumberId: config.phoneNumberId,
          lastUpdated: new Date().toISOString()
        };
      }

      await this.channelRepository.save(channel);

      //this.logger.log(`Canal configurado: ${channel.id} con phoneNumberId: ${config.phoneNumberId}`);

      this.whatsappGateway.emitConnectionStatus(
        channel.companyId,
        channel.id,
        'connected',
        { phoneNumber: channel.number },
        ChannelType.WHATSAPP_CLOUD
      );

    } catch (error) {
      this.logger.error(`Error configurando WhatsApp Cloud: ${error.message}`);
      throw error;
    }
  }

  async sendMessage(payload: any): Promise<any> {
    try {
      const { channelId, ...messagePayload } = payload;

      const channel = await this.channelRepository.findOne({
        where: { id: channelId }
      });

      if (!channel) {
        throw new Error(`Canal ${channelId} no encontrado`);
      }

      const result = await this.whatsappCloudService.sendMessageByChannel(
        channelId,
        messagePayload
      );

      // Guardar mensaje saliente en historial (excepto si proviene del bot)
      try {
        if (!messagePayload?.metadata?.isBot) {
          const toPhone = String(messagePayload.to || '').replace(/[^0-9]/g, '');
          const client = await this.clientsService.findOrCreateByPhoneAndCompany(
            toPhone,
            channel.companyId,
            { name: `WhatsApp ${toPhone}`, email: '', data: {} }
          );

          await this.chatHistoryRepository.save({
            channelId: channel.id,
            clientId: client.id,
            direction: MessageDirection.OUTBOUND,
            message: String(messagePayload.message || ''),
            metadata: {
              messageId: result.messageId || result.id,
              timestamp: result.timestamp || Date.now(),
              from: channel.number,
              to: messagePayload.to,
              type: 'text',
              hasMedia: false,
              fromFrontend: true,
            },
            createdAt: new Date(),
          });
        }
      } catch (persistError) {
        this.logger.error(`Error guardando mensaje saliente en historial: ${persistError.message}`);
      }

      this.whatsappGateway.emitMessage(channel.companyId, channelId, {
        id: result.messageId,
        from: channel.number,
        to: messagePayload.to,
        body: messagePayload.message,
        timestamp: result.timestamp,
        createdAt: new Date(),
        type: 'text',
        hasMedia: false,
        direction: 'outbound',
        channelId: channelId
      }, ChannelType.WHATSAPP_CLOUD);

      return result;
    } catch (error) {
      this.logger.error(`Error enviando mensaje: ${error.message}`);
      throw error;
    }
  }

  async handleWebhook(payload: any): Promise<void> {
    // 1) Extrae datos base del webhook de Meta
    const entry = Array.isArray(payload?.entry) ? payload.entry[0] : undefined;
    const change = Array.isArray(entry?.changes) ? entry.changes[0] : undefined;
    const value = change?.value || {};
    const phoneNumberId: string | undefined = value?.metadata?.phone_number_id;
    const displayPhone: string | undefined = value?.metadata?.display_phone_number;
    const messages: any[] = Array.isArray(value?.messages) ? value.messages : [];
    const contacts: any[] = Array.isArray(value?.contacts) ? value.contacts : [];

    // 2) Normaliza número para buscar canal por NÚMERO (evitamos columnas inexistentes)
    const normDisplay = this.normalizeMsisdn(displayPhone);

    // 3) Busca el canal por número y tipo (NO selecciona 'connection_config')
    const channel = await this.channelRepository.createQueryBuilder('channel')
      .select([
        'channel.id',
        'channel.companyId',
        'channel.number',
        'channel.type',
        'channel.status',
        'channel.createdAt',
        'channel.updatedAt',
      ])
      // Postgres: comparamos solo dígitos
      .where(`regexp_replace(channel.number, '[^0-9]', '', 'g') = :num`, { num: normDisplay })
      .andWhere('channel.type = :type', { type: ChannelType.WHATSAPP_CLOUD })
      .getOne();

    if (!channel) {
      this.logger.warn(
        `Canal WHATSAPP_CLOUD no encontrado por display_phone_number=${displayPhone} (phone_number_id=${phoneNumberId})`
      );
      // No lanzamos excepción: evitamos reintentos agresivos de Meta
      return;
    }

    // Nombre del contacto si viene
    const contactName: string | undefined = contacts?.[0]?.profile?.name;

    // 4) Procesa cada mensaje entrante con TU pipeline real
    for (const m of messages) {
      try {
        const tsSec = Number(m?.timestamp || Date.now() / 1000);
        const isText = m?.type === 'text';
        const body = isText ? (m?.text?.body ?? '') : '';

        // Obtener la URL del medio si existe
        let mediaUrl = null;
        let accessToken = null;
        const mediaId = m?.audio?.id || m?.video?.id || m?.image?.id || m?.document?.id;

        if (mediaId) {
          try {
            // Pasamos el accessToken directamente para evitar otra consulta a la BD
            const channelWithConfig = await this.channelRepository.findOne({
              where: { id: channel.id },
              select: ['connectionConfig'], // Seleccionar solo la configuración
            });
            const config = channelWithConfig?.connectionConfig as WhatsAppCloudConfig;

            if (config?.accessToken) {
              mediaUrl = await this.whatsappCloudService.getMediaUrl(mediaId, config);
              accessToken = config.accessToken; // Guardamos el token para pasarlo separadamente
            } else {
              this.logger.warn(`No se encontró accessToken para el canal ${channel.id}, no se puede obtener la URL del medio.`);
            }
          } catch (urlError) {
            this.logger.error(`Error obteniendo URL para mediaId ${mediaId}: ${urlError.message}`);
          }
        }
        // 👉 ESTE shape es el que tu MessageProcessorService espera:
        // - 'message' (texto)
        // - 'direction' = 'inbound'
        // - 'metadata' con 'from', 'messageId', 'timestamp', 'type', etc.
        const inbound = {
          message: body,
          direction: 'inbound',
          metadata: {
            messageId: m?.id,
            timestamp: tsSec,
            from: this.normalizeMsisdn(m?.from),
            type: m?.type,
            hasMedia: !isText,
            mediaUrl: mediaUrl,
            accessToken: accessToken, // Pasamos el token separadamente
            phoneNumberId,
            displayPhone,
            raw: m,
          },
        };

        // 👇 Método correcto en tu servicio:
        await this.messageProcessor.processIncomingMessage(
          channel,
          inbound as any,            // cumplimos types y dejamos que el service haga su flujo
          { name: contactName }
        );

      } catch (e: any) {
        this.logger.error(`Error procesando mensaje wamid=${m?.id}: ${e?.message || e}`);
        // Continua con el siguiente sin romper el lote
      }
    }
  }


  async getStatus(): Promise<ChannelStatus> {
    return ChannelStatus.ACTIVE;
  }

  async disconnect(channelId: string): Promise<void> {
    this.logger.log(`[Strategy] Desconectando canal ${channelId} (WhatsApp Cloud API)`);

    const channel = await this.channelRepository.findOne({
      where: { id: channelId }
    });

    if (channel) {
      this.whatsappGateway.emitConnectionStatus(
        channel.companyId,
        channelId,
        'disconnected',
        null,
        ChannelType.WHATSAPP_CLOUD
      );
    }

    return Promise.resolve();
  }
}