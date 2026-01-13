import { ChannelStatus } from '@/services/Channels/types';

export interface WhatsAppChannel {
  id: string;
  companyId: string;
  type: 'whatsapp_baileys';
  phoneNumber?: string;
  name?: string;
  status: ChannelStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface BaileysInstance {
  channelId: string;
  companyId: string;
  status: ChannelStatus;
  phoneNumber: string | null;
  qrCode: string | null;
  connectionStatus: string | null;
}