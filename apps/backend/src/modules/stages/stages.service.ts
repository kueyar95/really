import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { Stage } from './entities/stage.entity';
import { ClientStage } from '../clients/entities/client-stage.entity';

@Injectable()
export class StagesService {
  constructor(
    @InjectRepository(Stage)
    private readonly stageRepository: Repository<Stage>,
    @InjectRepository(ClientStage)
    private readonly clientStageRepository: Repository<ClientStage>,
  ) {}

  async create(createStageDto: CreateStageDto): Promise<Stage> {
    const stage = this.stageRepository.create(createStageDto);
    return await this.stageRepository.save(stage);
  }

  async findAll(): Promise<Stage[]> {
    return await this.stageRepository.find({
      relations: ['funnel', 'bot', 'clientStages'],
      order: {
        funnelId: 'ASC',
        order: 'ASC',
      },
    });
  }

  async findOne(id: string): Promise<Stage> {
    const stage = await this.stageRepository.findOne({
      where: { id },
      relations: ['funnel', 'bot', 'clientStages'],
    });

    if (!stage) {
      throw new NotFoundException(`Stage with ID ${id} not found`);
    }

    return stage;
  }

  async update(id: string, updateStageDto: UpdateStageDto): Promise<Stage> {
    const stage = await this.stageRepository.findOne({
      where: { id }
    });

    if (!stage) {
      throw new NotFoundException(`Stage with ID ${id} not found`);
    }

    Object.assign(stage, updateStageDto);
    return await this.stageRepository.save(stage);
  }

  async remove(id: string): Promise<void> {
    const stage = await this.findOne(id);
    await this.stageRepository.remove(stage);
  }

  async updateNotificationEmails(id: string, notificationEmails: string[]): Promise<Stage> {
    const stage = await this.findOne(id);
    stage.notificationEmails = notificationEmails ?? [];
    return await this.stageRepository.save(stage);
  }

  async findByFunnel(funnelId: string): Promise<any[]> {
    const stages = await this.stageRepository.find({
      where: { funnelId },
      relations: ['clientStages'],
      order: {
        order: 'ASC',
      }
    });

    return stages.map(stage => ({
      id: stage.id,
      name: stage.name,
      description: stage.description,
      order: stage.order,
      status: stage.status,
      botId: stage.botId,
      funnelId: stage.funnelId,
      clientCount: stage.clientStages?.length || 0,
      createdAt: stage.createdAt,
      notificationEmails: stage.notificationEmails || [],
    }));
  }

  async reorderStages(funnelId: string, stageIds: number[]): Promise<void> {
    const queryRunner = this.stageRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (let i = 0; i < stageIds.length; i++) {
        await queryRunner.manager.update(Stage, stageIds[i], { order: i + 1 });
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findClientsForStage(stageId: string) {
    const stage = await this.stageRepository.findOne({
      where: { id: stageId },
      relations: ['clientStages']
    });

    if (!stage) {
      throw new NotFoundException(`Stage with ID ${stageId} not found`);
    }

    const clientStages = await this.clientStageRepository.find({
      where: { stageId },
      relations: ['client', 'assignedUser', 'funnelChannel', 'funnelChannel.channel']
    });

    return clientStages.map(cs => ({
      ...cs.client,
      assignedUser: cs.assignedUser,
      assignedAt: cs.createdAt,
      funnelChannel: cs.funnelChannel,
    }));
  }

  async findByCompany(companyId: string): Promise<Stage[]> {
    return await this.stageRepository
      .createQueryBuilder('stage')
      .innerJoin('stage.funnel', 'funnel')
      .where('funnel.companyId = :companyId', { companyId })
      .leftJoinAndSelect('stage.funnel', 'funnelData')
      .orderBy('stage.order', 'ASC')
      .getMany();
  }
}
