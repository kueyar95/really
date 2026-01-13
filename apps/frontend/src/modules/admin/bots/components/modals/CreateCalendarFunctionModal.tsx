import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BotFunction } from "../types";
import { FunctionsService } from "@/services/Bots/functions";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2, Star, Calendar, Search, Clock } from "lucide-react";
import { useGoogleCalendarList } from "@/hooks/useGoogleCalendarList";
import { Switch } from "@/components/ui/switch";

// Interfaces para la estructura de datos del backend
interface BaseGoogleCalendarConstData {
  name: string;
  calendarId: string;
  description: string;
  duration: string;
  eventName: string;
}

interface GoogleCalendarAvailabilityParameters {
  type: 'object';
  properties: {
    date: {
      type: 'string';
      description: string;
    };
    endDate: {
      type: 'string';
      description: string;
    };
  };
  required: string[];
}

interface GoogleCalendarCreateEventParameters {
  type: 'object';
  properties: {
    startTime: {
      type: 'string';
      description: string;
    };
    name: {
      type: 'string';
      description: string;
    };
    email: {
      type: 'string';
      description: string;
    };
    attendeeName?: {
      type: 'string';
      description: string;
    };
  };
  required: string[];
}

interface GoogleCalendarAvailabilityConstData extends BaseGoogleCalendarConstData {
  type: 'get-availability';
}

interface GoogleCalendarCreateEventConstData extends BaseGoogleCalendarConstData {
  type: 'create-event';
  createMeet?: boolean;
  includeClientAsAttendee?: boolean;
  sendNotifications?: boolean;
}

interface GoogleCalendarBackendConstData extends BaseGoogleCalendarConstData {
  type: 'list-events' | 'update-event' | 'delete-event';
}

type GoogleCalendarParameters =
  | GoogleCalendarAvailabilityParameters
  | GoogleCalendarCreateEventParameters
  | Record<string, never>; // Para las funciones manejadas por el backend

type GoogleCalendarConstData =
  | GoogleCalendarAvailabilityConstData
  | GoogleCalendarCreateEventConstData
  | GoogleCalendarBackendConstData;

interface CreateCalendarFunctionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFunctionCreated: (newFunction: BotFunction) => void;
}

const FUNCTION_TYPES = [
  { id: "get-availability", name: "Consultar disponibilidad" },
  { id: "create-event", name: "Crear evento" },
  { id: "list-events", name: "Listar eventos" },
  { id: "update-event", name: "Actualizar evento" },
  { id: "delete-event", name: "Eliminar evento" },
] as const;

const DURATION_OPTIONS = [
  { id: "15m", name: "15 minutos", minutes: 15 },
  { id: "30m", name: "30 minutos", minutes: 30 },
  { id: "45m", name: "45 minutos", minutes: 45 },
  { id: "1h", name: "1 hora", minutes: 60 },
  { id: "1h30m", name: "1 hora y 30 minutos", minutes: 90 },
  { id: "2h", name: "2 horas", minutes: 120 },
  { id: "3h", name: "3 horas", minutes: 180 },
] as const;

// Función auxiliar para convertir duración a minutos
const getDurationInMinutes = (durationId: string): number => {
  const option = DURATION_OPTIONS.find(opt => opt.id === durationId);
  return option?.minutes || 60; // Por defecto 60 minutos si no se encuentra
};

export function CreateCalendarFunctionModal({
  isOpen,
  onClose,
  onFunctionCreated,
}: CreateCalendarFunctionModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { calendars, isLoading: isLoadingCalendars } = useGoogleCalendarList();
  const [newFunction, setNewFunction] = useState<Partial<BotFunction>>({
    category: "scheduling",
    parameters: {},
    constData: {},
  });

  const [calendarConfig, setCalendarConfig] = useState({
    calendarId: "",
    criteria: "availability",
    functionType: "get-availability" as "get-availability" | "create-event" | "list-events" | "update-event" | "delete-event",
    duration: "1h",
    eventName: "",
    // Opciones para create-event
    createMeet: false,
    // Estos valores siempre serán true
    includeClientAsAttendee: true,
    sendNotifications: true,
  });

  const handleCreateFunction = async () => {
    if (
      !newFunction.name ||
      !newFunction.description ||
      !newFunction.activationDescription ||
      !calendarConfig.calendarId
    ) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor completa todos los campos requeridos.",
      });
      return;
    }

    try {
      setIsLoading(true);

      let parameters: GoogleCalendarParameters;
      let constData: GoogleCalendarConstData;

      const baseConstData: BaseGoogleCalendarConstData = {
        name: newFunction.name || "",
        calendarId: calendarConfig.calendarId,
        description: newFunction.description || "",
        duration: getDurationInMinutes(calendarConfig.duration).toString(),
        eventName: calendarConfig.eventName || newFunction.name || "",
      };

      switch (calendarConfig.functionType) {
        case "get-availability":
          parameters = {
            type: "object",
            properties: {
              date: {
                type: "string",
                description: "Fecha para consultar disponibilidad",
              },
              endDate: {
                type: "string",
                description: "Fecha límite para consultar disponibilidad",
              },
            },
            required: ["date"],
          };

          constData = {
            ...baseConstData,
            type: "get-availability",
          };
          break;

        case "create-event":
          parameters = {
            type: "object",
            properties: {
              startTime: {
                type: "string",
                description: "Hora de inicio del evento (formato ISO)",
              },
              name: {
                type: "string",
                description: "Nombre del asistente",
              },
              email: {
                type: "string",
                description: "Email del asistente",
              },
              attendeeName: {
                type: "string",
                description: "Nombre completo del asistente",
              },
            },
            required: ["startTime", "name", "email"],
          };

          constData = {
            ...baseConstData,
            type: "create-event",
            createMeet: calendarConfig.createMeet,
            includeClientAsAttendee: true,
            sendNotifications: true,
          };
          break;

        case "list-events":
        case "update-event":
        case "delete-event":
          // Para estas funciones, los parámetros se manejan en el backend
          parameters = {} as Record<string, never>;
          constData = {
            ...baseConstData,
            type: calendarConfig.functionType,
          };
          break;
      }

      const functionData = {
        type: "google_calendar",
        data: {
          name: newFunction.name || "",
          description: newFunction.description || "",
          activationDescription: newFunction.activationDescription || "",
          parameters,
          constData,
        },
      };

      const response = await FunctionsService.createFunction(functionData);
      const functionToAdd: BotFunction = {
        id: response?.id || "temp-id-" + Date.now(),
        name: response?.name || newFunction.name || "",
        description: response?.description || newFunction.description || "",
        activationDescription:
          response?.activationDescription ||
          newFunction.activationDescription ||
          "",
        category: "scheduling",
        parameters: parameters as unknown as Record<string, unknown>,
        constData: constData as unknown as Record<string, unknown>,
      };

      onFunctionCreated(functionToAdd);
      handleClose();

      toast({
        title: "Función creada",
        description: "La función se ha creado correctamente.",
      });
    } catch (error) {
      console.error("Error creating function:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "No se pudo crear la función. Por favor, intenta nuevamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setNewFunction({
      category: "scheduling",
      parameters: {},
      constData: {},
    });
    setCalendarConfig({
      calendarId: "",
      criteria: "availability",
      functionType: "get-availability",
      duration: "1h",
      eventName: "",
      createMeet: false,
      includeClientAsAttendee: true,
      sendNotifications: true,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {calendarConfig.functionType === "get-availability"
              ? <><Search className="h-5 w-5 text-blue-500" /> Consulta de disponibilidad</>
              : calendarConfig.functionType === "create-event"
                ? <><Calendar className="h-5 w-5 text-green-500" /> Creación de eventos</>
                : calendarConfig.functionType === "list-events"
                  ? <><Calendar className="h-5 w-5 text-blue-500" /> Listar eventos</>
                  : calendarConfig.functionType === "delete-event"
                    ? <><Calendar className="h-5 w-5 text-red-500" /> Eliminar evento</>
                    : <><Calendar className="h-5 w-5 text-yellow-500" /> Actualizar evento</>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Selección de tipo de función - ancho completo */}
          <div className="bg-slate-50 p-4 rounded-lg border">
            <div className="flex items-center mb-2">
              <Calendar className="h-5 w-5 text-primary mr-2" />
              <h3 className="text-sm font-medium">Tipo de función</h3>
            </div>
            <Select
              value={calendarConfig.functionType}
              onValueChange={(value: "get-availability" | "create-event" | "list-events" | "update-event" | "delete-event") =>
                setCalendarConfig({
                  ...calendarConfig,
                  functionType: value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un tipo de función" />
              </SelectTrigger>
              <SelectContent>
                {FUNCTION_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Información básica - dos columnas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre de la función</Label>
              <Input
                placeholder="Ej: Agendar cita"
                value={newFunction.name || ""}
                onChange={(e) =>
                  setNewFunction({
                    ...newFunction,
                    name: e.target.value,
                  })
                }
                className="border rounded-md bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label>Nombre del evento</Label>
              <Input
                placeholder="Ej: Reunión con cliente"
                value={calendarConfig.eventName}
                onChange={(e) =>
                  setCalendarConfig({
                    ...calendarConfig,
                    eventName: e.target.value,
                  })
                }
                className="border rounded-md bg-white"
              />
              <p className="text-xs text-muted-foreground">
                Si lo dejas vacío, se usará el nombre de la función
              </p>
            </div>
          </div>

          {/* Descripciones - ancho completo */}
          <div className="space-y-4 bg-slate-50 p-4 rounded-lg border">
            <div className="flex items-center mb-2">
              <div className="h-5 w-5 text-primary mr-2">📝</div>
              <h3 className="text-sm font-medium">Descripciones</h3>
            </div>
            <div className="space-y-2">
              <Label>Descripción de la función</Label>
              <Textarea
                placeholder="Ej: Esta función permite al usuario agendar una cita en el calendario"
                value={newFunction.description || ""}
                onChange={(e) =>
                  setNewFunction({
                    ...newFunction,
                    description: e.target.value,
                  })
                }
                className="min-h-[60px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción de activación</Label>
              <Textarea
                placeholder="Describe cuándo se debe activar esta función..."
                value={newFunction.activationDescription || ""}
                onChange={(e) =>
                  setNewFunction({
                    ...newFunction,
                    activationDescription: e.target.value,
                  })
                }
                className="min-h-[60px]"
              />
            </div>
          </div>

          {/* Configuración de calendario - dos columnas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-primary" />
                <Label>Calendario</Label>
              </div>
              {isLoadingCalendars ? (
                <div className="flex items-center gap-2 h-9 px-3 border rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Cargando calendarios...</span>
                </div>
              ) : (
                <Select
                  value={calendarConfig.calendarId}
                  onValueChange={(value) =>
                    setCalendarConfig({
                      ...calendarConfig,
                      calendarId: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un calendario" />
                  </SelectTrigger>
                  <SelectContent>
                    {calendars
                      .filter(calendar => calendar.isConnected)
                      .map((calendar) => (
                      <SelectItem key={calendar.id} value={calendar.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: calendar.backgroundColor || '#4285f4' }}
                          />
                          <span>{calendar.summary}</span>
                          {calendar.primary && (
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 flex-shrink-0" />
                          )}
                        </div>
                      </SelectItem>
                    ))}
                    {calendars.filter(calendar => calendar.isConnected).length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-2">
                        No hay calendarios conectados
                      </div>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-primary" />
                <Label>Duración de la reunión</Label>
              </div>
              <Select
                value={calendarConfig.duration}
                onValueChange={(value) =>
                  setCalendarConfig({
                    ...calendarConfig,
                    duration: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona la duración" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((duration) => (
                    <SelectItem key={duration.id} value={duration.id}>
                      {duration.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Se enviará como {getDurationInMinutes(calendarConfig.duration)} minutos al backend
              </p>
            </div>
          </div>

          {/* Opciones adicionales para el tipo create-event */}
          {calendarConfig.functionType === "create-event" && (
            <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
              <div className="flex items-center mb-3">
                <div className="mr-2 text-lg">🎯</div>
                <h3 className="text-sm font-medium text-green-800">Opciones para reuniones virtuales</h3>
              </div>
              <div className="flex items-center justify-between p-3 border bg-white rounded-md">
                <div className="space-y-0.5">
                  <Label htmlFor="createMeet">Crear reunión de Google Meet</Label>
                  <p className="text-xs text-muted-foreground">
                    Agrega un enlace de Google Meet automáticamente al evento
                  </p>
                </div>
                <Switch
                  id="createMeet"
                  checked={calendarConfig.createMeet}
                  onCheckedChange={(checked) =>
                    setCalendarConfig({
                      ...calendarConfig,
                      createMeet: checked,
                    })
                  }
                />
              </div>
            </div>
          )}

          {/* Sección específica para get-availability */}
          {calendarConfig.functionType === "get-availability" && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="flex items-center mb-2">
                <div className="mr-2 text-lg">🔍</div>
                <h3 className="text-sm font-medium text-blue-800">Información sobre consulta de disponibilidad</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Esta función permitirá consultar horarios disponibles en el calendario seleccionado.
                El usuario deberá proporcionar una fecha para la consulta, y opcionalmente un rango de fechas.
                La duración configurada ({getDurationInMinutes(calendarConfig.duration)} minutos) determina los bloques de tiempo disponibles.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleCreateFunction} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              "Crear función"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
