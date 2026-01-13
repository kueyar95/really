import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useEffect, useRef } from "react";
import { AlertCircle, Calendar, Star, Clock, Link2Off } from "lucide-react";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useGoogleSheets } from '@/hooks/useGoogleSheets';
import { useGoogleCalendarList } from "@/hooks/useGoogleCalendarList";
import { useMedilink } from '@/hooks/useMedilink';
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarService } from "@/services/Calendar/queries";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MedilinkCard } from '../integrations/MedilinkCard';
import { MedilinkConfigModal } from '../integrations/MedilinkConfigModal';

export function IntegrationsTab() {
  const { toast } = useToast();
  const [showGoogleCalendarModal, setShowGoogleCalendarModal] = useState(false);
  const [showGoogleSheetsModal, setShowGoogleSheetsModal] = useState(false);
  const [showMedilinkModal, setShowMedilinkModal] = useState(false);
  
  const {
    isConnected,
    connectGoogleCalendar,
    handleCallback,
    handleDisconnect,
    handleDisconnectCalendar,
    isDisconnecting,
    isLoading
  } = useGoogleCalendar();
  
  const {
    isConnected: isMedilinkConnected,
    isInvalidToken: isMedilinkInvalidToken,
    isLoading: isMedilinkLoading,
  } = useMedilink();
  const { calendars, isLoading: isLoadingCalendars, refetch: refetchCalendars } = useGoogleCalendarList();
  const [isSelectingCalendar, setIsSelectingCalendar] = useState(false);
  const hasExecutedCallback = useRef(false);
  const {
    isConnected: isConnectedSheets,
    connectGoogleSheets,
    handleCallback: handleCallbackSheets,
    disconnect: disconnectSheets,
    isLoading: isLoadingSheets
  } = useGoogleSheets();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tab = searchParams.get('tab');
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const isSheet = searchParams.get('sheet') === 'true';

    if (tab === 'integrations' && code && !hasExecutedCallback.current) {
      hasExecutedCallback.current = true;
      if (isSheet) {
        handleCallbackSheets(code);
      } else {
        handleCallback({ code, state: state || '' });
      }
    }
  }, [handleCallback, handleCallbackSheets]);

  const handleDisconnectSheets = async () => {
    await disconnectSheets();
    setShowGoogleSheetsModal(false);
  };

  const handleSelectCalendar = async (calendarId: string) => {
    try {
      setIsSelectingCalendar(true);
      await CalendarService.selectCalendar(calendarId);
      await refetchCalendars();
      toast({
        title: "Calendario conectado",
        description: "El calendario ha sido conectado correctamente",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Error al conectar el calendario",
      });
    } finally {
      setIsSelectingCalendar(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Sección de Salud */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Salud</h2>
        <div className="space-y-4">
          <MedilinkCard
            isConnected={isMedilinkConnected}
            isInvalidToken={isMedilinkInvalidToken}
            isLoading={isMedilinkLoading}
            onClick={() => setShowMedilinkModal(true)}
          />
        </div>
      </div>

      {/* Sección de Agendamiento */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Agendamiento</h2>
        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => setShowGoogleCalendarModal(true)}
        >
          <CardHeader>
            <div className="flex items-center gap-4">
              <img
                src="/icons/google_calendar.png"
                alt="Google Calendar"
                className="w-10 h-10"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <CardTitle>Google Calendar</CardTitle>
                  <span className={`text-sm ${isLoading ? "text-gray-500" : isConnected ? "text-green-500" : "text-red-500"}`}>
                    {isLoading ? "Cargando..." : isConnected ? "Conectado" : "Desconectado"}
                  </span>
                </div>
                <CardDescription>
                  Agrega tus credenciales de Google Calendar para habilitar la integración con Google Calendar.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Google Sheets</h2>
        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => setShowGoogleSheetsModal(true)}
        >
          <CardHeader>
            <div className="flex items-center gap-4">
              <img
                src="/icons/google-sheets.svg"
                alt="Google Sheets"
                className="w-10 h-10"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <CardTitle>Google Sheets</CardTitle>
                  <span className={`text-sm ${isLoadingSheets ? "text-gray-500" : isConnectedSheets ? "text-green-500" : "text-red-500"}`}>
                    {isLoadingSheets ? "Cargando..." : isConnectedSheets ? "Conectado" : "Desconectado"}
                  </span>
                </div>
                <CardDescription>
                  Agrega tus credenciales de Google Sheets para habilitar la integración con Google Sheets.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Sección de Ecommerce */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Ecommerce</h2>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-2 rounded-lg">
                <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M19 3H5c-1.11 0-2 .89-2 2v14c0 1.11.89 2 2 2h14c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 16H5V5h14v14zm-8-2h2v-4h4v-2h-4V7h-2v4H7v2h4z"/>
                </svg>
              </div>
              <div>
                <CardTitle>Inventario</CardTitle>
                <CardDescription>
                  Agrega la integración a tu inventario para tener conexión a productos y pedidos.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>


      {/* Modal de Google Calendar */}
      <Dialog open={showGoogleCalendarModal} onOpenChange={setShowGoogleCalendarModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-4 mb-4">
              <img
                src="/icons/google_calendar.png"
                alt="Google Calendar"
                className="w-12 h-12"
              />
              <div>
                <DialogTitle>Google Calendar</DialogTitle>
                <DialogDescription>
                  Crea y edita eventos en Google Calendar.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Crear una conexión de espacio de trabajo</h3>
              <p className="text-sm text-muted-foreground">
                Una conexión para todo tu espacio de trabajo.
              </p>
            </div>

            {!isConnected && (
              <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                <span>Desconectado</span>
              </div>
            )}

            {isConnected && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <h3 className="text-sm font-medium">Calendarios disponibles</h3>
                  <p className="text-xs text-muted-foreground">
                    Conecta los calendarios que deseas usar para tus citas
                  </p>
                  <ScrollArea className="h-[280px] w-full rounded-md border">
                    {isLoadingCalendars ? (
                      <div className="flex items-center justify-center h-[280px]">
                        <div className="flex flex-col items-center gap-2">
                          <Calendar className="h-4 w-4 animate-spin text-primary" />
                          <p className="text-xs text-muted-foreground">Cargando calendarios...</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-1">
                        {calendars.map((calendar) => (
                          <div
                            key={calendar.id}
                            className={cn(
                              "w-full flex items-center p-2 rounded-md transition-all mb-1 last:mb-0",
                              calendar.isConnected ? "bg-primary/10" : "hover:bg-accent/50",
                            )}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div
                                className={cn(
                                  "w-2 h-2 rounded-full flex-shrink-0",
                                  calendar.isConnected && "ring-1 ring-primary ring-offset-1"
                                )}
                                style={{ backgroundColor: calendar.backgroundColor || '#4285f4' }}
                              />
                              <div className="text-left min-w-0 space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-medium truncate">{calendar.summary}</p>
                                  {calendar.primary && (
                                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 flex-shrink-0" />
                                  )}
                                  {calendar.isConnected && (
                                    <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full flex-shrink-0">
                                      Conectado
                                    </span>
                                  )}
                                </div>
                                {(calendar.description || calendar.timeZone) && (
                                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                    {calendar.timeZone && (
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        <Clock className="h-2.5 w-2.5" />
                                        <span className="truncate">{calendar.timeZone.replace('America/', '')}</span>
                                      </div>
                                    )}
                                    {calendar.description && (
                                      <span className="truncate hidden sm:inline-block">{calendar.description}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {calendar.isConnected ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleDisconnectCalendar(calendar.id)}
                                      >
                                        <Link2Off className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Desconectar calendario</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[10px]"
                                  onClick={() => handleSelectCalendar(calendar.id)}
                                  disabled={isSelectingCalendar}
                                >
                                  Conectar
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Características</h4>
                  <ul className="space-y-2.5">
                    <li className="flex items-start gap-2.5">
                      <div className="p-1.5 bg-gray-100 rounded-md mt-0.5">
                        <svg className="h-3.5 w-3.5 text-gray-600" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5zm2 4h10v2H7v-2zm0 4h7v2H7v-2z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-medium">Crear Citas</p>
                        <p className="text-[10px] text-muted-foreground">
                          Programa fácilmente nuevos eventos directamente en Google Calendar con IA.
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="p-1.5 bg-gray-100 rounded-md mt-0.5">
                        <svg className="h-3.5 w-3.5 text-gray-600" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10s10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8zm.5-13H11v6l5.2 3.2l.8-1.3l-4.5-2.7V7z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-medium">Verificar Disponibilidad</p>
                        <p className="text-[10px] text-muted-foreground">
                          Consulta la disponibilidad de los participantes antes de agendar con IA.
                        </p>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3">
              <Button
                onClick={() => isConnected ? handleDisconnect() : connectGoogleCalendar()}
                className="w-full"
                disabled={isDisconnecting}
              >
                {isDisconnecting ? "Desconectando..." : isConnected ? "Desconectar" : "Conectar con Google Calendar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Google Sheets */}
      <Dialog open={showGoogleSheetsModal} onOpenChange={setShowGoogleSheetsModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-4 mb-4">
              <img
                src="/icons/google-sheets.svg"
                alt="Google Sheets"
                className="w-12 h-12"
              />
              <div>
                <DialogTitle>Google Sheets</DialogTitle>
                <DialogDescription>
                  Crea y edita hojas de cálculo en Google Sheets.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Crear una conexión de espacio de trabajo</h3>
              <p className="text-sm text-muted-foreground">
                Una conexión para todo tu espacio de trabajo.
              </p>
            </div>

            {!isConnected && (
              <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                <span>Desconectado</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Características</h4>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-md">
                      <svg className="h-5 w-5 text-gray-600" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5zm2 4h10v2H7v-2zm0 4h7v2H7v-2z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Agregar registros</p>
                      <p className="text-sm text-muted-foreground">
                        Agrega nuevos registros a tu hoja de cálculo con IA.
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

          </div>
          <div className="flex justify-end">
              <Button
              onClick={() => isConnectedSheets ? handleDisconnectSheets() : connectGoogleSheets()}
              className="w-full"
            >
              {isConnectedSheets ? "Desconectar" : "Conectar con Google Sheets"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Medilink */}
      <MedilinkConfigModal
        open={showMedilinkModal}
        onOpenChange={setShowMedilinkModal}
      />

    </div>
  );
}