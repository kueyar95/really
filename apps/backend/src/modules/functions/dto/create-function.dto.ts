import { IsString, IsNotEmpty, IsEnum, IsObject, ValidateNested, IsArray, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { FunctionType } from '../core/types/function.types';
import { SheetField } from '../core/types/sheet.types';

// DTOs base
export class BaseFunctionData {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  activationDescription: string;

  @IsObject()
  parameters: Record<string, any>;

  @IsObject()
  constData: Record<string, any>;
}

// DTOs para Change Stage
export class CreateChangeStageData extends BaseFunctionData {
  @IsString()
  @IsNotEmpty()
  stageId: string;
}

// DTOs para Google Calendar
export class CreateGoogleCalendarData extends BaseFunctionData {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsOptional()
  startTime?: string;

  // Nuevas propiedades para invitados y Meet
  @IsString()
  @IsOptional()
  duration?: string;

  @IsString()
  @IsOptional()
  eventName?: string;

  @IsBoolean()
  @IsOptional()
  createMeet?: boolean;

  @IsString()
  @IsOptional()
  eventId?: string;

  @IsString()
  @IsOptional()
  searchTerm?: string;
}

// DTO para Google Sheets
export class CreateGoogleSheetData extends BaseFunctionData {
  @IsString()
  @IsNotEmpty()
  sheetUrl: string;

  @IsArray()
  @ValidateNested({ each: true })
  fields: SheetField[];

}

// DTO principal
export class CreateFunctionDto {
  type: any;

  data: any;
}