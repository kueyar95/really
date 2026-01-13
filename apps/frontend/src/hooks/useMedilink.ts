import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MedilinkService, MedilinkConnectionDto } from '@/services/Medilink/queries';
import { useToast } from './use-toast';

export function useMedilink() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Query para obtener metadata de la integración
  const { 
    data: metadata, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['medilink', 'metadata'],
    queryFn: async () => {
      try {
        return await MedilinkService.getMetadata();
      } catch (error: any) {
        // Si es 404, significa que no hay integración configurada aún
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const isConnected = metadata?.status === 'connected';
  const isInvalidToken = metadata?.status === 'invalid_token';

  // Mutation para conectar
  const connectMutation = useMutation({
    mutationFn: (data: MedilinkConnectionDto) => MedilinkService.connect(data),
    onSuccess: () => {
      toast({
        title: 'Conexión exitosa',
        description: 'La integración con Medilink ha sido configurada correctamente',
      });
      queryClient.invalidateQueries({ queryKey: ['medilink'] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Error al conectar';
      
      // Detectar error de variable de entorno faltante
      if (errorMessage.includes('MEDILINK_ENCRYPTION_KEY_B64') || errorMessage.includes('CryptoService no está configurado')) {
        toast({
          variant: 'destructive',
          title: '🔧 Configuración del Servidor Incompleta',
          description: 'Falta configurar MEDILINK_ENCRYPTION_KEY_B64 en el servidor. Revisa el archivo MEDILINK_ENV_SETUP.md en el backend.',
          duration: 10000,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error de conexión',
          description: errorMessage,
        });
      }
    },
  });

  // Mutation para validar
  const validateMutation = useMutation({
    mutationFn: () => MedilinkService.validate(),
    onSuccess: () => {
      toast({
        title: 'Validación exitosa',
        description: 'La conexión con Medilink es válida',
      });
      queryClient.invalidateQueries({ queryKey: ['medilink'] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Error al validar';
      toast({
        variant: 'destructive',
        title: 'Error de validación',
        description: errorMessage,
      });
    },
  });

  // Mutation para desconectar
  const disconnectMutation = useMutation({
    mutationFn: (reason?: string) => MedilinkService.disconnect(reason),
    onSuccess: () => {
      toast({
        title: 'Desconectado',
        description: 'La integración con Medilink ha sido desconectada',
      });
      queryClient.invalidateQueries({ queryKey: ['medilink'] });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Error al desconectar',
      });
    },
  });

  const connect = useCallback(async (data: MedilinkConnectionDto) => {
    setIsConnecting(true);
    try {
      await connectMutation.mutateAsync(data);
    } finally {
      setIsConnecting(false);
    }
  }, [connectMutation]);

  const validate = useCallback(async () => {
    await validateMutation.mutateAsync();
  }, [validateMutation]);

  const disconnect = useCallback(async (reason?: string) => {
    setIsDisconnecting(true);
    try {
      await disconnectMutation.mutateAsync(reason);
    } finally {
      setIsDisconnecting(false);
    }
  }, [disconnectMutation]);

  return {
    // Estado
    isConnected,
    isInvalidToken,
    isLoading,
    isConnecting,
    isDisconnecting,
    metadata,
    error,

    // Acciones
    connect,
    validate,
    disconnect,
    refetch,
  };
}

// Hook para listar sucursales
export function useMedilinkBranches(enabled = true) {
  return useQuery({
    queryKey: ['medilink', 'branches'],
    queryFn: async () => {
      try {
        return await MedilinkService.listBranches();
      } catch (error: any) {
        if (error.response?.status === 404) {
          return [];
        }
        throw error;
      }
    },
    enabled,
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
}

// Hook para listar profesionales
export function useMedilinkProfessionals(branchId?: string, enabled = true) {
  return useQuery({
    queryKey: ['medilink', 'professionals', branchId],
    queryFn: async () => {
      try {
        return await MedilinkService.listProfessionals(branchId);
      } catch (error: any) {
        if (error.response?.status === 404) {
          return [];
        }
        throw error;
      }
    },
    enabled: enabled && !!branchId,
    staleTime: 1000 * 60 * 10,
  });
}

// Hook para obtener sillones
export function useMedilinkChairs(branchId?: string, enabled = true) {
  return useQuery({
    queryKey: ['medilink', 'chairs', branchId],
    queryFn: async () => {
      try {
        return await MedilinkService.getChairs(branchId!);
      } catch (error: any) {
        if (error.response?.status === 404) {
          return [];
        }
        throw error;
      }
    },
    enabled: enabled && !!branchId,
    staleTime: 1000 * 60 * 10,
  });
}

// Hook para estados de cita
export function useMedilinkAppointmentStates(enabled = true) {
  return useQuery({
    queryKey: ['medilink', 'appointment-states'],
    queryFn: async () => {
      try {
        return await MedilinkService.listAppointmentStates();
      } catch (error: any) {
        if (error.response?.status === 404) {
          return [];
        }
        throw error;
      }
    },
    enabled,
    staleTime: 1000 * 60 * 30, // 30 minutos
  });
}

