import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ToastProvider } from "@/components/ui/toast";
import { Loader } from "@/components/ui/loader";
import { useChatEvents } from "@/hooks/useChatEvents";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { WhatsAppService } from "@/services/Whatsapp/queries";
import { ChatClient, ChatMessage } from "@/services/Whatsapp/types";
import { useQueryClient } from "@tanstack/react-query";
import { Client, Funnel } from "./types";
import { useSearchParams, useParams } from "react-router-dom";
import { Channel } from "@/modules/chats/types";
import { ChatHeader } from "@/modules/chats/components/ChatHeader";
import { ChatMessages } from "@/modules/chats/components/ChatMessages";
import { ChatInput } from "@/modules/chats/components/ChatInput";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState } from "@/modules/chats/components/EmptyState";
import { ChatsSidebar } from './components/sidebar/ChatsSidebar';
import { 
  changeStage, 
  getStagesByFunnel, 
  assignUserToClientStage,
  getClientStageInFunnel
} from '@/services/Stages/queries';
import { Stage } from '@/services/Stages/types';

interface ClientData {
  client: ChatClient;
  messages: ChatMessage[];
  lastMessage: {
    message: string;
    direction: 'inbound' | 'outbound';
    createdAt: string;
  };
}

// Actualizar el tipo en ChatHistoryResponse
export interface ChatHistoryResponse {
  clients: Array<ClientData>;
  total: number;
}

export function Chats() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const { channelId } = useParams();
  const clientIdFromUrl = searchParams.get('clientId');

  // Estados
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedClientData, setSelectedClientData] = useState<ChatHistoryResponse["clients"][0] | null>(null);

  // Helper para el valor del select
  const selectedChannelValue = useMemo(() => {
    if (selectedFunnelId) return `funnel:${selectedFunnelId}`;
    if (selectedChannelId) return `channel:${selectedChannelId}`;
    return '';
  }, [selectedFunnelId, selectedChannelId]);

  // Query para obtener los datos de la compañía
  const { data: companyData, isLoading: isLoadingFunnels } = useQuery({
    queryKey: ["company-chats", user?.company?.id],
    queryFn: () => WhatsAppService.findByCompanyId(user?.company?.id || ""),
    enabled: !!user?.company?.id
  });

  // Obtener channelId del cliente (puede venir de channel.id o channelId directamente)
  const clientChannelId = useMemo(() => {
    if (!selectedClientData?.client) return undefined;
    const channelId = selectedClientData.client.channel?.id || (selectedClientData.client as any).channelId;
    console.log('[Chats] clientChannelId calculado:', { 
      hasClient: !!selectedClientData?.client,
      channelId,
      channelObject: selectedClientData.client.channel,
      directChannelId: (selectedClientData.client as any).channelId
    });
    return channelId;
  }, [selectedClientData?.client]);

  // Verificar si la query debe estar habilitada
  const isQueryEnabled = !!selectedClientData?.client?.id;
  
  // Query para mensajes del cliente (filtrado por canal)
  const { data: clientMessages, isLoading: isLoadingMessages, error: messagesError } = useQuery({
    queryKey: ['client-messages', selectedClientData?.client?.id?.toString(), clientChannelId],
    queryFn: () => {
      const clientId = String(selectedClientData?.client?.id);
      console.log('[Chats] ⚡ Ejecutando query para obtener mensajes:', { clientId, channelId: clientChannelId });
      return WhatsAppService.getClientChatHistory(clientId, clientChannelId);
    },
    enabled: isQueryEnabled
  });

  // Log cuando cambia el estado de la query
  useEffect(() => {
    console.log('[Chats] Estado de la query:', {
      isQueryEnabled,
      clientId: selectedClientData?.client?.id,
      channelId: clientChannelId,
      isLoadingMessages,
      messagesCount: clientMessages?.length || 0,
      hasError: !!messagesError
    });
  }, [isQueryEnabled, selectedClientData?.client?.id, clientChannelId, isLoadingMessages, clientMessages, messagesError]);

  // Debug: Log cuando cambian los mensajes
  useEffect(() => {
    if (selectedClientData?.client?.id) {
      console.log('[Chats] Cliente seleccionado:', {
        clientId: selectedClientData.client.id,
        channelId: clientChannelId,
        channelObject: selectedClientData.client.channel,
        hasChannelId: !!(selectedClientData.client as any).channelId,
        messagesCount: clientMessages?.length || 0,
        isLoadingMessages,
        messagesError: messagesError?.message
      });
    }
  }, [selectedClientData?.client?.id, clientChannelId, clientMessages, isLoadingMessages, messagesError]);

  // Procesar clientes del funnel o canal seleccionado
  const sortedClients = useMemo(() => {
    if (!companyData?.funnels) {
      console.log('[Chats] sortedClients: No hay companyData.funnels');
      return [];
    }

    let clients: Client[] = [];

    if (selectedFunnelId) {
      const selectedFunnel = companyData.funnels.find((f: Funnel) => f.id === selectedFunnelId);
      if (selectedFunnel) {
        clients = selectedFunnel.channels.flatMap((channel: Channel) => channel.clients);
        console.log('[Chats] sortedClients: Funnel seleccionado', { 
          funnelId: selectedFunnelId, 
          channelsCount: selectedFunnel.channels.length,
          clientsCount: clients.length 
        });
      }
    } else if (selectedChannelId) {
      clients = companyData.funnels
        .flatMap((funnel: Funnel) => funnel.channels)
        .find((channel: Channel) => channel.id === selectedChannelId)
        ?.clients || [];
      console.log('[Chats] sortedClients: Canal seleccionado', { 
        channelId: selectedChannelId, 
        clientsCount: clients.length 
      });
    } else {
      console.log('[Chats] sortedClients: No hay funnel ni canal seleccionado');
    }

    const mappedClients = clients.map(client => ({
      client: {
        id: client.id,
        name: client.name,
        phone: client.phone,
        email: client.email || '',
        channel: client.channel,
        channelId: (client as any).channelId || client.channel?.id, // Asegurar que channelId esté disponible
        stage: client.stage,
        hasBot: client.hasBot,
        assignedUser: client.assignedUser,
        lastMessage: client.lastMessage
      },
      messages: [],
      lastMessage: {
        id: String(Date.now()),
        message: client.lastMessage?.message || '',
        direction: client.lastMessage?.direction || 'outbound',
        createdAt: client.lastMessage?.createdAt || new Date().toISOString(),
        metadata: {},
        channelId: client.channel?.id || (client as any).channelId
      }
    }));
    
    console.log('[Chats] sortedClients: Clientes mapeados', { 
      count: mappedClients.length,
      clients: mappedClients.slice(0, 3).map(c => ({
        id: c.client.id,
        name: c.client.name,
        channelId: c.client.channel?.id || (c.client as any).channelId,
        hasChannel: !!c.client.channel
      }))
    });
    
    return mappedClients;
  }, [companyData, selectedFunnelId, selectedChannelId]);

  // 🔧 A) Mantener sincronizado el cliente seleccionado con el caché ['company-chats']
  useEffect(() => {
    if (!selectedClientData) return;
    const fresh = sortedClients.find(
      c => String(c.client.id) === String(selectedClientData.client.id) &&
           c.client.channel?.id === selectedClientData.client.channel?.id
    );
    if (fresh && fresh !== selectedClientData) {
      setSelectedClientData(fresh);
    }
  }, [sortedClients, selectedClientData?.client.id, selectedClientData?.client.channel?.id]);

  // Obtener los IDs de los canales del funnel seleccionado
  const funnelChannelIds = useMemo(() => {
    if (!selectedFunnelId || !companyData?.funnels) return [];
    const funnel = companyData.funnels.find((f: Funnel) => f.id === selectedFunnelId);
    return funnel?.channels.map((c: Channel) => c.id) || [];
  }, [selectedFunnelId, companyData]);

  // Efecto para cargar el canal y cliente desde la URL
  useEffect(() => {
    console.log('[Chats] Efecto para cargar canal/cliente:', {
      channelId,
      hasCompanyData: !!companyData,
      funnelsCount: companyData?.funnels?.length || 0,
      selectedFunnelId,
      selectedChannelId
    });
    
    if (channelId) {
      console.log('[Chats] Estableciendo selectedChannelId desde URL:', channelId);
      setSelectedChannelId(channelId);
    } else if (companyData?.funnels?.length > 0 && !selectedFunnelId && !selectedChannelId) {
      const firstFunnel = companyData?.funnels[0];
      if (firstFunnel) {
        console.log('[Chats] Estableciendo primer funnel por defecto:', firstFunnel.id);
        setSelectedFunnelId(firstFunnel.id);
      }
    }
  }, [channelId, companyData, selectedFunnelId, selectedChannelId]);

  // Efecto para seleccionar el cliente cuando los datos estén disponibles
  useEffect(() => {
    if (clientIdFromUrl && sortedClients.length > 0) {
      const clientData = sortedClients.find(c => String(c.client.id) === clientIdFromUrl);
      if (clientData) {
        setSelectedClientData(clientData);
      }
    }
  }, [clientIdFromUrl, sortedClients]);

  // Handlers
  const handleSelectionChange = useCallback((channelId: string, funnelId?: string) => {
    if (funnelId) {
      // Si se selecciona un funnel
      setSelectedFunnelId(funnelId);
      setSelectedChannelId(null); // Limpiar selección de canal
    } else {
      // Si se selecciona un canal
      setSelectedFunnelId(null);
      setSelectedChannelId(channelId);
    }
    setSelectedClientData(null);
  }, []);

  const handleSelectClient = useCallback((client: ChatClient) => {
    console.log('[Chats] handleSelectClient llamado:', { 
      clientId: client.id, 
      channelId: client.channel?.id,
      clientObject: client
    });
    const clientData = sortedClients.find(c => 
      String(c.client.id) === String(client.id) &&
      c.client.channel?.id === client.channel?.id
    );
    console.log('[Chats] clientData encontrado:', { 
      found: !!clientData,
      clientData: clientData ? {
        clientId: clientData.client.id,
        channelId: clientData.client.channel?.id,
        hasChannel: !!clientData.client.channel
      } : null
    });
    if (clientData) {
      setSelectedClientData(clientData);
      console.log('[Chats] selectedClientData actualizado');
    } else {
      console.warn('[Chats] ⚠️ No se encontró clientData para el cliente seleccionado');
    }
  }, [sortedClients]);

  // Chat events actualizado
  const { sendMessage, isConnected, refreshChatData } = useChatEvents({
    selectedChannelId,
    selectedFunnelId,
    clientId: String(selectedClientData?.client?.id),
    channels: funnelChannelIds,
    onNewMessage: (message) => {
      if (message.from === 'me') return;

      const phoneToSearch = message.isBot ? message.to.split('@')[0] : message.from.split('@')[0];

      const bumpCompanyChatsCache = () => {
        if (!user?.company?.id) return;
        queryClient.setQueryData(['company-chats', user.company.id], (old: any) => {
          if (!old?.funnels) return old;
          const updated = { ...old };
          let updatedAny = false;
          updated.funnels = old.funnels.map((funnel: any) => {
            const channels = (funnel.channels || []).map((channel: any) => {
              if (channel.id !== (message.channelId || '')) return channel;
              const clients = [...(channel.clients || [])];
              // Preferir emparejar por clientId si viene del backend
              const idxById = message.clientId
                ? clients.findIndex((c: any) => String(c.id) === String(message.clientId))
                : -1;
              const idxByPhone = clients.findIndex((c: any) => c.phone === phoneToSearch);
              const lastMessage = {
                message: message.body,
                direction: message.isBot ? 'outbound' : 'inbound',
                createdAt: new Date(message.createdAt).toISOString(),
              };
              if (idxById !== -1) {
                const updatedClient = { ...clients[idxById], lastMessage };
                clients.splice(idxById, 1);
                clients.unshift(updatedClient);
                updatedAny = true;
              } else if (idxByPhone !== -1) {
                const updatedClient = { ...clients[idxByPhone], lastMessage };
                clients.splice(idxByPhone, 1);
                clients.unshift(updatedClient);
                updatedAny = true;
              } else {
                // Si no podemos identificar el cliente por id/phone, no crear placeholder para evitar duplicados.
                // Dejar que un refetch traiga el cliente real.
              }
              return { ...channel, clients };
            });
            return { ...funnel, channels };
          });
          // Si no se actualizó ninguno, forzar refetch
          if (!updatedAny && user?.company?.id) {
            queueMicrotask(() => {
              queryClient.invalidateQueries({ queryKey: ['company-chats', user.company.id] });
            });
          }
          return updatedAny ? updated : old;
        });
      };

      if (selectedClientData?.client.phone === phoneToSearch) {
        queryClient.setQueryData<ChatMessage[]>(
          ['client-messages', selectedClientData.client.id.toString(), selectedClientData.client.channel?.id],
          (oldMessages = []) => [...(oldMessages || []), {
            id: message.id,
            message: message.body,
            direction: message.isBot ? 'outbound' : 'inbound',
            createdAt: new Date(message.createdAt).toISOString(),
            metadata: message.metadata || {},
            channelId: message.channelId || ''
          }]
        );
        bumpCompanyChatsCache();
      } else {
        toast({
          title: "Nuevo mensaje",
          description: `De: ${message.from.split('@')[0]}`,
        });
        bumpCompanyChatsCache();
      }
    }
  });

  // Autoscroll al recibir mensajes
  useEffect(() => {
    if (chatContainerRef.current && clientMessages?.length) {
      const container = chatContainerRef.current;
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [clientMessages]);

  const assignLeadToCurrentUser = async (client: ChatClient) => {
    if (!user?.company?.id) return false;
    
    try {
      const companyData = await queryClient.fetchQuery({
        queryKey: ['company-chats', user.company.id],
        queryFn: async () => {
          return await WhatsAppService.findByCompanyId(user.company.id);
        }
      });

      let funnelId = '';
      for (const funnel of companyData.funnels || []) {
        const channelExists = funnel.channels.some((channel: any) => 
          channel.id === client.channel.id
        );
        if (channelExists) {
          funnelId = funnel.id;
          break;
        }
      }

      if (!funnelId) return false;

      const stages = await getStagesByFunnel(funnelId);
      const nonBotStage = stages.find((stage: Stage) => !stage.botId);
      
      if (!nonBotStage) return false;

      // Cambiar el stage del cliente en el canal específico
      await changeStage(client.id.toString(), nonBotStage.id, client.channel?.id);
      
      // Obtener el ClientStage actual en el funnel para asignar con su ID correcto
      // Pasar el channelId para asegurar que se asigne solo el chat correcto
      const clientStage = await getClientStageInFunnel(
        client.id.toString(), 
        funnelId, 
        client.channel?.id
      );
      if (clientStage?.id) {
        await assignUserToClientStage(clientStage.id, user.normalized_id);
      }
      
      toast({
        title: "Lead asignado",
        description: `El lead ha sido asignado a ${user.username}.`,
      });
      
      // Optimista: actualizar estado local
      setSelectedClientData(prev => {
        if (!prev) return prev;
        if (String(prev.client.id) !== String(client.id) || 
            prev.client.channel?.id !== client.channel?.id) return prev;
        return {
          ...prev,
          client: {
            ...prev.client,
            stage: {
              id: nonBotStage.id,
              name: nonBotStage.name
            },
            assignedUser: {
              ...(prev.client.assignedUser || {}),
              id: user.normalized_id,
              username: user.username
            }
          }
        };
      });

      refreshChatData();
      queryClient.invalidateQueries({ queryKey: ['company-chats'] });
      return true;
    } catch (error) {
      console.error("Error al asignar el lead:", error);
      return false;
    }
  };

  const handleSendMessage = async (messageContent: string) => {
    console.log("handleSendMessage", messageContent);
    if (!selectedClientData?.client) return;

    const recipientPhone = selectedClientData.client.phone;
    const channelId = selectedClientData.client.channel.id;
    const client = selectedClientData.client;
    console.log("channelId", channelId);
    console.log("client", client);
    console.log("recipientPhone", recipientPhone);

    try {
      // Enviar (acepta tanto Promise como void)
      await Promise.resolve(sendMessage(recipientPhone, messageContent, channelId));

      // 🔧 B) Invalida el caché tras enviar (para refrescar etapa/assignedUser/cabecera)
      await queryClient.invalidateQueries({ queryKey: ['company-chats'] }); // Invalidation recomendado por TanStack Query. :contentReference[oaicite:2]{index=2}

      // (Opcional) Optimista: actualizar lastMessage en cabecera
      // setSelectedClientData(prev => prev ? ({
      //   ...prev,
      //   client: {
      //     ...prev.client,
      //     lastMessage: {
      //       message: messageContent,
      //       direction: 'outbound',
      //       createdAt: new Date().toISOString()
      //     }
      //   }
      // }) : prev);

      // Si aún no está asignado, asigna automáticamente
      if (!selectedClientData.client.assignedUser) {
        await assignLeadToCurrentUser(selectedClientData.client);
      }

    } catch (e) {
      console.error("Error al enviar mensaje:", e);
      toast({
        title: "Error al enviar mensaje",
        description: "Por favor, intenta nuevamente",
        variant: "destructive",
      });
    }
  };

  // Polling suave si el socket está conectado
  useEffect(() => {
    if (selectedClientData?.client) {
      const refreshInterval = setInterval(() => {
        if (isConnected) {
          refreshChatData();
        }
      }, 5000);
      return () => clearInterval(refreshInterval);
    }
  }, [selectedClientData?.client, isConnected, refreshChatData]);

  // Validaciones de seguridad
  if (authLoading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;

  const sidebarProps = {
    clients: sortedClients,
    selectedClient: selectedClientData?.client,
    onSelectClient: handleSelectClient,
    channels: companyData?.funnels.map((funnel: Funnel) => ({
      ...funnel,
      channels: funnel.channels || []
    })) || [],
    selectedChannel: selectedChannelValue,
    onChannelChange: handleSelectionChange,
    isConnected: isConnected,
    isLoading: isLoadingFunnels
  };

  return (
    <SidebarProvider className="relative min-h-fit overflow-hidden" defaultOpen>
      <ToastProvider>
        <div className="relative flex w-full h-[calc(100vh-64px)] overflow-hidden">
          <ChatsSidebar {...sidebarProps} />
          <SidebarInset className="bg-[#f0f2f5] flex-1 min-h-fit overflow-hidden flex flex-col">
            {selectedClientData?.client ? (
              <>
                <ChatHeader client={selectedClientData.client} />
                <div className="flex-1 flex flex-col h-[calc(100vh-160px)] overflow-hidden">
                  <div
                    className="flex-1 overflow-y-auto"
                    style={{
                      backgroundImage: "url('/bg_wa_chat.jpg')",
                      backgroundRepeat: "repeat",
                      backgroundSize: "contain",
                      backgroundColor: "#efeae2",
                    }}
                    ref={chatContainerRef}
                  >
                    <ChatMessages
                      messages={clientMessages || []}
                      isLoading={isLoadingMessages}
                    />
                    {/* Debug info */}
                    {process.env.NODE_ENV === 'development' && (
                      <div style={{ position: 'fixed', bottom: 10, right: 10, background: 'rgba(0,0,0,0.8)', color: 'white', padding: '10px', fontSize: '12px', zIndex: 9999, maxWidth: '300px' }}>
                        <div>Client ID: {selectedClientData?.client?.id || 'N/A'}</div>
                        <div>Channel ID: {clientChannelId || 'N/A'}</div>
                        <div>Messages: {clientMessages?.length || 0}</div>
                        <div>Loading: {isLoadingMessages ? 'Yes' : 'No'}</div>
                        <div>Query Enabled: {isQueryEnabled ? 'Yes' : 'No'}</div>
                        {messagesError && <div style={{ color: 'red' }}>Error: {messagesError.message}</div>}
                      </div>
                    )}
                  </div>
                  <ChatInput
                    onSendMessage={handleSendMessage}
                    disabled={!selectedClientData}
                  />
                </div>
              </>
            ) : (
              <EmptyState />
            )}
          </SidebarInset>
        </div>
      </ToastProvider>
    </SidebarProvider>
  );
}
