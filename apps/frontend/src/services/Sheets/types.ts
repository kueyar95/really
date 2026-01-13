export interface SheetsAuthResponse {
  url: string;
}

export interface SheetsDisconnectResponse {
  success: boolean;
}

export interface SheetsStatusResponse {
  status: boolean;
  hasValidToken?: boolean;
}

export interface VerifyAccessResponse {
  hasAccess: boolean;
}

export interface SheetField {
  name: string;
  type: "string" | "number" | "date" | "boolean";
  description: string;
  required: boolean;
}

export interface CreateSheetFunctionData {
  type: 'google_sheet';
  data: {
    name: string;
    description: string;
    activationDescription: string;
    sheetUrl: string;
    fields: SheetField[];
  }
}