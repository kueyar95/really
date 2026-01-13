import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { StageStatus } from '../entities/stage.entity';

export class CreateStageDto {
  @IsString()
  @IsNotEmpty()
  funnelId: string;

  @IsString()
  @IsOptional()
  botId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsNotEmpty()
  order: number;

  @IsEnum(StageStatus)
  @IsOptional()
  status?: StageStatus;
}
