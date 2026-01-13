import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientStage } from '../../clients/entities/client-stage.entity';
import { Stage } from '../../stages/entities/stage.entity';
import { WhatsAppGateway } from '../../channels/infrastructure/gateway/whatsapp.gateway';

@Injectable()
export class ClientStageManagerService {
  private readonly logger = new Logger(ClientStageManagerService.name);

  constructor(
    @InjectRepository(ClientStage)
    private readonly clientStageRepository: Repository<ClientStage>,
    @InjectRepository(Stage)
    private readonly stageRepository: Repository<Stage>,
    private readonly whatsappGateway: WhatsAppGateway
  ) {}

  async findOrCreateClientStage(
    funnelChannelId: string,
    funnelId: string,
    clientId: string,
    companyId: string
  ): Promise<{
    clientStage: ClientStage;
    isNew: boolean;
  }> {
    // 1. Buscar ClientStage existente
    let clientStage = await this.clientStageRepository.findOne({
      where: {
        funnelChannelId,
        clientId
      },
      relations: [
        'client',
        'stage',
        'stage.bot',
        'stage.bot.botFunctions',
        'stage.bot.botFunctions.function',
        'funnelChannel',
        'funnelChannel.funnel',
        'funnelChannel.funnel.company'
      ]
    });

    if (clientStage) {
      return { clientStage, isNew: false };
    }

    // 2. Si no existe, buscar stage inicial
    const initialStage = await this.stageRepository.findOne({
      where: { funnelId },
      order: { order: 'ASC' }
    });

    if (!initialStage) {
      throw new NotFoundException('No se encontró un stage inicial en el funnel');
    }

    // 3. Crear nuevo ClientStage
    clientStage = await this.clientStageRepository.save({
      funnelId,
      clientId,
      stageId: initialStage.id,
      funnelChannelId,
      status: 'ACTIVE',
      data: {}
    });

    // 4. Recargar con todas las relaciones
    clientStage = await this.reloadWithRelations(clientStage.id);

    // 5. Emitir evento de nuevo cliente
    this.whatsappGateway.emitToCompany(companyId, 'newClient', {
      stageId: clientStage.stageId,
      client: clientStage.client,
      funnelId,
      channelId: funnelChannelId
    });

    return { clientStage, isNew: true };
  }

  async reloadWithRelations(clientStageId: string): Promise<ClientStage> {
    const clientStage = await this.clientStageRepository.findOne({
      where: { id: clientStageId },
      relations: [
        'client',
        'stage',
        'stage.bot',
        'stage.bot.botFunctions',
        'stage.bot.botFunctions.function',
        'funnelChannel',
        'funnelChannel.funnel',
        'funnelChannel.funnel.company'
      ]
    });

    if (!clientStage) {
      throw new NotFoundException(`ClientStage con ID ${clientStageId} no encontrado`);
    }

    return clientStage;
  }

  async updateState(
    clientStage: ClientStage,
    updates: {
      lastMessage?: string;
      lastResponse?: string;
      data?: Record<string, any>;
    }
  ): Promise<ClientStage> {
    clientStage.lastInteraction = new Date();

    if (updates.data) {
      clientStage.data = {
        ...clientStage.data,
        ...updates.data
      };
    }

    if (updates.lastMessage) {
      clientStage.data.lastMessage = updates.lastMessage;
    }

    if (updates.lastResponse) {
      clientStage.data.lastResponse = updates.lastResponse;
    }

    return await this.clientStageRepository.save(clientStage);
  }
}