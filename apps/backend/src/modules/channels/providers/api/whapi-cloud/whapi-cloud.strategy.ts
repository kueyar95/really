import { Injectable, Logger, Inject, forwardRef, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IAPIChannelStrategy } from '../../../core/interfaces/channel.interface';
import { Channel } from '../../../persistence/entities/channel.entity';
import { MessageProcessorService } from '../../../core/services/message-processor.service';
import { ChannelsService } from '../../../channels.service';
import { WhatsAppGateway } from '../../../infrastructure/gateway/whatsapp.gateway';
import { WhapiCloudService } from './whapi-cloud.service';
import { WhapiCloudConfig, WhapiQrCodeParams, WhapiSendTextParams, WhapiSendMediaParams, WhapiUserStatusWebhook, WhapiMessagesWebhook, WhapiStatusesWebhook, WhapiChannelWebhook, WhapiAdminChannel  } from './whapi-cloud.types';
import { IMessage } from '../../../core/interfaces/message.interface';
import { ChannelStatus, MessageDirection } from '../../../core/types/channel.types';
import { ChannelType } from '../../../core/types/channel.types';
import { ChatHistory } from '../../../../clients/entities/chat-history.entity';
import { ClientsService } from '../../../../clients/services/clients.service';

@Injectable()
export class WhapiCloudStrategy implements IAPIChannelStrategy {
  private readonly logger = new Logger('WhapiCloudStrategy');

  // Sistema de deduplicación de mensajes con TTL
  private processedMessages = new Map<string, number>(); // messageId -> timestamp
  private readonly MESSAGE_CACHE_TTL = 10 * 60 * 1000; // 10 minutos en milisegundos
  private readonly MESSAGE_CACHE_CLEANUP_INTERVAL = 2 * 60 * 1000; // 2 minutos

  constructor(
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    private readonly clientsService: ClientsService,
    @InjectRepository(ChatHistory)
    private readonly chatHistoryRepository: Repository<ChatHistory>,
    private readonly whapiCloudService: WhapiCloudService,
    private readonly messageProcessor: MessageProcessorService,
    private readonly whatsappGateway: WhatsAppGateway,
    @Inject(forwardRef(() => ChannelsService))
    private readonly channelsService: ChannelsService,
  ) {
    // Inicializar limpieza automática de caché
    this.initMessageCacheCleanup();
  }

  /**
   * Inicializa la limpieza automática de la caché de mensajes procesados
   */
  private initMessageCacheCleanup(): void {
    setInterval(() => {
      const currentTime = Date.now();
      const sizeBefore = this.processedMessages.size;

      // Eliminar mensajes que han expirado según TTL
      for (const [messageId, timestamp] of this.processedMessages.entries()) {
        if (currentTime - timestamp > this.MESSAGE_CACHE_TTL) {
          this.processedMessages.delete(messageId);
        }
      }

      const sizeAfter = this.processedMessages.size;
      const removedCount = sizeBefore - sizeAfter;

      if (removedCount > 0) {
        this.logger.debug(`🧹 Caché limpiada: ${removedCount} mensajes expirados eliminados (${sizeBefore} → ${sizeAfter})`);
      }
    }, this.MESSAGE_CACHE_CLEANUP_INTERVAL);
  }

  /**
   * Verifica si un mensaje ya fue procesado (considerando TTL)
   */
  private isMessageAlreadyProcessed(messageId: string): boolean {
    const timestamp = this.processedMessages.get(messageId);

    if (!timestamp) {
      return false; // No existe en caché
    }

    const currentTime = Date.now();
    const age = currentTime - timestamp;

    // Si ha expirado, eliminarlo y considerarlo como no procesado
    if (age > this.MESSAGE_CACHE_TTL) {
      this.processedMessages.delete(messageId);
      this.logger.debug(`⏱️ Mensaje ${messageId} expirado de caché (edad: ${Math.round(age / 1000)} segundos)`);
      return false;
    }

    return true; // Existe y no ha expirado
  }

  /**
   * Marca un mensaje como procesado con timestamp actual
   */
  private markMessageAsProcessed(messageId: string): void {
    const currentTime = Date.now();
    this.processedMessages.set(messageId, currentTime);
    this.logger.debug(`📝 Mensaje ${messageId} marcado como procesado (caché size: ${this.processedMessages.size})`);
  }

  async configure(config: WhapiCloudConfig): Promise<void> {
    this.logger.log(`Configurando estrategia Whapi.Cloud`);

    try {
      // Ya no hay nada que verificar en la configuración básica 
      // ya que los tokens se validan al crear el canal
      return Promise.resolve();
    } catch (error) {
      this.logger.error(`Error configurando Whapi.Cloud: ${error.message}`);
      throw new BadRequestException(`Error configurando Whapi.Cloud: ${error.message}`);
    }
  }

  async sendMessage(payload: any): Promise<any> {
    this.logger.log(`[Strategy] Enviando mensaje a ${JSON.stringify(payload)}`);

    try {
      // Obtener el channelId desde el payload
      const channelId = payload.channelId;
      if (!channelId) {
        throw new BadRequestException('Se requiere channelId para enviar mensajes');
      }

      // Buscar el canal para obtener el channelToken
      const channel = await this.channelRepository.findOne({
        where: { id: channelId }
      });

      if (!channel) {
        throw new NotFoundException(`Canal ${channelId} no encontrado`);
      }

      // Verificar que el canal sea de tipo WHAPI_CLOUD
      if (channel.type !== ChannelType.WHAPI_CLOUD) {
        throw new BadRequestException('El canal no es de tipo Whapi.Cloud');
      }

      // Obtener channelToken de la configuración del canal
      const channelToken = channel.connectionConfig?.whapiChannelToken;
      if (!channelToken) {
        throw new BadRequestException('El canal no tiene configurado un token válido');
      }
      let response;
      let messageContent: string;

      // Determinar si es un mensaje multimedia
      if (payload.media) {
        this.logger.log('Enviando mensaje multimedia');

        // Preparar los parámetros para el envío de mensaje multimedia
        const mediaParams: WhapiSendMediaParams = {
          to: payload.to,
          caption: payload.caption || payload.message,
          media: payload.media,
          filename: payload.filename,
          mimetype: payload.mimetype,
          typing_time: payload.typing_time || 0,
          view_once: payload.view_once,
          mentions: payload.mentions,
          quoted: payload.quoted
        };

        // Llamar al servicio para enviar el mensaje multimedia
        response = await this.whapiCloudService.sendMediaMessage(channelToken, mediaParams);
        messageContent = mediaParams.caption || '[Mensaje multimedia]';
      } else {
        this.logger.log('Enviando mensaje de texto');

        // Preparar los parámetros para el envío de mensaje de texto
        const textParams: WhapiSendTextParams = {
          to: payload.to,
          body: payload.message,
          typing_time: payload.typing_time || 0,
          no_link_preview: payload.no_link_preview,
          wide_link_preview: payload.wide_link_preview,
          mentions: payload.mentions,
          view_once: payload.view_once,
          quoted: payload.quoted
        };
        console.log('textParams', textParams);

        // Llamar al servicio para enviar el mensaje de texto
        response = await this.whapiCloudService.sendMessage(channelToken, textParams);
        messageContent = textParams.body;
      }

      this.logger.log(`Mensaje enviado exitosamente vía Whapi con ID: ${response.id}`);

      // Guardar mensaje saliente en historial
      try {
        this.logger.log(`Guardando mensaje saliente en historial para canal ${channelId} (Compañía: ${channel.companyId})`);

        // Buscar o crear cliente (company-scoped)
        const clientDefaults = {
          name: `WhatsApp ${payload.to}`, // Nombre por defecto
          email: '', // Puedes añadir email si lo tienes
          data: {}, // Puedes añadir metadatos del cliente si los tienes
          // companyId will be handled by findOrCreateByPhoneAndCompany
        };

        const client = await this.clientsService.findOrCreateByPhoneAndCompany(
          payload.to,      // phone number of the recipient
          channel.companyId, // companyId from the sending channel
          clientDefaults
        );
        this.logger.log(`Cliente obtenido/creado (ID: ${client.id}) para historial de mensaje saliente.`);

        // Guardar en ChatHistory
        if (!payload.metadata?.isBot) {
          await this.chatHistoryRepository.save({
            channelId: channel.id,
            clientId: client.id, // This is now the company-scoped client ID
            direction: MessageDirection.OUTBOUND,
            message: messageContent, // Contenido del mensaje (texto o caption)
            metadata: {
              messageId: response.id, // ID devuelto por Whapi
              timestamp: Date.now(), // Timestamp actual
              from: channel.number, // Número del canal propio
              to: payload.to, // Número del destinatario
              type: payload.media ? (payload.mimetype || 'media') : 'text', // Tipo de mensaje
              hasMedia: !!payload.media,
              mediaUrl: payload.media || null,
              mediaType: payload.mimetype || null,
              fromFrontend: true, // Asumimos que se originó desde frontend/API
              whapiStatus: response.status, // Guardar estado devuelto por Whapi
              // Puedes añadir más metadatos del payload si son relevantes
            },
            createdAt: new Date()
          });
          this.logger.log(`Mensaje saliente guardado en historial para cliente ${client.id}`);
        }
      } catch (dbError) {
        // Loggear el error pero no detener el flujo principal si falla el guardado
        this.logger.error(`Error guardando mensaje saliente en historial: ${dbError.message}`, dbError.stack);
      }

      // Retornar una respuesta consistente
      return {
        id: response.id,
        status: response.status,
        message: response.message,
        timestamp: new Date().toISOString(),
        sent: true,
        mediaUrl: payload.media || null,
        mediaType: payload.mimetype || null
      };
    } catch (error) {
      this.logger.error(`Error enviando mensaje vía Whapi: ${error.message}`);
      throw new BadRequestException(`Error al enviar mensaje vía Whapi: ${error.message}`);
    }
  }

  async handleWebhook(webhookData: any, identifier?: string): Promise<void> {
    this.logger.log(`[Strategy] Recibido webhook para Whapi.Cloud con channel_id: ${identifier}`);

    try {
      if (!identifier) {
        this.logger.error('No se proporcionó channel_id en el webhook');
        return;
      }

      // Buscar el canal correspondiente usando el whapiChannelId (channel_id del webhook)
      const channels = await this.channelRepository.find({
        where: {
          type: ChannelType.WHAPI_CLOUD
        },
        relations: ['company']
      });

      const channel = channels.find(channel => channel.connectionConfig?.whapiChannelId === identifier);

      if (!channel) {
        this.logger.error(`No se encontró canal para el channel_id: ${identifier}`);
        return;
      }

      channel.metadata = {
        ...(channel.metadata || {}),
        whapi_lastWebhookAt: new Date().toISOString(),
        whapi_lastWebhookType: `${webhookData?.event?.type}:${webhookData?.event?.event}` // p.ej. "users:post"
      };
      await this.channelRepository.save(channel);

      this.logger.log(`Procesando webhook para canal: ${channel.id}`);
      await this.processWebhookByType(channel, webhookData);

    } catch (error) {
      this.logger.error(`Error procesando webhook: ${error.message}`);
    }
  }

  /**
   * Procesa el webhook según su tipo
   */
  private async processWebhookByType(channel: Channel, webhookData: any): Promise<void> {
    this.logger.log(`Procesando webhook de tipo: ${JSON.stringify(webhookData)}`);
    // Determinar el tipo de evento basado en la estructura del webhook
    if (webhookData.event?.type === 'users' && (webhookData.event?.event === 'post' || webhookData.event?.event === 'delete')) {
      await this.handleUserStatusWebhook(channel, webhookData);
    } else if (webhookData.event?.type === 'messages' &&
      (webhookData.event?.event === 'post' || webhookData.event?.event === 'put')) {
      await this.handleMessagesWebhook(channel, webhookData);
    } else if (webhookData.event?.type === 'statuses' && webhookData.event?.event === 'post') {
      await this.handleStatusesWebhook(channel, webhookData);
    } else if (webhookData.event?.type === 'channel' && webhookData.event?.event === 'post') {
      await this.handleChannelWebhook(channel, webhookData);
    } else {
      // Formato no reconocido
      const eventType = webhookData.event?.type || '';
      this.logger.log(`Tipo de evento no reconocido: ${JSON.stringify(webhookData.event || 'desconocido')}`);
    }
  }

  /**
   * Procesa webhooks de estado de usuario (conexión/desconexión)
   */
  private async handleUserStatusWebhook(channel: Channel, webhookData: WhapiUserStatusWebhook): Promise<void> {
    this.logger.log(`Procesando webhook de estado de usuario para canal ${channel.id}`);
  
    const { event, user } = webhookData;
  
    if (event.event === 'post') {
      const formattedPhone = user.id.startsWith('+') ? user.id.substring(1) : user.id;
      this.logger.log(`👤 Usuario conectado: ${user.name} (${formattedPhone}) para canal ${channel.id}`);
  
      // VALIDACIÓN IMPORTANTE: Verificar si el número que se conecta es el esperado
      if (channel.number && channel.number !== formattedPhone) {
        this.logger.error(`❌ ALERTA: Se intentó conectar número ${formattedPhone} al canal ${channel.id} que pertenece a ${channel.number}`);
        
        // Emitir error y NO actualizar el canal
        this.whatsappGateway.emitToCompany(
          channel.companyId,
          'whapi:error',
          {
            channelId: channel.id,
            error: `Número incorrecto. Este canal pertenece a ${channel.number}, pero se conectó ${formattedPhone}`,
            expectedNumber: channel.number,
            actualNumber: formattedPhone
          }
        );
        
        // Desconectar sesión incorrecta
        try {
          await this.whapiCloudService.logout(channel.connectionConfig?.whapiChannelToken);
        } catch (e) {
          this.logger.error(`Error desconectando sesión incorrecta: ${e.message}`);
        }
        
        return; // NO continuar con la actualización
      }
  
      // Si es el primer número o es el mismo número, actualizar
      this.logger.log(`✅ Número correcto conectado al canal ${channel.id}`);
      
      channel.status = ChannelStatus.ACTIVE;
      channel.number = formattedPhone;
      
      const dateStr = new Date().toISOString().split('T')[0];
      channel.name = `WhatsApp ${formattedPhone} - ${dateStr}`;
      
      // Guardar metadata de última conexión
      channel.metadata = {
        ...channel.metadata,
        lastConnectedAt: new Date().toISOString(),
        lastConnectedPhone: formattedPhone
      };
  
      await this.channelRepository.save(channel);
  
      this.whatsappGateway.emitToCompany(
        channel.companyId,
        'whapi:status',
        {
          channelId: channel.id,
          status: 'connected',
          phoneNumber: formattedPhone,
          name: channel.name
        }
      );
      
    } else if (event.event === 'delete') {
      this.logger.log(`📴 Usuario desconectado para canal ${channel.id} (Número: ${channel.number})`);
  
      // Mantener el número para reconexión al mismo canal
      channel.status = ChannelStatus.CONNECTING;
      
      // Guardar metadata de desconexión
      channel.metadata = {
        ...channel.metadata,
        lastDisconnectedAt: new Date().toISOString(),
        expectedPhone: channel.number // Guardar número esperado para reconexión
      };
      
      await this.channelRepository.save(channel);
  
      this.whatsappGateway.emitToCompany(
        channel.companyId,
        'whapi:status',
        { 
          channelId: channel.id, 
          status: 'disconnected',
          phoneNumber: channel.number,
          message: `Canal esperando reconexión del número ${channel.number}`
        }
      );
  
      // Intentar reconexión automática después de 5 segundos
      const channelToken = channel.connectionConfig?.whapiChannelToken;
      if (channelToken) {
        setTimeout(async () => {
          this.logger.log(`🔄 Intentando reconexión automática para canal ${channel.id} (${channel.number})`);
          await this.initiateQrSession(channel.id, channel.companyId, channelToken);
        }, 5000);
      }
    }
  }

  /**
   * Procesa webhooks de mensajes entrantes
   */
  private async handleMessagesWebhook(channel: Channel, webhookData: WhapiMessagesWebhook): Promise<void> {
    this.logger.log(`Procesando webhook de mensajes para canal ${channel.id}`);

    // Procesar cada mensaje en el webhook
    for (const message of webhookData.messages) {
      // Ignorar mensajes enviados por nosotros
      if (message.from_me) {
        this.logger.log('Ignorando mensaje enviado por nosotros');
        continue;
      }

      // 🔥 DEDUPLICACIÓN: Verificar si el mensaje ya fue procesado
      if (this.isMessageAlreadyProcessed(message.id)) {
        this.logger.log(`⚠️ Mensaje duplicado detectado y omitido: ${message.id}`);
        continue;
      }

      // 🕒 FILTRO DE TIMESTAMP: Ignorar mensajes muy antiguos (más de 10 minutos)
      const messageTimestamp = message.timestamp * 1000; // Convertir a milisegundos (Unix timestamp está en UTC)
      const currentTime = Date.now(); // También en UTC
      const messageAge = currentTime - messageTimestamp;
      const MAX_MESSAGE_AGE = 10 * 60 * 1000; // 10 minutos en milisegundos

      // Debug: Mostrar timestamps para verificar
      const messageDate = new Date(messageTimestamp);
      const currentDate = new Date(currentTime);

      this.logger.debug(`📅 Timestamp check - Mensaje: ${messageDate.toISOString()}, Actual: ${currentDate.toISOString()}, Edad: ${Math.round(messageAge / 1000)} segundos`);

      if (messageAge > MAX_MESSAGE_AGE) {
        this.logger.log(`⏰ Mensaje muy antiguo omitido: ${message.id} (edad: ${Math.round(messageAge / 1000 / 60)} minutos, fecha: ${messageDate.toISOString()})`);
        continue;
      }

      // Verificar también mensajes del futuro (posible error de sincronización)
      if (messageAge < -60000) { // Más de 1 minuto en el futuro
        this.logger.warn(`🔮 Mensaje del futuro detectado: ${message.id} (diferencia: ${Math.round(-messageAge / 1000)} segundos adelante)`);
        // Aún así lo procesamos, pero lo registramos
      }

      // Marcar mensaje como procesado ANTES de procesarlo para evitar condiciones de carrera
      this.markMessageAsProcessed(message.id);
      this.logger.log(`✅ Procesando mensaje nuevo: ${message.id} (edad: ${Math.round(messageAge / 1000)} segundos)`);

      try {
        // Extraer información del mensaje según su tipo
        let messageContent = '';
        let hasMedia = false;
        let mediaUrl = null;
        let mediaType = null;

        // Determinar el contenido del mensaje según su tipo
        switch (message.type) {
          case 'text':
            messageContent = message.text?.body || '';
            break;
          case 'document':
            messageContent = message.document?.caption || '';
            hasMedia = true;
            mediaUrl = message.document?.link || null;
            mediaType = message.document?.mime_type || null;
            break;
          case 'voice':
            messageContent = '';
            hasMedia = true;
            mediaUrl = message.voice?.link || null;
            mediaType = message.voice?.mime_type || null;
            // El tipo se ajustará a 'audio' más abajo para el procesador
            break;
          case 'link_preview':
            messageContent = message.link_preview?.body || '';
            hasMedia = false; // Links no se consideran media en nuestro sistema
            break;
          default:
            messageContent = `[Mensaje de tipo: ${message.type}]`;
        }

        // Extraer número de teléfono sin la parte @s.whatsapp.net
        const phoneNumber = message.chat_id.split('@')[0];

        // Crear objeto de mensaje en nuestro formato
        const transformedMessage: IMessage = {
          channelId: channel.id,
          clientId: phoneNumber, // El número del cliente
          direction: MessageDirection.INBOUND,
          message: messageContent,
          metadata: {
            messageId: message.id,
            timestamp: message.timestamp * 1000, // Convertir a milisegundos
            type: message.type === 'voice' ? 'audio' : message.type,
            hasMedia,
            from: phoneNumber,
            to: channel.number,
            mediaUrl,
            mediaType,
            // Guardar el mensaje original para referencia
            originalMessage: message
          }
        };

        // Extraer información del contacto
        const contactInfo = {
          name: message.from_name || '',
          number: phoneNumber
        };

        // Procesar el mensaje
        await this.messageProcessor.processIncomingMessage(channel, transformedMessage, contactInfo);
        this.logger.log(`Mensaje procesado de ${transformedMessage.clientId}`);
      } catch (error) {
        this.logger.error(`Error procesando mensaje: ${error.message}`);
      }
    }
  }

  /**
   * Procesa webhooks de estados de mensaje (leído, entregado, etc.)
   */
  private async handleStatusesWebhook(channel: Channel, webhookData: WhapiStatusesWebhook): Promise<void> {
    this.logger.log(`Procesando webhook de estados para canal ${channel.id}`);

    // Por ahora, solo registramos la información
    for (const status of webhookData.statuses) {
      this.logger.log(`Mensaje ${status.id} tiene estado: ${status.status} (código ${status.code})`);

      // TODO: Si se requiere, implementar lógica para procesar estados
      // como actualización de estados de mensajes en la base de datos
    }
  }

  /**
   * Procesa webhooks de canales
   */
  private async handleChannelWebhook(channel: Channel, webhookData: any): Promise<void> {
    this.logger.log(`Procesando webhook de canales para canal ${channel.id}`);
    this.logger.debug(`Datos del webhook de canal: ${JSON.stringify(webhookData)}`);

    // Verificar si el webhook tiene información de salud (health)
    if (webhookData.health) {
      const healthStatus = webhookData.health.status;
      this.logger.log(`📊 Estado de salud del canal: ${JSON.stringify(healthStatus)}`);

      // Verificar el código de estado
      if (healthStatus && typeof healthStatus === 'object' && healthStatus.code !== undefined) {
        const statusCode = healthStatus.code;
        const statusText = healthStatus.text || 'unknown';

        this.logger.log(`🔍 Código de estado: ${statusCode}, Texto: ${statusText}`);

        // Manejar diferentes códigos de estado según documentación de Whapi
        switch (statusCode) {
          case 0: // Disconnected / sin sesión activa
            this.logger.log(`📱 Canal ${channel.id} desconectado`);
            await this.channelsService.updateChannelStatus(channel.id, ChannelStatus.CONNECTING);
            this.whatsappGateway.emitToCompany(channel.companyId, 'whapi:status', {
              channelId: channel.id, status: 'disconnected'
            });
            // Pedir QR para reautenticar
            {
              const channelToken = channel.connectionConfig?.whapiChannelToken;
              if (channelToken) await this.initiateQrSession(channel.id, channel.companyId, channelToken);
            }
            break;

          // whapi-cloud.strategy.ts
          case 1:  // Connected/INIT→OK
          this.logger.log(`✅ Canal ${channel.id} conectado`);

          // 1) obtener token del canal
          const token = channel.connectionConfig?.whapiChannelToken;
          
          // 2) resolver el número actual desde Whapi
          let phone: string | undefined;
          try {
            if (token) {
              const status = await this.whapiCloudService.getInstanceStatus(token);
              phone = status?.phone || undefined;
            }
          } catch (e) {
            this.logger.warn(`No se pudo leer phone desde getInstanceStatus: ${e instanceof Error ? e.message : e}`);
          }
          
          // 3) ACTUALIZAR estado **y** número
          await this.channelsService.updateChannelStatus(
            channel.id,
            ChannelStatus.ACTIVE,
            phone // <- importante
          );
          
          // 4) emitir socket con consistencia (útil para la UI)
          this.whatsappGateway.emitToCompany(channel.companyId, 'whapi:status', {
            channelId: channel.id,
            status: 'connected',
            phoneNumber: phone ?? channel.number ?? null,
          });
            break;



          case 2: // Connecting
            this.logger.log(`🔄 Canal ${channel.id} conectando`);
            await this.channelsService.updateChannelStatus(channel.id, ChannelStatus.CONNECTING);
            this.whatsappGateway.emitToCompany(channel.companyId, 'whapi:status', {
              channelId: channel.id, status: 'connecting'
            });
            break;

          case 3: // QR Code needed
            this.logger.log(`📱 Canal ${channel.id} requiere código QR`);
            await this.channelsService.updateChannelStatus(channel.id, ChannelStatus.CONNECTING);
            this.whatsappGateway.emitToCompany(channel.companyId, 'whapi:status', {
              channelId: channel.id, status: 'qr_required'
            });
            {
              const channelToken = channel.connectionConfig?.whapiChannelToken;
              if (channelToken) await this.initiateQrSession(channel.id, channel.companyId, channelToken);
            }
            break;

          case 4: // Error (incluye degradaciones como SYNC_ERROR según texto)
            this.logger.log(`❌ Canal ${channel.id} en error`);
            await this.channelsService.updateChannelStatus(channel.id, ChannelStatus.ERROR);
            this.whatsappGateway.emitToCompany(channel.companyId, 'whapi:status', {
              channelId: channel.id, status: 'error'
            });
            // Si detectas 'SYNC_ERROR' en health.status.text, considera orquestar logout + reauth
            // (según guía oficial)
            // https://support.whapi.cloud/help-desk/troubleshooting/channel-status-sync_error
            break;

          default:
            this.logger.warn(`⚠️ Código de estado desconocido: ${statusCode} para canal ${channel.id}`);
            // Conservador: conectando
            await this.channelsService.updateChannelStatus(channel.id, ChannelStatus.CONNECTING);
            this.whatsappGateway.emitToCompany(channel.companyId, 'whapi:status', {
              channelId: channel.id, status: 'degraded', code: statusCode
            });
            break;
        }

      }
    }

    // Verificar si el webhook tiene datos del canal (estructura alternativa)
    if (webhookData.data && webhookData.data.status) {
      const channelStatus = webhookData.data.status;
      this.logger.log(`📋 Estado del canal desde data: ${channelStatus}`);

      // Si status es active, cambiar a active
      if (channelStatus === 'active') {
        const phone = webhookData?.data?.phoneNumber ?? webhookData?.user?.phone ?? channel.number;
        await this.channelsService.updateChannelStatus(channel.id, ChannelStatus.ACTIVE, phone); // <-- PASA phone
        this.whatsappGateway.emitToCompany(channel.companyId, 'whapi:status', {
          channelId: channel.id, status: 'connected', phoneNumber: phone
        });
      } else if (channelStatus === 'inactive') {
        // En vez de eliminar de inmediato, primero intenta reautorizar por QR
        await this.channelsService.updateChannelStatus(channel.id, ChannelStatus.CONNECTING);
        this.whatsappGateway.emitToCompany(channel.companyId, 'whapi:status', {
          channelId: channel.id, status: 'disconnected'
        });
        const channelToken = channel.connectionConfig?.whapiChannelToken;
        if (channelToken) await this.initiateQrSession(channel.id, channel.companyId, channelToken);
        // (Si tu política es borrar canales inactivos definitivos, conserva tu borrado como fallback)
      }

      try {
        // Eliminar canal completamente (forzar eliminación)
        await this.channelsService.remove(channel.id, true);
        this.logger.log(`🗑️ Canal ${channel.id} eliminado exitosamente tras desactivación`);
      } catch (error) {
        this.logger.error(`Error eliminando canal desactivado ${channel.id}:`, error.message);
      }
    }
  }


  /**
   * Inicia una sesión de WhatsApp obteniendo un código QR y emitiéndolo por WebSocket
   * @param channelId ID del canal
   * @param companyId ID de la compañía
   * @param channelToken Token de autenticación del canal
   */
  async initiateQrSession(channelId: string, companyId: string, channelToken: string): Promise<void> {
    this.logger.log(`[Strategy] Iniciando sesión QR para canal ${channelId}`);

    try {
      // Primero verificamos si el canal existe
      const channel = await this.channelRepository.findOne({
        where: { id: channelId },
        relations: ['company']
      });
      if (!channel) {
        throw new NotFoundException(`Canal ${channelId} no encontrado`);
      }

      // Configuración para el QR
      const qrParams: WhapiQrCodeParams = {
        wakeup: true,
        size: 300  // Tamaño adecuado para la mayoría de dispositivos
      };

      // Obtener código QR usando el token del canal
      const qrResponse = await this.whapiCloudService.getQrCode(channelToken, qrParams);

      if (qrResponse.status !== 'OK' || !qrResponse.base64) {
        throw new BadRequestException(`Error obteniendo QR: estado=${qrResponse.status}`);
      }

      // Emitir QR por WebSocket
      this.logger.log(`Emitiendo QR para compañía ${companyId}`);

      this.whatsappGateway.emitToCompany(
        companyId,
        'whapi:qr',
        {
          channelId,
          qr: qrResponse.base64,
          expires: qrResponse.expire
        }
      );

      //si channel status es error, cambiar a connecting
      if (channel.status === ChannelStatus.ERROR) {
        await this.channelsService.updateChannelStatus(channelId, ChannelStatus.CONNECTING);
      }

      // Programar verificación periódica de estado
      // this.scheduleStatusCheck(channelId, companyId, channelToken);

    } catch (error) {
      this.logger.error(`Error iniciando sesión QR: ${error.message}`);

      // Notificar error por WebSocket
      this.whatsappGateway.emitToCompany(
        companyId,
        'whapi:error',
        {
          channelId,
          error: error.message
        }
      );

      // Marcar canal como error
      await this.channelsService.updateChannelStatus(channelId, ChannelStatus.ERROR);

      throw error;
    }
  }

  /**
   * Desconecta un canal de WhatsApp Whapi.Cloud
   * @param channelId ID del canal a desconectar
   */
  async disconnect(channelId: string): Promise<void> {
    this.logger.log(`[Strategy] Solicitando desconexión para canal ${channelId}`);

    try {
      // Buscar el canal para obtener el token
      const channel = await this.channelRepository.findOne({
        where: { id: channelId }
      });

      if (!channel) {
        throw new NotFoundException(`Canal ${channelId} no encontrado`);
      }

      // Verificar que el canal sea de tipo WHAPI_CLOUD
      if (channel.type !== ChannelType.WHAPI_CLOUD) {
        throw new BadRequestException('El canal no es de tipo Whapi.Cloud');
      }

      // Obtener el token de la configuración del canal
      const channelToken = channel.connectionConfig?.whapiChannelToken;

      if (!channelToken) {
        throw new BadRequestException('El canal no tiene configurado un token válido');
      }

      // Llamar al servicio para desconectar la instancia
      await this.whapiCloudService.logout(channelToken);

      this.logger.log(`Canal ${channelId} desconectado exitosamente`);

      // Emitir evento de desconexión
      this.whatsappGateway.emitToCompany(
        channel.companyId,
        'whapi:status',
        {
          channelId,
          status: 'disconnected'
        }
      );

      // Actualizar estado del canal
      await this.channelsService.updateChannelStatus(channelId, ChannelStatus.INACTIVE);
    } catch (error) {
      this.logger.error(`Error desconectando canal ${channelId}: ${error.message}`);
      throw error;
    }
  }

  async getStatus(): Promise<ChannelStatus> {
    this.logger.log(`[Strategy] Obteniendo estado...`);
    // Por ahora, lanzamos error o devolvemos INACTIVE.
    throw new Error('Método getStatus no implementado o requiere contexto adicional');
    // return ChannelStatus.INACTIVE; // Alternativa temporal
  }

  /**
   * Limpia recursos del canal en Whapi.Cloud (elimina el canal en la API Partner)
   * @param channelId ID del canal a limpiar
   */
  async cleanup(channelId: string): Promise<void> {
    this.logger.log(`[Strategy] Limpiando recursos para canal ${channelId}`);

    try {
      // Buscar el canal para obtener el whapiChannelId
      const channel = await this.channelRepository.findOne({
        where: { id: channelId }
      });

      if (!channel) {
        throw new NotFoundException(`Canal ${channelId} no encontrado`);
      }

      // Verificar que el canal sea de tipo WHAPI_CLOUD
      if (channel.type !== ChannelType.WHAPI_CLOUD) {
        throw new BadRequestException('El canal no es de tipo Whapi.Cloud');
      }

      // Obtener whapiChannelId de la configuración del canal
      const whapiChannelId = channel.connectionConfig?.whapiChannelId;

      if (!whapiChannelId) {
        this.logger.warn(`El canal ${channelId} no tiene whapiChannelId para eliminar en la API Partner`);
        return;
      }

      // Llamar al servicio para eliminar el canal en Whapi.Cloud
      await this.whapiCloudService.deleteWhapiPartnerChannel(whapiChannelId);

      this.logger.log(`Recursos del canal ${channelId} (whapiChannelId: ${whapiChannelId}) eliminados exitosamente`);
    } catch (error) {
      this.logger.error(`Error limpiando recursos del canal ${channelId}: ${error.message}`);
      throw error;
    }
  }

  public async syncAdminState(channelOrId: Channel | string): Promise<void> {
    // 1) Cargar canal si solo te pasaron el id
    const channel: Channel =
      typeof channelOrId === 'string'
        ? await this.channelRepository.findOne({ where: { id: channelOrId } })
        : channelOrId;

    if (!channel) {
      this.logger.warn(`[syncAdminState] Canal no encontrado`);
      return;
    }
    if (channel.type !== ChannelType.WHAPI_CLOUD) {
      // Solo aplica a whapi_cloud
      return;
    }

    // 2) Resolver el whapiChannelId
    const whapiId =
      channel.connectionConfig?.whapiChannelId ??
      channel.metadata?.whapiChannelId;

    if (!whapiId) {
      this.logger.warn(
        `[syncAdminState] Canal ${channel.id} sin whapiChannelId en connectionConfig/metadata; omitiendo`,
      );
      return;
    }

    // 3) Buscar en Manager API (get by id -> fallback list)
    let admin: WhapiAdminChannel | null = null;
    try {
      admin = await this.whapiCloudService.getAdminChannelById(whapiId);
      if (!admin) {
        admin = await this.whapiCloudService.findAdminChannelInList(whapiId);
      }
    } catch (e: any) {
      this.logger.warn(
        `[syncAdminState] Error consultando Manager para ${whapiId}: ${e.message}`,
      );
      return;
    }

    if (!admin) {
      this.logger.warn(
        `[syncAdminState] No se encontró canal ${whapiId} en Manager`,
      );
      return;
    }

    // 4) Comparar y persistir cambios en metadata
    const prevMode = (channel.metadata?.mode as string) ?? 'unknown';
    const nextMode = admin.mode ?? prevMode;

    const prevTill = (channel.metadata?.activeTill as string | null) ?? null;
    const nextTill = admin.active_till ?? prevTill;

    if (prevMode === nextMode && prevTill === nextTill) {
      // Nada que actualizar
      return;
    }

    channel.metadata = {
      ...(channel.metadata || {}),
      mode: nextMode,
      activeTill: nextTill,
      // opcional: deja huella de la última sync
      __admin_synced_at: new Date().toISOString(),
    };

    await this.channelRepository.save(channel);
    this.logger.log(
      `[syncAdminState] Canal ${channel.id}: mode ${prevMode} -> ${nextMode}, activeTill ${prevTill} -> ${nextTill}`,
    );

    // (Opcional) Notificar a la UI por WebSocket
    this.whatsappGateway.emitToCompany(channel.companyId, 'channel:updated', {
      channelId: channel.id,
      metadata: { mode: nextMode, activeTill: nextTill },
    });
  }
} 