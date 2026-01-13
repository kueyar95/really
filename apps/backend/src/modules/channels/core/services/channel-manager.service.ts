import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel } from '../../persistence/entities/channel.entity';
import { ChannelType, ChannelStatus } from '../types/channel.types';
import { IAPIChannelStrategy, ISocketChannelStrategy } from '../interfaces/channel.interface';
import { WhatsAppWebStrategy } from '../../providers/socket/whatsapp-web-DEPRECATED/whatsapp-web.strategy';
import { WhatsAppCloudStrategy } from '../../providers/api/whatsapp-cloud/whatsapp-cloud.strategy';
import { WhatsAppBaileysStrategy } from '../../providers/socket/whatsapp-baileys-DEPRECATED/whatsapp-baileys.strategy';
import { WhapiCloudStrategy } from '../../providers/api/whapi-cloud/whapi-cloud.strategy';
import { WhapiCloudService } from '../../providers/api/whapi-cloud/whapi-cloud.service';

@Injectable()
export class ChannelManagerService {
  private readonly logger = new Logger('ChannelManagerService');
  private readonly apiStrategies: Map<ChannelType, IAPIChannelStrategy>;
  private readonly socketStrategies: Map<ChannelType, ISocketChannelStrategy>;

  constructor(
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    private readonly whatsappWebStrategy: WhatsAppWebStrategy,
    private readonly whatsappCloudStrategy: WhatsAppCloudStrategy,
    private readonly whatsappBaileysStrategy: WhatsAppBaileysStrategy,
    private readonly whapiCloudStrategy: WhapiCloudStrategy,
    private readonly whapiCloudService: WhapiCloudService,
  ) {
    this.apiStrategies = new Map<ChannelType, IAPIChannelStrategy>([
      [ChannelType.WHATSAPP_CLOUD, this.whatsappCloudStrategy],
      [ChannelType.WHAPI_CLOUD, this.whapiCloudStrategy],
    ]);

    this.socketStrategies = new Map<ChannelType, ISocketChannelStrategy>([
      [ChannelType.WHATSAPP_WEB, this.whatsappWebStrategy],
      [ChannelType.WHATSAPP_BAILEYS, this.whatsappBaileysStrategy],
    ]);
  }

  private getAPIStrategy(channelType: ChannelType): IAPIChannelStrategy {
    const strategy = this.apiStrategies.get(channelType);
    if (!strategy) {
      throw new BadRequestException(`No se encontró estrategia API para el tipo de canal: ${channelType}`);
    }
    return strategy;
  }

  private getSocketStrategy(channelType: ChannelType): ISocketChannelStrategy {
    const strategy = this.socketStrategies.get(channelType);
    if (!strategy) {
      throw new BadRequestException(`No se encontró estrategia Socket para el tipo de canal: ${channelType}`);
    }
    return strategy;
  }

  private isAPIChannel(channelType: ChannelType): boolean {
    return channelType === ChannelType.WHATSAPP_CLOUD || channelType === ChannelType.WHAPI_CLOUD;
  }

  private async findChannel(id: string): Promise<Channel> {
    const channel = await this.channelRepository.findOne({
      where: { id },
      relations: ['company'],
    });

    if (!channel) {
      throw new NotFoundException(`Canal con ID ${id} no encontrado`);
    }

    return channel;
  }

  // Gestión de conexiones y estrategias
  // apps/backend/src/modules/channels/channels.service.ts
  // Reemplaza COMPLETO el método connectChannel(...) por este

async connectChannel(channelId: string, type: ChannelType): Promise<Channel> {
  const channel = await this.findChannel(channelId);
  if (!channel) {
    throw new NotFoundException(`Canal ${channelId} no encontrado`);
  }

  try {
    // Evitar reconexiones innecesarias
    if (channel.status === ChannelStatus.ACTIVE) {
      throw new BadRequestException('El canal ya está activo');
    }

    // —— Rama especial: WhatsApp Cloud API (Meta) — NO usa QR
    if (type === ChannelType.WHATSAPP_CLOUD) {
      const cfg = channel.connectionConfig || {};
      const hasValidCreds = Boolean(cfg.phoneNumberId && cfg.accessToken);
      if (!hasValidCreds) {
        throw new BadRequestException('Credenciales de WhatsApp Cloud API inválidas o incompletas');
      }

      // (Opcional) Health-check con la estrategia API (e.g., GET /{PHONE_NUMBER_ID}, webhooks, etc.)
      try {
        const apiStrategy = this.getAPIStrategy(type);
        if (apiStrategy?.configure) {
          await apiStrategy.configure(cfg);
        }
      } catch (e: any) {
        this.logger?.warn?.(`Health-check WhatsApp Cloud falló: ${e.message}`);
      }

      // Activar directamente (sin QR). Si falta el número en el canal, usa el de config/metadata
      const phone =
        channel.number ??
        cfg.phoneNumber ??
        channel.metadata?.phoneNumber ??
        null;

      channel.status = ChannelStatus.ACTIVE;
      if (phone) {
        channel.number = phone;
        channel.name = `WhatsApp ${phone}`;
      }

      return await this.channelRepository.save(channel);
    }

    // —— Resto de tipos (Whapi.Cloud, Baileys, etc.)
    // Flujo normal: marcar CONNECTING y delegar a la estrategia adecuada
    channel.status = ChannelStatus.CONNECTING;
    await this.channelRepository.save(channel);

    if (this.isAPIChannel(type)) {
      const strategy = this.getAPIStrategy(type);
      await strategy.configure(channel.connectionConfig);
    } else {
      const strategy = this.getSocketStrategy(type);
      await strategy.connect(channelId);
    }

    return channel;
  } catch (error: any) {
    channel.status = ChannelStatus.ERROR;
    await this.channelRepository.save(channel);
    throw new BadRequestException(`Error al conectar el canal: ${error.message}`);
  }
}



  async disconnectChannel(channelId: string): Promise<Channel> {
    const channel = await this.findChannel(channelId);

    try {
      // Desconectar según el tipo de canal
      if (this.isAPIChannel(channel.type)) {
        // Para canales API, llamar al método disconnect de la estrategia
        const strategy = this.getAPIStrategy(channel.type);
        await strategy.disconnect(channelId);
      } else {
        // Para canales Socket, comportamiento existente
        const strategy = this.getSocketStrategy(channel.type);
        await strategy.disconnect(channelId);
      }

      // Actualizar estado a inactivo
      channel.status = ChannelStatus.INACTIVE;
      return await this.channelRepository.save(channel);
    } catch (error) {
      this.logger.error(`Error al desconectar el canal ${channelId}: ${error.message}`);

      // Incluso en caso de error, intentamos marcar el canal como inactivo
      try {
        channel.status = ChannelStatus.INACTIVE;
        return await this.channelRepository.save(channel);
      } catch (saveError) {
        this.logger.error(`Error al guardar estado inactivo: ${saveError.message}`);
        throw new BadRequestException(`Error al desconectar el canal: ${error.message}`);
      }
    }
  }

  async sendMessage(channelId: string, payload: any): Promise<any> {
    //this.logger.log(`Enviando mensaje a través del canal ${channelId}`);

    const channel = await this.findChannel(channelId);

    // Para canales Whapi.Cloud, verificar si realmente está autenticado antes de enviar
    if (channel.type === ChannelType.WHAPI_CLOUD && channel.status !== ChannelStatus.ACTIVE) {
      const whapiStrategy = this.apiStrategies.get(ChannelType.WHAPI_CLOUD) as WhapiCloudStrategy;
      if (whapiStrategy) {
        try {
          // Verificar si el canal está realmente autenticado en Whapi
          const isAuthenticated = await this.whapiCloudService.checkChannelIsValidAndAuthenticated(
            channel.connectionConfig?.whapiChannelId,
            channel.connectionConfig?.whapiChannelToken
          );

          if (isAuthenticated) {
            //this.logger.log(`Canal ${channelId} está autenticado en Whapi, actualizando estado a ACTIVE`);
            channel.status = ChannelStatus.ACTIVE;
            await this.channelRepository.save(channel);
          } else {
            throw new BadRequestException('El canal no está autenticado en WhatsApp');
          }
        } catch (error) {
          this.logger.error(`Error verificando autenticación del canal ${channelId}: ${error.message}`);
          throw new BadRequestException('El canal no está activo o autenticado');
        }
      }
    } else if (channel.status !== ChannelStatus.ACTIVE) {
      throw new BadRequestException('El canal no está activo');
    }

    try {
      if (this.isAPIChannel(channel.type)) {
        // Para canales API, incluir el channelId en el payload
        const apiPayload = {
          ...payload,
          channelId // Añadir el channelId al payload
        };

        const strategy = this.getAPIStrategy(channel.type);
        return await strategy.sendMessage(apiPayload);
      } else {
        const strategy = this.getSocketStrategy(channel.type);
        return await strategy.sendMessage(channelId, payload);
      }
    } catch (error) {
      this.logger.error(`Error al enviar mensaje por canal ${channelId}: ${error.message}`);
      throw new BadRequestException(`Error al enviar mensaje: ${error.message}`);
    }
  }

  async handleWebhook(channelType: ChannelType, data: any, identifier?: string): Promise<void> {
    try {
      if (this.isAPIChannel(channelType)) {
        const strategy = this.getAPIStrategy(channelType);
        await strategy.handleWebhook(data, identifier);
      } else {
        throw new BadRequestException('Los webhooks solo están soportados para canales API');
      }
    } catch (error) {
      throw new BadRequestException(`Error al procesar webhook: ${error.message}`);
    }
  }

  async configureChannel(channelId: string, type: ChannelType, config: any): Promise<Channel> {
    const channel = await this.findChannel(channelId);

    channel.type = type;
    channel.connectionConfig = config;
    channel.status = ChannelStatus.INACTIVE;

    if (this.isAPIChannel(type)) {
      const strategy = this.getAPIStrategy(type);
      await strategy.configure(config);
    }

    return await this.channelRepository.save(channel);
  }

  // Consultas básicas necesarias para la gestión
  async getChannelsByCompany(companyId: string): Promise<Channel[]> {
    return await this.channelRepository.find({
      where: { companyId },
      relations: ['company'],
      order: {
        createdAt: 'DESC'
      }
    });
  }

  // Método público para iniciar la sesión QR de Whapi.Cloud
  async initiateWhapiQrSession(channelId: string, companyId: string, channelToken: string): Promise<void> {
    const channel = await this.findChannel(channelId);

    if (channel.type !== ChannelType.WHAPI_CLOUD) {
      throw new BadRequestException(`El canal ${channelId} no es de tipo Whapi.Cloud`);
    }

    // Obtener la estrategia de Whapi.Cloud
    const whapiStrategy = this.apiStrategies.get(ChannelType.WHAPI_CLOUD) as WhapiCloudStrategy;

    if (!whapiStrategy) {
      throw new BadRequestException('Estrategia Whapi.Cloud no encontrada');
    }

    // Llamar al método initiateQrSession de la estrategia
    return whapiStrategy.initiateQrSession(channelId, companyId, channelToken);
  }
}