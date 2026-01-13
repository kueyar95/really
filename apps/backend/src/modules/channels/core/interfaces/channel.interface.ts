import { ChannelConfig, ChannelStatus, ChannelType } from '../types/channel.types';

export interface IBaseChannel {
  id: string;
  companyId: string;
  type: ChannelType;
  status: ChannelStatus;
  number?: string;
  name?: string;
  connectionConfig?: ChannelConfig;
}

export interface IAPIChannelStrategy {
  configure(config: ChannelConfig): Promise<void>;
  sendMessage(payload: any): Promise<any>;
  handleWebhook(data: any, identifier?: string): Promise<void>;
  disconnect(channelId: string): Promise<void>;
  getStatus(): Promise<ChannelStatus>;
  cleanup?(channelId: string): Promise<void>;
}

export interface ISocketChannelStrategy {
  connect(companyId: string): Promise<void>;
  disconnect(companyId: string): Promise<void>;
  sendMessage(companyId: string, payload: any): Promise<any>;
  getStatus(companyId: string): Promise<ChannelStatus>;
  handleMessage?(message: any): Promise<void>;
}

export interface IChannelResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: any;
}
