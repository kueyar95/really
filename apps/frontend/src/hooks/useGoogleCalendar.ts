import { useMutation, useQuery } from '@tanstack/react-query';
import { CalendarService } from '@/services/Calendar/queries';
import { useToast } from './use-toast';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useGoogleCalendar = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isCallbackLoading, setIsCallbackLoading] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const { data: status, refetch: refetchStatus, isLoading: queryLoading } = useQuery({
    queryKey: ['calendar-status'],
    queryFn: CalendarService.getStatus,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const { mutateAsync: getAuthUrl } = useMutation({
    mutationFn: CalendarService.getAuthUrl,
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });

  const { mutateAsync: handleCallback } = useMutation({
    mutationFn: async ({ code, state }: { code: string; state: string }) => {
      return CalendarService.handleCallback(code, state);
    },
    onMutate: () => {
      setIsCallbackLoading(true);
    },
    onSuccess: async () => {
      await refetchStatus();
      setIsCallbackLoading(false);
      toast({
        title: 'Éxito',
        description: 'Google Calendar conectado correctamente',
      });
    },
    onError: (error: Error) => {
      setIsCallbackLoading(false);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  });

  const { mutateAsync: disconnect } = useMutation({
    mutationFn: CalendarService.disconnect,
    onMutate: () => {
      setIsDisconnecting(true);
    },
    onSuccess: async () => {
      await refetchStatus();
      setIsDisconnecting(false);
      toast({
        title: 'Éxito',
        description: 'Integración de Google Calendar desconectada correctamente',
      });
    },
    onError: (error: Error) => {
      setIsDisconnecting(false);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });

  const { mutateAsync: disconnectCalendar } = useMutation({
    mutationFn: CalendarService.disconnectCalendar,
    onSuccess: async () => {
      toast({
        title: 'Éxito',
        description: 'Calendario desconectado correctamente',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });

  const connectGoogleCalendar = async () => {
    try {
      if (!user?.company?.id) {
        throw new Error('No se encontró el ID de la compañía');
      }

      const returnUrl = '/dashboard/settings?tab=integrations';
      localStorage.setItem('calendarReturnUrl', returnUrl);

      const { url } = await getAuthUrl();
      // Parseamos la URL para manejar correctamente los parámetros
      const authUrl = new URL(url);
      // Reemplazamos el state existente o agregamos uno nuevo
      authUrl.searchParams.set('state', user.company.id);

      window.location.href = authUrl.toString();
    } catch (error) {
      console.error('Error al conectar con Google Calendar:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al conectar con Google Calendar',
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Error al desconectar la integración de Google Calendar:', error);
    }
  };

  const handleDisconnectCalendar = async (calendarId: string) => {
    try {
      await disconnectCalendar(calendarId);
    } catch (error) {
      console.error('Error al desconectar el calendario:', error);
    }
  };

  return {
    isConnected: isCallbackLoading ? true : status?.isConnected || false,
    connectGoogleCalendar,
    handleCallback,
    handleDisconnect,
    handleDisconnectCalendar,
    isDisconnecting,
    isLoading: queryLoading && !isCallbackLoading
  };
};