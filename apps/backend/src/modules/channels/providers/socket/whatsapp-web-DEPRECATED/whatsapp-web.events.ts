import { Logger } from '@nestjs/common';
import { Message } from 'whatsapp-web.js';
import { Channel } from '../../../persistence/entities/channel.entity';
import { MessageProcessorService } from '../../../core/services/message-processor.service';
import { IMessage } from '../../../core/interfaces/message.interface';
import { MessageDirection } from '../../../core/types/channel.types';

export class WhatsAppWebEvents {
  private readonly logger = new Logger('WhatsAppWebEvents');

  constructor(
    private readonly messageProcessor: MessageProcessorService
  ) {}

  async handleIncomingMessage(message: Message, channel: Channel): Promise<void> {
    //this.logger.log('=== INICIO PROCESAMIENTO DE MENSAJE ===');
    //this.logger.log(`Mensaje recibido: ${JSON.stringify({
    //  id: message.id.id,
    //  from: message.from,
    //  to: message.to,
    //  body: message.body,
    //  timestamp: message.timestamp
    //}, null, 2)}`);

    try {
      // Ignorar mensajes de grupos
      if (message.from.includes('@g.us')) {
        this.logger.log('❌ Mensaje de grupo ignorado');
        return;
      }

      // Obtener información del contacto
      //this.logger.log('👤 Obteniendo información del contacto...');
      const contact = await message.getContact();
      const contactName = contact.pushname || contact.name || contact.shortName;

      // Crear objeto de mensaje
      const messageData: IMessage = {
        channelId: channel.id,
        clientId: '0', // Se actualizará en el procesador
        direction: MessageDirection.INBOUND,
        message: message.body,
        metadata: {
          messageId: message.id.id,
          timestamp: message.timestamp,
          type: message.type,
          from: message.from.split('@')[0],
          hasMedia: message.hasMedia
        }
      };

      // Procesar el mensaje
      await this.messageProcessor.processIncomingMessage(
        channel,
        messageData,
        { name: contactName }
      );

      this.logger.log('✅ Mensaje procesado exitosamente');
    } catch (error) {
      this.logger.error(`❌ Error procesando mensaje: ${error.message}`);
      throw error;
    }
    this.logger.log('=== FIN PROCESAMIENTO DE MENSAJE ===\n');
  }
}
