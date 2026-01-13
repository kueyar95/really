import { useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getStageClients } from '@/services/Stages/queries';

interface StageClient {
  id: string;
  name: string;
  phone: string;
  email: string;
  data?: Record<string, unknown>;
  assignedAt?: string;
  assignedUser?: {
    username: string;
  };
}

interface StageEvents {
  funnelId: string;
  onNewClient?: (client: StageClient) => void;
  onClientMoved?: (data: {
    clientId: string;
    fromStageId: string;
    toStageId: string;
    client: StageClient;
  }) => void;
}

export function useStageEvents({ funnelId, onNewClient, onClientMoved }: StageEvents) {
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!socket || !user?.company?.id) return;

    const handleNewClient = (data: {
      stageId: string;
      client: StageClient;
      companyId: string;
      funnelId: string;
    }) => {
      if (data.companyId !== String(user?.company?.id)) return;
      if (data.funnelId === funnelId) {
        onNewClient?.(data.client);
      }

      queryClient.invalidateQueries({ queryKey: ['stages', data.funnelId] });
      queryClient.invalidateQueries({
        queryKey: ['stageClients', String(data.stageId)],
        exact: true
      });
    };

    const handleClientMoved = async (data: {
      clientId: string;
      fromStageId: string;
      toStageId: string;
      client: StageClient;
      companyId: string;
      funnelId: string;
    }) => {
      if (data.companyId !== String(user?.company?.id)) return;
      if (data.funnelId === funnelId) {
        onClientMoved?.(data);
      }

      await queryClient.invalidateQueries({ queryKey: ['stages', data.funnelId] });
      await queryClient.refetchQueries({ queryKey: ['stages', data.funnelId] });
      await queryClient.invalidateQueries({
        queryKey: ['stageClients', String(data.fromStageId)],
        exact: true
      });
      await queryClient.fetchQuery({
        queryKey: ['stageClients', String(data.fromStageId)],
        queryFn: () => getStageClients(data.fromStageId)
      });

      await queryClient.invalidateQueries({
        queryKey: ['stageClients', String(data.toStageId)],
        exact: true
      });
      const toStageData = await queryClient.fetchQuery({
        queryKey: ['stageClients', String(data.toStageId)],
        queryFn: () => getStageClients(data.toStageId)
      });
    };

    // Verificar conexión inicial
    socket.on('connect', () => {
    });

    socket.on('disconnect', (reason: string) => {
    });

    // Escuchar eventos a nivel de empresa
    socket.on('newClient', handleNewClient);
    socket.on('clientMoved', handleClientMoved);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('newClient', handleNewClient);
      socket.off('clientMoved', handleClientMoved);
    };
  }, [socket, funnelId, onNewClient, onClientMoved, queryClient, user]);
}