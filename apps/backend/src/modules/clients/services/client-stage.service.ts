import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientStage } from '../entities/client-stage.entity';
import { CreateClientStageDto } from '../dtos/client-stage.dto';

type FindByClientAndFunnelOpts = {
  /** Si true, idealmente debería crear el ClientStage si no existe.
   *  Nota: crear requiere repos de Stage/FunnelChannel; este servicio no los tiene inyectados aquí,
   *  así que de momento solo habilitamos la firma para evitar TS2554 y dejamos el TODO.
   */
  ensure?: boolean;
  /** Si lo pasas, priorizamos el ClientStage cuyo funnelChannel.channelId === channelId */
  channelId?: string;
};

@Injectable()
export class ClientStageService {
  constructor(
    @InjectRepository(ClientStage)
    private readonly clientStageRepository: Repository<ClientStage>,
  ) {}

  async create(createClientStageDto: CreateClientStageDto): Promise<ClientStage> {
    const clientStage = this.clientStageRepository.create(createClientStageDto);
    return await this.clientStageRepository.save(clientStage);
  }

  async findByClientId(clientId: string): Promise<ClientStage[]> {
    return await this.clientStageRepository.find({
      where: { clientId },
      relations: [
        'stage',
        'assignedUser',
        'funnelChannel',
        'funnelChannel.funnel',
        'funnelChannel.channel',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  /** Asigna usuario a un ClientStage por su ID (UUID string) */
  async assignUser(id: string, assignedUserId: string): Promise<ClientStage> {
    const existing = await this.clientStageRepository.findOne({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('ClientStage no encontrado');
    }

    await this.clientStageRepository.update({ id }, { assignedUserId });

    return await this.clientStageRepository.findOne({
      where: { id },
      relations: [
        'stage',
        'assignedUser',
        'funnelChannel',
        'funnelChannel.funnel',
        'funnelChannel.channel',
      ],
    });
  }

  /** Quita la asignación de usuario del ClientStage por su ID (UUID string) */
  async removeAssignedUserFromStage(id: string): Promise<ClientStage> {
    const existing = await this.clientStageRepository.findOne({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('ClientStage no encontrado');
    }

    await this.clientStageRepository.update({ id }, { assignedUserId: null });

    return await this.clientStageRepository.findOne({
      where: { id },
      relations: [
        'stage',
        'assignedUser',
        'funnelChannel',
        'funnelChannel.funnel',
        'funnelChannel.channel',
      ],
    });
  }

  /**
   * Cambia la etapa del último ClientStage activo del cliente.
   * stageId puede venir como number o string (según tu esquema), no lo casteamos a int.
   * Si se proporciona channelId, busca el ClientStage específico de ese canal.
   */
  async changeStage(clientId: string, stageId: string | number, channelId?: string): Promise<ClientStage> {
    console.log(`🔄 [changeStage] clientId=${clientId}, stageId=${stageId}, channelId=${channelId}`);
    
    // Buscar todos los ClientStages activos del cliente
    const clientStages = await this.clientStageRepository.find({
      where: { clientId, status: 'ACTIVE' as any },
      order: { createdAt: 'DESC' },
      relations: ['funnelChannel', 'funnelChannel.channel'],
    });

    console.log(`📊 [changeStage] Encontrados ${clientStages.length} ClientStages activos para cliente ${clientId}`);
    
    if (clientStages.length > 0) {
      console.log('📋 [changeStage] ClientStages encontrados:', clientStages.map(cs => ({
        id: cs.id,
        funnelChannelId: cs.funnelChannelId,
        channelId: cs.funnelChannel?.channel?.id,
        stageId: cs.stageId
      })));
    }

    if (!clientStages.length) {
      throw new NotFoundException('No se encontró un ClientStage existente para este cliente');
    }

    // Si se proporciona channelId, filtrar por ese canal
    let existingClientStage: any;
    if (channelId) {
      existingClientStage = clientStages.find(
        cs => cs.funnelChannel?.channel?.id === channelId
      );
      
      if (!existingClientStage) {
        console.error(`❌ [changeStage] No se encontró ClientStage para channelId=${channelId}`);
        console.error(`❌ [changeStage] Canales disponibles:`, clientStages.map(cs => cs.funnelChannel?.channel?.id));
        throw new NotFoundException(`No se encontró un ClientStage activo para el cliente en el canal ${channelId}`);
      }
      
      console.log(`✅ [changeStage] ClientStage encontrado para canal ${channelId}: id=${existingClientStage.id}`);
    } else {
      // Si no se proporciona channelId, usar el más reciente
      existingClientStage = clientStages[0];
      console.log(`✅ [changeStage] Usando ClientStage más reciente: id=${existingClientStage.id}`);
    }

    await this.clientStageRepository.update(existingClientStage.id, { stageId: stageId as any });
    console.log(`✅ [changeStage] Stage actualizado a ${stageId} para ClientStage ${existingClientStage.id}`);

    return await this.clientStageRepository.findOne({
      where: { id: existingClientStage.id },
      relations: [
        'stage',
        'assignedUser',
        'funnelChannel',
        'funnelChannel.funnel',
        'funnelChannel.channel',
      ],
    });
  }

  /**
   * Busca el ClientStage ACTIVO del cliente dentro de un funnel específico.
   * - Soporta un 3er parámetro opcional (opts) para evitar TS2554.
   * - Si pasas channelId, prioriza el ClientStage que pertenezca a ese canal dentro del funnel.
   * - Si no encuentra en el funnel pedido, devuelve null (o TODO: crear si ensure===true).
   */
  async findByClientAndFunnel(
    clientId: string,
    funnelId: string,
    opts?: FindByClientAndFunnelOpts,
  ): Promise<ClientStage | null> {
    const { channelId } = opts ?? {};

    // Traemos todos los activos del cliente (ordenados reciente→antiguo) con relaciones necesarias
    const all = await this.clientStageRepository.find({
      where: { clientId, status: 'ACTIVE' as any },
      relations: [
        'stage',
        'assignedUser',
        'funnelChannel',
        'funnelChannel.funnel',
        'funnelChannel.channel',
      ],
      order: { createdAt: 'DESC' },
    });

    if (!all.length) {
      // TODO: si opts?.ensure === true, aquí debería crearse el ClientStage inicial
      return null;
    }

    // 1) Prioriza coincidencia exacta por funnelId + channelId (si se pidió)
    if (channelId) {
      const byFunnelAndChannel = all.find(
        cs =>
          cs.funnelChannel?.funnelId === funnelId &&
          cs.funnelChannel?.channel?.id === channelId,
      );
      if (byFunnelAndChannel) return byFunnelAndChannel;
    }

    // 2) Si no hay channelId o no coincide, intenta por funnelId solamente
    const byFunnel = all.find(cs => cs.funnelChannel?.funnelId === funnelId);
    if (byFunnel) return byFunnel;

    // 3) No hay ClientStage en ese funnel
    // TODO: si opts?.ensure === true, aquí debería crearse el ClientStage inicial en el primer stage
    return null;
  }

  // ----------------------------------------------------------------
  // Si luego quieres implementar ensure:
  // - Inyecta repos de Stage y FunnelChannel
  // - Obtén el FunnelChannel (por funnelId y opcional channelId)
  // - Busca el Stage inicial (order ASC)
  // - this.clientStageRepository.save({ clientId, stageId: firstStage.id, funnelChannelId: fc.id, status: 'ACTIVE' })
  // ----------------------------------------------------------------
}
