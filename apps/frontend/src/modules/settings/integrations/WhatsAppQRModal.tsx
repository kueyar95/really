import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeCanvas } from "qrcode.react";
import { AlertCircle, Loader2, SmartphoneNfc } from "lucide-react";
import { useEffect } from "react";

interface WhatsAppQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCode: string | null;
  status: string | null;
  error: string | null;
}

export function WhatsAppQRModal({
  isOpen,
  onClose,
  qrCode,
  status,
  error
}: WhatsAppQRModalProps) {
  // Cerrar automáticamente el modal cuando la conexión es exitosa
  useEffect(() => {
    if (status === 'ready') {
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, onClose]);

  const getStatusMessage = () => {
    if (error) {
      return (
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      );
    }

    switch (status) {
      case 'connecting':
        return (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Iniciando conexión...
          </div>
        );
      case 'waiting_scan':
        return (
          <div className="flex items-center gap-2">
            <SmartphoneNfc className="w-4 h-4" />
            Escanea el código QR con WhatsApp
          </div>
        );
      case 'authenticated':
        return (
          <div className="flex items-center gap-2 text-green-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            ¡Autenticado! Configurando...
          </div>
        );
      case 'ready':
        return (
          <div className="flex items-center gap-2 text-green-500">
            <SmartphoneNfc className="w-4 h-4" />
            ¡WhatsApp conectado exitosamente!
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Preparando conexión...
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp</DialogTitle>
          <DialogDescription>
            Sigue los pasos para conectar tu WhatsApp
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 py-4">
          {qrCode ? (
            <>
              <div className="p-4 bg-white rounded-lg">
                <QRCodeCanvas
                  value={qrCode}
                  size={256}
                  level="H"
                  includeMargin
                />
              </div>
              <div className="space-y-2 text-center">
                <p className="text-sm text-muted-foreground">
                  1. Abre WhatsApp en tu teléfono
                </p>
                <p className="text-sm text-muted-foreground">
                  2. Toca Menú o Configuración y selecciona WhatsApp Web
                </p>
                <p className="text-sm text-muted-foreground">
                  3. Apunta tu teléfono hacia esta pantalla para escanear el código QR
                </p>
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              {getStatusMessage()}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 