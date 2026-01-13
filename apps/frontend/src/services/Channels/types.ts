export type ChannelType = 'whatsapp';

export type ChannelStatus = 'active' | 'inactive' | 'pending' | 'connecting' | 'error';

export interface Channel {
  id: string;
  name: string;
  type: string;
  status: ChannelStatus;
  number: string;
  companyId: string;
  connectionConfig: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChannelDto {
  name: string;
  type: ChannelType;
  phoneNumber?: string;
}

export interface UpdateChannelDto {
  name?: string;
  phoneNumber?: string;
}

export interface ConnectChannelDto {
  type: ChannelType;
  channelId: string;
}

export interface SendMessageDto {
  to: string;
  message: string;
  channelId: string;
}
