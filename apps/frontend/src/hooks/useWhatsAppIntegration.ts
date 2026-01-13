import { useState, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { ChannelStatus } from '@/services/Whatsapp/types';

interface UseWhatsAppIntegrationReturn {
  status: ChannelStatus;
  phoneNumber: string | null;
  qrCode: string | null;
  connectionStatus: string | null;
  lastError: string | null;
  connect: () => void;
  disconnect: () => void;
  isLoading: boolean;
}

export function useWhatsAppIntegration(): UseWhatsAppIntegrationReturn {
  const { socket, lastError } = useSocket();
  const { user } = useAuth();
  const [status, setStatus] = useState<ChannelStatus>('not_configured');
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleQR = (data: { qr: string }) => {
      setQrCode(data.qr);
      setConnectionStatus('waiting_scan');
      setIsLoading(false);
    };

    const handleStatus = (data: { status: string; phoneNumber?: string }) => {
      setConnectionStatus(data.status);

      if (data.phoneNumber) {
        setPhoneNumber(data.phoneNumber);
      }

      switch (data.status) {
        case 'connecting':
          setStatus('connecting');
          setIsLoading(true);
          break;
        case 'authenticated':
          setStatus('connecting');
          setQrCode(null);
          break;
        case 'ready':
          setStatus('active');
          setQrCode(null);
          setIsLoading(false);
          break;
        case 'inactive':
          setStatus('inactive');
          setPhoneNumber(null);
          setQrCode(null);
          setIsLoading(false);
          break;
        case 'error':
          console.error('Error en la conexión de WhatsApp');
          setStatus('error');
          setIsLoading(false);
          break;
        default:
          setStatus('not_configured');
          setIsLoading(false);
      }
    };

    const handleError = (error: { message: string }) => {
      console.error('Error de WhatsApp:', error.message);
      setStatus('error');
      setIsLoading(false);
    };

    socket.on('qr', handleQR);
    socket.on('connectionStatus', handleStatus);
    socket.on('error', handleError);

    // Verificar estado inicial
    socket.emit('getWhatsAppStatus', (response: { status: string; phoneNumber?: string }) => {
      handleStatus(response);
    });

    return () => {
      socket.off('qr', handleQR);
      socket.off('connectionStatus', handleStatus);
      socket.off('error', handleError);
    };
  }, [socket]);

  const connect = () => {
    if (!socket || !user?.company?.id) {
      console.error('No se puede conectar: socket o company_id no disponible');
      return;
    }
    setIsLoading(true);
    socket.emit('connectWhatsApp', { companyId: user.company?.id, type: 'whatsapp_web' });
    setStatus('connecting');
  };

  const disconnect = () => {
    if (!socket || !user?.company_id) {
      console.error('No se puede desconectar: socket o company_id no disponible');
      return;
    }
    setIsLoading(true);
    socket.emit('disconnectWhatsApp', { companyId: user.company_id, type: 'whatsapp_web' });
  };

  return {
    status,
    phoneNumber,
    qrCode,
    connectionStatus,
    lastError,
    connect,
    disconnect,
    isLoading
  };
}