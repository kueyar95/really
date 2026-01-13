import { IsEnum, IsString } from 'class-validator';
import { ChannelType } from '../core/types/channel.types';

export class ConnectWhatsappDto {
  @IsString()
  companyId: string;

  @IsEnum(ChannelType)
  type: ChannelType = ChannelType.WHATSAPP_WEB;
}