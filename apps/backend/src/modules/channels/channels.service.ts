import { Injectable, NotFoundException, BadRequestException, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository, LessThan, In, MoreThan } from 'typeorm';
import { Channel } from './persistence/entities/channel.entity';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { ConnectChannelDto } from './dto/connect-channel.dto';
import { ConnectWhatsappDto } from './dto/connect-whatsapp.dto';
import { WhatsAppCloudConfigDto } from './dto/whatsapp-cloud-config.dto';
import { Client } from '../clients/entities/client.entity';
import { ChatHistory } from '../clients/entities/chat-history.entity';
import { ChannelType, ChannelStatus } from './core/types/channel.types';
import { ChannelManagerService } from './core/services/channel-manager.service';
import { WhatsAppBaileysService } from './providers/socket/whatsapp-baileys-DEPRECATED/whatsapp-baileys.service';
import { WASocket } from '@whiskeysockets/baileys';
import { CreateWhapiChannelDto } from './dto/create-whapi-channel.dto';
import { WhapiCloudStrategy } from './providers/api/whapi-cloud/whapi-cloud.strategy';
import { WhapiCloudService } from './providers/api/whapi-cloud/whapi-cloud.service';
import { CompaniesService } from '../companies/companies.service';

export interface ConnectResult {
  channelId: string;
  status: 'active' | 'connecting' | 'awaiting_qr';
  requiresQr: boolean;
  method: 'none' | 'qr';
  phoneNumber?: string | null;
  qrCode?: string | null;
}

type UpsertWhatsAppCloudParams = {
  companyId: string;
  accessToken?: string | null;
  wabaId?: string | null;
  phoneNumberId?: string | null;
  phoneNumber?: string | null;
  businessName?: string | null;
  configId?: string | null;
  status?: ChannelStatus;
};

@Injectable()
export class ChannelsService {
  private readonly logger = new Logger(ChannelsService.name);

  constructor(
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(ChatHistory)
    private readonly chatHistoryRepository: Repository<ChatHistory>,
    private readonly channelManager: ChannelManagerService,
    private readonly whatsappBaileysService: WhatsAppBaileysService,
    private readonly whapiCloudService: WhapiCloudService,
    private readonly companiesService: CompaniesService
  ) { }

  // En channels.service.ts - Reemplaza el método upsertWhatsAppCloudChannel

  async upsertWhatsAppCloudChannel(params: UpsertWhatsAppCloudParams): Promise<Channel> {
    const {
      companyId,
      accessToken = null,
      wabaId = null,
      phoneNumberId = null,
      phoneNumber = null,
      businessName = null,
      configId = null,
      status = ChannelStatus.INACTIVE,
    } = params;

    // Buscar canal existente SOLO si coinciden TODOS los identificadores clave
    let channel: Channel | null = null;

    const normalizedNumber = (phoneNumber ?? '').replace(/[^0-9]/g, '');

    // Buscar solo si tenemos phoneNumberId Y coincide exactamente
    if (phoneNumberId) {
      channel = await this.channelRepository
        .createQueryBuilder('channel')
        .where('channel.type = :type', { type: ChannelType.WHATSAPP_CLOUD })
        .andWhere('channel.company_id = :companyId', { companyId })
        .andWhere(
          `(channel.connectionConfig ->> 'phoneNumberId') = :phoneNumberId`,
          { phoneNumberId }
        )
        .getOne();
    }

    const nextConnectionConfig = {
      ...(channel?.connectionConfig ?? {}),
      provider: 'whatsapp_cloud',
      accessToken: accessToken ?? channel?.connectionConfig?.accessToken ?? null,
      wabaId: wabaId ?? channel?.connectionConfig?.wabaId ?? null,
      phoneNumberId: phoneNumberId ?? channel?.connectionConfig?.phoneNumberId ?? null,
      configId: configId ?? channel?.connectionConfig?.configId ?? null,
    };

    const nextMetadata = {
      ...(channel?.metadata ?? {}),
      phoneNumber: phoneNumber ?? channel?.metadata?.phoneNumber ?? null,
      businessName: businessName ?? channel?.metadata?.businessName ?? null,
    };

    if (channel) {
      // Solo actualizar si es el MISMO canal (mismo phoneNumberId)
      channel.status = status;
      if (phoneNumber) channel.number = phoneNumber;
      channel.name = phoneNumber ? `WhatsApp Cloud (${phoneNumber})` : (channel.name ?? 'WhatsApp Cloud');
      channel.connectionConfig = nextConnectionConfig;
      channel.metadata = nextMetadata;
      return this.channelRepository.save(channel);
    }

    // IMPORTANTE: Siempre crear un nuevo canal si no encontramos uno con el mismo phoneNumberId exacto
    // Esto permite múltiples canales WhatsApp Cloud para la misma empresa
    channel = this.channelRepository.create({
      companyId,
      type: ChannelType.WHATSAPP_CLOUD,
      status,
      number: phoneNumber ?? null,
      name: phoneNumber
        ? `WhatsApp Cloud (${phoneNumber})`
        : `WhatsApp Cloud ${new Date().toISOString().substring(0, 19).replace('T', ' ')}`, // Agregar timestamp para diferenciar
      connectionConfig: nextConnectionConfig,
      metadata: nextMetadata,
    });

    return this.channelRepository.save(channel);
  }

  /**
 * Wrapper para mantener compatibilidad con el controlador de WhatsApp.
 * Crea o actualiza el canal de WhatsApp Cloud con los datos disponibles.
 */
  async createOrUpdateFromWhatsapp(params: {
    companyId: string;
    accessToken?: string | null;
    wabaId?: string | null;
    phoneNumberId?: string | null;
    phoneNumber?: string | null;
    businessName?: string | null;
    configId?: string | null;
    status?: ChannelStatus;
  }) {
    const status =
      params.status ??
      (params.phoneNumber ? ChannelStatus.ACTIVE : ChannelStatus.INACTIVE);

    return this.upsertWhatsAppCloudChannel({
      companyId: params.companyId,
      accessToken: params.accessToken ?? null,
      wabaId: params.wabaId ?? null,
      phoneNumberId: params.phoneNumberId ?? null,
      phoneNumber: params.phoneNumber ?? null,
      businessName: params.businessName ?? null,
      configId: params.configId ?? null,
      status,
    });
  }


  async create(createChannelDto: CreateChannelDto): Promise<Channel> {
    // Validar si ya existe un canal con el mismo número
    if (createChannelDto.number) {
      const existingChannel = await this.channelRepository.findOne({
        where: {
          companyId: createChannelDto.companyId,
          type: createChannelDto.type,
          number: createChannelDto.number
        }
      });

      if (existingChannel) {
        throw new BadRequestException('Ya existe un canal con este número para esta empresa');
      }
    }

    const channel = this.channelRepository.create({
      ...createChannelDto,
      status: createChannelDto.status || ChannelStatus.INACTIVE
    });
    return await this.channelRepository.save(channel);
  }

  async findAll(): Promise<Channel[]> {
    return await this.channelRepository.find({
      relations: ['company'],
      // NOTA: Se removieron 'funnelChannels' y 'chatHistories' para optimizar consultas
      // Estas relaciones pueden contener millones de registros y causaban 79M+ filas retornadas
      // Si se necesitan, usar métodos específicos como getChannelFunnelChannels()
    });
  }

  async findOne(id: string): Promise<Channel> {
    const channel = await this.channelRepository.findOne({
      where: { id },
      relations: ['company'],
      // NOTA: Se removieron 'funnelChannels' y 'chatHistories' para optimizar
      // Usar getChannelFunnelChannels() o getChannelChatStats() si se necesitan
    });

    if (!channel) {
      throw new NotFoundException(`Canal con ID ${id} no encontrado`);
    }

    return channel;
  }

  async update(id: string, updateChannelDto: UpdateChannelDto): Promise<Channel> {
    const channel = await this.findOne(id);
    Object.assign(channel, updateChannelDto);
    return await this.channelRepository.save(channel);
  }

  /**
   * Elimina un canal y realiza las tareas de limpieza necesarias
   * @param id ID del canal a eliminar
   * @param force Si es true, continúa con la eliminación aun si hay errores en los pasos previos
   */
  async remove(id: string, force: boolean = false): Promise<void> {
    try {
      const channel = await this.findOne(id);

      // 🔍 VERIFICAR ANTES DE ELIMINAR (solo para Whapi.Cloud)
      if (channel.type === ChannelType.WHAPI_CLOUD && channel.connectionConfig?.whapiChannelId && !force) {
        //this.logger.log(`🔍 Verificando si canal ${channel.connectionConfig.whapiChannelId} está realmente muerto antes de eliminar...`);

        try {
          const isStillValid = await this.whapiCloudService.checkChannelIsValid(
            channel.connectionConfig.whapiChannelId
          );

          if (isStillValid) {
            //this.logger.log(`⚠️ Canal ${id} aún está activo en Whapi - solo desconectando, NO eliminando`);

            // Solo desconectar, NO eliminar
            channel.status = ChannelStatus.INACTIVE;
            await this.channelRepository.save(channel);
            return;
          }

          //this.logger.log(`✅ Canal ${id} confirmado como muerto - procediendo con eliminación`);
        } catch (error) {
          this.logger.warn(`Error verificando canal ${id}, asumiendo que está muerto: ${error.message}`);
        }
      }

      // 1. Desconectar el cliente si está activo
      if (channel.status === ChannelStatus.ACTIVE || channel.status === ChannelStatus.CONNECTING) {
        try {
          //this.logger.log(`Desconectando canal ${id} antes de eliminar`);
          await this.channelManager.disconnectChannel(channel.id);
        } catch (error) {
          // Si el error contiene "404" o "not found", no es crítico
          const isNotFoundError = error.message.includes('404') ||
            error.message.toLowerCase().includes('not found') ||
            error.message.toLowerCase().includes('channel not found');

          if (isNotFoundError) {
            //this.logger.log(`Canal ${id} ya no existe en el proveedor - continuando con eliminación`);
          } else {
            this.logger.warn(`Error al desconectar canal ${id}: ${error.message}`);
            if (!force) throw error;
          }
        }
      }

      // 2. Limpiar recursos específicos según el tipo de canal
      try {
        if (channel.type === ChannelType.WHATSAPP_BAILEYS) {
          //this.logger.log(`Limpiando archivos locales de Baileys para canal ${id}`);
          await this.whatsappBaileysService.cleanupChannel(id);
        } else {
          // Intentar usar el método cleanup de la estrategia si está disponible
          const strategy = this.channelManager['apiStrategies']?.get(channel.type);

          if (strategy && typeof strategy.cleanup === 'function') {
            //this.logger.log(`Usando método cleanup de la estrategia para canal ${id}`);
            await strategy.cleanup(channel.id);
          } else if (channel.type === ChannelType.WHAPI_CLOUD && channel.connectionConfig?.whapiChannelId) {
            // Para compatibilidad con versiones donde cleanup no está implementado
            //this.logger.log(`Limpiando recursos de Whapi.Cloud manualmente para canal ${id}`);

            const whapiCloudStrategy = this.channelManager['apiStrategies'].get(ChannelType.WHAPI_CLOUD) as WhapiCloudStrategy;
            if (whapiCloudStrategy) {
              const whapiCloudService = whapiCloudStrategy['whapiCloudService'];
              await whapiCloudService.deleteWhapiPartnerChannel(channel.connectionConfig.whapiChannelId);
            }
          }
        }
      } catch (error) {
        // Si el error contiene "404" o "not found", no es crítico
        const isNotFoundError = error.message.includes('404') ||
          error.message.toLowerCase().includes('not found') ||
          error.message.toLowerCase().includes('channel not found');

        if (isNotFoundError) {
          //this.logger.log(`Recursos del canal ${id} ya no existen en el proveedor - continuando con eliminación`);
        } else {
          this.logger.warn(`Error limpiando recursos del canal ${id}: ${error.message}`);
          if (!force) throw error;
        }
      }

      // 3. Eliminar registros relacionados
      await this.cleanupRelatedRecords(channel);

      // 4. Eliminar el canal
      await this.channelRepository.remove(channel);

      //this.logger.log(`Canal ${id} eliminado completamente`);
    } catch (error) {
      this.logger.error(`Error eliminando canal ${id}: ${error.message}`);
      throw new Error(`Error al eliminar canal: ${error.message}`);
    }
  }

  private async cleanupRelatedRecords(channel: Channel): Promise<void> {
    try {
      // 1. Eliminar registros de client_stages que referencian a funnel_channels
      await this.channelRepository.manager.query(
        `DELETE FROM client_stages WHERE funnel_channel_id IN (
          SELECT id FROM funnel_channels WHERE channel_id = $1
        )`,
        [channel.id]
      );

      // 2. Eliminar registros de funnel_channels
      await this.channelRepository.manager.query(
        `DELETE FROM funnel_channels WHERE channel_id = $1`,
        [channel.id]
      );

      // 3. Eliminar historiales de chat
      await this.chatHistoryRepository.delete({ channelId: channel.id });

      //this.logger.log(`Registros relacionados limpiados para canal ${channel.id}`);
    } catch (error) {
      this.logger.error(`Error limpiando registros relacionados del canal ${channel.id}:`, error);
      throw error;
    }
  }

  async connectWhatsapp(connectWhatsappDto: ConnectWhatsappDto): Promise<Channel> {
    //this.logger.log(`[1] Iniciando conexión WhatsApp para compañía ${connectWhatsappDto.companyId}`);

    if (connectWhatsappDto.type !== ChannelType.WHATSAPP_WEB && connectWhatsappDto.type !== ChannelType.WHATSAPP_BAILEYS) {
      throw new BadRequestException('Tipo de conexión WhatsApp inválido');
    }

    // Crear un nuevo canal siempre en estado CONNECTING
    const channel = await this.create({
      name: `WhatsApp ${connectWhatsappDto.type === ChannelType.WHATSAPP_WEB ? 'Web' : 'Baileys'} ${new Date().toISOString()}`,
      companyId: connectWhatsappDto.companyId,
      type: connectWhatsappDto.type,
      status: ChannelStatus.CONNECTING
    });

    //this.logger.log(`[2] Canal creado con ID ${channel.id}`);

    try {
      await this.channelManager.connectChannel(channel.id, connectWhatsappDto.type);
      await this.updateChannelStatus(channel.id, ChannelStatus.ACTIVE);
      //this.logger.log(`[3] Conexión iniciada para canal ${channel.id}`);
      return channel;
    } catch (error) {
      this.logger.error(`[X] Error conectando canal ${channel.id}:`, error);
      await this.updateChannelStatus(channel.id, ChannelStatus.ERROR);
      throw error;
    }
  }

  async configureWhatsAppCloud(channelId: string, config: WhatsAppCloudConfigDto): Promise<void> {
    await this.channelManager.configureChannel(channelId, ChannelType.WHATSAPP_CLOUD, config);
  }

  async handleWhatsAppCloudMessage(phoneNumberId: string, message: any, contact: any): Promise<void> {
    const webhookData = {
      object: 'whatsapp_business_account',
      entry: [{
        changes: [{
          value: {
            metadata: {
              phone_number_id: phoneNumberId
            },
            messages: [message],
            contacts: contact ? [contact] : undefined
          },
          field: 'messages'
        }]
      }]
    };

    await this.channelManager.handleWebhook(ChannelType.WHATSAPP_CLOUD, webhookData);
  }

  async findChannelByWebhookToken(token: string): Promise<Channel | null> {
    const channel = await this.channelRepository
      .createQueryBuilder('channel')
      .where('channel.type = :type', { type: ChannelType.WHATSAPP_CLOUD })
      .andWhere(`channel."connectionConfig"->>'webhookVerifyToken' = :token`, { token })
      .getOne();

    if (!channel) {
      throw new NotFoundException(`Canal con token ${token} no encontrado`);
    }
    return channel;
  }

  /**
   * Handshake por ID: decide reconexión silenciosa o QR
   * Usado por POST /channels/:id/connect
   */
  async connectChannel(params: { channelId: string; companyId?: string | null }): Promise<ConnectResult> {
    const { channelId, companyId } = params;

    const channel = await this.channelRepository.findOne({
      where: companyId
        ? { id: channelId, companyId }
        : { id: channelId },
    });

    if (!channel) {
      throw new NotFoundException(`Canal ${channelId} no encontrado`);
    }

    const type = channel.type;

    if (type === ChannelType.WHAPI_CLOUD) {
      const whapiId = channel.connectionConfig?.whapiChannelId;
      const whapiToken = channel.connectionConfig?.whapiChannelToken;

      if (!whapiId || !whapiToken) {
        throw new BadRequestException('Canal Whapi sin credenciales configuradas');
      }

      // 1) Comprobar si está válido y autenticado en Whapi
      let isAuthenticated = false;
      try {
        isAuthenticated = await this.whapiCloudService.checkChannelIsValidAndAuthenticated(whapiId, whapiToken);
      } catch (e) {
        this.logger.warn(`checkChannelIsValidAndAuthenticated falló para ${whapiId}: ${e.message}`);
        isAuthenticated = false;
      }

      if (isAuthenticated) {
        // Reconexión silenciosa: intenta enriquecer número desde health si falta
        let phone: string | null = channel.number ?? null;
        try {
          const health = await this.whapiCloudService.getInstanceStatus(whapiToken);
          phone = health?.phone ?? phone ?? null;
        } catch (e) {
          this.logger.warn(`getInstanceStatus falló: ${e.message}`);
        }

        await this.updateChannelStatus(channel.id, ChannelStatus.ACTIVE, phone ?? undefined);

        return {
          channelId: channel.id,
          status: 'active',
          requiresQr: false,
          method: 'none',
          phoneNumber: phone ?? null,
          qrCode: null,
        };
      }

      // 2) No autenticado: marcar CONNECTING y disparar QR en background con tu flujo existente
      await this.updateChannelStatus(channel.id, ChannelStatus.CONNECTING);

      // Usa el companyId del canal si no viene en params
      const effectiveCompanyId = companyId ?? channel.companyId;
      this.initiateQrInBackground(channel.id, effectiveCompanyId, whapiToken);

      return {
        channelId: channel.id,
        status: 'awaiting_qr',
        requiresQr: true,
        method: 'qr',
        phoneNumber: channel.number ?? null,
        qrCode: null,
      };
    }

    if (type === ChannelType.WHATSAPP_CLOUD) {
      // WhatsApp Cloud API (Meta) no usa QR: valida config y activa
      const hasValidCreds = Boolean(channel.connectionConfig?.meta?.phoneNumberId);
      if (!hasValidCreds) {
        throw new BadRequestException('Credenciales de WhatsApp Cloud API inválidas o incompletas');
      }

      await this.updateChannelStatus(channel.id, ChannelStatus.ACTIVE, channel.number ?? undefined);

      return {
        channelId: channel.id,
        status: 'active',
        requiresQr: false,
        method: 'none',
        phoneNumber: channel.number ?? null,
        qrCode: null,
      };
    }

    throw new BadRequestException('Tipo de canal no soportado para connect');
  }

  async connect(connectChannelDto: ConnectChannelDto): Promise<Channel> {
    const channel = await this.findOne(connectChannelDto.channelId);

    if (!channel) {
      throw new NotFoundException(`Canal ${connectChannelDto.channelId} no encontrado`);
    }

    // Actualizar estado a connecting
    channel.status = ChannelStatus.CONNECTING;
    await this.channelRepository.save(channel);

    try {
      await this.channelManager.connectChannel(channel.id, channel.type);
      return channel;
    } catch (error) {
      channel.status = ChannelStatus.ERROR;
      await this.channelRepository.save(channel);
      throw new BadRequestException(`Error al conectar el canal: ${error.message}`);
    }
  }

  async disconnect(channelId: string): Promise<Channel> {
    const channel = await this.findOne(channelId);

    if (!channel) {
      throw new NotFoundException(`Canal ${channelId} no encontrado`);
    }

    return await this.channelManager.disconnectChannel(channelId);
  }

  async sendMessage(channelId: string, payload: any): Promise<any> {
    return await this.channelManager.sendMessage(channelId, payload);
  }

  async handleWebhook(channelType: ChannelType, data: any, identifier?: string): Promise<void> {
    await this.channelManager.handleWebhook(channelType, data, identifier);
  }

  async getChannelsStatus(companyId: string): Promise<Channel[]> {
    return await this.findByCompany(companyId);
  }

  async findByCompany(companyId: string): Promise<Channel[]> {
    const channels = await this.channelRepository.find({
      where: {
        companyId,
        status: In([ChannelStatus.ACTIVE, ChannelStatus.INACTIVE, ChannelStatus.CONNECTING]),
        /*number: Not(IsNull())*/
      },
      relations: ['company'],
      // NOTA CRÍTICA: Se removieron 'funnelChannels' y 'chatHistories'
      // Esta era la consulta más costosa (79M+ filas, 51 horas de CPU acumuladas)
      // Usar métodos específicos si se necesitan estas relaciones
      order: {
        createdAt: 'DESC'
      }
    });
    return channels;
  }

  async findChannelByCompanyAndType(companyId: string, type: ChannelType): Promise<Channel | null> {
    return await this.channelRepository.findOne({
      where: {
        companyId,
        type
      }
    });
  }

  async findByCompanyAndType(companyId: string, type: ChannelType): Promise<Channel[]> {
    //this.logger.log(`Buscando canales de tipo ${type} para la compañía ${companyId}`);

    return this.channelRepository.find({
      where: {
        companyId,
        type
      },
      order: {
        createdAt: 'DESC'
      }
    });
  }

  async getActiveChannelsByCompany(companyId: string): Promise<Channel[]> {
    return await this.channelRepository.find({
      where: {
        companyId,
        status: ChannelStatus.ACTIVE
      },
      order: {
        createdAt: 'DESC'
      }
    });
  }

  async updateChannelStatus(channelId: string, status: ChannelStatus, phoneNumber?: string): Promise<Channel> {
    const channel = await this.findOne(channelId);

    if (!channel) {
      throw new NotFoundException(`Canal ${channelId} no encontrado`);
    }

    channel.status = status;
    if (phoneNumber) {
      channel.number = phoneNumber;
      channel.name = `WhatsApp ${phoneNumber}`;
    }

    return await this.channelRepository.save(channel);
  }

  async getSocket(channelId: string): Promise<WASocket | null> {
    const channel = await this.channelRepository.findOne({
      where: {
        id: channelId,
        type: ChannelType.WHATSAPP_BAILEYS,
        status: ChannelStatus.ACTIVE
      }
    });

    if (!channel) {
      return null;
    }

    return this.whatsappBaileysService.getClient(channelId);
  }

  // Método para iniciar la conexión Whapi.Cloud
  async initiateWhapiCloudConnection(createWhapiChannelDto: CreateWhapiChannelDto): Promise<Channel> {
    //this.logger.log(`Iniciando conexión Whapi.Cloud para compañía ${createWhapiChannelDto.companyId}`);

    // 1. BUSCAR TODOS LOS CANALES WHAPI DE LA COMPAÑÍA
    const existingChannels = await this.channelRepository.find({
      where: {
        companyId: createWhapiChannelDto.companyId,
        type: ChannelType.WHAPI_CLOUD
      },
      order: {
        createdAt: 'DESC'
      }
    });

    // 2. VERIFICAR CADA CANAL EXISTENTE
    for (const existingChannel of existingChannels) {
      if (existingChannel.connectionConfig?.whapiChannelId && existingChannel.connectionConfig?.whapiChannelToken) {
        //this.logger.log(`🔍 Verificando canal existente ${existingChannel.id} (${existingChannel.connectionConfig.whapiChannelId})`);

        try {
          // Verificar si el canal está válido en Whapi
          const isChannelValid = await this.whapiCloudService.checkChannelIsValid(
            existingChannel.connectionConfig.whapiChannelId
          );

          if (isChannelValid) {
            // Verificar si está autenticado
            const isAuthenticated = await this.whapiCloudService.checkChannelIsValidAndAuthenticated(
              existingChannel.connectionConfig.whapiChannelId,
              existingChannel.connectionConfig.whapiChannelToken
            );

            if (isAuthenticated) {
              // Obtener el número actual conectado
              const instanceStatus = await this.whapiCloudService.getInstanceStatus(
                existingChannel.connectionConfig.whapiChannelToken
              );

              const currentPhone = instanceStatus.phone;

              // Si el canal ya tiene un número asignado y es diferente, NO reutilizar
              if (existingChannel.number && currentPhone && existingChannel.number !== currentPhone) {
                //this.logger.log(`⚠️ Canal ${existingChannel.id} tiene número ${existingChannel.number} pero ahora está conectado ${currentPhone} - NO reutilizar`);
                continue;
              }

              //this.logger.log(`♻️ Canal existente ${existingChannel.id} está activo Y autenticado - reutilizando`);

              existingChannel.status = ChannelStatus.ACTIVE;
              if (currentPhone) {
                existingChannel.number = currentPhone;
              }

              await this.channelRepository.save(existingChannel);
              return existingChannel;

            } else {
              // Canal no autenticado - puede ser reutilizado para reconexión
              //this.logger.log(`♻️ Canal existente ${existingChannel.id} válido pero NO autenticado`);

              // Si el canal tiene un número previo, lo mantenemos para reconexión
              if (existingChannel.number) {
                //this.logger.log(`📱 Canal tiene número previo: ${existingChannel.number} - esperando reconexión del mismo número`);
              }

              existingChannel.status = ChannelStatus.CONNECTING;
              await this.channelRepository.save(existingChannel);

              // Iniciar proceso QR
              this.initiateQrInBackground(
                existingChannel.id,
                createWhapiChannelDto.companyId,
                existingChannel.connectionConfig.whapiChannelToken
              );

              return existingChannel;
            }
          } else {
            //this.logger.log(`🗑️ Canal ${existingChannel.id} no válido en Whapi - marcando como ERROR`);
            existingChannel.status = ChannelStatus.ERROR;
            await this.channelRepository.save(existingChannel);
          }
        } catch (error) {
          this.logger.warn(`Error verificando canal ${existingChannel.id}: ${error.message}`);
        }
      }
    }

    // 3. CREAR NUEVO CANAL SOLO SI NO HAY NINGUNO REUTILIZABLE
    //this.logger.log('No se encontraron canales reutilizables, creando nuevo canal');

    try {
      const whapiCloudStrategy = this.channelManager['apiStrategies'].get(ChannelType.WHAPI_CLOUD) as WhapiCloudStrategy;
      if (!whapiCloudStrategy) {
        throw new BadRequestException('Estrategia Whapi.Cloud no disponible');
      }

      const whapiCloudService = whapiCloudStrategy['whapiCloudService'];

      // Crear canal en Whapi.Cloud
      const partnerChannel = await whapiCloudService.createWhapiPartnerChannel();
      //this.logger.log(`Canal Partner creado: ${partnerChannel.channelId}`);

      // Crear canal en nuestra BD
      const channelData: CreateChannelDto = {
        name: `WhatsApp Whapi ${new Date().toISOString().substring(0, 19).replace('T', ' ')}`,
        companyId: createWhapiChannelDto.companyId,
        type: ChannelType.WHAPI_CLOUD,
        status: ChannelStatus.CONNECTING,
        connectionConfig: {
          whapiChannelId: partnerChannel.channelId,
          whapiChannelToken: partnerChannel.token
        },
        metadata: {
          projectId: whapiCloudService.getDefaultProjectId(),
          activeTill: partnerChannel.activeTill,
          mode: partnerChannel.mode
        }
      };

      const newChannel = await this.create(channelData);

      // Iniciar proceso QR
      this.initiateQrInBackground(
        newChannel.id,
        createWhapiChannelDto.companyId,
        partnerChannel.token
      );

      return newChannel;

    } catch (error) {
      this.logger.error(`Error creando canal Whapi.Cloud: ${error.message}`);
      throw new BadRequestException(`Error al iniciar la conexión Whapi.Cloud: ${error.message}`);
    }
  }

  // Método helper privado para lanzar la tarea en segundo plano con manejo de errores
  private initiateQrInBackground(channelId: string, companyId: string, token: string): void {
    //this.logger.log(`[BG Task] Iniciando obtención de QR para canal ${channelId}`);
    this.channelManager.initiateWhapiQrSession(channelId, companyId, token)
      .then(() => {
        //this.logger.log(`[BG Task] Proceso initiateWhapiQrSession para ${channelId} completado (QR emitido o error manejado internamente).`);
      })
      .catch(async (error) => {
        // Este catch es por si initiateWhapiQrSession *en sí mismo* lanza un error inesperado
        // (los errores de getQrCode ya se manejan dentro y emiten por WS)
        this.logger.error(`[BG Task] Error INESPERADO al iniciar sesión QR para ${channelId}: ${error.message}`);
        try {
          // Intentar marcar el canal como ERROR si falla catastróficamente
          await this.updateChannelStatus(channelId, ChannelStatus.ERROR);
          // Emitir error por WS si es posible/necesario
          const channel = await this.channelRepository.findOne({ where: { id: channelId } });
          if (channel) {
            this.channelManager['whatsappGateway']?.emitToCompany(
              channel.companyId,
              'whapi:error',
              { channelId, error: `Error crítico iniciando sesión: ${error.message}` }
            );
          }
        } catch (updateError) {
          this.logger.error(`[BG Task] Falló al actualizar estado a ERROR para ${channelId} tras fallo de inicio: ${updateError.message}`);
        }
      });
  }

  /**
   * Extiende la validez de un canal Whapi.Cloud por un número de meses
   * @param id ID del canal
   * @param months Número de meses a extender
   * @returns El canal actualizado
   */
  async extendWhapiChannel(id: string, months: number): Promise<Channel> {
    //this.logger.log(`Extendiendo canal ${id} por ${months} meses`);

    // Obtener el canal existente
    const channel = await this.findOne(id);

    // Verificar que el canal es de tipo WHAPI_CLOUD
    if (channel.type !== ChannelType.WHAPI_CLOUD) {
      throw new BadRequestException('Solo se pueden extender canales de tipo Whapi.Cloud');
    }

    // Obtener el ID del canal en Whapi.Cloud
    const whapiChannelId = channel.connectionConfig?.whapiChannelId;
    if (!whapiChannelId) {
      throw new BadRequestException('El canal no tiene un ID de Whapi.Cloud configurado');
    }

    // Convertir meses a días (aproximadamente)
    const days = months * 30;

    // Extender el canal utilizando el servicio Whapi.Cloud
    const result = await this.whapiCloudService.extendWhapiChannel(whapiChannelId, days);

    // Actualizar el canal con la nueva fecha de actividad
    const newActiveTill = new Date(result.activeTill);

    // Actualizar los metadatos del canal
    const updatedMetadata = {
      ...channel.metadata,
      lastExtension: new Date().toISOString(),
      extensionMonths: months,
      activeTill: newActiveTill.toISOString()
    };

    // Guardar los cambios en el canal
    const updatedChannel = await this.channelRepository.save({
      ...channel,
      metadata: updatedMetadata
    });

    //this.logger.log(`Canal ${id} extendido exitosamente hasta ${newActiveTill.toISOString()}`);

    return updatedChannel;
  }

  /**
   * Sincroniza el estado de los canales Whapi.Cloud con su estado real en Whapi
   * @param companyId ID de la compañía (opcional, si no se proporciona se sincronizan todos)
   * @returns Número de canales actualizados
   */
  async syncWhapiChannelsStatus(companyId?: string): Promise<number> {
    //this.logger.log(`Sincronizando estado de canales Whapi.Cloud${companyId ? ` para compañía ${companyId}` : ' para todas las compañías'}`);

    const whereCondition: any = {
      type: ChannelType.WHAPI_CLOUD
    };

    if (companyId) {
      whereCondition.companyId = companyId;
    }

    // Buscar todos los canales Whapi.Cloud
    const whapiChannels = await this.channelRepository.find({
      where: whereCondition
    });

    let updatedCount = 0;

    for (const channel of whapiChannels) {
      if (channel.connectionConfig?.whapiChannelId && channel.connectionConfig?.whapiChannelToken) {
        try {
          //this.logger.log(`🔍 Sincronizando canal ${channel.id} (${channel.connectionConfig.whapiChannelId})`);

          const isAuthenticated = await this.whapiCloudService.checkChannelIsValidAndAuthenticated(
            channel.connectionConfig.whapiChannelId,
            channel.connectionConfig.whapiChannelToken
          );

          if (isAuthenticated && channel.status !== ChannelStatus.ACTIVE) {
            //this.logger.log(`✅ Actualizando canal ${channel.id} a ACTIVE (estaba en ${channel.status})`);
            channel.status = ChannelStatus.ACTIVE;
            await this.channelRepository.save(channel);
            updatedCount++;
          } else if (!isAuthenticated && channel.status === ChannelStatus.ACTIVE) {
            // Verificar si al menos está activo (sin autenticación)
            const isChannelValid = await this.whapiCloudService.checkChannelIsValid(
              channel.connectionConfig.whapiChannelId
            );

            if (isChannelValid) {
              //this.logger.log(`🔄 Actualizando canal ${channel.id} a CONNECTING (estaba en ACTIVE pero no autenticado)`);
              channel.status = ChannelStatus.CONNECTING;
              await this.channelRepository.save(channel);
              updatedCount++;
            } else {
              //this.logger.log(`❌ Actualizando canal ${channel.id} a ERROR (no está activo en Whapi)`);
              channel.status = ChannelStatus.ERROR;
              await this.channelRepository.save(channel);
              updatedCount++;
            }
          }
        } catch (error) {
          this.logger.error(`Error sincronizando canal ${channel.id}: ${error.message}`);
        }
      }
    }

    //this.logger.log(`Sincronización completada. ${updatedCount} canales actualizados.`);
    return updatedCount;
  }

  /**
   * Limpia los canales Whapi.Cloud pendientes antiguos
   * @param hoursThreshold Horas desde la creación para considerar un canal como antiguo (por defecto 24)
   * @returns Número de canales eliminados
   */
  async cleanupPendingWhapiChannels(hoursThreshold: number = 24): Promise<number> {
    //this.logger.log(`Limpiando canales Whapi.Cloud pendientes más antiguos que ${hoursThreshold} horas`);

    // Calcular la fecha límite
    const thresholdDate = new Date();
    thresholdDate.setHours(thresholdDate.getHours() - hoursThreshold);

    // Buscar canales pendientes antiguos
    const pendingChannels = await this.channelRepository.find({
      where: {
        type: ChannelType.WHAPI_CLOUD,
        status: ChannelStatus.CONNECTING,
        createdAt: LessThan(thresholdDate)
      }
    });

    //this.logger.log(`Encontrados ${pendingChannels.length} canales pendientes antiguos para eliminar`);

    let deletedCount = 0;

    // Eliminar cada canal pendiente
    for (const channel of pendingChannels) {
      try {
        // Solo eliminar recursos en Whapi.Cloud si hay un whapiChannelId
        if (channel.connectionConfig?.whapiChannelId) {
          // Obtener la estrategia de Whapi.Cloud para acceder al servicio
          const whapiCloudStrategy = this.channelManager['apiStrategies'].get(ChannelType.WHAPI_CLOUD) as WhapiCloudStrategy;

          if (whapiCloudStrategy) {
            const whapiCloudService = whapiCloudStrategy['whapiCloudService'];

            // Eliminar el canal en Whapi.Cloud
            await whapiCloudService.deleteWhapiPartnerChannel(channel.connectionConfig.whapiChannelId)
              .catch(error => {
                // Solo loggeamos el error, no interrumpimos el proceso
                this.logger.warn(`Error eliminando canal ${channel.connectionConfig.whapiChannelId} en Whapi.Cloud: ${error.message}`);
              });
          }
        }

        // Eliminar el canal de nuestra base de datos
        await this.channelRepository.remove(channel);
        deletedCount++;

        //this.logger.log(`Canal pendiente ${channel.id} eliminado exitosamente`);
      } catch (error) {
        this.logger.error(`Error eliminando canal pendiente ${channel.id}: ${error.message}`);
      }
    }

    //this.logger.log(`Se eliminaron ${deletedCount} canales pendientes antiguos`);
    return deletedCount;
  }

  async reconnectPhoneToChannel(phoneNumber: string, companyId: string): Promise<Channel | null> {
    //this.logger.log(`🔄 Intentando reconectar número ${phoneNumber} a su canal original`);

    // Buscar canal que tenía este número asignado
    const channelWithNumber = await this.channelRepository.findOne({
      where: {
        companyId,
        type: ChannelType.WHAPI_CLOUD,
        number: phoneNumber
      }
    });

    if (!channelWithNumber) {
      this.logger.warn(`No se encontró canal previo para el número ${phoneNumber}`);
      return null;
    }

    //this.logger.log(`✅ Encontrado canal ${channelWithNumber.id} para número ${phoneNumber}`);

    // Verificar que el canal siga siendo válido
    const isValid = await this.whapiCloudService.checkChannelIsValid(
      channelWithNumber.connectionConfig?.whapiChannelId
    );

    if (!isValid) {
      this.logger.error(`Canal ${channelWithNumber.id} ya no es válido en Whapi`);
      channelWithNumber.status = ChannelStatus.ERROR;
      await this.channelRepository.save(channelWithNumber);
      return null;
    }

    // Actualizar estado y retornar canal para reconexión
    channelWithNumber.status = ChannelStatus.CONNECTING;
    await this.channelRepository.save(channelWithNumber);

    // Iniciar proceso QR para reconexión
    this.initiateQrInBackground(
      channelWithNumber.id,
      companyId,
      channelWithNumber.connectionConfig.whapiChannelToken
    );

    return channelWithNumber;
  }

}
