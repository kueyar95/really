import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeCanvas } from "qrcode.react";
import { AlertCircle, Loader2, CheckCircle, XCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

type UiStatus =
  | "connecting"
  | "waiting_scan"
  | "awaiting_qr"
  | "active"
  | "inactive"
  | "error"
  | "not_configured"  
  | "connected"
  | "ready"
  | "authenticated";

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCode: string | null;
  status: UiStatus | null;
  error: string | null;
  isInitiating?: boolean;
  isHookLoading?: boolean;
  title?: string;
  description?: string;
  instructions?: {
    step1?: string;
    step2?: string;
    step3?: string;
  };
}

const StepIndicator = ({
  label,
  status,
}: {
  label: string;
  status: "pending" | "loading" | "success" | "error";
}) => {
  const Icon =
    status === "loading"
      ? Loader2
      : status === "success"
      ? CheckCircle
      : status === "error"
      ? XCircle
      : Circle;

  const iconColor =
    status === "success"
      ? "text-green-500"
      : status === "error"
      ? "text-red-500"
      : status === "loading"
      ? "text-blue-500"
      : "text-gray-400";

  const isSpinning = status === "loading";

  return (
    <div
      className={cn(
        "flex items-center gap-3 transition-opacity duration-300",
        status === "pending" ? "opacity-50" : "opacity-100"
      )}
    >
      <Icon
        className={cn(
          "w-5 h-5 flex-shrink-0",
          iconColor,
          isSpinning && "animate-spin"
        )}
      />
      <span
        className={cn(
          "text-sm font-medium",
          status === "pending" ? "text-gray-500" : "text-gray-800"
        )}
      >
        {label}
      </span>
    </div>
  );
};

export function QRModal({
  isOpen,
  onClose,
  qrCode,
  status,
  error,
  isInitiating,
  isHookLoading,
  title = "Conectar Canal",
  description = "Sigue los pasos para completar la conexión",
  instructions = {
    step1: "1. Abre WhatsApp en tu teléfono",
    step2: "2. Toca Menú o Configuración y selecciona WhatsApp Web",
    step3: "3. Apunta tu teléfono hacia esta pantalla para escanear el código QR",
  },
}: QRModalProps) {
  const isSuccess = useMemo(() => {
    return status === "active" || status === "connected" || status === "ready" || status === "authenticated";
  }, [status]);

  const isInactive = status === "inactive";

  const [hasShownQr, setHasShownQr] = useState(false);
  
  useEffect(() => {
    if (qrCode && (status === "waiting_scan" || status === "awaiting_qr")) {
      setHasShownQr(true);
    }
  }, [qrCode, status]);

  // Auto-close on success
  useEffect(() => {
    if (isSuccess && isOpen) {
      const t = setTimeout(() => {
        onClose();
      }, 900);
      return () => clearTimeout(t);
    }
  }, [isSuccess, isOpen, onClose]);

  const getStepStatus = (
    step: number
  ): "pending" | "loading" | "success" | "error" => {
    if (status === "error") return "error";
    const step1 = isInitiating ? "loading" : "success";
    const sawQr = hasShownQr || status === "waiting_scan" || status === "awaiting_qr" || !!qrCode;
    const step2 = sawQr ? "success" : step1 === "success" ? "loading" : "pending";
    const step3 = isSuccess ? "success" : sawQr ? "loading" : "pending";

    switch (step) {
      case 1:
        return step1;
      case 2:
        return step2;
      case 3:
        return step3;
      case 4:
        return isSuccess ? "success" : "pending";
      default:
        return "pending";
    }
  };

  const showSteps = status !== "error";

  // Contenido principal según estado
  let mainContent: React.ReactNode = null;

  if (status === "error" && error) {
    mainContent = (
      <div className="flex flex-col items-center justify-center h-full text-center gap-2 text-red-500 p-4">
        <XCircle className="w-10 h-10 mb-2" />
        <span className="font-medium text-lg">Error de conexión</span>
        <p className="text-sm">{error}</p>
      </div>
    );
  } else if (isInactive) {
    mainContent = (
      <div className="flex flex-col items-center justify-center h-full text-center gap-2 text-gray-500 p-4">
        <AlertCircle className="w-10 h-10 mb-2" />
        <span className="font-medium text-lg">Canal Desconectado</span>
        <p className="text-sm">Este canal se ha desconectado.</p>
      </div>
    );
  } else if (qrCode && (status === "waiting_scan" || status === "awaiting_qr")) {
    mainContent = (
      <>
        <div className="p-2 bg-white rounded-lg shadow-md mb-4">
          {qrCode.startsWith("data:image/") ? (
            <img
              src={qrCode}
              alt="Código QR"
              width={200}
              height={200}
              className="block mx-auto"
            />
          ) : (
            <QRCodeCanvas value={qrCode} size={200} level="H" includeMargin />
          )}
        </div>
        <p className="text-sm text-center text-muted-foreground max-w-xs">
          {instructions?.step1}
          <br />
          {instructions?.step2}
          <br />
          {instructions?.step3}
        </p>
      </>
    );
  } else if (isInitiating || status === "connecting") {
    mainContent = (
      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
        <Loader2 className="w-10 h-10 mb-4 animate-spin text-primary" />
        <p className="text-lg font-medium">Iniciando conexión...</p>
        <p className="text-sm mt-1">
          Configurando todo lo inicial, por favor espera.
        </p>
      </div>
    );
  } else if (isHookLoading) {
    mainContent = (
      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
        <Loader2 className="w-10 h-10 mb-4 animate-spin text-primary" />
        <p className="text-lg font-medium">Generando código QR...</p>
        <p className="text-sm mt-1">
          Por favor espera un momento sin cerrar la pestaña.
        </p>
      </div>
    );
  } else if (hasShownQr && (status === "inactive" as UiStatus)) {
    mainContent = (
      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
        <Loader2 className="w-10 h-10 mb-4 animate-spin text-primary" />
        <p className="text-lg font-medium">Verificando conexión…</p>
        <p className="text-sm mt-1">Si ya escaneaste, espera unos segundos.</p>
      </div>
    );
  } else if (isSuccess) {
    mainContent = (
      <div className="flex flex-col items-center justify-center h-full text-center text-green-600 p-4">
        <CheckCircle className="w-10 h-10 mb-2" />
        <span className="font-medium text-lg">¡WhatsApp conectado!</span>
        <p className="text-sm mt-1">Cerrando…</p>
      </div>
    );
  } else {
    mainContent = (
      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
        <Loader2 className="w-10 h-10 mb-4 animate-spin text-primary" />
        <p className="text-lg font-medium">Preparando...</p>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 py-4">
          <div className="w-full min-h-[290px] flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg shadow-inner">
            {mainContent}
          </div>

          {status !== "error" && (
            <div className="w-full space-y-3 px-4">
              <StepIndicator label="Iniciando conexión" status={getStepStatus(1)} />
              <StepIndicator label="Generando código QR" status={getStepStatus(2)} />
              <StepIndicator label="Escaneando código QR" status={getStepStatus(3)} />
              <StepIndicator label="Canal Conectado" status={getStepStatus(4)} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
