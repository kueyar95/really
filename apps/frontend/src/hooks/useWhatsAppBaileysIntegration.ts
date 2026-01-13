/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { ChannelStatus } from '@/services/Whatsapp/types';

interface UseBaileysIntegrationReturn {
  status: ChannelStatus;
  phoneNumber: string | null;
  qrCode: string | null;
  connectionStatus: string | null;
  lastError: string | null;
  connect: () => void;
  disconnect: () => void;
  isLoading: boolean;
  channelId: string | null;
}

interface UseBaileysIntegrationProps {
  channelId?: string;
}

// TODO: Este hook está deprecado. Usar useChannelConnection en su lugar
// @deprecated Use useChannelConnection instead
export function useBaileysIntegration(props?: UseBaileysIntegrationProps): UseBaileysIntegrationReturn {
  console.warn('[Deprecated] useBaileysIntegration está deprecado. Usar useChannelConnection en su lugar');
  const { socket } = useSocket();
  const { user } = useAuth();
  const channelId = props?.channelId;
  const [pendingChannelId, setPendingChannelId] = useState<string | null>(null);

  const [status, setStatus] = useState<ChannelStatus>('not_configured');
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!socket) return;
    if (!channelId) return;

    const handleConnectionStatus = (data: {
      channelId: string;
      status: string;
      data?: { phoneNumber?: string }
    }) => {
      if (data.channelId !== channelId) return;

      setConnectionStatus(data.status);

      if (data.data?.phoneNumber) setPhoneNumber(data.data.phoneNumber);

      switch (data.status) {
        case 'connecting':
          setStatus('connecting');
          setIsLoading(true);
          break;
        case 'connected':
          setStatus('active');
          setQrCode(null);
          setIsLoading(false);
          break;
        case 'ready':
          setStatus('active');
          setQrCode(null);
          setIsLoading(false);
          break;
        case 'disconnected':
          setStatus('inactive');
          setPhoneNumber(null);
          setQrCode(null);
          setIsLoading(false);
          break;
        case 'error':
          setStatus('error');
          setIsLoading(false);
          break;
        default:
          setStatus('not_configured');
          setIsLoading(false);
      }
    };

    const handleQR = (data: { channelId: string; qr: string }) => {
      if (data.channelId !== channelId) return;
      setQrCode(data.qr);
      setConnectionStatus('waiting_scan');
      setIsLoading(false);
    };

    const handleError = (data: { channelId: string; error: { message: string } }) => {
      console.error('[Baileys] ❌ Error', {
        error: data.error.message,
        estado: status,
        contexto: {
          tieneQR: !!qrCode,
          telefono: phoneNumber
        },
        channelId
      });
      setStatus('error');
      setIsLoading(false);
    };

    socket.on(`baileys:${channelId}:connectionStatus`, handleConnectionStatus);
    socket.on(`baileys:${channelId}:qr`, handleQR);
    socket.on(`baileys:${channelId}:error`, handleError);

    // Verificar estado inicial
    socket.emit('getBaileysStatus', { channelId }, (response: any) => {
      handleConnectionStatus(response);
    });

    return () => {
      socket.off(`baileys:${channelId}:connectionStatus`, handleConnectionStatus);
      socket.off(`baileys:${channelId}:qr`, handleQR);
      socket.off(`baileys:${channelId}:error`, handleError);
    };
  }, [socket, channelId]);

  const connect = async () => {
    if (!socket || !user?.company?.id) {
      console.error('[Baileys] ❌ Error al conectar:', {
        tieneSocket: !!socket,
        tieneCompanyId: !!user?.company?.id
      });
      return;
    }

    // Reiniciamos todos los estados al iniciar una nueva conexión
    setIsLoading(true);
    setStatus('connecting');
    setQrCode(null);
    setConnectionStatus(null);
    setPhoneNumber(null);
    setPendingChannelId(null);

    // Si no hay channelId, iniciamos una nueva conexión
    if (!channelId) {
      socket.emit('connectWhatsApp', {
        companyId: user.company.id,
        type: 'whatsapp_baileys'
      }, (response: { channelId: string; status: string }) => {
        if (response?.channelId) {
          setPendingChannelId(response.channelId);
          setStatus(response.status as ChannelStatus);
        } else {
          console.error('[Baileys] ❌ No se recibió channelId en la respuesta');
        }
      });
      return;
    }

    socket.emit('connectWhatsApp', {
      channelId,
      companyId: user.company.id,
      type: 'whatsapp_baileys'
    });
  };

  // Efecto para escuchar eventos cuando tenemos un pendingChannelId
  useEffect(() => {
    if (!socket || !pendingChannelId) return;
    const handleConnectionStatus = (data: {
      channelId: string;
      status: string;
      data?: { phoneNumber?: string }
    }) => {

      if (data.channelId !== pendingChannelId) return;

      setConnectionStatus(data.status);

      if (data.data?.phoneNumber) setPhoneNumber(data.data.phoneNumber);

      switch (data.status) {
        case 'connecting':
          setStatus('connecting');
          setIsLoading(true);
          break;
        case 'connected':
          setStatus('active');
          setQrCode(null);
          setIsLoading(false);
          break;
        case 'ready':
          setStatus('active');
          setQrCode(null);
          setIsLoading(false);
          break;
        case 'disconnected':
          setStatus('inactive');
          setPhoneNumber(null);
          setQrCode(null);
          setIsLoading(false);
          break;
        case 'error':
          console.error('[Baileys] ❌ Error en la conexión');
          setStatus('error');
          setIsLoading(false);
          break;
        default:
          setStatus('not_configured');
          setIsLoading(false);
      }
    };

    const handleQR = (data: { channelId: string; qr: string }) => {
      if (data.channelId !== pendingChannelId) return;

      setQrCode(data.qr);
      setConnectionStatus('waiting_scan');
      setIsLoading(false);
    };

    const handleError = (data: { channelId: string; error: { message: string } }) => {
      console.error('[Baileys] ❌ Error', {
        error: data.error.message,
        estado: status,
        contexto: {
          tieneQR: !!qrCode,
          telefono: phoneNumber
        },
        channelId
      });
      setStatus('error');
      setIsLoading(false);
    };

    socket.on(`baileys:${pendingChannelId}:connectionStatus`, handleConnectionStatus);
    socket.on(`baileys:${pendingChannelId}:qr`, handleQR);
    socket.on(`baileys:${pendingChannelId}:error`, handleError);

    return () => {
      socket.off(`baileys:${pendingChannelId}:connectionStatus`, handleConnectionStatus);
      socket.off(`baileys:${pendingChannelId}:qr`, handleQR);
      socket.off(`baileys:${pendingChannelId}:error`, handleError);
    };
  }, [socket, pendingChannelId]);

  const disconnect = () => {
    if (!socket || !user?.company_id) {
      console.error('[Baileys Hook] Error al desconectar:', {
        tieneSocket: !!socket,
        tieneCompanyId: !!user?.company_id,
        estadoActual: status
      });
      return;
    }

    setIsLoading(true);
    setStatus('not_configured'); // Reseteamos al estado inicial
    setQrCode(null);
    setPhoneNumber(null);
    setConnectionStatus(null);
    setPendingChannelId(null);

    socket.emit('disconnectWhatsApp', {
      companyId: user.company_id,
      type: 'whatsapp_baileys'
    });
  };

  return {
    status: (channelId || pendingChannelId) ? status : 'not_configured',
    phoneNumber: (channelId || pendingChannelId) ? phoneNumber : null,
    qrCode: (channelId || pendingChannelId) ? qrCode : null,
    connectionStatus: (channelId || pendingChannelId) ? connectionStatus : null,
    channelId: channelId || pendingChannelId,
    lastError: null,
    connect,
    disconnect,
    isLoading
  };
}