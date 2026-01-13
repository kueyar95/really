import { IsNotEmpty, IsString } from 'class-validator';
import { ChannelType } from '../core/types/channel.types';

export class ConnectChannelDto {
  @IsString()
  @IsNotEmpty()
  channelId: string;

  @IsString()
  @IsNotEmpty()
  type: ChannelType;
}