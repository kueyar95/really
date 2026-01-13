import { useEffect, useRef, useState, useCallback } from "react";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext";
import { ChannelType } from "../types";

type UiStatus = "active" | "connecting" | "inactive" | "error" | "not_configured" | "waiting_scan";
type WsTransport = "idle" | "connecting" | "connected" | "reconnecting" | "disconnected";

interface UseChannelConnectionProps {
  channelId: string;
  type: ChannelType;
  enabled?: boolean;
}

interface WhapiStatusPayload {
  channelId: string;
  status: string;
  phoneNumber?: string;
  state?: string;
  data?: any;
}

export function useChannelConnection({ channelId, type, enabled = true }: UseChannelConnectionProps) {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const companyId = user?.company?.id;

  const [status, setStatus] = useState<UiStatus>("inactive");
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<WsTransport>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const qrActiveRef = useRef(false);
  const qrExpireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debug logging sin referencias circulares
  useEffect(() => {
    console.log('[useChannelConnection] State:', {
      channelId,
      type,
      enabled,
      isConnected,
      status,
      qrCode: qrCode ? 'EXISTS' : 'NULL',
      socketExists: !!socket,
      socketConnected: socket?.connected || false
    });
  }, [channelId, type, enabled, isConnected, status, qrCode, socket]);

  const mapWhapiToUi = useCallback((incoming: string): UiStatus => {
    const s = (incoming || "").toLowerCase();
    if (s === "connected" || s === "alive" || s === "active") return "active";
    if (s === "connecting" || s === "qr" || s === "awaiting_qr" || s === "waiting_scan" || s === "scanning")
      return "connecting";
    if (s === "error" || s === "sync_error") return "error";
    return "inactive";
  }, []);

  // Socket connection status
  useEffect(() => {
    if (!socket || !enabled) return;
    
    setConnectionStatus(isConnected ? "connected" : "disconnected");
  }, [socket, enabled, isConnected]);

  // Join company room when socket connects
  useEffect(() => {
    if (!socket || !enabled || !companyId || !isConnected) return;

    console.log('[useChannelConnection] Joining company room:', companyId);
    socket.emit("joinCompany", { companyId });

    // Request initial status after joining
    const onJoined = (data: any) => {
      console.log('[useChannelConnection] Joined company room:', data);
      if (type === 'whapi_cloud') {
        socket.emit("getWhapiStatus", { channelId });
      }
    };

    socket.on("joined", onJoined);

    return () => {
      socket.off("joined", onJoined);
    };
  }, [socket, enabled, companyId, isConnected, channelId, type]);

  // Listen for Whapi events
  useEffect(() => {
    if (!socket || !enabled) return;

    console.log('[useChannelConnection] Setting up listeners for channel:', channelId);

    const onWhapiStatus = (payload: WhapiStatusPayload) => {
      console.log('[useChannelConnection] Received whapi:status:', payload);
      
      if (!payload) return;
      
      // Check if this event is for our channel
      if (payload.channelId && payload.channelId !== channelId) {
        console.log('[useChannelConnection] Status for different channel, ignoring');
        return;
      }

      const s = (payload.status || payload?.data?.status || "").toLowerCase();

      if (qrActiveRef.current && (s === "" || s === "disconnected" || s === "inactive")) {
        console.log('[useChannelConnection] Ignoring disconnected status while QR active');
        return;
      }

      if (s === "connected" || s === "alive" || s === "active") {
        qrActiveRef.current = false;
        if (qrExpireTimerRef.current) {
          clearTimeout(qrExpireTimerRef.current);
          qrExpireTimerRef.current = null;
        }
        setQrCode(null);
      }

      const ui = mapWhapiToUi(s);
      console.log('[useChannelConnection] Mapping status:', s, '->', ui);
      setStatus(ui);

      const phone = payload.phoneNumber || payload?.data?.phoneNumber || null;
      if (phone) setPhoneNumber(phone);
    };

    const onWhapiQr = (payload: any) => {
      console.log('[useChannelConnection] Received whapi:qr:', {
        channelId: payload?.channelId,
        hasQr: !!(payload?.qr || payload?.qrCode),
        expire: payload?.expire || payload?.expires
      });
      
      if (!payload) return;
      
      // Check if this QR is for our channel
      if (payload.channelId && payload.channelId !== channelId) {
        console.log('[useChannelConnection] QR for different channel, ignoring');
        return;
      }

      const code = payload.qr || payload.qrCode || null;
      const expireSec = Number(payload.expire || payload.expires || 60);

      console.log('[useChannelConnection] QR code extracted:', code ? 'YES' : 'NO');
      
      if (!code) {
        console.log('[useChannelConnection] No QR code in payload');
        return;
      }

      setQrCode(code);
      setStatus("waiting_scan");
      qrActiveRef.current = true;

      // Set expiration timer
      if (qrExpireTimerRef.current) clearTimeout(qrExpireTimerRef.current);
      qrExpireTimerRef.current = setTimeout(() => {
        console.log('[useChannelConnection] QR expired');
        qrActiveRef.current = false;
        setQrCode(null);
        setStatus("inactive");
      }, Math.max(5, expireSec - 2) * 1000);
    };

    const onWhapiError = (payload: any) => {
      console.log('[useChannelConnection] Received whapi:error:', payload);
      
      if (!payload) return;
      
      if (payload.channelId && payload.channelId !== channelId) {
        console.log('[useChannelConnection] Error for different channel, ignoring');
        return;
      }

      setLastError(payload.error || "Whapi error");
      qrActiveRef.current = false;
      if (qrExpireTimerRef.current) {
        clearTimeout(qrExpireTimerRef.current);
        qrExpireTimerRef.current = null;
      }
      setQrCode(null);
      setStatus("error");
    };

    // Generic connection status (compatibility)
    const onConnectionStatus = (payload: any) => {
      console.log('[useChannelConnection] Received connectionStatus:', payload);
      
      if (!payload) return;
      if (payload.channelId && payload.channelId !== channelId) return;
      
      const ui = mapWhapiToUi(payload.status);
      setStatus(ui);
    };

    socket.on("whapi:status", onWhapiStatus);
    socket.on("whapi:qr", onWhapiQr);
    socket.on("whapi:error", onWhapiError);
    socket.on("connectionStatus", onConnectionStatus);

    // Also listen to all events for debug (sin objeto socket completo)
    const onAnyEvent = (eventName: string, ...args: any[]) => {
      if (eventName.includes('whapi')) {
        console.log('[useChannelConnection] Event:', eventName, {
          hasPayload: args.length > 0,
          channelId: args[0]?.channelId
        });
      }
    };
    socket.onAny(onAnyEvent);

    return () => {
      socket.off("whapi:status", onWhapiStatus);
      socket.off("whapi:qr", onWhapiQr);
      socket.off("whapi:error", onWhapiError);
      socket.off("connectionStatus", onConnectionStatus);
      socket.offAny(onAnyEvent);
    };
  }, [socket, enabled, channelId, mapWhapiToUi]);

  // Cleanup QR timer on unmount
  useEffect(() => {
    return () => {
      if (qrExpireTimerRef.current) {
        clearTimeout(qrExpireTimerRef.current);
      }
    };
  }, []);

  const connect = useCallback(async () => {
    if (!socket || !companyId) {
      console.log('[useChannelConnection] Cannot connect:', {
        hasSocket: !!socket,
        hasCompanyId: !!companyId
      });
      return;
    }
    
    console.log('[useChannelConnection] Connecting:', { companyId, type, channelId });
    setIsLoading(true);
    setLastError(null);
    
    try {
      socket.emit("connectWhatsApp", { companyId, type, channelId });
    } catch (e: any) {
      console.error('[useChannelConnection] Connect error:', e?.message);
      setLastError(e?.message || "connectWhatsApp failed");
    } finally {
      setIsLoading(false);
    }
  }, [socket, companyId, type, channelId]);

  const disconnect = useCallback(async () => {
    if (!socket) return;
    
    console.log('[useChannelConnection] Disconnecting:', { channelId });
    setIsLoading(true);
    setLastError(null);
    
    try {
      socket.emit("disconnectWhatsApp", { channelId, companyId, type });
    } catch (e: any) {
      console.error('[useChannelConnection] Disconnect error:', e?.message);
      setLastError(e?.message || "disconnectWhatsApp failed");
    } finally {
      setIsLoading(false);
    }
  }, [socket, channelId, companyId, type]);

  return {
    status,
    phoneNumber,
    qrCode,
    connectionStatus,
    lastError,
    connect,
    disconnect,
    isLoading,
  };
}