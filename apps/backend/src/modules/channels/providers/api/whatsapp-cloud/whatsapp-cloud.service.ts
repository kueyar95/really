// whatsapp-cloud.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Channel } from '../../../persistence/entities/channel.entity';
import { WhatsAppCloudConfig, WhatsAppCloudMessagePayload } from './whatsapp-cloud.types';
import { IMessagePayload } from '../../../core/interfaces/message.interface';
import { ChannelType } from '../../../core/types/channel.types';

@Injectable()
export class WhatsAppCloudService {
  private readonly logger = new Logger('WhatsAppCloudService');
  private readonly API_VERSION = 'v23.0'; // Usar versión más reciente
  private readonly BASE_URL = 'https://graph.facebook.com';

  constructor(
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
  ) {}

  private async getChannelConfigById(channelId: string): Promise<WhatsAppCloudConfig> {
    const channel = await this.channelRepository.findOne({ where: { id: channelId, type: ChannelType.WHATSAPP_CLOUD as any } });
    if (!channel || !channel.connectionConfig) {
      throw new Error('Configuración de WhatsApp Cloud no encontrada para el canal');
    }
    return channel.connectionConfig as WhatsAppCloudConfig;
  }

  async verifyConnection(config: WhatsAppCloudConfig): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.BASE_URL}/${this.API_VERSION}/${config.phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${config.accessToken}`
          },
          params: {
            fields: 'display_phone_number,verified_name'
          }
        }
      );

      //this.logger.log(`WhatsApp Cloud verificado: ${response.data.display_phone_number}`);
      
      // Actualizar el número en la configuración si lo obtenemos
      if (response.data.display_phone_number) {
        config.displayPhoneNumber = response.data.display_phone_number;
      }

      return !!response.data;
    } catch (error) {
      this.logger.error(`Error verificando conexión: ${error.message}`);
      if (error.response) {
        this.logger.error(`Respuesta de error: ${JSON.stringify(error.response.data)}`);
      }
      return false;
    }
  }

  async sendMessageByChannel(channelId: string, payload: IMessagePayload): Promise<any> {
    try {
      const config = await this.getChannelConfigById(channelId);
      
      // Formatear el número de teléfono (quitar caracteres especiales)
      const formattedNumber = payload.to
        .replace(/\D/g, '') // Quitar todo lo que no sea dígito
        .replace(/^0+/, ''); // Quitar ceros iniciales

      // Asegurarse de que tenga código de país
      const phoneNumber = formattedNumber.startsWith('56') 
        ? formattedNumber 
        : `56${formattedNumber}`; // Agregar código de Chile si no lo tiene

      const messagePayload: WhatsAppCloudMessagePayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: 'text',
        text: {
          preview_url: false,
          body: payload.message
        }
      };

      //this.logger.log(`Enviando mensaje a ${phoneNumber}: ${payload.message.substring(0, 50)}...`);

      const response = await axios.post(
        `${this.BASE_URL}/${this.API_VERSION}/${config.phoneNumberId}/messages`,
        messagePayload,
        {
          headers: {
            'Authorization': `Bearer ${config.accessToken.trim()}`,
            'Content-Type': 'application/json'
          }
        }
      );

      //this.logger.log(`Mensaje enviado exitosamente: ${response.data.messages[0].id}`);

      return {
        messageId: response.data.messages[0].id,
        timestamp: Date.now(),
        status: 'sent',
        to: phoneNumber
      };
    } catch (error) {
      this.logger.error(`Error enviando mensaje: ${error.message}`);
      if (error.response) {
        this.logger.error(`Respuesta de error: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async getMediaUrl(mediaId: string, config: WhatsAppCloudConfig): Promise<string> {
    try {
      //this.logger.log(`Obteniendo URL para media ID: ${mediaId}`);

      const response = await axios.get(
        `${this.BASE_URL}/${this.API_VERSION}/${mediaId}`,
        {
          headers: {
            'Authorization': `Bearer ${config.accessToken.trim()}`,
          },
        }
      );

      if (response.data.url) {
        //this.logger.log(`URL de media obtenida: ${response.data.url}`);
        return response.data.url;
      } else {
        throw new Error('La respuesta de la API de WhatsApp no contiene una URL.');
      }
    } catch (error) {
      this.logger.error(`Error obteniendo URL de media: ${error.message}`);
      if (error.response) {
        this.logger.error(`Respuesta de error de WhatsApp: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`No se pudo obtener la URL del medio: ${error.message}`);
    }
  }

  // Método para obtener el número de teléfono del canal
  async getPhoneNumber(phoneNumberId: string, accessToken: string): Promise<string> {
    try {
      const response = await axios.get(
        `${this.BASE_URL}/${this.API_VERSION}/${phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          params: {
            fields: 'display_phone_number'
          }
        }
      );
      
      return response.data.display_phone_number;
    } catch (error) {
      this.logger.error(`Error obteniendo número de teléfono: ${error.message}`);
      return '';
    }
  }
}