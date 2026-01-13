import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Function } from '../../entities/function.entity';
import { ChangeStageConstData } from '../../core/types/function.types';
import { ClientStageService } from '../../../clients/services/client-stage.service';
import { WhatsAppGateway } from '../../../channels/infrastructure/gateway/whatsapp.gateway';
import { ClientStage } from '../../../clients/entities/client-stage.entity';

interface ChangeStageContext {
  companyId: string;
  clientId: string;
  stageId?: string;
  funnelId: string;
}

interface ChangeStageResult {
  success: boolean;
  data: {
    previousStageId?: string;
    newStageId: string;
  };
  error?: string;
  metadata?: {
    clientId: string;
    funnelId: string;
    channelId?: string;
  };
}

@Injectable()
export class ChangeStageImplementation {
  constructor(
    private readonly clientStageService: ClientStageService,
    @InjectRepository(ClientStage)
    private readonly clientStageRepository: Repository<ClientStage>,
    @Inject(forwardRef(() => WhatsAppGateway))
    private readonly whatsappGateway: WhatsAppGateway,
  ) {}

  async execute(
    function_: Function,
    args: Record<string, any>,
    context: ChangeStageContext
  ): Promise<ChangeStageResult> {
    try {
      // 1. Validar argumentos
      const { stageId } = args;
      if (!stageId) {
        throw new Error('Stage ID is required');
      }

      // 2. Validar que el stage ID coincide con el configurado
      const constData = function_.constData as ChangeStageConstData;
      if (constData.stageId !== stageId) {
        throw new Error('Invalid stage ID');
      }

      // 3. Obtener el stage actual del cliente
      const currentClientStage = await this.clientStageService.findByClientId(context.clientId);
      const previousStageId = currentClientStage?.[0]?.stageId;

      // 4. Cambiar el stage
      await this.clientStageRepository
            .createQueryBuilder()
            .update(ClientStage)
            .set({ stageId: stageId })
            .where("client_id = :clientId", { clientId: context.clientId })
            .execute();

      // 5. Emitir evento de movimiento
      this.whatsappGateway.emitToCompany(context.companyId, 'clientMoved', {
        clientId: context.clientId,
        fromStageId: previousStageId,
        toStageId: stageId,
        funnelId: context.funnelId,
        channelId: currentClientStage?.[0]?.funnelChannel?.channelId
      });

      return {
        success: true,
        data: {
          previousStageId,
          newStageId: stageId
        },
        metadata: {
          clientId: context.clientId,
          funnelId: context.funnelId,
          channelId: currentClientStage?.[0]?.funnelChannel?.channelId
        }
      };
    } catch (error) {
      return {
        success: false,
        data: {
          newStageId: args.stageId
        },
        error: error.message
      };
    }
  }
}