import { Channel } from "../Channels/types";

export enum StageStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  ARCHIVED = 'archived'
}

export interface Stage {
  id: string;
  funnelId: string;
  botId: string | null;
  name: string;
  description?: string;
  order: number;
  status: StageStatus;
  createdAt: Date;
  updatedAt: Date;
  notificationEmails?: string[];
  bot?: AiBot;
  clientStages: { id: string }[];
  clientCount: number;
}

export interface AiBot {
  id: string;
  name: string;
  // ... otros campos necesarios
}

export interface ClientStage {
  id: string;
  // ... otros campos necesarios
}

export interface GetStagesByFunnelResponse {
  stages: Stage[];
}

export interface StageClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  data: {
    age?: number;
    occupation?: string;
    interests?: string[];
    [key: string]: string | number | string[] | undefined;
  };
  assignedUser?: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
  funnelChannel: {
    funnelId: string;
    channelId: string;
    isActive: boolean;
    channel: Channel;
  };
  assignedAt?: string;
}

export interface Chat {
  user: string;
  phone: string;
  date: string;
  message: string;
  assignedUser?: string;
  clientId: string;
  channelId: string;
  channelType: string;
}

export interface CreateStageDto {
  name: string;
  description?: string;
  funnelId: string;
  botId?: string | null;
  order: number;
  status: StageStatus;
}
