/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, NotFoundException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateFunnelDto } from '../dto/create-funnel.dto';
import { UpdateFunnelDto } from '../dto/update-funnel.dto';
import { Funnel } from '../entities/funnel.entity';
import { FunnelChannel } from '../entities/funnel-channel.entity';
import { Channel } from '../../channels/persistence/entities/channel.entity';
import { BotMessageProcessorService } from './bot-message-processor.service';
import { ClientStageManagerService } from './client-stage-manager.service';
import { Stage } from '@/modules/stages/entities/stage.entity';
import { ClientStage } from '../../clients/entities/client-stage.entity';

@Injectable()
export class FunnelsService {
  private readonly logger = new Logger(FunnelsService.name);

  constructor(
    @InjectRepository(Funnel)
    private readonly funnelRepository: Repository<Funnel>,
    @InjectRepository(FunnelChannel)
    private readonly funnelChannelRepository: Repository<FunnelChannel>,
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    @InjectRepository(Stage)
    private readonly stageRepository: Repository<Stage>,
    @InjectRepository(ClientStage)
    private readonly clientStageRepository: Repository<ClientStage>,
    private readonly botMessageProcessor: BotMessageProcessorService,
    private readonly clientStageManager: ClientStageManagerService
  ) {}

  async create(createFunnelDto: CreateFunnelDto): Promise<Funnel> {
    const { channelIds, ...funnelData } = createFunnelDto;

    // Verificar que todos los canales existan
    const channels = await this.channelRepository.find({
      where: { id: In(channelIds) }
    });
    if (channels.length !== channelIds.length) {
      throw new NotFoundException('Uno o más canales no fueron encontrados');
    }

    // Crear el funnel
    const funnel = this.funnelRepository.create(funnelData);
    await this.funnelRepository.save(funnel);

    // Para cada canal, desactivar otros FunnelChannels activos antes de crear el nuevo
    for (const channelId of channelIds) {
      await this.funnelChannelRepository.update(
        { channelId, isActive: true },
        { isActive: false }
      );
    }

    // Crear las relaciones con los canales
    const funnelChannels = channelIds.map(channelId =>
      this.funnelChannelRepository.create({
        funnelId: funnel.id,
        channelId,
        isActive: true
      })
    );
    await this.funnelChannelRepository.save(funnelChannels);

    // Retornar el funnel con sus canales
    return this.findOne(funnel.id);
  }

  async findAll(): Promise<Funnel[]> {
    const funnels = await this.funnelRepository.find({
      relations: ['company', 'funnelChannels', 'funnelChannels.channel', 'stages'],
      order: {
        createdAt: 'DESC',
      },
    });

    // Mapear los canales para cada funnel
    return funnels.map(funnel => ({
      ...funnel,
      channels: funnel.funnelChannels.map(fc => fc.channel)
    }));
  }

  async findOne(id: string): Promise<Funnel> {
    const funnel = await this.funnelRepository.findOne({
      where: { id },
      relations: ['company', 'funnelChannels', 'funnelChannels.channel', 'stages'],
    });

    if (!funnel) {
      throw new NotFoundException(`Funnel with ID ${id} not found`);
    }

    // Mapear los canales
    return {
      ...funnel,
      channels: funnel.funnelChannels.map(fc => fc.channel)
    };
  }

  async update(id: string, updateFunnelDto: UpdateFunnelDto): Promise<Funnel> {
    const funnel = await this.findOne(id);
    const { channelIds, ...funnelData } = updateFunnelDto;

    // Actualizar datos básicos del funnel
    Object.assign(funnel, funnelData);
    await this.funnelRepository.save(funnel);

    // Si se proporcionaron channelIds, actualizar las relaciones
    if (channelIds) {
      // Obtener los FunnelChannels actuales
      const currentFunnelChannels = await this.funnelChannelRepository.find({
        where: { funnelId: id }
      });

      // Identificar los FunnelChannels que se van a eliminar
      const funnelChannelsToRemove = currentFunnelChannels.filter(
        fc => !channelIds.includes(fc.channelId)
      );

      // Primero eliminar los ClientStages asociados a los FunnelChannels que se van a eliminar
      if (funnelChannelsToRemove.length > 0) {
        const funnelChannelIds = funnelChannelsToRemove.map(fc => fc.id);
        //this.logger.log(`🗑️ Eliminando ClientStages asociados a FunnelChannels: ${funnelChannelIds.join(', ')}`);
        
        // Buscar y eliminar todos los ClientStages asociados a los FunnelChannels que se van a eliminar
        await this.clientStageRepository.delete({
          funnelChannelId: In(funnelChannelIds)
        });

        // Ahora sí eliminar los FunnelChannels
        await this.funnelChannelRepository.remove(funnelChannelsToRemove);
      }

      // Crear nuevos FunnelChannels para los canales nuevos
      const existingChannelIds = currentFunnelChannels.map(fc => fc.channelId);
      const newChannelIds = channelIds.filter(
        channelId => !existingChannelIds.includes(channelId)
      );

      if (newChannelIds.length > 0) {
        // Para cada nuevo canal, desactivar otros FunnelChannels activos
        for (const channelId of newChannelIds) {
          await this.funnelChannelRepository.update(
            { channelId, isActive: true },
            { isActive: false }
          );
        }

        const newFunnelChannels = newChannelIds.map(channelId =>
          this.funnelChannelRepository.create({
            funnelId: id,
            channelId,
            isActive: true
          })
        );
        await this.funnelChannelRepository.save(newFunnelChannels);
      }
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const funnel = await this.findOne(id);
    //this.logger.log(`🗑️ Iniciando eliminación del funnel ${id}`);

    // Primero, obtenemos todos los IDs de stages asociados a este funnel
    if (funnel.stages?.length > 0) {
      const stageIds = funnel.stages.map(stage => stage.id);
      //this.logger.log(`🗑️ Eliminando ClientStages asociados a ${stageIds.length} stages del funnel ${id}`);
      
      // Primero eliminamos todos los client_stages asociados a estas stages
      await this.clientStageRepository.delete({
        stageId: In(stageIds)
      });

      // Ahora podemos eliminar las stages con seguridad
      //this.logger.log(`🗑️ Eliminando ${stageIds.length} stages del funnel ${id}`);
      await this.stageRepository.delete({ funnelId: id });
    }

    // Obtenemos los IDs de los FunnelChannels para eliminar los ClientStages asociados
    if (funnel.funnelChannels?.length > 0) {
      const funnelChannelIds = funnel.funnelChannels.map(fc => fc.id);
      
      // Eliminamos los ClientStages asociados a los FunnelChannels
      //this.logger.log(`🗑️ Eliminando ClientStages asociados a ${funnelChannelIds.length} FunnelChannels del funnel ${id}`);
      await this.clientStageRepository.delete({
        funnelChannelId: In(funnelChannelIds)
      });

      // Luego eliminamos los funnelChannels
      //this.logger.log(`🗑️ Eliminando ${funnelChannelIds.length} FunnelChannels del funnel ${id}`);
      await this.funnelChannelRepository.delete({ funnelId: id });
    }

    // Finalmente eliminamos el funnel
    //this.logger.log(`🗑️ Eliminando el funnel ${id}`);
    await this.funnelRepository.remove(funnel);
    //this.logger.log(`✅ Funnel ${id} eliminado completamente`);
  }

  async findByCompany(companyId: string): Promise<Funnel[]> {
    const funnels = await this.funnelRepository.find({
      where: { companyId },
      relations: ['funnelChannels', 'funnelChannels.channel', 'stages'],
      order: {
        createdAt: 'DESC',
      },
    });

    return funnels.map(funnel => ({
      ...funnel,
      channels: funnel.funnelChannels.map(fc => fc.channel)
    }));
  }

  async findByChannel(channelId: string): Promise<Funnel[]> {
    const funnelChannels = await this.funnelChannelRepository.find({
      where: { channelId },
      relations: ['funnel', 'funnel.stages', 'funnel.funnelChannels', 'funnel.funnelChannels.channel'],
    });

    return funnelChannels.map(fc => ({
      ...fc.funnel,
      channels: fc.funnel.funnelChannels.map(fch => fch.channel)
    }));
  }

  async getFunnelsWithChannelsStatus(companyId: string): Promise<any> {
    const funnels = await this.funnelRepository.find({
      where: { companyId },
      relations: [
        'funnelChannels',
        'funnelChannels.channel',
        'funnelChannels.channel.company',
        // 'funnelChannels.channel.chatHistories',
        // 'funnelChannels.channel.funnelChannels'
      ],
      order: {
        createdAt: 'DESC',
      },
    });

    return funnels.map(funnel => ({
      id: funnel.id,
      name: funnel.name,
      description: funnel.description,
      isActive: funnel.isActive,
      channels: funnel.funnelChannels.map(fc => ({
        ...fc.channel,
        funnelChannelId: fc.id,
        isActive: fc.isActive,
        createdAt: fc.channel.createdAt,
        updatedAt: fc.channel.updatedAt,
        chatHistories: fc.channel.chatHistories,
        funnelChannels: fc.channel.funnelChannels
      }))
    }));
  }

  async processIncomingMessage(data: {
    funnelChannelId: string;
    clientId: string;
    message: string;
    chatHistory: { role: string; content: string }[];
    channelNumber: string;
  }): Promise<void> {
    const { funnelChannelId, clientId, message, chatHistory, channelNumber } = data;
    this.logger.debug(`🎯 [Funnel] === INICIO PROCESAMIENTO EN FUNNEL ===`);
    this.logger.debug(`🎯 [Funnel] FunnelChannelId: ${funnelChannelId}, Cliente: ${clientId}`);
    this.logger.debug(`🎯 [Funnel] Mensaje: "${message}"`);
    this.logger.debug(`🎯 [Funnel] Canal: ${channelNumber}, Historial: ${chatHistory.length} mensajes`);

    try {
      // 1. Obtener el funnel
      this.logger.debug(`🎯 [Funnel] Buscando funnelChannel (ID: ${funnelChannelId})...`);
      const funnelChannel = await this.funnelChannelRepository.findOne({
        where: { id: funnelChannelId },
        relations: ['funnel', 'funnel.stages', 'funnel.stages.bot', 'funnel.company']
      });

      if (!funnelChannel) {
        this.logger.error(`❌ [Funnel] FunnelChannel ${funnelChannelId} no encontrado`);
        throw new Error(`FunnelChannel ${funnelChannelId} no encontrado`);
      }

      this.logger.debug(`✅ [Funnel] FunnelChannel encontrado: "${funnelChannel.funnel.name}" (ID: ${funnelChannel.id})`);

      // 2. Obtener o crear el ClientStage
      this.logger.debug(`👤 [Funnel] Buscando/creando ClientStage para cliente ${clientId}...`);
      const { clientStage, isNew } = await this.clientStageManager.findOrCreateClientStage(
        funnelChannel.id,
        funnelChannel.funnel.id,
        clientId,
        funnelChannel.funnel.companyId
      );

      this.logger.debug(`👤 [Funnel] ClientStage ${isNew ? 'creado' : 'encontrado'}: ${clientStage.id}, Stage: ${clientStage.stageId}`);

      // 2.1 Si el cliente ya está asignado a un usuario, NO responder con bot
      if (clientStage.assignedUserId) {
        this.logger.debug(`🙋 [Funnel] Chat asignado a user=${clientStage.assignedUserId}. Se omite respuesta del bot.`);
        return;
      }

      // 3. Verificar si hay bot configurado
      if (!clientStage.stage) {
        this.logger.warn(`⚠️ [Funnel] ClientStage ${clientStage.id} no tiene stage asociado (stageId: ${clientStage.stageId})`);
        return;
      }

      this.logger.debug(`📋 [Funnel] Stage encontrado: ID=${clientStage.stage.id}, Nombre="${clientStage.stage.name}", botId=${clientStage.stage.botId || 'null'}`);

      if (!clientStage.stage.bot) {
        this.logger.warn(`⚠️ [Funnel] Stage "${clientStage.stage.name}" (ID: ${clientStage.stageId}) no tiene bot configurado`);
        this.logger.warn(`⚠️ [Funnel] botId en stage: ${clientStage.stage.botId || 'null'}, relación bot cargada: ${!!clientStage.stage.bot}`);
        
        // Mostrar información sobre stages disponibles en el funnel
        if (funnelChannel.funnel?.stages) {
          const stagesWithBot = funnelChannel.funnel.stages.filter(s => s.botId);
          const stagesWithoutBot = funnelChannel.funnel.stages.filter(s => !s.botId);
          this.logger.debug(`📊 [Funnel] Stages en funnel "${funnelChannel.funnel.name}": ${funnelChannel.funnel.stages.length} total`);
          this.logger.debug(`📊 [Funnel] Stages con bot: ${stagesWithBot.length} (${stagesWithBot.map(s => `${s.name}(${s.id})`).join(', ')})`);
          this.logger.debug(`📊 [Funnel] Stages sin bot: ${stagesWithoutBot.length} (${stagesWithoutBot.map(s => `${s.name}(${s.id})`).join(', ')})`);
        }
        
        return;
      }

      this.logger.debug(`✅ [Funnel] Bot encontrado: ID=${clientStage.stage.bot.id}, Nombre="${clientStage.stage.bot.name || 'N/A'}"`);

      // 4. Procesar el mensaje con el bot
      this.logger.debug(`📨 [Funnel] Procesando mensaje con bot...`);
      this.logger.debug(`📜 [Funnel] Historial (últimos 3): ${JSON.stringify(chatHistory.slice(-3), null, 2)}`);
      
      await this.botMessageProcessor.processMessage({
        message,
        chatHistory,
        clientStage,
        channelNumber
      });

      this.logger.debug(`✅ [Funnel] Mensaje procesado exitosamente por el bot`);
    } catch (error) {
      this.logger.error(`❌ [Funnel] Error procesando mensaje en funnel ${funnelChannelId}: ${error.message}`);
      this.logger.error(`❌ [Funnel] Stack: ${error.stack}`);
      throw error;
    }
    this.logger.debug(`🎯 [Funnel] === FIN PROCESAMIENTO EN FUNNEL ===`);
  }
}
