import api from '../api';
import { Funnel, GetFunnelsParams, CreateFunnelDto, FunnelWithBots } from './types';
import { Stage as FunnelStage } from './types';
import { AiBot } from '../Bots/types';
import { Channel } from '../Channels/types';
import { Template } from '../../modules/admin/funnels/templates/types';
import { StageStatus } from '../Stages/types';

interface FunnelChannelResponse {
  id: string;
  channelId: string;
  channel: Channel;
}

interface StartAnalysisResponse {
  jobId: string;
}

interface JobStatusResponse {
  jobId: string;
  status: 'processing' | 'completed' | 'error';
  result?: {
    success: true;
    data: {
      templateId: string;
      filledTemplate: Template;
      timings: {
        total: string;
      }
    }
  };
  error?: string;
}

export const getFunnels = async (params: GetFunnelsParams): Promise<Funnel[]> => {
  try {
    const { companyId } = params;
    const response = await api.get<Funnel[]>('/funnels', {
      params: {
        companyId
      }
    });
    return response.data;
  } catch (error) {
    console.error(error);
    throw new Error('Error al obtener los funnels');
  }
};

export const createFunnel = async (data: CreateFunnelDto): Promise<Funnel> => {
  try {
    const response = await api.post<Funnel>('/funnels', data);
    return response.data;
  } catch (error) {
    console.error(error);
    throw new Error('Error al crear el funnel');
  }
};

export async function getFunnelsWithBots(companyId: string): Promise<FunnelWithBots[]> {
  try {
    const funnelsResponse = await api.get<Funnel[]>('/funnels', {
      params: {
        companyId: companyId
      }
    });
    const funnels = funnelsResponse.data;

    const stagesResponse = await api.get<FunnelStage[]>('/stages');
    const allStages = stagesResponse.data;

    const botsResponse = await api.get<AiBot[]>('/ai-bots');
    const bots = botsResponse.data;

    // Agrupar stages y bots por funnel
    return funnels.map((funnel: Funnel) => {
      const funnelStages = allStages.filter((stage: FunnelStage) => stage.funnelId === funnel.id);
      const botIds = new Set(funnelStages.map((stage: FunnelStage) => stage.botId));
      const funnelBots = bots.filter((bot: AiBot) => botIds.has(bot.id));

      // Convertir FunnelStage a Stage (con StageStatus)
      const convertedStages = funnelStages.map((stage: FunnelStage) => ({
        ...stage,
        botId: stage.botId || null,
        status: (stage.status as unknown) as StageStatus,
        clientStages: stage.clientStages || [],
        clientCount: stage.clientStages?.length || 0
      }));

      return {
        ...funnel,
        stages: convertedStages,
        bots: funnelBots
      };
    });
  } catch (error) {
    console.error("Error al obtener funnels con bots:", error);
    throw error;
  }
}

export const getFunnelChannels = async (funnelId: string): Promise<FunnelChannelResponse[]> => {
  try {
    const response = await api.get<FunnelChannelResponse[]>(`/funnels/${funnelId}/channels`);
    return response.data;
  } catch (error) {
    console.error('Error fetching funnel channels:', error);
    throw error;
  }
};

export const updateFunnel = async (funnelId: string, data: {
  name?: string;
  description?: string;
  isActive?: boolean;
  channelIds?: string[];
}) => {
  const response = await api.put(`/funnels/${funnelId}`, data);
  return response.data;
};

export const analyzeSite = async (url: string, templateId: string) => {
  try {
    const response = await api.post<StartAnalysisResponse>('/web-scraping/analyze-website', {
      url,
      templateId,
    });
    return response.data;
  } catch (error) {
    console.error('❌ [API] Error al iniciar análisis:', error);
    throw error;
  }
};

export const checkAnalysisStatus = async (jobId: string) => {
  try {
    const response = await api.get<JobStatusResponse>(`/web-scraping/job-status/${jobId}`);
    return response.data;
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      console.error('⚠️ [API] Proceso no encontrado:', jobId);
    } else {
      console.error('❌ [API] Error al consultar estado:', error);
    }
    throw error;
  }
};

export const deleteFunnel = async (funnelId: string) => {
  try {
    const response = await api.delete(`/funnels/${funnelId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting funnel:', error);
    throw new Error('Error al eliminar el funnel');
  }
};

export const getFunnel = async (funnelId: string) => {
  const response = await api.get(`/funnels/${funnelId}`);
  return response.data;
};

export const updateStage = async (stageId: string, data: {
  name?: string;
  description?: string;
  order?: number;
  botId?: string | null;
  status?: string;
}) => {
  const response = await api.patch(`/stages/${stageId}`, data);
  return response.data;
};