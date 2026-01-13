import { Logger } from '@nestjs/common';
import { WAMessage } from '@whiskeysockets/baileys';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { Channel } from '../../../persistence/entities/channel.entity';
import { MessageProcessorService } from '../../../core/services/message-processor.service';
import { IMessage } from '../../../core/interfaces/message.interface';
import { MessageDirection } from '../../../core/types/channel.types';
import { Injectable } from '@nestjs/common';
import { SupabaseAuthService } from '../../../../../auth/supabase.service';

@Injectable()
export class WhatsAppBaileysEvents {
  private readonly logger = new Logger('WhatsAppBaileysEvents');
  private readonly BUCKET_NAME = 'whatsapp-files';

  constructor(
    private readonly messageProcessor: MessageProcessorService,
    private readonly supabaseService: SupabaseAuthService
  ) {}

  async handleIncomingMessage(message: WAMessage, channel: Channel): Promise<void> {
    try {
      // Ignorar mensajes de estado y grupos
      if (message.key?.remoteJid?.includes('@g.us') ||
          message.message?.protocolMessage ||
          message.message?.senderKeyDistributionMessage) {
        return;
      }

      const messageContent = message.message?.conversation ||
                           message.message?.extendedTextMessage?.text ||
                           message.message?.imageMessage?.caption ||
                           '';

      const senderNumber = message.key.remoteJid?.split('@')[0] || '';
      
      // Obtener el nombre del remitente (pushName)
      const senderName = message.pushName || `WhatsApp ${senderNumber}`;

      // Procesar contenido multimedia si existe
      let mediaUrl = null;
      let mediaData = null;

      if (this.hasMedia(message)) {
        try {
          const mediaContent = this.getMediaContent(message);
          if (mediaContent) {
            // Descargar el contenido multimedia
            const buffer = await downloadMediaMessage(message, 'buffer', {});
            
            // Generar nombre de archivo único
            const fileName = `${channel.id}/${Date.now()}-${message.key.id}.${this.getExtensionFromMime(mediaContent.mimetype)}`;
            
            // Subir a Supabase Storage
            mediaUrl = await this.supabaseService.uploadFile(
              `${process.env.SUPABASE_BUCKET_NAME}/whatsapp-files`,
              fileName,
              buffer,
              mediaContent.mimetype
            );

            mediaData = {
              mimetype: mediaContent.mimetype,
              fileName: mediaContent.fileName || fileName.split('/').pop(),
              fileLength: mediaContent.fileLength || buffer.length,
              caption: mediaContent.caption || null
            };

            this.logger.debug(`Archivo multimedia subido a Supabase: ${mediaUrl}`);
          }
        } catch (error) {
          this.logger.error(`Error procesando contenido multimedia: ${error.message}`);
        }
      }

      const processedMessage: IMessage = {
        message: messageContent,
        direction: message.key.fromMe ? MessageDirection.OUTBOUND : MessageDirection.INBOUND,
        channelId: channel.id,
        clientId: '0',
        metadata: {
          messageId: message.key.id || '',
          timestamp: (message.messageTimestamp as number) * 1000,
          from: senderNumber,
          type: this.getMessageType(message),
          hasMedia: this.hasMedia(message),
          mediaUrl: mediaUrl,
          mediaData: mediaData
        }
      };

      this.logger.debug(`Procesando mensaje para canal ${channel.id}: ${JSON.stringify(processedMessage)}`);

      await this.messageProcessor.processIncomingMessage(channel, processedMessage, {
        name: senderName
      });
    } catch (error) {
      this.logger.error(`Error procesando mensaje en eventos: ${error.message}`);
      throw error;
    }
  }

  private getMessageType(message: WAMessage): string {
    if (message.message?.conversation) return 'text';
    if (message.message?.imageMessage) return 'image';
    if (message.message?.videoMessage) return 'video';
    if (message.message?.audioMessage) return 'audio';
    if (message.message?.documentMessage) return 'document';
    if (message.message?.stickerMessage) return 'sticker';
    return 'unknown';
  }

  private hasMedia(message: WAMessage): boolean {
    return !!(
      message.message?.imageMessage ||
      message.message?.videoMessage ||
      message.message?.audioMessage ||
      message.message?.documentMessage ||
      message.message?.stickerMessage
    );
  }

  private getMediaContent(message: WAMessage): any {
    if (message.message?.imageMessage) return message.message.imageMessage;
    if (message.message?.videoMessage) return message.message.videoMessage;
    if (message.message?.audioMessage) return message.message.audioMessage;
    if (message.message?.documentMessage) return message.message.documentMessage;
    if (message.message?.stickerMessage) return message.message.stickerMessage;
    return null;
  }

  private getExtensionFromMime(mimetype: string): string {
    const mimeToExt: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'video/mp4': 'mp4',
      'audio/ogg': 'ogg',
      'audio/mp4': 'm4a',
      'application/pdf': 'pdf'
    };
    return mimeToExt[mimetype] || 'bin';
  }
}