import { IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';

export class CreateClientStageDto {
  @IsString()
  @IsNotEmpty()
  stageId: string;

  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsString()
  @IsNotEmpty()
  funnelChannelId: string;

  @IsString()
  @IsOptional()
  assignedUserId?: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @IsString()
  @IsOptional()
  status?: string;
}