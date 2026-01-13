import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ChannelType, ChannelStatus } from '../core/types/channel.types';

export class CreateChannelDto {
  @IsEnum(ChannelType)
  @IsOptional()
  type?: ChannelType;

  @IsString()
  companyId: string;

  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsEnum(ChannelStatus)
  @IsOptional()
  status?: ChannelStatus;

  @IsOptional()
  connectionConfig?: any;

  @IsOptional()
  metadata?: any;

  @IsOptional()
  temporaryConnection?: boolean;
}
