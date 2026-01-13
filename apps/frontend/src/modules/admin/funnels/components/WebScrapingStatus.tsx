import { useEffect, useState, useCallback } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { checkAnalysisStatus } from "@/services/Funnels/queries";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Circle } from "lucide-react";

interface WebScrapingStatusProps {
  jobId: string;
  onComplete: (result: {
    success?: boolean;
    data?: {
      templateId: string;
      filledTemplate: any;
      timings: { total: string };
    };
    error?: string;
  }) => void;
  onStatusChange: (isProcessing: boolean) => void;
  onClose: () => void;
  isCompleted: boolean;
}

const ANALYSIS_STAGES = [
  {
    id: "routes_search",
    message: "Buscando todas las rutas del sitio web...",
    description: "Analizando la estructura de navegación",
  },
  {
    id: "routes_filter",
    message: "Seleccionando rutas relevantes...",
    description: "Identificando páginas importantes",
  },
  {
    id: "content_scraping",
    message: "Extrayendo contenido de las páginas...",
    description: "Recopilando información valiosa",
  },
  {
    id: "content_synthesis",
    message: "Sintetizando el contenido...",
    description: "Procesando y organizando la información",
  },
  {
    id: "template_filling",
    message: "Personalizando la plantilla...",
    description: "Adaptando el contenido a tu negocio",
  },
];

export function WebScrapingStatus({
  jobId,
  onComplete,
  onStatusChange,
  onClose,
  isCompleted: externalIsCompleted,
}: WebScrapingStatusProps) {
  const [progress, setProgress] = useState(0);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(true);
  const [timeTaken, setTimeTaken] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 60; // 5 minutos máximo (con 5 segundos entre intentos)

  // Efecto separado para la barra de progreso
  useEffect(() => {
    if (isCompleted || error) {
      return;
    }

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return 90; // No avanzar más del 90% hasta completar
        return Math.min(90, prev + 1); // Avanzar 1% cada 500ms
      });
    }, 500);

    return () => clearInterval(progressInterval);
  }, [isCompleted, error]);

  // Efecto para el polling de estado
  useEffect(() => {
    if (isCompleted || error) {
      return;
    }

    let intervalId: NodeJS.Timeout;
    let startTime = Date.now();

    const checkStatus = async () => {
      try {
        const response = await checkAnalysisStatus(jobId);
        const currentTime = Date.now();
        const elapsedSeconds = ((currentTime - startTime) / 1000).toFixed(1);

        if (response.status === "completed") {
          setIsCompleted(true);
          setProgress(100);
          setTimeTaken(elapsedSeconds);
          onComplete({
            success: true,
            data: {
              templateId: response.result?.data.templateId || "",
              filledTemplate: response.result?.data.filledTemplate,
              timings: response.result?.data.timings || {
                total: elapsedSeconds + "s",
              },
            },
          });
          onStatusChange(false);
          clearInterval(intervalId);
        } else if (response.status === "processing") {
          if (retryCount >= MAX_RETRIES) {
            setError(
              "El proceso ha excedido el tiempo máximo de espera (5 minutos)"
            );
            onComplete({
              success: false,
              error: "Tiempo máximo excedido",
            });
            onStatusChange(false);
            clearInterval(intervalId);
            return;
          }

          setRetryCount((prev) => prev + 1);

          // Actualizar el stage cada 6 segundos
          const stageIndex =
            Math.floor(Number(elapsedSeconds) / 6) % ANALYSIS_STAGES.length;
          setCurrentStageIndex(stageIndex);
        } else if (response.status === "error") {
          setError(response.error || "Error desconocido");
          onComplete({
            success: false,
            error: response.error,
          });
          onStatusChange(false);
          clearInterval(intervalId);
        }
      } catch (error) {
        console.error("Error checking status:", error);
        setError("Error al verificar el estado del análisis");
        onComplete({
          success: false,
          error: "Error al verificar el estado del análisis",
        });
        onStatusChange(false);
        clearInterval(intervalId);
      }
    };

    // Iniciar el polling de estado cada 5 segundos
    intervalId = setInterval(checkStatus, 5000);

    // Llamada inicial
    checkStatus();

    return () => {
      clearInterval(intervalId);
    };
  }, [jobId, onComplete, onStatusChange, isCompleted, error]);

  // Sincronizar con el estado externo de completado
  useEffect(() => {
    if (externalIsCompleted) {
      setIsCompleted(true);
      setProgress(100);
    }
  }, [externalIsCompleted]);

  const handleClose = () => {
    if (isCompleted || error) {
      setShowDialog(false);
      onClose();
    }
  };

  const currentStage = ANALYSIS_STAGES[currentStageIndex];

  return (
    <Dialog open={showDialog} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isCompleted
              ? "¡Análisis completado!"
              : error
              ? "Error en el análisis"
              : "Analizando sitio web"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {error ? (
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Error en el análisis</p>
                <p className="text-sm opacity-90">{error}</p>
              </div>
            </div>
          ) : isCompleted ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-green-600">
                <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">¡Análisis completado con éxito!</p>
                  {timeTaken && (
                    <p className="text-sm text-muted-foreground">
                      Tiempo total: {timeTaken}s
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Progress value={100} className="h-2 bg-green-100" />
                <p className="text-sm text-muted-foreground text-center">
                  La plantilla ha sido personalizada y está lista para usar
                </p>
              </div>

              <div className="space-y-1">
                {ANALYSIS_STAGES.map((stage, index) => (
                  <div
                    key={stage.id}
                    className="flex items-center gap-2 py-1 px-2 rounded text-green-500"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">{stage.message}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                  </div>
                  <div>
                    <p className="font-medium">{currentStage.message}</p>
                    <p className="text-sm text-muted-foreground">
                      {currentStage.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Progress
                  value={progress}
                  className={cn(
                    "h-2 transition-all duration-300",
                    progress === 100 ? "bg-green-100" : "bg-blue-100"
                  )}
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Progreso: {Math.round(progress)}%</span>
                  <span>
                    Intento {retryCount + 1} de {MAX_RETRIES}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                {ANALYSIS_STAGES.map((stage, index) => (
                  <div
                    key={stage.id}
                    className={cn(
                      "flex items-center gap-2 py-1 px-2 rounded transition-colors",
                      index === currentStageIndex && "bg-blue-50",
                      index < currentStageIndex && "text-green-500",
                      index > currentStageIndex &&
                        "text-muted-foreground opacity-50"
                    )}
                  >
                    {index < currentStageIndex ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : index === currentStageIndex ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-current opacity-50" />
                    )}
                    <span className="text-sm">{stage.message}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {(isCompleted || error) && (
          <DialogFooter>
            <Button onClick={handleClose}>Cerrar</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
