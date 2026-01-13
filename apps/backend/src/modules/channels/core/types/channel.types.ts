export enum ChannelType {
  WHATSAPP_WEB = 'whatsapp_web',
  WHATSAPP_CLOUD = 'whatsapp_cloud',
  WHATSAPP_BAILEYS = 'whatsapp_baileys',
  WHAPI_CLOUD = 'whapi_cloud',
  INSTAGRAM = 'instagram',
  FACEBOOK = 'facebook',
  TELEGRAM = 'telegram'
}

export enum ChannelStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CONNECTING = 'connecting',
  ERROR = 'error'
}

export enum MessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound'
}

export interface ChannelConfig {
  phoneNumberId?: string;
  accessToken?: string;
  webhookVerifyToken?: string;
  [key: string]: any;
}

export interface MessageMetadata {
  messageId: string;
  timestamp: number;
  type: string;
  hasMedia?: boolean;
  [key: string]: any;
}
