import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Interval } from '@nestjs/schedule';
import { Channel } from '../../../persistence/entities/channel.entity';
import { ChannelStatus, ChannelType } from '../../../core/types/channel.types';
import { WhapiCloudService } from './whapi-cloud.service';
import { ChannelsService } from '../../../channels.service';
import { WhatsAppGateway } from '../../../infrastructure/gateway/whatsapp.gateway';
import { WhapiCloudStrategy } from './whapi-cloud.strategy';

/**
 * Watchdog de canales Whapi.Cloud: hace polling al /health, normaliza estado,
 * aplica una ventana de verificación post-scan y dispara recuperación si falla.
 */
@Injectable()
export class WhapiHeartbeatService {
  private readonly logger = new Logger(WhapiHeartbeatService.name);
  private readonly INTERVAL_MS = parseInt(process.env.WHAPI_HEARTBEAT_INTERVAL_MS || '15000', 10);
  private readonly MAX_STRIKES = parseInt(process.env.WHAPI_HEARTBEAT_MAX_STRIKES || '3', 10);
  private readonly CACHE_REFRESH_MS = parseInt(process.env.WHAPI_CACHE_REFRESH_MS || '60000', 10); // 1 minuto

  // ⏳ Ventana de verificación (post-scan/post-login) por canal
  private verifyingUntil = new Map<string, number>();

  // 📦 OPTIMIZACIÓN: Caché de canales en memoria
  private channelsCache: Channel[] = [];
  private lastCacheRefresh = 0;

  private running = false;

  constructor(
    @InjectRepository(Channel)
    private readonly channelRepo: Repository<Channel>,
    private readonly whapi: WhapiCloudService,
    @Inject(forwardRef(() => ChannelsService))
    private readonly channelsService: ChannelsService,
    private readonly ws: WhatsAppGateway,
    private readonly whapiCloudStrategy: WhapiCloudStrategy,
  ) {}

  /** Expuesto para que otros servicios/gateway puedan abrir la ventana manualmente */
  startVerificationWindow(channelId: string, ms = 90_000) {
    const until = Date.now() + ms;
    this.verifyingUntil.set(channelId, until);
    this.logger.debug(`[Heartbeat] Ventana de verificación abierta ${ms}ms para canal ${channelId}`);
  }

  /** OPTIMIZACIÓN: Invalidar caché para forzar refresh en el próximo ciclo */
  invalidateCache() {
    this.lastCacheRefresh = 0;
    this.logger.debug('[Heartbeat] Caché invalidado - se refrescará en el próximo ciclo');
  }

  /** Permite forzar un chequeo inmediato para un canal específico */
  async checkNow(channelId: string) {
    try {
      const ch = await this.channelRepo.findOne({ where: { id: channelId } });
      if (ch) await this.checkChannel(ch);
    } catch (e: any) {
      this.logger.error(`checkNow error: ${e.message}`);
    }
  }

  @Interval(1000) // tick pequeño; cada canal respeta su propio INTERVAL_MS
  async poll() {
    if (this.running) return;
    this.running = true;
    try {
      const now = Date.now();
      
      // 📦 OPTIMIZACIÓN: Usar caché en memoria, refrescar solo cada CACHE_REFRESH_MS
      if (now - this.lastCacheRefresh > this.CACHE_REFRESH_MS || this.channelsCache.length === 0) {
        this.channelsCache = await this.channelRepo.find({ 
          where: { type: ChannelType.WHAPI_CLOUD },
          select: ['id', 'companyId', 'status', 'number', 'metadata', 'connectionConfig'], // Solo campos necesarios
        });
        this.lastCacheRefresh = now;
        this.logger.debug(`[Heartbeat] Caché refrescado: ${this.channelsCache.length} canales Whapi`);
      }

      for (const ch of this.channelsCache) {
        // OPTIMIZACIÓN: Saltar canales excluidos del heartbeat
        if (ch.metadata?.excludeFromHeartbeat === true) {
          continue;
        }

        // OPTIMIZACIÓN: Saltar canales con demasiados strikes consecutivos
        const strikes = Number(ch.metadata?.whapi_hbStrikes || 0);
        if (strikes >= this.MAX_STRIKES * 10) {
          // Después de 30 strikes (10x el máximo), dejar de verificar
          // Y marcar para excluir del heartbeat
          if (!ch.metadata?.excludeFromHeartbeat) {
            this.logger.warn(
              `Canal ${ch.id} tiene ${strikes} strikes consecutivos - excluyendo del heartbeat`
            );
            // Actualizar BD y caché
            await this.bumpMeta(ch, { 
              excludeFromHeartbeat: true,
              excludedReason: 'too_many_strikes',
              excludedAt: new Date().toISOString()
            });
            // Forzar refresh del caché en el próximo ciclo
            this.lastCacheRefresh = 0;
          }
          continue;
        }

        const last = Number(ch.metadata?.__hb_lastTick || 0);
        if (now - last < this.INTERVAL_MS) continue;
        await this.checkChannel(ch);
      }
    } catch (err: any) {
      this.logger.error(`Heartbeat loop error: ${err?.message}`);
    } finally {
      this.running = false;
    }
  }

  private parsePhoneFromHealth(health: any): string | undefined {
    const fromUser = health?.user?.id || health?.phone;
    if (!fromUser) return undefined;
    const onlyDigits = String(fromUser).replace(/[^0-9]/g, '');
    return onlyDigits || undefined;
  }

  private isAuthorized(health: any): boolean {
    const state = String(health?.state || '').toUpperCase();
    return state === 'AUTH' || state === 'AUTHORIZED' || state === 'CONNECTED' || state === 'READY' || health?.connected === true;
  }

  private isTransitionState(health: any): boolean {
    const st = String(health?.state || '').toUpperCase();
    // Estados típicos entre “escaneado” y “conectado”
    return [
      'PAIRING',
      'OPENING',
      'SYNCING',
      'PENDING',
      'SCAN_COMPLETE',
      'LINKING',
      'PUSHNAME',
      'RESTORING',
      'CONNECTING',
    ].includes(st);
  }

  private async bumpMeta(ch: Channel, patch: Record<string, any>): Promise<void> {
    ch.metadata = { ...(ch.metadata || {}), ...patch };
    await this.channelRepo.save(ch);
  }

  private async checkChannel(ch: Channel) {
    const token = ch.connectionConfig?.whapiChannelToken;
    if (!token) {
      this.logger.warn(`Canal ${ch.id} sin whapiChannelToken; saltando`);
      await this.bumpMeta(ch, { __hb_lastTick: Date.now() });
      return;
    }

    try {
      const health = await this.whapi.getInstanceStatus(token, { wakeup: true, channel_type: 'web' });

      // Si Whapi reporta un estado de transición post-scan, abrimos/renovamos la ventana
      if (this.isTransitionState(health)) {
        this.startVerificationWindow(ch.id);
      }

      const authorized = this.isAuthorized(health);
      const phone = this.parsePhoneFromHealth(health);
      const now = Date.now();
      const grace = (this.verifyingUntil.get(ch.id) ?? 0) > now;

      // Persistimos señales de vida y estado
      const metaPatch: Record<string, any> = {
        __hb_lastTick: now,
        whapi_lastHealthAt: new Date(now).toISOString(),
        whapi_lastState: health?.state || 'unknown',
        whapi_hbStrikes: 0,
        // OPTIMIZACIÓN: Si el canal responde OK, quitar exclusión del heartbeat
        excludeFromHeartbeat: false,
      };
      if (phone && !ch.number) ch.number = phone;
      ch.metadata = { ...(ch.metadata || {}), ...metaPatch };

      if (authorized) {
        // ✅ Conectado
        if (ch.status !== ChannelStatus.ACTIVE) {
          await this.channelsService.updateChannelStatus(ch.id, ChannelStatus.ACTIVE, phone);
        }
        this.ws.emitWhapiStatus(ch.companyId, ch.id, 'connected', { state: health?.state, phoneNumber: phone });
        this.verifyingUntil.delete(ch.id); // fin de ventana
      } else {
        // ⏳ No autorizado: si estamos en ventana, no “retrocedas” a disconnected
        if (grace) {
          if (ch.status !== ChannelStatus.CONNECTING) {
            await this.channelsService.updateChannelStatus(ch.id, ChannelStatus.CONNECTING);
          }
          this.ws.emitWhapiStatus(ch.companyId, ch.id, 'verifying', { state: health?.state });
        } else {
          if (ch.status !== ChannelStatus.ERROR) {
            await this.channelsService.updateChannelStatus(ch.id, ChannelStatus.CONNECTING);
          }
          this.ws.emitWhapiStatus(ch.companyId, ch.id, 'disconnected', { state: health?.state });
        }
      }

      await this.channelRepo.save(ch);
      if (authorized && ch.connectionConfig?.whapiChannelId) {
        try {
          // Throttle opcional: cada 2 min
          const last = Number(ch.metadata?.__admin_lastSync || 0);
          if (Date.now() - last > 120_000) {
            await this.whapiCloudStrategy.syncAdminState(ch); // puedes pasar ch o ch.id
            ch.metadata = { ...(ch.metadata || {}), __admin_lastSync: Date.now() };
            await this.channelRepo.save(ch);
          }
        } catch (e: any) {
          this.logger.debug(`[Heartbeat] syncAdminState fallo para canal ${ch.id}: ${e.message}`);
        }
      }
    } catch (err: any) {
      const strikes = Number(ch.metadata?.whapi_hbStrikes || 0) + 1;
      const patch = {
        __hb_lastTick: Date.now(),
        whapi_hbStrikes: strikes,
        whapi_lastHealthError: err?.message,
      };
      ch.metadata = { ...(ch.metadata || {}), ...patch };
      await this.channelRepo.save(ch);
  
      this.logger.warn(`Health fallo canal ${ch.id} (strike ${strikes}/${this.MAX_STRIKES}): ${err?.message}`);
  
      if (strikes >= this.MAX_STRIKES) {
        await this.channelsService.updateChannelStatus(ch.id, ChannelStatus.ERROR);
        this.ws.emitWhapiStatus(ch.companyId, ch.id, 'error', { reason: 'health_failed', strikes });
      }
    }
  }
}
