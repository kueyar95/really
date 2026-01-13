import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, PhoneCall, Trash2 } from "lucide-react";
import { ChannelType } from "@/services/Whatsapp/types";
import { BsWhatsapp, BsInstagram, BsMessenger, BsTelegram } from "react-icons/bs";
import { useChannelConnection } from "@/services/Whatsapp/hooks/useChannelConnection";
import { ChannelsService } from "@/services/Channels/queries";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Channel as WhatsappChannel } from "@/services/Whatsapp/types";
import { QRModal } from "./QRModal";

interface ChannelCardProps {
  channel: WhatsappChannel;
  onUpdate: () => void; // <- importante para refetch de la lista
}

const channelIcons = {
  whatsapp_web: <BsWhatsapp className="h-8 w-8 text-[#00a884]" />,
  whatsapp_baileys: <BsWhatsapp className="h-8 w-8 text-[#00a884]" />,
  whatsapp_cloud: <BsWhatsapp className="h-8 w-8 text-[#00a884]" />,
  whapi_cloud: <BsWhatsapp className="h-8 w-8 text-[#00a884]" />,
  telegram: <BsTelegram className="h-8 w-8 text-blue-400" />,
  instagram: <BsInstagram className="h-8 w-8 text-pink-500" />,
  facebook: <BsMessenger className="h-8 w-8 text-blue-500" />
} as const;

const channelTitles = {
  whatsapp_web: 'WhatsApp Web',
  whatsapp_baileys: 'WhatsApp Web',
  whatsapp_cloud: 'WhatsApp Cloud API',
  whapi_cloud: 'WhatsApp Web',
  telegram: 'Telegram',
  instagram: 'Instagram Direct',
  facebook: 'Facebook Messenger'
} as const;

export function ChannelCard({ channel, onUpdate }: ChannelCardProps) {
  const [showQRModal, setShowQRModal] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // Estado local que la UI usa para decidir texto/botones
  const [localStatus, setLocalStatus] = useState<
    'active' | 'connecting' | 'inactive' | 'error' | 'not_configured' | 'waiting_scan'
  >(channel.status as any);

  // —— FIX 1: sincroniza localStatus cuando cambian las props (p. ej. tras refetch)
  useEffect(() => {
    setLocalStatus(channel.status as any);
  }, [channel.status]);

  // Teléfono a mostrar: si el hook no lo trae, usa el de backend
  const displayPhoneNumber = channel.number;

  // Identificar WhatsApp Cloud (no usa QR ni ws)
  const isCloud = channel.type === 'whatsapp_cloud';

  // Para Cloud NO iniciamos el hook; para el resto, sí
  const {
    phoneNumber: wsPhoneNumber,
    qrCode,
    connectionStatus: wsStatus,
    lastError,
    connect,
    disconnect,
    isLoading,
    status: wsChannelStatus
  } = useChannelConnection({
    channelId: channel.id,
    type: channel.type as ChannelType,
    enabled: !isCloud
  });

  // Si el ws reporta estado, úsalo para canales con ws
  useEffect(() => {
    if (!isCloud && wsChannelStatus) setLocalStatus(wsChannelStatus as any);
  }, [isCloud, wsChannelStatus]);

  // —— FIX 2: escucha el evento global que dispara el modal al finalizar el signup
  useEffect(() => {
    const handler = () => {
      try { onUpdate(); } catch { /* noop */ }
    };
    window.addEventListener('channels:refresh', handler as any);
    return () => window.removeEventListener('channels:refresh', handler as any);
  }, [onUpdate]);

  const handleConnect = async () => {
    try {
      const result = await ChannelsService.connectById(channel.id);

      // Caso feliz sin QR (incluye Cloud si el backend ya lo activa)
      if (result?.status === 'active' && !result?.requiresQr) {
        setLocalStatus('active');
        toast({ title: "Conectado", description: "El canal se ha reconectado correctamente." });
        onUpdate(); // pide al padre que refetch
        return;
      }

      // Solo canales con QR deben abrir modal y activar hook
      if (!isCloud && (result?.requiresQr || result?.status === 'awaiting_qr' || result?.status === 'connecting')) {
        setShowQRModal(true);
        setLocalStatus('connecting');
        connect();
      }
    } catch (err: any) {
      toast({
        title: "Error al conectar",
        description: err?.message || "No fue posible iniciar la reconexión.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      if (!isCloud) {
        await disconnect(); // ws/QR
      } else {
        // Si tienes endpoint explícito para Cloud, úsalo:
        if (typeof (ChannelsService as any).disconnectById === 'function') {
          await (ChannelsService as any).disconnectById(channel.id);
        }
      }
      setLocalStatus('inactive');
      onUpdate();
    } catch (err: any) {
      toast({
        title: "Error al desconectar",
        description: err?.message || "No fue posible desconectar el canal.",
        variant: "destructive",
      });
    }
  };

  const handleCloseQRModal = () => {
    setShowQRModal(false);
    // Solo para canales con ws; Cloud no necesita desconectar hook
    if (!isCloud && localStatus !== 'active') {
      disconnect();
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      if (localStatus === 'active' && !isCloud) {
        await disconnect();
      }
      await ChannelsService.deleteChannel(channel.id, true);
      toast({ title: "Canal eliminado", description: "El canal ha sido eliminado exitosamente" });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Error al eliminar el canal",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const getStatusBadge = () => {
    if (isLoading) {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-700 animate-pulse">
          <div className="w-2 h-2 rounded-full bg-blue-500 mr-2 animate-[pulse_1.5s_ease-in-out_infinite]" />
          Verificando estado...
        </Badge>
      );
    }

    switch (localStatus) {
      case 'connecting':
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-700 transition-colors duration-200">
            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
            Conectando...
          </Badge>
        );
      case 'active':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-700 transition-colors duration-200">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
            Conectado
          </Badge>
        );
      case 'inactive':
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-700 transition-colors duration-200">
            <div className="w-2 h-2 rounded-full bg-gray-500 mr-2" />
            Desconectado
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-700 transition-colors duration-200">
            <div className="w-2 h-2 rounded-full bg-red-500 mr-2" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-700 transition-colors duration-200">
            <div className="w-2 h-2 rounded-full bg-gray-500 mr-2" />
            No configurado
          </Badge>
        );
    }
  };

  // Mostrar teléfono del hook si existe (solo ws), sino el del backend
  const phoneToShow = (!isCloud && wsPhoneNumber) ? wsPhoneNumber : displayPhoneNumber;

  return (
    <>
      <Card className="flex flex-col h-[220px] transition-all hover:shadow-md">
        <CardHeader className="flex-none pb-3 border-b">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-50 rounded-lg">
                {channelIcons[channel.type as keyof typeof channelIcons]}
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="font-medium truncate">
                  {channelTitles[channel.type as keyof typeof channelTitles]}
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {phoneToShow ? (
                    <div className="flex items-center gap-1 truncate">
                      <PhoneCall className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{phoneToShow}</span>
                    </div>
                  ) : (
                    'Sin número asociado'
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col justify-between flex-1 py-4">
          <div className="space-y-2">
            {getStatusBadge()}
            {lastError && !isCloud && (
              <p className="text-sm text-red-500 line-clamp-2">
                {lastError}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-auto">
            {localStatus === 'active' ? (
              <Button
                variant="destructive"
                size="sm"
                className="flex-1 max-w-[120px] relative overflow-hidden transition-all duration-200"
                onClick={handleDisconnect}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-red-600/20 animate-pulse" />
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <span className="truncate">Desconectando</span>
                  </div>
                ) : (
                  <span className="truncate">Desconectar</span>
                )}
              </Button>
            ) : (
              <div className="flex w-full gap-2">
                <Button
                  className="flex-1 relative overflow-hidden transition-all duration-200"
                  size="sm"
                  onClick={handleConnect}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary-foreground/20 animate-pulse" />
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span className="truncate">Conectando</span>
                    </div>
                  ) : (
                    <span className="truncate">Conectar</span>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  disabled={isDeleting}
                  className="relative overflow-hidden transition-all duration-200"
                >
                  {isDeleting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-red-600/20 animate-pulse" />
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    </div>
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Solo se usa para canales con QR */}
      {!isCloud && (
        <QRModal
          isOpen={showQRModal}
          onClose={handleCloseQRModal}
          qrCode={qrCode}
          status={wsChannelStatus}
          error={lastError}
          title={`Conectar ${channel.name || "Canal"}`}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar canal definitivamente?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el canal{phoneToShow && ` ${phoneToShow}`} y sus recursos asociados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
