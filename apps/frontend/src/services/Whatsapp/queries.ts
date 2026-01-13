/* eslint-disable @typescript-eslint/no-explicit-any */
import { AxiosError } from 'axios';
import api from '../api';
import { Channel, ChatMessage, FunnelChatsResponse, Funnel } from './types';
import { ConnectChannelDto, SendMessageDto } from '../Channels/types';

export class WhatsAppService {
  public static async getChannels(companyId: string) {
    try {
      const response = await api.get<Channel[]>(`/channels?companyId=${companyId}`);
      console.log('[WhatsAppService] /channels backend response:', response.data); // 👈 Log
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message);
      }
      throw new Error('Error inesperado');
    }
  }

  public static async getChannel(id: string) {
    try {
      const response = await api.get<Channel>(`/channels/${id}`);
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message);
      }
      throw new Error('Error inesperado');
    }
  }

  public static async getChannelsStatus(companyId: string) {
    try {
      const response = await api.get(`/funnels/company/${companyId}/channels-status`);
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message);
      }
      throw new Error('Error inesperado');
    }
  }

  public static async connectChannel(data: ConnectChannelDto) {
    try {
      const response = await api.post<Channel>('/channels/connect', data);
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message);
      }
      throw new Error('Error inesperado');
    }
  }

  public static async disconnectChannel(id: string) {
    try {
      const response = await api.post<void>(`/channels/${id}/disconnect`);
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message);
      }
      throw new Error('Error inesperado');
    }
  }

  public static async sendMessage(id: string, data: SendMessageDto) {
    try {
      const response = await api.post<void>(`/channels/${id}/send`, data);
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message);
      }
      throw new Error('Error inesperado');
    }
  }

  public static async getFunnelChats(funnelId: string) {
    try {
      const response = await api.get<FunnelChatsResponse>(`/chat-history/funnel/${funnelId}`);
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message);
      }
      throw new Error('Error inesperado');
    }
  }

  public static async getChannelChatHistory(channelId: string) {
    try {
      const response = await api.get(`/chat-history/channel/${channelId}`);
      const clientsMap = new Map();

      response.data.forEach((chat: any) => {
        if (!clientsMap.has(chat.client.id)) {
          // Obtener la etapa actual del cliente
          const currentStage = chat.client.clientStages?.[0]?.stage
            ? {
                id: String(chat.client.clientStages[0].stage.id),
                stageId: String(chat.client.clientStages[0].stage.id),
                name: chat.client.clientStages[0].stage.name,
                botId: chat.client.clientStages[0].stage.botId
              }
            : null;

          clientsMap.set(chat.client.id, {
            client: {
              id: chat.client.id,
              name: chat.client.name,
              phone: chat.client.phone,
              email: chat.client.email || '',
              data: chat.client.data || {},
              currentStage,
              assignedUser: chat.client.assignedUser
            },
            messages: [],
            lastMessage: null
          });
        }

        const message = {
          id: chat.id,
          message: chat.message,
          direction: chat.direction,
          createdAt: new Date(chat.createdAt),
          metadata: chat.metadata || {}
        };

        const clientData = clientsMap.get(chat.client.id);
        clientData.messages.push(message);

        // Actualizar lastMessage si este mensaje es más reciente
        if (!clientData.lastMessage ||
            new Date(chat.createdAt).getTime() >
            new Date(clientData.lastMessage.createdAt).getTime()) {
          clientData.lastMessage = message;
        }
      });

      const formattedResponse = {
        clients: Array.from(clientsMap.values()).map(client => ({
          client: client,
          messages: [],
          lastMessage: {
            message: client.lastMessage.message,
            direction: client.lastMessage.direction,
            createdAt: client.lastMessage.createdAt
          }
        })),
        total: clientsMap.size
      };

      return formattedResponse;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message);
      }
      throw new Error('Error inesperado');
    }
  }

  public static async getClientChatHistory(clientId: string, channelId?: string): Promise<ChatMessage[]> {
    try {
      const params = channelId ? { channelId } : {};
      const response = await api.get(`/chat-history/client/${clientId}`, { params });
      
      // Validar que response.data sea un array
      if (!Array.isArray(response.data)) {
        console.error('[WhatsAppService] getClientChatHistory: response.data no es un array', response.data);
        return [];
      }
      
      const messages = response.data.map((chat: any) => ({
        id: chat.id,
        message: chat.message,
        direction: chat.direction,
        createdAt: chat.createdAt,
        metadata: chat.metadata || {},
        channelId: chat.channel?.id
      }));
      
      console.log(`[WhatsAppService] getClientChatHistory: ${messages.length} mensajes obtenidos para cliente ${clientId}, canal ${channelId}`);
      
      return messages;
    } catch (error) {
      console.error('[WhatsAppService] getClientChatHistory error:', error);
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message || 'Error al obtener historial de chat');
      }
      throw new Error('Error inesperado');
    }
  }

  public static async findByCompanyId(companyId: string) {
    try {
      const response = await api.get(`/chat-history/company/${companyId}`);
      return {
        funnels: response.data.funnels.map((funnel: Funnel) => ({
          ...funnel,
          channels: funnel.channels.map((channel: Channel) => ({
            ...channel,
            clients: channel.clients.map(client => ({
              ...client,
              channelId: channel.id,
              lastMessage: {
                message: client.lastMessage?.message || '',
                direction: client.lastMessage?.direction || 'outbound',
                createdAt: client.lastMessage?.createdAt || new Date().toISOString()
              }
            }))
          }))
        }))
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message);
      }
      throw new Error('Error inesperado');
    }
  }
}