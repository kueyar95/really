import { BotFunction } from "../../types";

export interface CreateSheetFunctionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFunctionCreated: (newFunction: BotFunction) => void;
}

export interface SheetConfigState {
  sheetUrl: string;
}

export interface ValidationState {
  isValidating: boolean;
  status: "none" | "valid" | "invalid";
}

export const FIELD_TYPES = [
  { value: "string", label: "Texto" },
  { value: "number", label: "Número" },
  { value: "date", label: "Fecha" },
  { value: "boolean", label: "Si/No" },
] as const;