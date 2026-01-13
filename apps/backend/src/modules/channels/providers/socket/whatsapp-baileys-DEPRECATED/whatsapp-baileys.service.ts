import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
} from '@whiskeysockets/baileys';
import * as path from 'path';
import * as fs from 'fs';
import { Channel } from '../../../persistence/entities/channel.entity';
import { ChannelType, ChannelStatus } from '../../../core/types/channel.types';
import { WhatsAppGateway } from '../../../infrastructure/gateway/whatsapp.gateway';
import { WhatsAppBaileysStrategy } from './whatsapp-baileys.strategy';
import { Boom } from '@hapi/boom';

@Injectable()
export class WhatsAppBaileysService implements OnModuleInit {
  private readonly logger = new Logger('WhatsAppBaileysService');
  private readonly SESSION_BASE_PATH = '.baileys_auth';
  private readonly clientsMap = new Map<string, WASocket>();
  private readonly connectionAttempts = new Map<string, number>();
  private readonly messageCallbacks = new Map<string, (data: any) => void>();
  private reconnectAttempts = new Map<string, number>();
  private readonly MAX_RECONNECT_ATTEMPTS = 10;

  constructor(
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    private readonly whatsappGateway: WhatsAppGateway,
    @Inject(forwardRef(() => WhatsAppBaileysStrategy))
    private readonly whatsappBaileysStrategy: WhatsAppBaileysStrategy,
  ) {
    if (!fs.existsSync(this.SESSION_BASE_PATH)) {
      fs.mkdirSync(this.SESSION_BASE_PATH);
    }
  }

  private getSessionPath(channelId: string): string {
    return path.join(this.SESSION_BASE_PATH, `channel_${channelId}`);
  }

  async onModuleInit() {
    await this.initializeExistingChannels();
    
    // Set up periodic health check every 30 minutes
    setInterval(() => {
      this.healthCheckAllConnections();
    }, 30 * 60 * 1000);
  }

  private async initializeExistingChannels() {
    try {
      const activeChannels = await this.channelRepository.find({
        where: {
          type: ChannelType.WHATSAPP_BAILEYS,
          status: ChannelStatus.ACTIVE,
          number: Not(IsNull())
        },
        relations: ['company']
      });

      this.logger.log(`[INIT] Encontrados ${activeChannels.length} canales activos para reconectar`);

      for (const channel of activeChannels) {
        try {
          this.logger.log(`[INIT] Intentando reconectar canal ${channel.id}`);

          // Marcar como connecting mientras intentamos reconectar
          await this.updateChannelStatus(channel.id, channel.number, ChannelStatus.CONNECTING);

          // Intentar reconectar
          await this.initializeClient(channel.id);

          this.logger.log(`[INIT] Canal ${channel.id} reconectado exitosamente`);
        } catch (error) {
          this.logger.error(`[INIT] Error reconectando canal ${channel.id}:`, error);
          // Si falla la reconexión, marcar como error
          await this.updateChannelStatus(channel.id, null, ChannelStatus.ERROR);
        }
      }
    } catch (error) {
      this.logger.error('[INIT] Error inicializando canales existentes:', error);
    }
  }

  private async cleanSession(companyId: string) {
    const sessionPath = this.getSessionPath(companyId);
    if (fs.existsSync(sessionPath)) {
      try {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        this.logger.log(`Sesión limpiada para compañía ${companyId}`);
      } catch (error) {
        this.logger.error(`Error limpiando sesión para compañía ${companyId}:`, error);
      }
    }
  }

  async initializeClient(channelId: string): Promise<WASocket> {
    try {
      // Si ya hay una conexión activa y está conectada, retornarla
      const existingClient = this.clientsMap.get(channelId);
      if (existingClient?.user?.id) {
        this.logger.log(`[1] Cliente ya conectado para canal ${channelId}`);
        return existingClient;
      }

      // Limpiar cliente existente si hay uno
      await this.cleanExistingClient(channelId);

      this.logger.log(`[1] Iniciando cliente para canal ${channelId}`);

      const channel = await this.channelRepository.findOne({
        where: { id: channelId },
        relations: ['company']
      });

      if (!channel) {
        this.logger.warn(`[X] Canal ${channelId} no encontrado o fue eliminado`);
        // Limpiar recursos si el canal no existe
        this.clientsMap.delete(channelId);
        this.reconnectAttempts.delete(channelId);
        this.connectionAttempts.delete(channelId);
        return null;
      }

      const sessionPath = path.join(this.SESSION_BASE_PATH, `channel_${channelId}`);
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        retryRequestDelayMs: 1000
      });

      sock.ev.on('creds.update', saveCreds);

      // Agregar manejo de mensajes
      sock.ev.on('messages.upsert', async ({ messages, type }) => {
        try {
          if (type === 'notify') {
            // Verificar estado actual del canal
            const currentChannel = await this.channelRepository.findOne({
              where: {
                id: channelId,
                status: ChannelStatus.ACTIVE,  // Solo procesar mensajes si el canal está activo
                type: ChannelType.WHATSAPP_BAILEYS
              }
            });

            if (!currentChannel) {
              this.logger.warn(`[MSG] Ignorando mensajes para canal ${channelId} - no está activo`);
              return;
            }

            for (const msg of messages) {
              // Ignorar mensajes propios y grupos
              if (!msg.key.fromMe && !msg.key.remoteJid?.includes('@g.us')) {
                await this.handleIncomingMessage(msg, currentChannel);
              }
            }
          }
        } catch (error) {
          this.logger.error(`[MSG] Error procesando mensajes para canal ${channelId}:`, error);
        }
      });

      sock.ev.on('connection.update', async (update) => {
        try {
          const { connection, lastDisconnect, qr } = update;

          if (qr) {
            // Verificar si el canal aún existe antes de emitir QR
            const channelExists = await this.channelRepository.findOne({
              where: { id: channelId }
            });

            if (!channelExists) {
              this.logger.warn(`[X] Canal ${channelId} eliminado, deteniendo reconexión`);
              sock.end(new Error('Canal eliminado'));
              this.clientsMap.delete(channelId);
              return;
            }

            this.logger.log('[2] Nuevo código QR generado');
            this.whatsappGateway.emitQR(channel.companyId, channelId, qr, channel.type);
          }

          if (connection === 'close') {
            const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
            const attempts = this.reconnectAttempts.get(channelId) || 0;

            // Verificar si el canal aún existe antes de reconectar
            const channelExists = await this.channelRepository.findOne({
              where: { id: channelId }
            });

            if (!channelExists) {
              this.logger.warn(`[X] Canal ${channelId} eliminado, deteniendo reconexión`);
              this.clientsMap.delete(channelId);
              this.reconnectAttempts.delete(channelId);
              return;
            }

            // Only treat loggedOut as a terminal condition
            if (statusCode === DisconnectReason.loggedOut) {
              this.logger.log(`[3] Sesión cerrada para canal ${channelId}, requiere reautenticación`);
              await this.updateChannelStatus(channelId, null, ChannelStatus.ERROR);
              this.reconnectAttempts.delete(channelId);
              this.clientsMap.delete(channelId);
              return;
            }

            // For all other errors, attempt reconnection with exponential backoff
            if (attempts >= this.MAX_RECONNECT_ATTEMPTS) {
              this.logger.log(`[3] Máximo de intentos alcanzado para canal ${channelId}`);
              await this.updateChannelStatus(channelId, null, ChannelStatus.ERROR);
              this.reconnectAttempts.delete(channelId);
              this.clientsMap.delete(channelId);
              return;
            }
            
            // Calculate backoff time: 2^attempts * 1000ms (1s, 2s, 4s, 8s, etc.)
            // But cap it at 60 seconds max
            const backoffTime = Math.min(Math.pow(2, attempts) * 1000, 60000);
            
            this.reconnectAttempts.set(channelId, attempts + 1);
            this.logger.log(`[3] Reintentando conexión ${attempts + 1}/${this.MAX_RECONNECT_ATTEMPTS} en ${backoffTime/1000}s para canal ${channelId}`);
            
            setTimeout(async () => {
              try {
                await this.initializeClient(channelId);
              } catch (error) {
                this.logger.error(`[X] Error en reconexión de canal ${channelId}:`, error);
              }
            }, backoffTime);
          }

          if (connection === 'open') {
            this.logger.log('[4] Conexión establecida');
            this.reconnectAttempts.delete(channelId);
            await this.handleSuccessfulConnection(channel, sock);
            // Importante: No intentar reconectar si la conexión está abierta
          }
        } catch (error) {
          this.logger.error('[X] Error en connection.update:', error);
          // No propagar el error
        }
      });

      this.clientsMap.set(channelId, sock);
      return sock;
    } catch (error) {
      this.logger.error(`[X] Error inicializando cliente para canal ${channelId}:`, error);
      // No propagar el error
      return null;
    }
  }

  private async handleSuccessfulConnection(channel: Channel, sock: WASocket) {
    const phoneNumber = sock.user?.id?.split(':')[0];
    await this.updateChannelStatus(channel.id, phoneNumber, ChannelStatus.ACTIVE);
    this.whatsappGateway.emitConnectionStatus(
      channel.companyId,
      channel.id,
      'connected',
      { phoneNumber },
      channel.type
    );
  }

  private async handleIncomingMessage(msg: any, channel: Channel) {
    try {
      await this.whatsappBaileysStrategy.handleIncomingMessage(msg, channel);
    } catch (error) {
      this.logger.error(`Error procesando mensaje en canal ${channel.id}:`, error);
    }
  }


  private async updateChannelStatus(channelId: string, phoneNumber?: string | null, status: ChannelStatus = ChannelStatus.ACTIVE) {
    try {
      const channel = await this.channelRepository.findOne({
        where: {
          id: channelId,
          type: ChannelType.WHATSAPP_BAILEYS
        }
      });

      if (channel) {
        if (channel.status !== status || (phoneNumber && channel.number !== phoneNumber)) {
          if (phoneNumber) {
            channel.number = phoneNumber;
            channel.name = `WhatsApp ${phoneNumber}`;
          }
          channel.status = status;
          await this.channelRepository.save(channel);
        }
      }
    } catch (error) {
      this.logger.error(`Error actualizando estado del canal ${channelId}:`, error);
      throw error;
    }
  }

  async getClient(channelId: string): Promise<WASocket | null> {
    const clientInfo = this.clientsMap.get(channelId);
    return clientInfo || null;
  }

  async disconnectClient(channelId: string): Promise<void> {
    const clientInfo = this.clientsMap.get(channelId);
    if (clientInfo) {
      try {
        clientInfo.end(new Error('Desconexión solicitada'));
        this.clientsMap.delete(channelId);
        await this.updateChannelStatus(channelId, null, ChannelStatus.INACTIVE);
      } catch (error) {
        this.logger.error(`Error desconectando cliente para compañía ${channelId}:`, error);
        throw error;
      }
    }
  }

  registerMessageCallback(channelId: string, callback: (data: any) => void) {
    this.logger.log(`Registrando callback para compañía ${channelId}`);
    this.messageCallbacks.set(channelId, callback);
    this.logger.log(`Callbacks registrados: ${Array.from(this.messageCallbacks.keys()).join(', ')}`);
  }

  removeMessageCallback(channelId: string) {
    this.logger.log(`Removiendo callback para compañía ${channelId}`);
    this.messageCallbacks.delete(channelId);
  }

  async cleanupChannel(channelId: string): Promise<void> {
    try {
      // 1. Desconectar cliente si existe
      await this.disconnectClient(channelId);

      // 2. Limpiar sesión local
      await this.cleanSession(channelId);

      // 3. Eliminar del mapa de clientes
      this.clientsMap.delete(channelId);

      // 4. Eliminar callbacks
      this.messageCallbacks.delete(channelId);

      // 5. Eliminar intentos de conexión
      this.connectionAttempts.delete(channelId);

      this.logger.log(`Limpieza completa del canal ${channelId} finalizada`);
    } catch (error) {
      this.logger.error(`Error en limpieza del canal ${channelId}:`, error);
      throw error;
    }
  }

  private async cleanExistingClient(channelId: string) {
    const client = this.clientsMap.get(channelId);
    if (client) {
      try {
        this.logger.log('[Service] Limpiando cliente existente...');
        client.ev.removeAllListeners('messages.upsert');
        client.end(new Error('Desconexión manual'));
        this.clientsMap.delete(channelId);
        this.logger.log('[Service] Cliente existente limpiado');
      } catch (error) {
        this.logger.error('[Service] Error al cerrar cliente existente:', error);
      }
    }
  }

  // New method to check health of all connections
  private async healthCheckAllConnections() {
    try {
      this.logger.log(`[HEALTH] Iniciando verificación de salud para todas las conexiones`);
      
      // Get all active channels
      const activeChannels = await this.channelRepository.find({
        where: {
          type: ChannelType.WHATSAPP_BAILEYS,
          status: ChannelStatus.ACTIVE
        }
      });
      
      for (const channel of activeChannels) {
        try {
          const socket = this.clientsMap.get(channel.id);
          
          // Check if socket exists and is properly connected
          if (!socket || !socket.user?.id) {
            this.logger.warn(`[HEALTH] Canal ${channel.id} no está conectado correctamente, reconectando...`);
            
            // Try to reconnect
            await this.initializeClient(channel.id);
          } else {
            this.logger.log(`[HEALTH] Canal ${channel.id} está conectado correctamente`);
          }
        } catch (error) {
          this.logger.error(`[HEALTH] Error verificando canal ${channel.id}:`, error);
        }
      }
    } catch (error) {
      this.logger.error(`[HEALTH] Error en healthCheckAllConnections:`, error);
    }
  }

  async sendMessage(channelId: string, to: string, message: any): Promise<any> {
    const client = this.clientsMap.get(channelId);
    
    if (!client?.user?.id) {
      // If client is not connected, try to reconnect first
      try {
        await this.reconnectClient(channelId);
        // Wait a bit for connection to stabilize
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        throw new Error('Unable to establish connection');
      }
    }

    try {
      // Attempt to send message
      const result = await client.sendMessage(to, message);
      return result;
    } catch (error) {
      if (error.message === 'Connection Closed') {
        // Update channel status
        await this.updateChannelStatus(channelId, null, ChannelStatus.INACTIVE);
        
        // Trigger reconnection process
        await this.reconnectClient(channelId);
        
        throw new Error('Connection lost. Message will be retried automatically.');
      }
      throw error;
    }
  }

  private async reconnectClient(channelId: string) {
    const clientInfo = this.clientsMap.get(channelId);
    if (!clientInfo) return;

    try {
      // Clean up existing connection
      await this.cleanExistingClient(channelId);
      
      // Initialize new connection
      await this.initializeClient(channelId);
      
      // Update channel status
      await this.updateChannelStatus(channelId, clientInfo?.user?.id, ChannelStatus.ACTIVE);
    } catch (error) {
      this.logger.error(`Failed to reconnect client ${channelId}:`, error);
      throw error;
    }
  }
}