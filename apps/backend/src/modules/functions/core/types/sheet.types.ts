import { FunctionType } from './function.types';

export interface SheetField {
  name: string;
  type: 'string' | 'number' | 'date';
  description: string;
  required: boolean;
}

export interface GoogleSheetParameters {
  type: 'object';
  properties: Record<string, {
    type: 'string' | 'number';  // Solo tipos válidos de OpenAI
    description: string;
  }>;
  required: string[];
}

export interface GoogleSheetConstData {
  type: FunctionType.GOOGLE_SHEET;
  sheetUrl: string;
  name: string;
  description: string;
  activationDescription: string;
  fields: SheetField[];  // Campos dinámicos definidos en la creación
}
