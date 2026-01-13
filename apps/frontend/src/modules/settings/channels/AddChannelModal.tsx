/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { ChannelType } from "@/services/Whatsapp/types";
import { QRModal } from "./QRModal";
import { useBaileysIntegration } from '@/hooks/useWhatsAppBaileysIntegration';
import { useAuth } from "@/contexts/AuthContext";
import { ChannelsService } from "@/services/Channels/queries";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useChannelConnection } from "@/services/Whatsapp/hooks/useChannelConnection";
import api from "@/services/api";

declare global {
  interface Window { FB: any; fbAsyncInit?: () => void; }
}

interface AddChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (channelId?: string) => void;
}

interface ChannelOption {
  type: ChannelType;
  title: string;
  description: string;
  icon: string;
  available: boolean;
}

const channelOptions: ChannelOption[] = [
  { type: "whapi_cloud", title: "WhatsApp Web", description: "Conecta WhatsApp escaneando un código QR", icon: "/icons/whatsapp.svg", available: true },
  { type: "whatsapp_cloud", title: "WhatsApp Cloud API", description: "Conecta usando la API oficial de Meta", icon: "/icons/whatsapp.svg", available: true },
  { type: "facebook", title: "Facebook Messenger", description: "Conecta tu cuenta de Facebook", icon: "/icons/messenger.svg", available: false },
  { type: "instagram", title: "Instagram", description: "Conecta tu cuenta de Instagram", icon: "/icons/instagram.svg", available: false },
  { type: "telegram", title: "Telegram", description: "Conecta un bot de Telegram", icon: "/icons/telegram.svg", available: false }
];

// Helpers
function getApiBase(): string {
  const candidates = [
    api?.defaults?.baseURL,
    (import.meta as any)?.env?.VITE_API_URL,
    (import.meta as any)?.env?.VITE_BACKEND_URL
  ].filter((x): x is string => !!x && typeof x === "string" && x.length > 0);
  if (candidates.length === 0) throw new Error("API base URL no definida (configura VITE_API_URL).");
  return candidates[0].replace(/\/$/, "");
}

const FB_APP_ID = (import.meta as any).env?.VITE_FB_APP_ID as string;
const WA_ES_CONFIG_ID = (import.meta as any).env?.VITE_WA_ES_CONFIG_ID as string;
const WA_DEBUG = (import.meta as any).env?.VITE_WA_DEBUG === '1';

function log(...args: any[]) {
  // eslint-disable-next-line no-console
  console.log("[WA-ES]", ...args);
}

// Normaliza teléfono para comparar (sólo dígitos)
function digitsOnly(s?: string) {
  return (s ?? '').replace(/\D+/g, '');
}

/**
 * Intenta resolver el channelId recién creado consultando el backend.
 * Busca por:
 *  - connectionConfig.phoneNumberId === payload.phoneNumberId
 *  - número normalizado (metadata.phoneNumber | number) === payload.phoneNumber
 *  - connectionConfig.wabaId === payload.wabaId
 *
 * Polling: hasta maxTries (1s entre intentos).
 */
async function resolveChannelIdAfterExchange(
  companyId: string,
  payload: any,
  maxTries = 15,
  delayMs = 1000
): Promise<string | null> {
  const wantPhoneId = payload?.phoneNumberId;
  const wantWabaId = payload?.wabaId;
  const wantNumber = digitsOnly(payload?.phoneNumber);

  for (let i = 0; i < maxTries; i++) {
    try {
      const channels = await ChannelsService.getChannels(companyId);
      const found = (channels || []).find((ch: any) => {
        if (ch?.type !== 'whatsapp_cloud') return false;

        const byPhoneId = ch?.connectionConfig?.phoneNumberId && ch.connectionConfig.phoneNumberId === wantPhoneId;
        const byWaba = ch?.connectionConfig?.wabaId && ch.connectionConfig.wabaId === wantWabaId;

        const metaNum = digitsOnly(ch?.metadata?.phoneNumber);
        const headerNum = digitsOnly(ch?.number);
        const byNumber = (metaNum && metaNum === wantNumber) || (headerNum && headerNum === wantNumber);

        return Boolean(byPhoneId || byWaba || byNumber);
      });

      if (found?.id) {
        console.log('[WA-ES] resolveChannelIdAfterExchange → FOUND:', found.id);
        return found.id as string;
      }
    } catch (e) {
      console.warn('[WA-ES] resolveChannelIdAfterExchange error (retrying):', e);
    }

    await new Promise((r) => setTimeout(r, delayMs));
    try { window.dispatchEvent(new CustomEvent('channels:refresh')); } catch {}
  }

  console.warn('[WA-ES] resolveChannelIdAfterExchange → no se encontró channelId tras polling');
  return null;
}

function parseQueryString(qs: string): Record<string, string> {
  const params = new URLSearchParams(qs);
  const out: Record<string, string> = {};
  params.forEach((v, k) => (out[k] = v));
  return out;
}

async function exchangeCodeAtBackend(code: string, state?: string) {
  const base = getApiBase();
  const res = await fetch(`${base}/integrations/whatsapp/embedded-signup/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, state }),
    credentials: 'include'
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Exchange failed (${res.status}): ${text || 'no body'}`);
  }
  return res.json();
}

function loadFacebookSDK(): Promise<void> {
  return new Promise((resolve) => {
    if (window.FB) {
      log("SDK ya presente");
      return resolve();
    }
    log("Inyectando SDK Facebook...");
    window.fbAsyncInit = function () {
      log("fbAsyncInit disparado. Init con", { FB_APP_ID });
      try {
        window.FB.init({
          appId: FB_APP_ID,
          cookie: true,
          xfbml: false,
          version: "v21.0",
        });
        log("FB.init OK");
      } catch (e) {
        console.error("[WA-ES] FB.init ERROR:", e);
      }
      resolve();
    };
    const id = "facebook-jssdk";
    if (document.getElementById(id)) {
      log("script sdk ya estaba, resolviendo");
      return resolve();
    }
    const js = document.createElement("script");
    js.id = id;
    js.async = true;
    js.defer = true;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    document.body.appendChild(js);
  });
}

// Selección de id desde varias formas de respuesta
function pickChannelId(input: any): string | undefined {
  return input?.channelId || input?.channel?.id || input?.id || undefined;
}

// --------------------------------------

export function AddChannelModal({ isOpen, onClose, onSuccess }: AddChannelModalProps) {
  const { user } = useAuth();
  const [selectedChannel, setSelectedChannel] = useState<ChannelType | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [channelError, setChannelError] = useState<{ type: ChannelType | null; message: string | null }>({ type: null, message: null });
  const [isInitiatingWhapi, setIsInitiatingWhapi] = useState(false);
  const [whapiChannelId, setWhapiChannelId] = useState<string | null>(null);

  // WhatsApp Cloud
  const [isConnectingWA, setIsConnectingWA] = useState(false);

  const baileysIntegration = useBaileysIntegration();

  // Hook Whapi
  const {
    status: whapiHookStatus,
    qrCode: whapiHookQrCode,
    connectionStatus: whapiHookConnStatus,
    lastError: whapiHookError,
    isLoading: whapiHookIsLoading,
    connect,
  } = useChannelConnection({
    channelId: whapiChannelId ?? '',
    type: 'whapi_cloud',
    enabled: !!whapiChannelId && selectedChannel === 'whapi_cloud' && isOpen
  });

  const isWhapiHookActive = !!whapiChannelId && selectedChannel === 'whapi_cloud' && isOpen;

  // ✅ finish reutilizable para TODOS los flows (Whapi, Baileys, WhatsApp Cloud)
  const finish = useCallback((id?: string, msg = "Canal WhatsApp conectado exitosamente!") => {
    log("finish(): disparado", { id, msg });
    toast.success(msg);
    setTimeout(() => {
      try { onSuccess(id); } catch { /* noop */ }
      try { window.dispatchEvent(new CustomEvent('channels:refresh')); } catch { /* noop */ }
      onClose();
    }, 900);
  }, [onSuccess, onClose]);

  // Éxito (Baileys/Whapi) → usa finish
  useEffect(() => {
    if (baileysIntegration.status === 'active' && baileysIntegration.channelId) {
      finish(baileysIntegration.channelId, "Canal Baileys conectado exitosamente!");
    }
    if (isWhapiHookActive && whapiHookStatus === 'active' && whapiChannelId) {
      finish(whapiChannelId, "Canal WhatsApp (Whapi) conectado exitosamente!");
    }
  }, [baileysIntegration.status, baileysIntegration.channelId, isWhapiHookActive, whapiHookStatus, whapiChannelId, finish]);

  // Abrir Embedded Signup con FB.login (WhatsApp Cloud)
  function openWhatsAppEmbedded(companyId: string) {
    log("openWhatsAppEmbedded()", { companyId, FB_APP_ID, WA_ES_CONFIG_ID });

    if (!FB_APP_ID || !WA_ES_CONFIG_ID) {
      toast.error("Faltan VITE_FB_APP_ID o VITE_WA_ES_CONFIG_ID");
      return;
    }

    loadFacebookSDK()
      .then(() => {
        if (!window.FB) throw new Error("Facebook SDK no cargó");

        log("Llamando FB.login con config_id...");

        window.FB.login(
          function onLogin(resp: any) {
            log("[WA-ES] FB.login callback:", resp);

            const code = resp?.authResponse?.code as string | undefined;
            const grantedScopes = resp?.authResponse?.grantedScopes as string | undefined;

            if (!code) {
              log("[WA-ES] Usuario canceló o error:", resp);
              toast.error("No se completó la autorización");
              setIsConnectingWA(false);
              return;
            }

            log("[WA-ES] Code recibido, haciendo exchange...");

            (async () => {
              try {
                const result = await api.post('/integrations/whatsapp/embedded-signup/exchange-fblogin', {
                  code,
                  companyId,
                  grantedScopes,
                  configId: WA_ES_CONFIG_ID
                });

                log("[WA-ES] Exchange result:", result.data);

                if (result.data?.success) {
                  const msg =
                    result.data.phoneNumber
                      ? `WhatsApp conectado: ${result.data.phoneNumber}`
                      : "WhatsApp Cloud conectado correctamente";

                  if (result.data?.debug) {
                    try { sessionStorage.setItem('wa_es_debug', JSON.stringify(result.data.debug)); } catch { /* noop */ }
                    console.log('[WA-ES] DEBUG dump →', result.data.debug);
                  }
                  if (result.data.phoneNumber) {
                    sessionStorage.setItem('wa_phone', result.data.phoneNumber);
                  }

                  // 1) por si acaso viene directo en el payload (otros flows)
                  let newChannelId = pickChannelId(result.data);

                  // 2) si no vino, resolver por polling contra /channels
                  if (!newChannelId && user?.company?.id) {
                    console.log('[WA-ES] Resolviendo channelId por polling…', {
                      wabaId: result.data?.wabaId,
                      phoneNumberId: result.data?.phoneNumberId,
                      phoneNumber: result.data?.phoneNumber
                    });
                    newChannelId = await resolveChannelIdAfterExchange(user.company.id, result.data) as any;
                  }

                  console.log('DEBUG newChannelId:', newChannelId);
                  finish(newChannelId || undefined, msg);
                } else {
                  throw new Error(result.data?.error || "Error en el intercambio");
                }
              } catch (e: any) {
                console.error("[WA-ES] Error:", e);

                const errorData = e?.response?.data;
                if (errorData?.debug?.causes) {
                  console.error("[WA-ES] Posibles causas:", errorData.debug.causes);
                }

                const errorMsg = errorData?.message || e?.message || "Error al conectar";
                toast.error(errorMsg);

                if (errorData?.debug?.solution) {
                  setTimeout(() => { toast.info(errorData.debug.solution); }, 1000);
                }
              } finally {
                setIsConnectingWA(false);
              }
            })();
          },
          {
            config_id: WA_ES_CONFIG_ID,
            response_type: "code",
            override_default_response_type: true,
            extras: { setup: {}, feature_type: "", sessionInfoVersion: 3 }
          }
        );

        setIsConnectingWA(true);
      })
      .catch((e) => {
        console.error("[WA-ES] Error al iniciar Embedded Signup:", e);
        setIsConnectingWA(false);
        toast.error("No se pudo iniciar el Embedded Signup");
      });
  }

  // Listener postMessage desde /callback → usa finish + resolver por polling si hace falta
  useEffect(() => {
    let apiOrigin: string | null = null;
    try { apiOrigin = new URL(getApiBase()).origin; } catch { apiOrigin = null; }
    const frontOrigin = window.location.origin;

    async function onEmbeddedMsg(ev: MessageEvent) {
      log("postMessage recibido:", { origin: ev.origin, data: ev.data, apiOrigin, frontOrigin, WA_DEBUG });

      if (!ev?.data || ev.data.type !== 'wa:embedded:completed') return;

      const allowed = WA_DEBUG ? true : (ev.origin === frontOrigin || (!!apiOrigin && ev.origin === apiOrigin));
      if (!allowed) {
        log("postMessage ignorado por origin no permitido.");
        return;
      }

      setIsConnectingWA(false);

      if (ev.data.ok) {
        let newChannelId = pickChannelId(ev.data);
        if (!newChannelId && user?.company?.id) {
          console.log('[WA-ES] (postMessage) Resolviendo channelId por polling…', {
            wabaId: ev.data?.wabaId,
            phoneNumberId: ev.data?.phoneNumberId,
            phoneNumber: ev.data?.phoneNumber
          });
          newChannelId = await resolveChannelIdAfterExchange(user.company.id, ev.data) as any;
        }
        finish(newChannelId || undefined, "WhatsApp Cloud conectado correctamente");
      } else {
        log("Embedded Signup ERROR:", ev.data);
        toast.error(ev.data.error || "No se completó el alta de WhatsApp Cloud");
      }
    }

    window.addEventListener('message', onEmbeddedMsg);
    return () => window.removeEventListener('message', onEmbeddedMsg);
  }, [finish, user?.company?.id]);

  // Selección de canal
  const handleChannelSelect = async (channelType: ChannelType) => {
    log("Seleccionaste canal:", channelType);
    setSelectedChannel(channelType);
    setChannelError({ type: null, message: null });
    setWhapiChannelId(null);
    setIsInitiatingWhapi(false);

    if (channelType === "whapi_cloud") {
      if (!user?.company?.id) { toast.error("Error: ID de compañía no encontrado."); return; }
      setShowQRModal(true);
      setIsInitiatingWhapi(true);
      try {
        const newChannel = await ChannelsService.initiateWhapiChannel(user.company.id);
        log("initiateWhapiChannel ->", newChannel);
        setWhapiChannelId(newChannel.channelId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        setChannelError({ type: 'whapi_cloud', message: errorMessage });
        setShowQRModal(false);
        toast.error(`Error al iniciar canal: ${errorMessage}`);
      } finally { setIsInitiatingWhapi(false); }

    } else if (channelType === "whatsapp_baileys") {
      setShowQRModal(true);
      baileysIntegration.disconnect();
      setTimeout(() => { baileysIntegration.connect(); }, 100);

    } else if (channelType === "whatsapp_cloud") {
      if (!user?.company?.id) { toast.error("Error: ID de compañía no encontrado."); return; }
      setIsConnectingWA(true);
      await openWhatsAppEmbedded(user.company.id);
    }
  };

  const handleCloseQRModal = () => {
    setShowQRModal(false);
    if (selectedChannel === "whatsapp_baileys") {
      setSelectedChannel(null);
      setChannelError({ type: null, message: null });
      if (baileysIntegration.status !== 'active') baileysIntegration.disconnect();
    }
  };

  // Conectar whapi cuando ya tengamos channelId
  useEffect(() => {
    if (isWhapiHookActive && whapiChannelId) {
      log("Conectando WHAPI hook…", { whapiChannelId });
      connect();
    }
  }, [isWhapiHookActive, whapiChannelId, connect]);

  // Abrir modal QR automáticamente
  useEffect(() => {
    if (!isOpen) return;
    if (selectedChannel === 'whapi_cloud' && (whapiHookQrCode || whapiHookStatus === 'waiting_scan' || whapiHookStatus === 'connecting')) {
      setShowQRModal(true);
    }
  }, [isOpen, selectedChannel, whapiHookQrCode, whapiHookStatus]);

  // Reset al cerrar
  useEffect(() => {
    if (!isOpen) {
      setShowQRModal(false);
      setSelectedChannel(null);
      setWhapiChannelId(null);
      if (baileysIntegration.status !== 'active' && baileysIntegration.status !== 'not_configured') {
        baileysIntegration.disconnect();
      }
      setIsConnectingWA(false);
    }
  }, [isOpen]);

  // 🔧 Importante: estas variables deben ser `string | undefined` (no `null`) para casar con los tipos de `QRModal`.
  const qrModalStatus: string | undefined =
    isWhapiHookActive ? ((whapiHookStatus as any) ?? undefined) : undefined;
  const qrModalQrCode: string | undefined =
    isWhapiHookActive ? (whapiHookQrCode ?? undefined) : undefined;
  const qrModalError: string | undefined =
    isWhapiHookActive
      ? (whapiHookError ?? undefined)
      : (channelError.type === 'whapi_cloud' ? (channelError.message ?? undefined) : undefined);

  const qrModalIsInitiating = isInitiatingWhapi;
  const qrModalIsHookLoading = isWhapiHookActive && !!whapiHookIsLoading;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar nuevo canal</DialogTitle>
            <DialogDescription>Selecciona el tipo de canal que deseas agregar</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            {channelOptions.map((option) => {
              const isWaCloud = option.type === 'whatsapp_cloud';
              const isBusy = (isInitiatingWhapi && option.type === 'whapi_cloud') || (isConnectingWA && isWaCloud);
              const disabled = !option.available || isBusy;

              return (
                <Card
                  key={option.type}
                  className={`p-4 cursor-pointer hover:bg-accent transition-colors ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  onClick={() => !disabled && handleChannelSelect(option.type)}
                  aria-disabled={disabled}
                >
                  <div className="flex items-center gap-4">
                    <img src={option.icon} alt={option.title} className="w-8 h-8" />
                    <div className="flex-1">
                      <h3 className="font-medium">{option.title}</h3>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                      {selectedChannel === option.type && option.type === 'whapi_cloud' && qrModalError && (
                        <p className="text-sm text-red-500 mt-1">{qrModalError}</p>
                      )}
                    </div>
                    {isBusy && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                  </div>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <QRModal
        isOpen={showQRModal && selectedChannel === 'whapi_cloud'}
        onClose={handleCloseQRModal}
        qrCode={qrModalQrCode as any}         
        status={qrModalStatus as any}
        error={qrModalError as any}  
        isInitiating={qrModalIsInitiating}
        isHookLoading={qrModalIsHookLoading}
        title="Conectar WhatsApp (Whapi)"
      />
    </>
  );
}