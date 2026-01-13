/* eslint-disable @typescript-eslint/no-explicit-any */
export type ChannelType = 'whatsapp_web' | 'whatsapp_baileys' | 'whatsapp_cloud' | 'telegram' | 'instagram' | 'facebook' | 'whapi_cloud';
export type ChannelStatus = 'not_configured' | 'connecting' | 'active' | 'inactive' | 'error'; 

export interface Channel {
  id: string;
  name: string;
  type: string;
  number: string;
  status: string;
  isActive: boolean;
  clients: ChatClient[];
}

export interface WhapiChannel {
  channelId: string;
  status: string;
  message: string;
}

export interface ChatClient {
  id: string;
  name: string;
  phone: string;
  email: string;
  channel: {
    id: string;
    name: string;
    type: string;
  };
  stage?: {
    id: string;
    name: string;
    bot?: {
      id: string;
      name: string;
    };
  };
  hasBot: boolean;
  assignedUser?: {
    id: string;
    username: string;
  };
  lastMessage?: {
    message: string;
    direction: 'inbound' | 'outbound';
    createdAt: string;
  };
}

export interface ConnectionStatus {
  status: string;
  number?: string;
  message?: string;
}

export interface ConnectionError {
  code: string;
  message: string;
}

export interface ChatHistory {
  id: string;
  channelId: string;
  clientId: string;
  message: string;
  createdAt: string;
}

export interface ChatHistoryResponse {
  clients: Array<{
    client: ChatClient;
    messages: ChatMessage[];
    lastMessage: {
      message: string;
      direction: 'inbound' | 'outbound';
      createdAt: string;
    };
  }>;
  total: number;
}

export interface Funnel {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  stages: Stage[];
  channels: Channel[];
}

export interface Stage {
  id: string;
  name: string;
  description?: string;
  botId?: string;
  bot?: {
    id: string;
    name: string;
  };
}

export interface FunnelChat {
  metadata: Record<string, unknown>;
  id: string;
  message: string;
  direction: 'inbound' | 'outbound';
  createdAt: string;
  client: ChatClient;
}

export interface FunnelChannel extends Channel {
  chats: FunnelChat[];
}

export interface FunnelChatsResponse {
  id: string;
  name: string;
  channels: FunnelChannel[];
}

export interface MediaMessage {
  url: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'sticker';
  mimetype: string;
  fileName?: string;
  fileLength?: number;
  caption?: string;
}

export interface ChatMessage {
  id: string;
  message: string;
  direction: 'inbound' | 'outbound';
  createdAt: string;
  metadata?: Record<string, any>;
  channelId?: string;
  media?: MediaMessage;
  status?: string;
}