/* eslint-disable @typescript-eslint/no-explicit-any */
import api from '../api';
import { AiBot, Step } from './types';

export interface CreateAiBotDto {
  name: string;
  companyId: string;
  mainConfig: {
    model: string;
    maxTokens: number;
    temperature: number;
  };
  sysPrompt: {
    block_identifier: string;
    block_content: string;
  }[];
  steps?: Step[];
}

interface Funnel {
  id: string;
  name: string;
  stages: Stage[];
}

interface Stage {
  id: string;
  name: string;
  botId: string | null;
}

export interface BotWithFunnelInfo extends AiBot {
  funnels?: {
    id: string;
    name: string;
    stages: { id: string; name: string }[];
  }[];
}

export class BotsService {

  static async getAllBots(): Promise<AiBot[]> {
    try {
      const response = await api.get<AiBot[]>('/ai-bots');
      return response.data;
    } catch (error) {
      console.error('Error fetching bots:', error);
      throw error;
    }
  }

  static async getBot(id: string): Promise<AiBot> {
    try {
      const response = await api.get<AiBot>(`/ai-bots/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching bot:', error);
      throw error;
    }
  }

  static async getCompanyBotsWithFunnels(): Promise<BotWithFunnelInfo[]> {
    try {
      // Get all bots for the company
      const botsResponse = await api.get<AiBot[]>('/ai-bots');
      const bots = botsResponse.data;
      
      // Get all funnels with their stages
      const funnelsResponse = await api.get<Funnel[]>('/funnels/company');
      const funnels = funnelsResponse.data;
      
      // Map bots to include funnel information
      const botsWithFunnels = bots.map(bot => {
        const botFunnels = funnels.filter((funnel: Funnel) => 
          funnel.stages.some((stage: Stage) => stage.botId === bot.id)
        ).map((funnel: Funnel) => ({
          id: funnel.id,
          name: funnel.name,
          stages: funnel.stages.filter((stage: Stage) => stage.botId === bot.id).map((stage: Stage) => ({
            id: stage.id,
            name: stage.name
          }))
        }));
        
        return {
          ...bot,
          funnels: botFunnels.length > 0 ? botFunnels : undefined
        };
      });
      
      return botsWithFunnels;
    } catch (error) {
      console.error('Error fetching company bots with funnels:', error);
      throw error;
    }
  }

  static async createBot(createDto: CreateAiBotDto): Promise<AiBot> {
    try {
      const response = await api.post('/ai-bots', createDto);
      return response.data;
    } catch (error) {
      console.error('Error creating bot:', error);
      throw error;
    }
  }

  static async updateBot(
    id: string,
    updateAiBotDto: Partial<AiBot>
  ): Promise<AiBot> {
    try {
      const response = await api.patch<AiBot>(`/ai-bots/${id}`, updateAiBotDto);
      return response.data;
    } catch (error: any) {
      console.error('Error updating bot:', error);
      if (error.response) {
        console.error('Error response:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw error;
    }
  }

  static async updateBotSteps(id: string, steps: Step[]): Promise<Step[]> {
    try {
      const response = await api.patch<Step[]>(`/ai-bots/${id}/steps`, { steps });
      return response.data;
    } catch (error) {
      console.error('Error updating bot steps:', error);
      throw error;
    }
  }
  
  static async deleteBot(id: string): Promise<void> {
    try {
      await api.delete(`/ai-bots/${id}`);
    } catch (error) {
      console.error('Error deleting bot:', error);
      throw error;
    }
  }

}
