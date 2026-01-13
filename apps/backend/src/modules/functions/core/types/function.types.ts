export enum FunctionType {
  CHANGE_STAGE = 'change_stage',
  GOOGLE_CALENDAR = 'google_calendar',
  GOOGLE_SHEET = 'google_sheet'
}

import {
  ChangeStageParameters,
  ChangeStageConstData
} from './stage.types';

import {
  GoogleCalendarParameters,
  GoogleCalendarConstData
} from './calendar.types';

import {
  GoogleSheetParameters,
  GoogleSheetConstData
} from './sheet.types';

export type FunctionParameters =
  | ChangeStageParameters
  | GoogleCalendarParameters
  | GoogleSheetParameters;

export type FunctionConstData =
  | ChangeStageConstData
  | GoogleCalendarConstData
  | GoogleSheetConstData;

// Re-exportamos todos los tipos para mantener la compatibilidad
export * from './stage.types';
export * from './calendar.types';
export * from './sheet.types';

