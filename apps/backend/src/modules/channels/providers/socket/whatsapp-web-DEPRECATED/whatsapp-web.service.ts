import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client as WhatsAppClient, LocalAuth } from 'whatsapp-web.js';
import * as path from 'path';
import * as fs from 'fs';
import { Channel } from '../../../persistence/entities/channel.entity';
import { ChannelType, ChannelStatus } from '../../../core/types/channel.types';
import { WhatsAppWebClientInfo, WhatsAppWebSessionConfig } from './whatsapp-web.types';
import { WhatsAppGateway } from '../../../infrastructure/gateway/whatsapp.gateway';

@Injectable()
export class WhatsAppWebService implements OnModuleInit {
  private readonly logger = new Logger('WhatsAppWebService');
  private readonly SESSION_BASE_PATH = '.wwebjs_auth';
  private readonly clientsMap = new Map<string, WhatsAppWebClientInfo>();
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 5000; // 5 segundos

  constructor(
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    private readonly whatsappGateway: WhatsAppGateway,
  ) {
    // Asegurar que existe el directorio de sesiones
    if (!fs.existsSync(this.SESSION_BASE_PATH)) {
      fs.mkdirSync(this.SESSION_BASE_PATH);
    }
  }

  async onModuleInit() {
    // await this.initializeExistingChannels();
  }

  private getSessionPath(companyId: string): string {
    return path.join(this.SESSION_BASE_PATH, `company_${companyId}`);
  }

  private getSessionConfig(companyId: string): WhatsAppWebSessionConfig {
    return {
      clientId: `company_${companyId}`,
      dataPath: this.getSessionPath(companyId),
      puppeteerOptions: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      }
    };
  }

  private async initializeExistingChannels() {
    try {
      const activeChannels = await this.channelRepository.find({
        where: {
          type: ChannelType.WHATSAPP_WEB,
          status: ChannelStatus.ACTIVE
        }
      });

      this.logger.log(`Encontrados ${activeChannels.length} canales activos para reconectar`);

      for (const channel of activeChannels) {
        try {
          await this.initializeClient(channel.companyId);
          this.logger.log(`Canal ${channel.id} reconectado exitosamente`);
        } catch (error) {
          this.logger.error(`Error reconectando canal ${channel.id}: ${error.message}`);
          channel.status = ChannelStatus.INACTIVE;
          await this.channelRepository.save(channel);
        }
      }
    } catch (error) {
      this.logger.error('Error inicializando canales existentes:', error);
    }
  }

  async initializeClient(companyId: string): Promise<WhatsAppClient> {
    const sessionConfig = this.getSessionConfig(companyId);

    const client = new WhatsAppClient({
      authStrategy: new LocalAuth({
        clientId: sessionConfig.clientId,
        dataPath: sessionConfig.dataPath
      }),
      puppeteer: sessionConfig.puppeteerOptions
    });

    const clientInfo: WhatsAppWebClientInfo = {
      client,
      status: 'connecting',
      reconnectAttempts: 0
    };

    this.setupClientEvents(client, companyId);
    this.clientsMap.set(companyId, clientInfo);

    try {
      await client.initialize();
      return client;
    } catch (error) {
      this.logger.error(`Error inicializando cliente para compañía ${companyId}:`, error);
      throw error;
    }
  }

  private setupClientEvents(client: WhatsAppClient, companyId: string) {
    client.on('qr', (qr) => {
      this.logger.log(`QR Code recibido para compañía ${companyId}`);
      this.whatsappGateway.emitQR(companyId, qr, ChannelType.WHATSAPP_WEB);
      this.updateClientInfo(companyId, { status: 'connecting' });
    });

    client.on('authenticated', () => {
      this.logger.log(`Cliente autenticado para compañía ${companyId}`);
      this.whatsappGateway.emitConnectionStatus(companyId, 'authenticated', null, ChannelType.WHATSAPP_WEB);
      this.updateClientInfo(companyId, {
        status: 'authenticated',
        lastConnection: new Date()
      });
    });

    client.on('ready', async () => {
      this.logger.log(`Cliente listo para compañía ${companyId}`);
      const info = client.info;
      this.whatsappGateway.emitConnectionStatus(companyId, 'ready', info.wid.user, ChannelType.WHATSAPP_WEB);
      this.updateClientInfo(companyId, {
        status: 'ready',
        reconnectAttempts: 0
      });

      // Actualizar estado del canal
      await this.updateChannelStatus(companyId, info.wid.user);
    });

    client.on('disconnected', async (reason) => {
      this.logger.warn(`Cliente desconectado para compañía ${companyId}: ${reason}`);
      this.whatsappGateway.emitConnectionStatus(companyId, 'disconnected', null, ChannelType.WHATSAPP_WEB);

      const clientInfo = this.clientsMap.get(companyId);
      if (clientInfo) {
        clientInfo.status = 'disconnected';
        if (clientInfo.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
          setTimeout(async () => {
            try {
              await this.reconnectClient(companyId);
            } catch (error) {
              this.logger.error(`Error en reconexión para compañía ${companyId}:`, error);
            }
          }, this.RECONNECT_DELAY);
        } else {
          await this.updateChannelStatus(companyId, null, ChannelStatus.INACTIVE);
        }
      }
    });
  }

  private async updateChannelStatus(companyId: string, phoneNumber?: string | null, status: ChannelStatus = ChannelStatus.ACTIVE) {
    try {
      const channel = await this.channelRepository.findOne({
        where: {
          companyId,
          type: ChannelType.WHATSAPP_WEB
        }
      });

      if (channel) {
        if (phoneNumber) {
          channel.number = phoneNumber;
          channel.name = `WhatsApp ${phoneNumber}`;
        }
        channel.status = status;
        await this.channelRepository.save(channel);
      }
    } catch (error) {
      this.logger.error(`Error actualizando estado del canal para compañía ${companyId}:`, error);
    }
  }

  private updateClientInfo(companyId: string, update: Partial<WhatsAppWebClientInfo>) {
    const clientInfo = this.clientsMap.get(companyId);
    if (clientInfo) {
      Object.assign(clientInfo, update);
      this.clientsMap.set(companyId, clientInfo);
    }
  }

  private async reconnectClient(companyId: string) {
    const clientInfo = this.clientsMap.get(companyId);
    if (clientInfo) {
      clientInfo.reconnectAttempts++;
      try {
        await clientInfo.client.initialize();
      } catch (error) {
        this.logger.error(`Error en intento de reconexión ${clientInfo.reconnectAttempts}:`, error);
        throw error;
      }
    }
  }

  async getClient(companyId: string): Promise<WhatsAppClient | null> {
    const clientInfo = this.clientsMap.get(companyId);
    return clientInfo?.client || null;
  }

  async disconnectClient(companyId: string): Promise<void> {
    const clientInfo = this.clientsMap.get(companyId);
    if (clientInfo?.client) {
      try {
        await clientInfo.client.destroy();
        this.clientsMap.delete(companyId);
        await this.updateChannelStatus(companyId, null, ChannelStatus.INACTIVE);
      } catch (error) {
        this.logger.error(`Error desconectando cliente para compañía ${companyId}:`, error);
        throw error;
      }
    }
  }
}
