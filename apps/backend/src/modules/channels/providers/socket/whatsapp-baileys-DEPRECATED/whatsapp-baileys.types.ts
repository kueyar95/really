import { WASocket } from '@whiskeysockets/baileys';
import { ChannelConfig } from '../../../core/types/channel.types';

export interface WhatsAppBaileysConfig extends ChannelConfig {
  companyId: string;
  sessionPath?: string;
}

export interface WhatsAppBaileysEventPayload {
  companyId: string;
  type: 'qr' | 'ready' | 'authenticated' | 'auth_failure' | 'disconnected';
  data?: any;
}

export interface WhatsAppBaileysClientInfo {
  client: WASocket;
  status: 'connecting' | 'authenticated' | 'ready' | 'disconnected' | 'error';
  lastConnection?: Date;
  reconnectAttempts: number;
  channelId: string;
  companyId: string;
}

export interface WhatsAppBaileysSessionConfig {
  clientId: string;
  dataPath: string;
}