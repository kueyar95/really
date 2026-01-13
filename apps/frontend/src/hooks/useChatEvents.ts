/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useCallback, useRef } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { useQueryClient } from "@tanstack/react-query";
import { ChatHistoryResponse, ChatClient, ChatMessage } from "@/services/Whatsapp/types";
import { useInactivity } from '@/contexts/InactivityContext';

interface Message {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
  createdAt: Date;
  clientId?: string;
  channelId?: string;
  hasMedia: boolean;
  type: string;
  isBot?: boolean;
  metadata?: Record<string, unknown>;
  clientName?: string;  // Nombre del cliente si es nuevo
  media?: {
    url: string;
    type: 'image' | 'video' | 'audio' | 'document' | 'sticker';
    mimetype: string;
    fileName?: string;
    fileLength?: number;
    caption?: string;
  };
}

interface MessageStatus {
  messageId: string;
  status: string;
}

interface UseChatEventsProps {
  onNewMessage?: (message: Message) => void;
  onMessageStatus?: (status: MessageStatus) => void;
  selectedChannelId?: string | null;
  selectedFunnelId?: string | null;
  clientId?: string;
  channels?: string[];
  user?: { company?: { id: string } };
}

export function useChatEvents({
  onNewMessage,
  onMessageStatus,
  selectedChannelId,
  selectedFunnelId,
  clientId,
  channels = [],
}: UseChatEventsProps) {
  const { socket } = useSocket();
  const { isDisconnected } = useInactivity();
  const queryClient = useQueryClient();
  const pendingMessages = useRef<Record<string, any>>({});

  // Refs para estado y callbacks
  const isInitialized = useRef(false);
  const currentChannels = useRef<string[]>([]);
  const callbacks = useRef({ onNewMessage, onMessageStatus });

  // Actualizar canales cuando cambien las props
  useEffect(() => {
    if (selectedFunnelId) {
      currentChannels.current = channels;
    } else if (selectedChannelId) {
      currentChannels.current = [selectedChannelId];
    }
  }, [selectedFunnelId, selectedChannelId, channels]);

  // Actualizar las referencias de callbacks cuando cambien
  useEffect(() => {
    callbacks.current = { onNewMessage, onMessageStatus };
  }, [onNewMessage, onMessageStatus]);

  const cacheUtils = useRef({
    updateCache: (message: Message, isBot: boolean) => {
      if (isDisconnected) return;
      queryClient.setQueriesData<ChatHistoryResponse>(
        { queryKey: ['channel-chats', currentChannels.current[0]] },
        (oldData) => {
          if (!oldData) return oldData;
          const newMessage = {
            id: message.id,
            message: message.body,
            direction: isBot ? 'outbound' : 'inbound',
            createdAt: new Date(message.createdAt).toISOString(),
            metadata: {
              ...message.metadata,
              media: message.media
            },
            isBot: isBot
          } as const;

          const phoneToSearch = isBot ? message.to.split('@')[0] : message.from.split('@')[0];

          const clientIndex = oldData.clients.findIndex(
            clientData => clientData.client.phone === phoneToSearch
          );

          if (clientIndex !== -1) {
            const updatedClients = [...oldData.clients];
            updatedClients[clientIndex] = {
              ...updatedClients[clientIndex],
              messages: [...updatedClients[clientIndex].messages, newMessage],
              lastMessage: newMessage
            };

            const [client] = updatedClients.splice(clientIndex, 1);
            updatedClients.unshift(client);

            return {
              ...oldData,
              clients: updatedClients
            };
          }

          const newClient: ChatClient = {
            id: Date.now().toString(),
            name: message.clientName || `Cliente ${phoneToSearch}`,
            phone: phoneToSearch,
            email: '',
            channel: {
              id: message.channelId || '',
              name: 'Canal',
              type: 'whatsapp_cloud'
            },
            stage: {
              id: 'initial',
              name: 'Inicial'
            },
            hasBot: false,
            lastMessage: {
              message: newMessage.message,
              direction: newMessage.direction,
              createdAt: newMessage.createdAt
            }
          };

          const newClientData = {
            client: newClient,
            messages: [newMessage],
            lastMessage: newMessage
          };

          return {
            ...oldData,
            clients: [newClientData, ...oldData.clients],
            total: oldData.total + 1
          };
        }
      );
    }
  });

  // Efecto principal para manejar eventos del socket
  useEffect(() => {
    if (!socket || isInitialized.current || isDisconnected) {
      return;
    }

    isInitialized.current = true;

    const handleMessage = (message: Message) => {
      const isRelevantMessage = selectedFunnelId
        ? channels.includes(message.channelId || '')
        : message.channelId === selectedChannelId;

      if (isRelevantMessage) {
        cacheUtils.current.updateCache(message, false);
        callbacks.current.onNewMessage?.(message);
        
        // Force a refresh on the client messages for the current client
        if (clientId) {
          const phoneToSearch = message.from.split('@')[0];
          
          // Check if message is for the current conversation
          if (clientId && phoneToSearch) {
            queryClient.invalidateQueries({ queryKey: ['client-messages', clientId] });
          }
        }
      } else {
        // Si cambió el canal (p.ej. tras reconectar), aún así notificar y refrescar la barra lateral
        callbacks.current.onNewMessage?.(message);
        queryClient.invalidateQueries({ queryKey: ['company-chats'] });
      }
    };

    const handleBotResponse = (message: Message) => {
      const isRelevantMessage = selectedFunnelId
        ? channels.includes(message.channelId || '')
        : message.channelId === selectedChannelId;

      if (isRelevantMessage) {
        cacheUtils.current.updateCache(message, true);
        callbacks.current.onNewMessage?.({ ...message, isBot: true });
        
        // Force a refresh on the client messages for the current client
        if (clientId) {
          const phoneToSearch = message.to.split('@')[0];
          
          // Check if bot message is for the current conversation
          if (clientId && phoneToSearch) {
            queryClient.invalidateQueries({ queryKey: ['client-messages', clientId] });
          }
        }
      } else {
        // Asegurar que la barra lateral se refresque aunque el canal actual no coincida
        callbacks.current.onNewMessage?.({ ...message, isBot: true });
        queryClient.invalidateQueries({ queryKey: ['company-chats'] });
      }
    };

    // Registrar listeners
    socket.on("message", handleMessage);

    // Si estamos en un funnel, escuchar todos sus canales
    if (selectedFunnelId) {
      channels.forEach(channelId => {
        socket.on(`baileys:${channelId}:message`, handleMessage);
      });
    } else if (selectedChannelId) {
      socket.on(`baileys:${selectedChannelId}:message`, handleMessage);
    }

    socket.on("bot_response", handleBotResponse);

    // Crear un wrapper para manejar el caso donde onMessageStatus es undefined
    const handleMessageStatus = (status: MessageStatus) => {
      if (callbacks.current.onMessageStatus) {
        callbacks.current.onMessageStatus(status);
      }
    };

    socket.on("message_status", handleMessageStatus);

    // Cleanup
    return () => {
      socket.off("message", handleMessage);

      if (selectedFunnelId) {
        channels.forEach(channelId => {
          socket.off(`baileys:${channelId}:message`, handleMessage);
        });
      } else if (selectedChannelId) {
        socket.off(`baileys:${selectedChannelId}:message`, handleMessage);
      }

      socket.off("bot_response", handleBotResponse);
      socket.off("message_status", handleMessageStatus);
      isInitialized.current = false;
    };
  }, [socket, selectedChannelId, selectedFunnelId, channels, isDisconnected]);

  // Efecto para limpiar mensajes pendientes al desmontar
  useEffect(() => {
    return () => {
      pendingMessages.current = {};
    };
  }, []);

  // Add a function to manually refresh chat data
  const refreshChatData = useCallback(() => {
    if (clientId) {
      queryClient.invalidateQueries({ queryKey: ['client-messages', clientId] });
    }
  }, [clientId, queryClient]);

  return {
    sendMessage: useCallback((to: string, content: string, channelId?: string) => {
      console.log("sendMessage", to, content, channelId);
      if (!socket || isDisconnected || !clientId) return;

      const messageId = Date.now().toString();
      const effectiveChannelId = channelId || selectedChannelId;

      // Crear mensaje optimista
      const newMessage: ChatMessage = {
        id: messageId,
        message: content,
        direction: 'outbound',
        createdAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        metadata: {},
        channelId: effectiveChannelId || '',
        status: 'pending'
      };
      socket.emit("sendMessage", {
        to,
        message: content,
        messageId,
        channelId: effectiveChannelId,
        metadata: { timestamp: Date.now(), type: 'text' }
      });

      const currentMessages = queryClient.getQueryData<ChatMessage[]>(['client-messages', clientId]) || [];
      console.log("currentMessages", currentMessages);
      queryClient.setQueryData(['client-messages', clientId.toString()], [...currentMessages, newMessage]);

      socket.once(`message_status:${messageId}`, (status: string) => {
        const messages = queryClient.getQueryData<ChatMessage[]>(['client-messages', clientId]) || [];
        queryClient.setQueryData(['client-messages', clientId],
          messages.map(msg => msg.id === messageId ? { ...msg, status } : msg)
        );
      });

    }, [socket, isDisconnected, selectedChannelId, clientId, queryClient]),
    isConnected: !!socket?.connected && !isDisconnected,
    refreshChatData
  };
}