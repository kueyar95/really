import { MessageDirection, MessageMetadata } from '../types/channel.types';

export interface IMessage {
  channelId: string;
  clientId: string;
  direction: MessageDirection;
  message: string;
  metadata: MessageMetadata;
}

export interface IMessagePayload {
  to: string;
  message: string;
  type?: string;
  metadata?: any;
}

export interface IProcessedMessage {
  id: string;
  timestamp: number;
  createdAt: Date;
  from: string;
  to: string;
  body: string;
  type: string;
  clientId: string;
  hasMedia?: boolean;
  metadata?: any;
  mediaUrl?: string;
}

export interface IChatHistory {
  role: 'user' | 'assistant';
  content: string;
}
