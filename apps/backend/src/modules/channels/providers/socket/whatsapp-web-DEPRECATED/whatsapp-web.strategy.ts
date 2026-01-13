import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel } from '../../../persistence/entities/channel.entity';
import { ISocketChannelStrategy } from '../../../core/interfaces/channel.interface';
import { ChannelStatus, ChannelType } from '../../../core/types/channel.types';
import { WhatsAppWebService } from './whatsapp-web.service';
import { WhatsAppWebEvents } from './whatsapp-web.events';
import { MessageProcessorService } from '../../../core/services/message-processor.service';

@Injectable()
export class WhatsAppWebStrategy implements ISocketChannelStrategy {
  private readonly logger = new Logger('WhatsAppWebStrategy');
  private readonly events: WhatsAppWebEvents;

  constructor(
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    private readonly whatsappWebService: WhatsAppWebService,
    private readonly messageProcessor: MessageProcessorService,
  ) {
    this.events = new WhatsAppWebEvents(messageProcessor);
  }

  async connect(companyId: string): Promise<void> {
    try {
      const client = await this.whatsappWebService.initializeClient(companyId);

      // Configurar el manejador de mensajes
      client.on('message', async (message) => {
        try {
          const channel = await this.channelRepository.findOne({
            where: {
              companyId,
              type: ChannelType.WHATSAPP_WEB,
              status: ChannelStatus.ACTIVE
            },
            relations: ['company', 'funnelChannels', 'funnelChannels.funnel']
          });

          if (channel) {
            await this.events.handleIncomingMessage(message, channel);
          }
        } catch (error) {
          this.logger.error(`Error procesando mensaje: ${error.message}`);
        }
      });
    } catch (error) {
      this.logger.error(`Error conectando WhatsApp Web para compañía ${companyId}:`, error);
      throw error;
    }
  }

  async disconnect(companyId: string): Promise<void> {
    await this.whatsappWebService.disconnectClient(companyId);
  }

  async sendMessage(companyId: string, payload: any): Promise<any> {
    const client = await this.whatsappWebService.getClient(companyId);
    if (!client) {
      throw new Error('Cliente de WhatsApp Web no conectado');
    }

    try {
      const { to, message } = payload;
      const formattedNumber = to.includes('@c.us') ? to : `${to}@c.us`;

      const response = await client.sendMessage(formattedNumber, message);
      return {
        messageId: response.id.id,
        timestamp: response.timestamp,
        status: 'sent'
      };
    } catch (error) {
      this.logger.error(`Error enviando mensaje: ${error.message}`);
      throw error;
    }
  }

  async getStatus(companyId: string): Promise<ChannelStatus> {
    const client = await this.whatsappWebService.getClient(companyId);
    if (!client) {
      return ChannelStatus.INACTIVE;
    }

    const channel = await this.channelRepository.findOne({
      where: {
        companyId,
        type: ChannelType.WHATSAPP_WEB
      }
    });

    return channel?.status || ChannelStatus.INACTIVE;
  }
}
