import { useMutation, useQuery } from '@tanstack/react-query';
import { SheetsService } from '@/services/Sheets/queries';
import { useToast } from './use-toast';
import { useState } from 'react';

export const useGoogleSheets = () => {
  const { toast } = useToast();
  const [isCallbackLoading, setIsCallbackLoading] = useState(false);

  const { data: status, refetch: refetchStatus, isLoading: queryLoading } = useQuery({
    queryKey: ['sheets-status'],
    queryFn: SheetsService.getStatus,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const { mutateAsync: getAuthUrl } = useMutation({
    mutationFn: SheetsService.getAuthUrl,
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });

  const { mutateAsync: handleCallback } = useMutation({
    mutationFn: SheetsService.handleCallback,
    onMutate: () => {
      setIsCallbackLoading(true);
    },
    onSuccess: async () => {
      await refetchStatus();
      setIsCallbackLoading(false);
      toast({
        title: 'Éxito',
        description: 'Google Sheets conectado correctamente',
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
    mutationFn: SheetsService.disconnect,
      onSuccess: () => {
      refetchStatus();
      toast({
        title: 'Éxito',
        description: 'Google Sheets desconectado correctamente',
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

  const { mutateAsync: verifyAccess } = useMutation({
    mutationFn: SheetsService.verifyAccess,
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });

  const connectGoogleSheets = async () => {
    try {
      const { url } = await getAuthUrl();
      localStorage.setItem('sheetsReturnUrl', '/dashboard/settings?tab=integrations&sheet=true');
      window.location.href = url;
    } catch (error) {
      console.error('Error al conectar con Google Sheets:', error);
      window.location.href = '/dashboard/settings?tab=integrations&sheet=true&error=true';
    }
  };

  return {
    isConnected: isCallbackLoading ? true : status?.status,
    connectGoogleSheets,
    handleCallback,
    disconnect,
    verifyAccess,
    isLoading: queryLoading && !isCallbackLoading
  };
};