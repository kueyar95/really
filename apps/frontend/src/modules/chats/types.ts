import { MediaMessage, ChatClient } from "@/services/Whatsapp/types";
import { User } from '@supabase/supabase-js';

export interface ClientStage {
  id: number;
  name: string;
  botId: string;
  bot: {
    id: string;
    name: string;
  };
}

export type Client = ChatClient & {
  channelId: string;
  lastMessage: {
    content: string;
    direction: 'inbound' | 'outbound';
    createdAt: string;
  };
}

export interface Channel {
  id: string;
  name: string;
  type: string;
  status: string;
  isActive: boolean;
  clients: Client[];
}

export interface Funnel {
  id: string;
  name: string;
  stages: {
    id: number;
    name: string;
    botId: string;
    bot?: {
      id: string;
      name: string;
    };
  }[];
  channels: Channel[];
}

export interface CompanyData {
  funnels: Funnel[];
}

export interface MessageContentProps {
  message: string;
  media?: MediaMessage;
}

export interface ChatProps {
  user: User;
  loading: boolean;
}