import { useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';

interface WhatsAppEvents {
  onQR?: (qr: string) => void;
  onConnectionStatus?: (status: string) => void;
}

export function useWhatsAppEvents(channelId: string | null, events: WhatsAppEvents = {}) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !channelId) return;

    const handleQR = (data: { qr: string }) => {
      events.onQR?.(data.qr);
    };

    const handleStatus = (data: { status: string }) => {
      events.onConnectionStatus?.(data.status);
    };

    socket.on('qr', handleQR);
    socket.on('connectionStatus', handleStatus);

    socket.emit('subscribeToCompany', { companyId: channelId }, (response: unknown) => {
    });

    return () => {
      socket.off('qr', handleQR);
      socket.off('connectionStatus', handleStatus);
    };
  }, [socket, channelId, events]);
}