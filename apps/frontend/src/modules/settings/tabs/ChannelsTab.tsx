import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, PlusCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { WhatsAppService } from "@/services/Whatsapp/queries";
import { ChannelsService } from "@/services/Channels/queries";
import { Channel } from "@/services/Whatsapp/types";
import { AddChannelModal } from "../channels/AddChannelModal";
import { ChannelCard } from "../channels/ChannelCard";
import { ConnectFunnelModal } from '../channels/ConnectFunnelModal';
import { useSocket } from "@/contexts/SocketContext";

export function ChannelsTab() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const companyId = user?.company?.id;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [funnelModalChannelId, setFunnelModalChannelId] = useState<string | null>(null);
  const [forceRefreshCounter, setForceRefreshCounter] = useState(0);

  const {
    data: channels,
    isLoading,
    error,
    refetch
  } = useQuery<Channel[]>({
    queryKey: ['channels', companyId, forceRefreshCounter],
    queryFn: async () => {
      if (!companyId) {
        throw new Error('companyId no está disponible');
      }
      const res = await ChannelsService.getChannels(companyId);
      console.log('[ChannelsTab] /channels response:', res);
      return res;
    },
    enabled: !!companyId,
    refetchInterval: 30000,
    staleTime: 10000,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes('companyId') || error?.message?.includes('UUID')) {
        return false;
      }
      return failureCount < 3;
    }
  });

  const forceRefresh = useCallback(() => {
    console.log('[ChannelsTab] Forcing refresh...');
    setForceRefreshCounter(prev => prev + 1);
    refetch();
    queryClient.invalidateQueries({ queryKey: ['channels'] });
  }, [refetch, queryClient]);

  useEffect(() => {
    const handleChannelsRefresh = () => {
      console.log('[ChannelsTab] Event channels:refresh received');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['channels', companyId] });
    };

    window.addEventListener('channels:refresh', handleChannelsRefresh);
    
    return () => {
      window.removeEventListener('channels:refresh', handleChannelsRefresh);
    };
  }, [refetch, queryClient, companyId]);

  useEffect(() => {
    if (!socket) return;

    const handleWhapiStatus = (data: any) => {
      console.log('[ChannelsTab] Whapi status received:', data);
      if (data.status === 'connected' || data.status === 'active') {
        console.log('[ChannelsTab] Channel connected, refreshing list...');
        setTimeout(() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['channels', companyId] });
        }, 1000);
      }
    };

    const handleConnectionStatus = (data: any) => {
      console.log('[ChannelsTab] Connection status received:', data);
      if (data.status === 'connected' || data.status === 'ready') {
        console.log('[ChannelsTab] Connection established, refreshing list...');
        setTimeout(() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['channels', companyId] });
        }, 1000);
      }
    };

    const handleChannelCreated = () => {
      console.log('[ChannelsTab] Channel created event received');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['channels', companyId] });
    };

    socket.on('whapi:status', handleWhapiStatus);
    socket.on('connectionStatus', handleConnectionStatus);
    socket.on('channel:created', handleChannelCreated);

    return () => {
      socket.off('whapi:status', handleWhapiStatus);
      socket.off('connectionStatus', handleConnectionStatus);
      socket.off('channel:created', handleChannelCreated);
    };
  }, [socket, refetch, queryClient, companyId]);

  const handleChannelAdded = (newChannelId?: string) => {
    console.log('[ChannelsTab] handleChannelAdded called. New channel ID:', newChannelId);
    forceRefresh();
    setTimeout(() => forceRefresh(), 1000);
    setTimeout(() => forceRefresh(), 2000);
    setTimeout(() => forceRefresh(), 3000);
    queryClient.invalidateQueries({ queryKey: ['channels', companyId] });
    setTimeout(() => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['channels', companyId] });
    }, 2000);
    if (newChannelId) {
      setFunnelModalChannelId(newChannelId);
    }
  };

  const handleChannelUpdate = () => {
    console.log('[ChannelsTab] handleChannelUpdate called');
    refetch();
    queryClient.invalidateQueries({ queryKey: ['channels', companyId] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Canales de Comunicación</h3>
          <p className="text-sm text-muted-foreground">
            Conecta y gestiona tus canales de comunicación.
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Agregar Canal
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <Card>
            <CardHeader>
              <CardTitle>Cargando...</CardTitle>
            </CardHeader>
          </Card>
        ) : error ? (
          <Card className="col-span-full">
            <CardHeader>
              <CardTitle>Error al cargar canales</CardTitle>
              <CardDescription>
                {(error as any).message?.includes('companyId') || (error as any).message?.includes('UUID') 
                  ? 'Error de configuración: El ID de la compañía no es válido. Por favor, cierra sesión y vuelve a iniciar sesión.'
                  : (error as any).message || 'Ha ocurrido un error inesperado al cargar los canales.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button onClick={() => {
                  refetch();
                  queryClient.invalidateQueries({ queryKey: ['channels', companyId] });
                }}>
                  Reintentar
                </Button>
                {(((error as any).message?.includes('companyId')) || ((error as any).message?.includes('UUID'))) && (
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.reload()}
                  >
                    Recargar página
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : channels?.length === 0 ? (
          <Card className="col-span-full">
            <CardHeader>
              <CardTitle>No hay canales configurados</CardTitle>
              <CardDescription>
                Agrega un nuevo canal para comenzar a enviar mensajes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar Canal
              </Button>
            </CardContent>
          </Card>
        ) : (
          channels?.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              onUpdate={handleChannelUpdate}
            />
          ))
        )}
      </div>

      <AddChannelModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleChannelAdded}
      />

      <ConnectFunnelModal
        isOpen={!!funnelModalChannelId}
        onClose={() => setFunnelModalChannelId(null)}
        channelId={funnelModalChannelId ?? undefined}
      />
    </div>
  );
}
