import { Client as WhatsAppClient } from 'whatsapp-web.js';
import { ChannelConfig } from '../../../core/types/channel.types';

export interface WhatsAppWebConfig extends ChannelConfig {
  companyId: string;
  sessionPath?: string;
  qrCode?: string;
}

export interface WhatsAppWebEventPayload {
  companyId: string;
  type: 'qr' | 'ready' | 'authenticated' | 'auth_failure' | 'disconnected';
  data?: any;
}

export interface WhatsAppWebClientInfo {
  client: WhatsAppClient;
  status: 'connecting' | 'authenticated' | 'ready' | 'disconnected';
  lastConnection?: Date;
  reconnectAttempts: number;
}

export interface WhatsAppWebSessionConfig {
  clientId: string;
  dataPath: string;
  puppeteerOptions: {
    headless: boolean;
    args: string[];
  };
}
