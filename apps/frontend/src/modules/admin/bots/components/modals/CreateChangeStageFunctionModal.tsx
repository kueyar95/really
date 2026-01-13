/* eslint-disable @typescript-eslint/no-explicit-any */
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BotFunction } from "../types";
import {
  FunctionsService,
} from "@/services/Bots/functions";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getAllStages, Funnel } from "@/services/Stages/queries";

interface CreateChangeStageFunctionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFunctionCreated: (newFunction: BotFunction) => void;
}

export function CreateChangeStageFunctionModal({
  isOpen,
  onClose,
  onFunctionCreated,
}: CreateChangeStageFunctionModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [newFunction, setNewFunction] = useState<Partial<BotFunction>>({
    category: "stage",
    parameters: {},
    constData: {},
  });

  // Obtener los funnels y sus etapas
  const { data: funnels, isLoading: isLoadingFunnels } = useQuery<Funnel[]>({
    queryKey: ["all-stages"],
    queryFn: getAllStages,
    enabled: isOpen, // Solo cargar cuando el modal está abierto
  });

  const handleCreateFunction = async () => {
    if (
      !newFunction.name ||
      !newFunction.description ||
      !newFunction.activationDescription ||
      !newFunction.id
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

      const stageId = newFunction.id.replace("change_stage-", "");

      // Estructura exactamente como se muestra en la imagen del backend
      const functionData = {
        type: "change_stage",
        data: {
          name: newFunction.name || "",
          description: newFunction.description || "",
          activationDescription: newFunction.activationDescription || "",
          parameters: {},
          constData: {},
          stageId: stageId,
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
        category: "stage",
        parameters: response?.parameters || {},
        constData: response?.constData || {},
      };

      onFunctionCreated(functionToAdd);
      handleClose();

      toast({
        title: "Función creada",
        description: "La función se ha creado correctamente.",
      });
    } catch (error: any) {
      console.error("Error creating function:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.message ||
          "No se pudo crear la función. Por favor, intenta nuevamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setNewFunction({
      category: "stage",
      parameters: {},
      constData: {},
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear función de cambio de etapa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nombre de la función</Label>
            <Input
              placeholder="Ej: Derivar a confirmación"
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
            <Label>Etapa de destino</Label>
            <Select
              onValueChange={(value) =>
                setNewFunction({
                  ...newFunction,
                  id: `change_stage-${value}`,
                })
              }
              disabled={isLoadingFunnels}
            >
              <SelectTrigger className="border rounded-md bg-white">
                <SelectValue
                  placeholder={
                    isLoadingFunnels
                      ? "Cargando etapas..."
                      : "Selecciona la etapa"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {funnels?.map((funnel) => (
                  <SelectGroup key={funnel.id}>
                    <SelectLabel className="font-bold">
                      {funnel?.name}
                    </SelectLabel>
                    {funnel.stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Descripción de la función</Label>
            <Textarea
              placeholder="Ej: Esta función cambia la etapa del flujo cuando el cliente necesita ser atendido por un agente"
              value={newFunction.description || ""}
              onChange={(e) =>
                setNewFunction({
                  ...newFunction,
                  description: e.target.value,
                })
              }
              className="min-h-[80px]"
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
              className="min-h-[80px]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
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
