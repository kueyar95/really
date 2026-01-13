import { createContext, useContext, useEffect, useRef, useState } from "react";
import socketIO, { Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { supabase } from "@/components/auth/supabase";
import { BaileysInstance } from "@/types/whatsapp";
import { ChannelStatus } from "@/services/Channels/types";

type IOSocket = ReturnType<typeof socketIO>;

interface SocketContextType {
  socket: IOSocket | null;
  isConnected: boolean;
  whatsappInstances: Map<string, BaileysInstance>;
  lastError: string | null;
  forceDisconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

function getApiHttpBase(): string {
  const base =
    (import.meta as any).env?.VITE_BASE_URL ||
    (import.meta as any).env?.VITE_BACKEND_URL ||
    "http://localhost:3000";
  return String(base).replace(/\/$/, "");
}

function toWsUrl(httpBase: string): string {
  if (httpBase.startsWith("https://")) return httpBase.replace("https://", "wss://");
  if (httpBase.startsWith("http://")) return httpBase.replace("http://", "ws://");
  return httpBase;
}

const HTTP_BASE = getApiHttpBase();
const WS_BASE = toWsUrl(HTTP_BASE);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<IOSocket | null>(null);
  const { user } = useAuth();
  const [whatsappInstances, setWhatsappInstances] = useState<Map<string, BaileysInstance>>(new Map());
  const [lastError, setLastError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isForceDisconnected, setIsForceDisconnected] = useState(false);
  const connectingRef = useRef(false);

  const log = (...args: any[]) => {
    console.log("[WS]", ...args);
  };

  const forceDisconnect = () => {
    if (socketRef.current) {
      log("forceDisconnect()");
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsForceDisconnected(true);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    if (isForceDisconnected) return;
    if (connectingRef.current) return;
    if (!user) return;

    const init = async () => {
      try {
        connectingRef.current = true;

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || null;

        if (socketRef.current) {
          socketRef.current.removeAllListeners();
          socketRef.current.disconnect();
          socketRef.current = null;
        }

        const NAMESPACE = "/whatsapp";
        const WS_URL = `${WS_BASE}${NAMESPACE}`;

        const authPayload: Record<string, any> = {};
        if (token) {
          authPayload.token = token;
          authPayload.authorization = `Bearer ${token}`;
        }

        const queryPayload: Record<string, any> = {};
        if (token) queryPayload.token = token;

        log("Conectando a", WS_URL, { HTTP_BASE, tokenPresent: !!token });
        console.log("Conectando a", WS_URL, { HTTP_BASE, tokenPresent: !!token });
        console.log("authPayload", authPayload);
        console.log("queryPayload", queryPayload);
        const socket = socketIO(WS_URL, {
          transports: ["websocket"],
          autoConnect: false,
          withCredentials: false,
          auth: authPayload,
          query: queryPayload,
          path: "/socket.io",
        });

        // Connection listeners
        socket.on("connect", () => {
          log("connect OK", { id: socket.id, url: WS_URL });
          setLastError(null);
          setIsConnected(true);

          const companyId = user?.company?.id;
          if (companyId) {
            log("Emitting joinCompany:", companyId);
            socket.emit("joinCompany", { companyId });
          }
        });

        socket.on("joined", (data: any) => {
          log("Joined company room:", data);
        });

        socket.on("connect_error", (err: any) => {
          log("connect_error", { message: err?.message });
          setIsConnected(false);
          setLastError(err?.message || "connect_error");

          if (!isForceDisconnected) {
            setTimeout(() => socket.connect(), 4000);
          }
        });

        socket.on("error", (err: any) => {
          log("socket error", err);
          setLastError(typeof err === "string" ? err : err?.message || "socket_error");
        });

        socket.on("disconnect", (reason: string) => {
          log("disconnect", { reason });
          setIsConnected(false);
          if (reason === "io server disconnect" && !isForceDisconnected) {
            setTimeout(() => socket.connect(), 4000);
          }
        });

        // Whapi events listeners
        socket.on("whapi:qr", (data: any) => {
          log("Received whapi:qr event:", {
            channelId: data?.channelId,
            hasQr: !!(data?.qr || data?.qrCode)
          });
        });

        socket.on("whapi:status", (data: any) => {
          log("Received whapi:status event:", data);
        });

        socket.on("whapi:error", (data: any) => {
          log("Received whapi:error event:", data);
        });

        // Baileys status
        socket.on("baileys:status", (data: {
          channelId: string;
          status: string;
          phoneNumber?: string;
        }) => {
          setWhatsappInstances(prev => {
            const map = new Map(prev);
            const current = map.get(data.channelId) || {
              channelId: data.channelId,
              companyId: user?.company?.id as string,
              status: data.status,
              phoneNumber: null,
              qrCode: null,
              connectionStatus: null
            };
            map.set(data.channelId, {
              ...current,
              status: data.status as ChannelStatus,
              phoneNumber: data.phoneNumber || current.phoneNumber
            });
            return map;
          });
        });

        // Debug: listen to all events
        socket.onAny((eventName: string, ...args: any[]) => {
          if (eventName.includes('whapi') || eventName === 'joined') {
            log(`Event [${eventName}]:`, args);
          }
        });

        if (!isForceDisconnected) socket.connect();
        socketRef.current = socket;

      } catch (e) {
        log("init() error", e);
      } finally {
        connectingRef.current = false;
      }
    };

    init();

    return () => {
      connectingRef.current = false;
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user?.id, isForceDisconnected]);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        whatsappInstances,
        lastError,
        forceDisconnect
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket debe ser usado dentro de un SocketProvider");
  return ctx;
}