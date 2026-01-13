/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket,
  OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { WsAuthGuard } from '../guards/ws-auth.guard';
import { CompanyAccessService } from '../../core/services/company-access.service';
import { ChannelsService } from '../../channels.service';
import { ChannelType, ChannelStatus } from '../../core/types/channel.types';

interface CompanyRoom {
  users: Set<string>;
  companyId: string;
}

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      process.env.AUTH_FRONT_URL,
      'https://frontend-production-e71a.up.railway.app',
      'http://frontend-production-e71a.up.railway.app',
      'https://25889fa065fd.ngrok-free.app',
      /^https:\/\/.*\.ngrok-free\.app$/,
      /^https:\/\/.*\.ngrok\.io$/,
    ],
    credentials: true,
    transports: ['websocket', 'polling'],
  },
  namespace: '/whatsapp'
})
@UseGuards(WsAuthGuard)
export class WhatsAppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('WhatsAppGateway');
  private companyRooms = new Map<string, CompanyRoom>();

  constructor(
    private readonly companyAccessService: CompanyAccessService,
    @Inject(forwardRef(() => ChannelsService))
    private readonly channelsService: ChannelsService
  ) { }

  afterInit(server: Server) {
    //this.logger.log('WebSocket Gateway inicializado');
  }

  handleConnection(client: Socket) {
    //this.logger.log(`Cliente conectado: ${client.id}`);
    // this.logger.debug('Handshake:', client.handshake);
  }

  handleDisconnect(client: Socket) {
    //this.logger.log(`Cliente desconectado: ${client.id}`);
    this.removeUserFromAllRooms(client.id);
  }

  private removeUserFromAllRooms(socketId: string) {
    for (const [companyId, room] of this.companyRooms.entries()) {
      if (room.users.has(socketId)) {
        room.users.delete(socketId);
        //this.logger.log(`Usuario ${socketId} eliminado de la compañía ${companyId}`);

        // Si no quedan usuarios, eliminar la sala
        if (room.users.size === 0) {
          this.companyRooms.delete(companyId);
          //this.logger.log(`Sala de compañía ${companyId} eliminada por falta de usuarios`);
        }
      }
    }
  }

  private mapStatusToLabel(status: ChannelStatus): string {
    switch (status) {
      case ChannelStatus.ACTIVE:
        return 'connected';
      case ChannelStatus.CONNECTING:
        return 'connecting';
      case ChannelStatus.ERROR:
        return 'error';
      default:
        return 'disconnected';
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('joinCompany')
  async handleJoinCompany(
    @MessageBody() data: { companyId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      //this.logger.log(`Solicitud de unión a compañía: ${JSON.stringify(data)}`);

      if (!data?.companyId) {
        throw new Error('Se requiere companyId para unirse');
      }

      const { companyId } = data;
      const userId = client.data.user.id;

      // Validar acceso del usuario a la compañía
      await this.companyAccessService.validateUserCompanyAccess(userId, companyId);

      // Crear o actualizar la sala de la compañía
      if (!this.companyRooms.has(companyId)) {
        this.companyRooms.set(companyId, {
          users: new Set([client.id]),
          companyId
        });
      } else {
        this.companyRooms.get(companyId).users.add(client.id);
      }

      // Unir al cliente a la sala de Socket.io
      client.join(`company_${companyId}`);

      //this.logger.log(`Cliente ${client.id} unido a la compañía ${companyId}`);
      this.logger.debug('Estado actual de salas:', this.getDebugRoomsState());

      // ⬇️ NUEVO: re-emitir snapshot de estado Whapi al recién llegado
  const channels = await this.channelsService.findByCompanyAndType(
    companyId,
    ChannelType.WHAPI_CLOUD
  );
  for (const ch of channels) {
    this.emitWhapiStatus(
      ch.companyId,
      ch.id,
      this.mapStatusToLabel(ch.status), // e.g., 'connected' | 'disconnected' | 'connecting' | 'error'
      { phoneNumber: ch.number }
    );
  }

      // Confirmar la unión al cliente
      client.emit('joined', { companyId, userId: client.data.user.id, email: client.data.user.email });


    } catch (error: any) {
      this.logger.error(`Error en unión a compañía: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  private getDebugRoomsState() {
    return Array.from(this.companyRooms.entries()).map(([companyId, room]) => ({
      companyId,
      userCount: room.users.size,
      users: Array.from(room.users)
    }));
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('connectWhatsApp')
  async handleConnectWhatsApp(
    @MessageBody() data: {
      companyId: string;
      type: ChannelType;
      channelId?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      //this.logger.log(`Solicitud de conexión WhatsApp:`, data);

      if (!data?.companyId) {
        throw new Error('Se requiere companyId para conectar WhatsApp');
      }

      await this.companyAccessService.validateUserCompanyAccess(
        client.data.user.id,
        data.companyId
      );

      let channel;
      if (data.channelId) {
        // Reconectar canal existente
        channel = await this.channelsService.findOne(data.channelId);
        if (!channel) {
          throw new Error('Canal no encontrado');
        }
      } else {
        // Crear nuevo canal
        channel = await this.channelsService.create({
          name: data.type === ChannelType.WHATSAPP_WEB ? 'WhatsApp Web' : 'WhatsApp Baileys',
          companyId: data.companyId,
          type: data.type,
          status: ChannelStatus.CONNECTING
        });
      }

      // Intentar conectar WhatsApp
      await this.channelsService.connect({
        channelId: channel.id,
        type: data.type
      });

      //this.logger.log(`Conexión iniciada para canal ${channel.id}`);

      // ⚠️ Importante:
      // Para WHAPI_CLOUD no marcamos ACTIVE ni emitimos 'connected' de forma optimista.
      // La fuente de verdad serán los webhooks (Users/Channel) y el heartbeat (/health).
      if (channel && channel.type !== ChannelType.WHAPI_CLOUD) {
        const phoneNumber = channel.number;
        this.emitConnectionStatus(
          channel.companyId,
          channel.id,
          'connected',
          { phoneNumber },
          channel.type
        );
        await this.channelsService.updateChannelStatus(channel.id, ChannelStatus.ACTIVE);
      }

      return { channelId: channel.id, status: channel.status };

    } catch (error: any) {
      this.logger.error(`Error conectando WhatsApp: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('disconnectWhatsApp')
  async handleDisconnectWhatsApp(
    @MessageBody() data: {
      channelId: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const channel = await this.channelsService.findOne(data.channelId);
      if (!channel) {
        throw new Error('Canal no encontrado');
      }

      await this.companyAccessService.validateUserCompanyAccess(
        client.data.user.id,
        channel.companyId
      );

      await this.channelsService.disconnect(channel.id);

      this.emitConnectionStatus(
        channel.companyId,
        channel.id,
        'disconnected',
        null,
        channel.type
      );

    } catch (error: any) {
      this.logger.error(`Error desconectando WhatsApp: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('sendMessage')
  async handleSendMessage(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    try {
      // Split the data into channelId and payload
      const { channelId, ...messagePayload } = data;
      const result = await this.channelsService.sendMessage(channelId, messagePayload);
      return result;
    } catch (error: any) {
      if (error.message.includes('Connection lost')) {
        // Notify client about temporary disconnection
        client.emit('connectionStatus', {
          status: 'reconnecting',
          channelId: data.channelId
        });

        // Retry logic
        setTimeout(async () => {
          try {
            const { channelId, ...messagePayload } = data;
            const result = await this.channelsService.sendMessage(channelId, messagePayload);
            client.emit('messageSent', result);
          } catch (retryError: any) {
            client.emit('error', {
              message: 'Failed to send message after reconnection attempt',
              originalError: retryError.message
            });
          }
        }, 5000);
      }

      throw error;
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('getBaileysStatus')
  async handleGetBaileysStatus(
    @MessageBody() data: { channelId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.user.id;
      const user = await this.companyAccessService.getUserCompany(userId);

      if (!user?.companyId) {
        throw new Error('Usuario no tiene una compañía asignada');
      }

      // Si se proporciona channelId, devolver solo ese canal
      if (data?.channelId) {
        const channel = await this.channelsService.findOne(data.channelId);
        if (!channel) {
          throw new Error('Canal no encontrado');
        }
        return {
          channelId: channel.id,
          status: channel.status,
          phoneNumber: channel.number,
          companyId: channel.companyId
        };
      }

      // Si no hay channelId, devolver todos los canales de la compañía
      const channels = await this.channelsService.findByCompanyAndType(
        user.companyId,
        ChannelType.WHATSAPP_BAILEYS
      );

      return channels.map(channel => ({
        channelId: channel.id,
        status: channel.status,
        phoneNumber: channel.number,
        companyId: channel.companyId
      }));
    } catch (error: any) {
      this.logger.error(`Error obteniendo estado de Baileys: ${error.message}`);
      throw error;
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('getWhapiStatus')
  async handleGetWhapiStatus(
    @MessageBody() data: { channelId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      //this.logger.log(`Solicitud de estado de Whapi:`, data);
      const userId = client.data.user.id;
      const user = await this.companyAccessService.getUserCompany(userId);

      if (!user?.companyId) {
        throw new Error('Usuario no tiene una compañía asignada');
      }

      if (data?.channelId) {
        const channel = await this.channelsService.findOne(data.channelId);
        if (!channel) {
          throw new Error('Canal no encontrado');
        }
      }

      const channels = await this.channelsService.findByCompanyAndType(
        user.companyId,
        ChannelType.WHAPI_CLOUD
      );

      return channels.map(channel => ({
        channelId: channel.id,
        status: channel.status,
        phoneNumber: channel.number,
        companyId: channel.companyId
      }));
    }

    catch (error: any) {
      this.logger.error(`Error obteniendo estado de Whapi: ${error.message}`);
      throw error;
    }
  }

  // Métodos de emisión de eventos
  emitQR(companyId: string, channelId: string, qr: string, type: ChannelType = ChannelType.WHATSAPP_WEB) {
    const eventName = type === ChannelType.WHATSAPP_BAILEYS ? `baileys:${channelId}:qr` : 'qr';
    //this.logger.log(`[WS] Emitiendo QR (${type}) para canal ${channelId} de compañía ${companyId}`);

    // Verificar si el servidor está inicializado
    if (this.server?.sockets?.adapter?.rooms) {
      const clients = this.server.sockets.adapter.rooms.get(`company_${companyId}`);
      this.logger.debug(`[WS] Clientes conectados en la sala: ${clients ? clients.size : 0}`);
    }

    this.server?.to(`company_${companyId}`).emit(eventName, { channelId, qr });
  }

  emitConnectionStatus(companyId: string, channelId: string, status: string, data?: any, type: ChannelType = ChannelType.WHATSAPP_WEB) {
    const eventName = type === ChannelType.WHATSAPP_BAILEYS ? `baileys:${channelId}:connectionStatus` : 'connectionStatus';
    //this.logger.log(`[WS] Emitiendo estado ${status} (${type}) para canal ${channelId}`);
    this.logger.debug(`[WS] Evento: ${eventName}, Datos:`, data);

    this.server.to(`company_${companyId}`).emit(eventName, { channelId, status, data });
  }

  emitMessage(companyId: string, channelId: string, message: any, type: ChannelType = ChannelType.WHATSAPP_WEB) {
    const eventName = type === ChannelType.WHATSAPP_BAILEYS ? `baileys:${channelId}:message` : 'message';
    ////this.logger.log(`📨 Emitiendo mensaje con evento '${eventName}' para canal ${channelId}`);
    //this.logger.debug('Mensaje a emitir:', message);

    const messageToEmit = {
      ...message,
      channelId,
      media: message.metadata?.hasMedia ? {
        url: message.metadata.mediaUrl,
        type: message.metadata.type,
        ...message.metadata.mediaData
      } : null
    };

    this.server.to(`company_${companyId}`).emit(eventName, messageToEmit);
  }

  /**
   * Método genérico para emitir eventos a una sala de compañía específica
   *
   * Eventos personalizados para Whapi.Cloud:
   * - 'whapi:qr': Envía código QR para escanear ({ channelId, qrCode, expires })
   * - 'whapi:status': Envía actualizaciones de estado ({ channelId, status, phoneNumber })
   * - 'whapi:error': Envía mensajes de error ({ channelId, error })
   *
   * @param companyId ID de la compañía
   * @param event Nombre del evento a emitir
   * @param data Datos a enviar
   */
  emitToCompany(companyId: string, event: string, data: any) {
    ////this.logger.log(`Emitiendo evento ${event} a compañía ${companyId}`);
    this.server.to(`company_${companyId}`).emit(event, data);
  }

  /**
   * Emite un evento de estado del canal Whapi.Cloud a una compañía específica
   * @param companyId ID de la compañía
   * @param channelId ID del canal
   * @param status Estado del canal ('connected', 'disconnected', etc.)
   * @param data Datos adicionales del evento (número, nombre, etc.)
   */
  emitWhapiStatus(companyId: string, channelId: string, status: string, data?: any) {
    //this.logger.log(`Emitiendo estado Whapi.Cloud "${status}" para canal ${channelId} a compañía ${companyId}`);
    this.emitToCompany(companyId, 'whapi:status', {
      channelId,
      status,
      ...data
    });
  }
}
