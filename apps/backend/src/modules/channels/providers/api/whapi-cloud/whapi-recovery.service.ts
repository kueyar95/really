import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel } from '../../../persistence/entities/channel.entity';
import { ChannelStatus, ChannelType } from '../../../core/types/channel.types';
import { WhapiCloudService } from './whapi-cloud.service';
import { ChannelsService } from '../../../channels.service';
import { ChannelManagerService } from '../../../core/services/channel-manager.service';

@Injectable()
export class WhapiRecoveryService {
  private readonly logger = new Logger(WhapiRecoveryService.name);
  private locks = new Set<string>();

  constructor(
    @InjectRepository(Channel)
    private readonly channelRepo: Repository<Channel>,
    private readonly whapi: WhapiCloudService,
    @Inject(forwardRef(() => ChannelsService))
    private readonly channelsService: ChannelsService,
    private readonly channelManager: ChannelManagerService,
  ) {}

  /** Orquesta la recuperación de un canal Whapi (idempotente por lock) */
  async recover(channelId: string) {
    if (this.locks.has(channelId)) return;
    this.locks.add(channelId);
    try {
      const ch = await this.channelRepo.findOne({ where: { id: channelId }, relations: ['company'] });
      if (!ch) return;
      if (ch.type !== ChannelType.WHAPI_CLOUD) return;

      const token = ch.connectionConfig?.whapiChannelToken;
      if (!token) {
        this.logger.warn(`[recover] Canal ${channelId} sin token; marcando ERROR`);
        await this.channelsService.updateChannelStatus(channelId, ChannelStatus.ERROR);
        return;
      }

      // 1) Comprobación rápida de salud
      try {
        const health = await this.whapi.getInstanceStatus(token, { wakeup: true });
        const state = String(health?.state || '').toUpperCase();
        if (state === 'AUTH' || state === 'AUTHORIZED' || state === 'CONNECTED') {
          await this.channelsService.updateChannelStatus(channelId, ChannelStatus.ACTIVE);
          return;
        }
        // Si Whapi reporta SYNC_ERROR, la guía indica logout + reauth
        if (state === 'SYNC_ERROR') {
          await this.safeLogout(token);
        }
      } catch (e) {
        // Ignoramos y seguimos al logout
        this.logger.warn(`[recover] health previo falló: ${e?.message}`);
      }

      // 2) Logout defensivo y re‐autenticación por QR
      await this.safeLogout(token);
      await this.channelsService.updateChannelStatus(channelId, ChannelStatus.CONNECTING);

      // Reemitir QR y esperar webhook de Users:connected para activar
      await this.channelManager.initiateWhapiQrSession(channelId, ch.companyId, token);

      // 3) (Opcional) Guardar contador/telemetría
      const recCount = Number(ch.metadata?.whapi_recoveries || 0) + 1;
      ch.metadata = { ...(ch.metadata || {}), whapi_recoveries: recCount, whapi_lastRecoveryAt: new Date().toISOString() };
      await this.channelRepo.save(ch);
    } catch (err) {
      this.logger.error(`[recover] Error recuperando canal ${channelId}: ${err?.message}`);
    } finally {
      this.locks.delete(channelId);
    }
  }

  private async safeLogout(token: string) {
    try {
      await this.whapi.logout(token);
    } catch (e) {
      // Si ya estaba sin sesión, continuamos
      this.logger.warn(`[recover] logout tolerado: ${e?.message}`);
    }
  }
}