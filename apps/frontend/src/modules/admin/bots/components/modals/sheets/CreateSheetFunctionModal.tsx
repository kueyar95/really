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
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useGoogleSheets } from "@/hooks/useGoogleSheets";
import { FunctionsService } from "@/services/Bots/functions";
import { CreateSheetFunctionData, SheetField } from '@/services/Sheets/types';
import { CreateSheetFunctionModalProps, SheetConfigState, ValidationState } from "./types";
import { SheetUrlInput } from "./SheetUrlInput";
import { SheetFieldsEditor } from "./SheetFieldsEditor";
import { BotFunction } from '../../types';

interface BasicInfoInputsProps {
  newFunction: Partial<BotFunction>;
  onNewFunctionChange: (newFunction: Partial<BotFunction>) => void;
}

interface ActionButtonsProps {
  isLoading: boolean;
  onClose: () => void;
  onCreate: () => Promise<void>;
}

export function CreateSheetFunctionModal({
  isOpen,
  onClose,
  onFunctionCreated,
}: CreateSheetFunctionModalProps) {
  const { toast } = useToast();
  const { verifyAccess } = useGoogleSheets();

  // Estados
  const [isLoading, setIsLoading] = useState(false);
  const [newFunction, setNewFunction] = useState<Partial<BotFunction>>({
    category: "google_sheet",
    parameters: {},
    constData: {},
  });
  const [sheetConfig, setSheetConfig] = useState<SheetConfigState>({
    sheetUrl: "",
  });
  const [validationState, setValidationState] = useState<ValidationState>({
    isValidating: false,
    status: "none",
  });
  const [fields, setFields] = useState<SheetField[]>([]);

  // Handlers
  const handleVerifyAccess = async () => {
    if (!sheetConfig.sheetUrl) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor ingresa la URL de la hoja de cálculo",
      });
      return;
    }

    setValidationState(prev => ({ ...prev, isValidating: true }));
    try {
      const response = await verifyAccess(sheetConfig.sheetUrl);
      setValidationState({
        isValidating: false,
        status: response.hasAccess ? "valid" : "invalid",
      });

      if (!response.hasAccess) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No tienes permisos para acceder a esta hoja de cálculo",
        });
      }
    } catch (error) {
      console.error("Error al verificar el acceso a la hoja de cálculo:", error);
      setValidationState({
        isValidating: false,
        status: "invalid",
      });
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al verificar el acceso a la hoja de cálculo",
      });
    }
  };

  const handleCreateFunction = async () => {
    if (
      !newFunction.name ||
      !newFunction.description ||
      !newFunction.activationDescription ||
      !sheetConfig.sheetUrl ||
      validationState.status !== "valid"
    ) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor completa todos los campos requeridos y valida la URL.",
      });
      return;
    }

    if (fields.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes agregar al menos un campo para la hoja de cálculo.",
      });
      return;
    }

    try {
      setIsLoading(true);

      const functionData: CreateSheetFunctionData = {
        type: "google_sheet",
        data: {
          name: newFunction.name,
          description: newFunction.description,
          activationDescription: newFunction.activationDescription,
          sheetUrl: sheetConfig.sheetUrl,
          fields: fields,
        },
      };

      const response = await FunctionsService.createFunction(functionData);

      const functionToAdd: BotFunction = {
        id: response?.id || "temp-id-" + Date.now(),
        name: response?.name || newFunction.name,
        description: response?.description || newFunction.description,
        activationDescription: response?.activationDescription || newFunction.activationDescription,
        category: "google_sheet",
        parameters: response?.parameters || {},
        constData: response?.constData || {},
      };

      onFunctionCreated(functionToAdd);
      handleClose();

      toast({
        title: "Éxito",
        description: "La función se ha creado correctamente.",
      });
    } catch (error) {
      console.error("Error al crear la función:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al crear la función. Por favor intenta nuevamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setNewFunction({
      category: "google_sheet",
      parameters: {},
      constData: {},
    });
    setSheetConfig({ sheetUrl: "" });
    setValidationState({ isValidating: false, status: "none" });
    setFields([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Crear función de hoja de cálculo</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          <div className="space-y-4 py-4">
            <BasicInfoInputs
              newFunction={newFunction}
              onNewFunctionChange={setNewFunction}
            />

            <SheetUrlInput
              sheetConfig={sheetConfig}
              validationState={validationState}
              onSheetConfigChange={setSheetConfig}
              onVerifyAccess={handleVerifyAccess}
            />

            <SheetFieldsEditor
              fields={fields}
              onFieldsChange={setFields}
            />
          </div>
        </div>

        <ActionButtons
          isLoading={isLoading}
          onClose={handleClose}
          onCreate={handleCreateFunction}
        />
      </DialogContent>
    </Dialog>
  );
}

function BasicInfoInputs({ newFunction, onNewFunctionChange }: BasicInfoInputsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label>Nombre de la función</Label>
        <Input
          placeholder="Ej: Registrar cliente"
          value={newFunction.name || ""}
          onChange={(e) =>
            onNewFunctionChange({
              ...newFunction,
              name: e.target.value,
            })
          }
        />
      </div>

      <div className="space-y-2">
        <Label>Descripción de la función</Label>
        <Textarea
          placeholder="Ej: Registra los datos del cliente en la hoja de cálculo"
          value={newFunction.description || ""}
          onChange={(e) =>
            onNewFunctionChange({
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
            onNewFunctionChange({
              ...newFunction,
              activationDescription: e.target.value,
            })
          }
          className="min-h-[80px]"
        />
      </div>
    </>
  );
}

function ActionButtons({ isLoading, onClose, onCreate }: ActionButtonsProps) {
  return (
    <div className="flex justify-end gap-2 pt-4 border-t">
      <Button variant="outline" onClick={onClose} disabled={isLoading}>
        Cancelar
      </Button>
      <Button onClick={onCreate} disabled={isLoading}>
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
  );
}