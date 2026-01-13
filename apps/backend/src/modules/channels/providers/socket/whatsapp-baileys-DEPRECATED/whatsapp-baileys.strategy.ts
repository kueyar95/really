import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel } from '../../../persistence/entities/channel.entity';
import { ISocketChannelStrategy } from '../../../core/interfaces/channel.interface';
import { ChannelStatus, ChannelType, MessageDirection } from '../../../core/types/channel.types';
import { WhatsAppBaileysService } from './whatsapp-baileys.service';
import { WhatsAppBaileysEvents } from './whatsapp-baileys.events';
import { MessageProcessorService } from '../../../core/services/message-processor.service';
import { IMessage } from '../../../core/interfaces/message.interface';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { WASocket } from '@whiskeysockets/baileys';
import { WAMessage } from '@whiskeysockets/baileys';
import { ChatHistory } from '@/modules/clients/entities/chat-history.entity';
import { Client } from '@/modules/clients/entities/client.entity';
import { SupabaseAuthService } from '../../../../../auth/supabase.service';

@Injectable()
export class WhatsAppBaileysStrategy implements ISocketChannelStrategy {
  private readonly logger = new Logger('WhatsAppBaileysStrategy');
  private readonly events: WhatsAppBaileysEvents;

  constructor(
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    @InjectRepository(ChatHistory)
    private readonly chatHistoryRepository: Repository<ChatHistory>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly whatsappBaileysService: WhatsAppBaileysService,
    private readonly messageProcessor: MessageProcessorService,
    private readonly supabaseService: SupabaseAuthService
  ) {
    this.events = new WhatsAppBaileysEvents(messageProcessor, supabaseService);
  }

  private getMessageType(message: any): string {
    if (message.message?.conversation) return 'text';
    if (message.message?.imageMessage) return 'image';
    if (message.message?.videoMessage) return 'video';
    if (message.message?.audioMessage) return 'audio';
    if (message.message?.documentMessage) return 'document';
    if (message.message?.stickerMessage) return 'sticker';
    return 'unknown';
  }

  private hasMedia(message: any): boolean {
    return !!(
      message.message?.imageMessage ||
      message.message?.videoMessage ||
      message.message?.audioMessage ||
      message.message?.documentMessage ||
      message.message?.stickerMessage
    );
  }

  private getMediaContent(message: any): any {
    if (message.message?.imageMessage) return message.message.imageMessage;
    if (message.message?.videoMessage) return message.message.videoMessage;
    if (message.message?.audioMessage) return message.message.audioMessage;
    if (message.message?.documentMessage) return message.message.documentMessage;
    if (message.message?.stickerMessage) return message.message.stickerMessage;
    return null;
  }

  private async processMediaContent(message: any): Promise<{ mediaUrl: string | null; mediaData: any }> {
    try {
      if (!this.hasMedia(message)) {
        return { mediaUrl: null, mediaData: null };
      }

      const mediaContent = this.getMediaContent(message);
      if (!mediaContent) {
        return { mediaUrl: null, mediaData: null };
      }

      let mediaUrl = mediaContent.url;

      // Si no hay URL directa, necesitamos descargar el contenido
      if (!mediaUrl) {
        try {
          const buffer = await downloadMediaMessage(message, 'buffer', {});
          // Convertir el buffer a base64 para enviar a través de WebSocket
          mediaUrl = `data:${mediaContent.mimetype};base64,${buffer.toString('base64')}`;
        } catch (error) {
          this.logger.error(`Error descargando contenido multimedia: ${error.message}`);
          return { mediaUrl: null, mediaData: null };
        }
      }

      const mediaData = {
        mimetype: mediaContent.mimetype,
        fileName: mediaContent.fileName || null,
        fileLength: mediaContent.fileLength || null,
        caption: mediaContent.caption || null
      };

      return { mediaUrl, mediaData };
    } catch (error) {
      this.logger.error(`Error procesando contenido multimedia: ${error.message}`);
      return { mediaUrl: null, mediaData: null };
    }
  }

  async connect(channelId: string): Promise<void> {
    try {
      const channel = await this.channelRepository.findOne({
        where: { id: channelId },
        relations: ['company']
      });

      if (!channel) {
        throw new Error('Canal no encontrado');
      }

      const socket = await this.whatsappBaileysService.initializeClient(channelId);

      if (!socket) {
        throw new Error('No se pudo inicializar el socket');
      }

      // Removemos la configuración de eventos aquí ya que ahora se maneja en el service
      this.logger.log(`Socket inicializado para canal ${channelId}`);
    } catch (error) {
      this.logger.error(`Error conectando WhatsApp Baileys para canal ${channelId}:`, error);
      throw error;
    }
  }

  async disconnect(channelId: string): Promise<void> {
    await this.whatsappBaileysService.disconnectClient(channelId);
  }

  async sendMessage(channelId: string, payload: {
    to: string,
    message: string,
    messageId?: string,
    metadata?: {
      timestamp: number,
      type: string,
      isBot?: boolean
    }
  }): Promise<any> {
    // Maximum retry attempts for sending message
    const MAX_SEND_RETRIES = 3;
    let retryCount = 0;
    let lastError = null;

    while (retryCount < MAX_SEND_RETRIES) {
      try {
        // Get socket client
        let socket = await this.whatsappBaileysService.getClient(channelId);
        
        // Check if socket exists and is connected
        if (!socket || !socket.user?.id) {
          this.logger.warn(`Cliente no inicializado o desconectado para canal ${channelId}, intentando reconectar...`);
          // Attempt to reconnect
          socket = await this.whatsappBaileysService.initializeClient(channelId);
          
          // If still not connected, throw error
          if (!socket || !socket.user?.id) {
            throw new Error('No se pudo establecer conexión con WhatsApp');
          }
        }

        const channel = await this.channelRepository.findOne({
          where: { id: channelId }
        });

        // Buscar o crear cliente
        let client = await this.clientRepository.findOne({
          where: { phone: payload.to }
        });

        if (!client) {
          client = await this.clientRepository.save({
            phone: payload.to,
            name: `WhatsApp ${payload.to}`,
            email: '',
            data: {}
          });
        }

        // Enviar mensaje
        const jid = `${payload.to}@s.whatsapp.net`;
        const result = await socket.sendMessage(jid, { text: payload.message });

        // Solo guardar si no es un mensaje del bot (ya que el bot lo guarda por su cuenta)
        if (!payload.metadata?.isBot) {
          await this.chatHistoryRepository.save({
            channelId,
            clientId: client.id,
            direction: 'outbound',
            message: payload.message,
            metadata: {
              messageId: payload.messageId || result.key.id,
              timestamp: payload.metadata?.timestamp || Date.now(),
              from: channel.number,
              to: payload.to,
              type: payload.metadata?.type || 'text',
              hasMedia: false,
              fromFrontend: true
            }
          });
        }

        return {
          ...result,
          messageId: payload.messageId || result.key.id
        };
        
      } catch (error) {
        lastError = error;
        retryCount++;
        
        if (retryCount < MAX_SEND_RETRIES) {
          // Log retry attempt
          this.logger.warn(`Reintento ${retryCount}/${MAX_SEND_RETRIES} al enviar mensaje a ${payload.to}: ${error.message}`);
          
          // Wait before retrying (exponential backoff: 1s, 2s, 4s...)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount - 1) * 1000));
        } else {
          // Log final failure
          this.logger.error(`Error enviando mensaje para canal ${channelId}:`, error);
          throw error;
        }
      }
    }
    
    // If all retries fail, throw the last error
    throw lastError;
  }

  private async sendMediaMessage(socket: WASocket, jid: string, payload: any): Promise<any> {
    if (payload.media.url) {
      return this.sendMediaMessageFromUrl(socket, jid, payload);
    } else if (payload.media.buffer) {
      return this.sendMediaMessageFromBuffer(socket, jid, payload);
    }
    throw new Error('No se proporcionó URL ni buffer para el mensaje multimedia');
  }

  private async sendMediaMessageFromUrl(socket: WASocket, jid: string, payload: any): Promise<any> {
    if (payload.media.mimetype?.startsWith('image/')) {
      return await socket.sendMessage(jid, {
        image: { url: payload.media.url },
        caption: payload.message
      });
    } else if (payload.media.mimetype?.startsWith('video/')) {
      return await socket.sendMessage(jid, {
        video: { url: payload.media.url },
        caption: payload.message
      });
    } else if (payload.media.mimetype?.startsWith('audio/')) {
      return await socket.sendMessage(jid, {
        audio: { url: payload.media.url },
        mimetype: payload.media.mimetype
      });
    } else {
      // Para cualquier otro tipo de archivo
      return await socket.sendMessage(jid, {
        document: { url: payload.media.url },
        mimetype: payload.media.mimetype,
        fileName: payload.media.fileName
      });
    }
  }

  private async sendMediaMessageFromBuffer(socket: WASocket, jid: string, payload: any): Promise<any> {
    if (payload.media.mimetype?.startsWith('image/')) {
      return await socket.sendMessage(jid, {
        image: payload.media.buffer,
        caption: payload.message
      });
    } else if (payload.media.mimetype?.startsWith('video/')) {
      return await socket.sendMessage(jid, {
        video: payload.media.buffer,
        caption: payload.message
      });
    } else if (payload.media.mimetype?.startsWith('audio/')) {
      return await socket.sendMessage(jid, {
        audio: payload.media.buffer,
        mimetype: payload.media.mimetype
      });
    } else {
      // Para cualquier otro tipo de archivo
      return await socket.sendMessage(jid, {
        document: payload.media.buffer,
        mimetype: payload.media.mimetype,
        fileName: payload.media.fileName
      });
    }
  }

  async getStatus(companyId: string): Promise<ChannelStatus> {
    const socket = await this.whatsappBaileysService.getClient(companyId);
    if (!socket) {
      return ChannelStatus.INACTIVE;
    }

    const channel = await this.channelRepository.findOne({
      where: {
        companyId,
        type: ChannelType.WHATSAPP_BAILEYS
      }
    });

    return channel?.status || ChannelStatus.INACTIVE;
  }

  async handleIncomingMessage(message: WAMessage, channel: Channel): Promise<void> {
    try {
      await this.events.handleIncomingMessage(message, channel);
    } catch (error) {
      this.logger.error(`Error procesando mensaje en strategy:`, error);
    }
  }
}