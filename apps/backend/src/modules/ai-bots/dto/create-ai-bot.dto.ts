import { IsString, IsNotEmpty, IsObject, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StepFunction } from '../interfaces/step-function.interface';

export class PromptBlockDto {
  @IsString()
  @IsNotEmpty()
  block_identifier: string;

  @IsString()
  block_content: string;
}

export class StepFunctionDto implements StepFunction {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  activation: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  external_name: string;
}

export class BotStepDto {
  @IsNumber()
  @IsNotEmpty()
  number: number;

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepFunctionDto)
  @IsOptional()
  functions?: StepFunctionDto[];
}

export class CreateAiBotDto {
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsObject()
  @IsOptional()
  ragConfig?: Record<string, any>;

  @IsObject()
  @IsOptional()
  functionsConfig?: Record<string, any>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromptBlockDto)
  @IsOptional()
  sysPrompt?: PromptBlockDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BotStepDto)
  @IsOptional()
  steps?: BotStepDto[];

  @IsObject()
  @IsOptional()
  mainConfig?: Record<string, any>;
}
