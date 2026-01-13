import { AiBot } from '../Bots/types';
import { Stage as StageType } from '../Stages/types';
import { Channel as ChannelType } from '../Channels/types';

export interface Funnel {
  [x: string]: any;
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  companyId: string;
  channelIds?: string[]; // Para compatibilidad con el frontend actual
  channels?: Channel[]; // Array de objetos Channel que viene del backend
  createdAt: Date;
  updatedAt: Date;
}

export interface FunnelChannelResponse {
  id: string;
  channelId: string;
  channel: ChannelType;
}

export interface Company {
  id: string;
  // ... otros campos necesarios de Company
}

export interface Channel {
  id: string;
  // ... otros campos necesarios de Channel
}

export interface Stage {
  id: string;
  funnelId: string;
  botId: string;
  name: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  description?: string;
  status: string;
  bot?: AiBot;
  clientStages?: { id: string }[];
}

export interface GetFunnelsParams {
  companyId: string;
}

export interface CreateFunnelDto {
  name: string;
  description?: string;
  isActive: boolean;
  companyId: string;
  channelIds: string[];
}

export interface UpdateFunnelDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  channelIds?: string[];
}

export interface FunnelWithBots extends Funnel {
  stages: StageType[];
  bots: AiBot[];
}