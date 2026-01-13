import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet, Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ValidationState, SheetConfigState } from "./types";

interface SheetUrlInputProps {
  sheetConfig: SheetConfigState;
  validationState: ValidationState;
  onSheetConfigChange: (config: SheetConfigState) => void;
  onVerifyAccess: () => void;
}

export function SheetUrlInput({
  sheetConfig,
  validationState,
  onSheetConfigChange,
  onVerifyAccess,
}: SheetUrlInputProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Hoja de cálculo</Label>
      <div className="relative flex flex-col gap-2">
        <div className="relative flex items-center">
          <div className="absolute left-3 flex h-full items-center">
            <FileSpreadsheet className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            placeholder="Ej: https://docs.google.com/spreadsheets/d/1234567890/edit#gid=0"
            value={sheetConfig.sheetUrl || ""}
            onChange={(e) =>
              onSheetConfigChange({
                ...sheetConfig,
                sheetUrl: e.target.value,
              })
            }
            className={cn(
              "pl-10 pr-24 font-mono text-sm",
              {
                "border-green-500 focus-visible:ring-green-500": validationState.status === "valid",
                "border-red-500 focus-visible:ring-red-500": validationState.status === "invalid",
                "border-input": validationState.status === "none",
              }
            )}
          />
          <ValidationButton
            validationState={validationState}
            onVerifyAccess={onVerifyAccess}
            disabled={!sheetConfig.sheetUrl}
          />
        </div>
        <ValidationMessage status={validationState.status} />
      </div>
    </div>
  );
}

interface ValidationButtonProps {
  validationState: ValidationState;
  onVerifyAccess: () => void;
  disabled: boolean;
}

function ValidationButton({ validationState, onVerifyAccess, disabled }: ValidationButtonProps) {
  return (
    <div className="absolute right-1 h-full">
      <Button
        type="button"
        variant={validationState.status === "valid" ? "ghost" : "secondary"}
        size="sm"
        onClick={onVerifyAccess}
        disabled={validationState.isValidating || disabled}
        className={cn(
          "h-7 px-3 transition-all",
          {
            "bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700": validationState.status === "valid",
            "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700": validationState.status === "invalid",
          }
        )}
      >
        <ValidationButtonContent validationState={validationState} />
      </Button>
    </div>
  );
}

function ValidationButtonContent({ validationState }: { validationState: ValidationState }) {
  if (validationState.isValidating) {
    return (
      <>
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        <span className="text-xs">Validando...</span>
      </>
    );
  }

  switch (validationState.status) {
    case "valid":
      return (
        <>
          <Check className="mr-1 h-3 w-3" />
          <span className="text-xs">Verificado</span>
        </>
      );
    case "invalid":
      return (
        <>
          <X className="mr-1 h-3 w-3" />
          <span className="text-xs">Inválido</span>
        </>
      );
    default:
      return (
        <>
          <Check className="mr-1 h-3 w-3" />
          <span className="text-xs">Validar URL</span>
        </>
      );
  }
}

function ValidationMessage({ status }: { status: ValidationState["status"] }) {
  if (status === "valid") {
    return <p className="text-xs text-green-600">✓ Tienes acceso a esta hoja de cálculo</p>;
  }
  if (status === "invalid") {
    return <p className="text-xs text-red-600">✗ No tienes acceso a esta hoja de cálculo</p>;
  }
  return null;
}