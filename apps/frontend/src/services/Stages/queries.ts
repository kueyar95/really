/* eslint-disable @typescript-eslint/no-explicit-any */
import api from '../api';
import { Stage, StageClient, CreateStageDto } from './types';
import { Channel } from '../Whatsapp/types';

// Interfaz básica para la selección de etapas
export interface BasicStage {
  id: string;
  name: string;
  funnelId: string;
}

export interface Funnel {
  id: string;
  name: string;
  stages: BasicStage[];
}

export const getAllStages = async (): Promise<Funnel[]> => {
  try {
    const response = await api.get<any[]>('/stages');
    const funnelsMap = new Map<string, Funnel>();

    response.data.forEach((stage) => {
        if (!funnelsMap.has(stage.funnelId)) {
          funnelsMap.set(stage.funnel.id, {
            id: stage.funnel.id,
            name: stage.funnel.name,
            stages: []
          });
        }

        const funnel = funnelsMap.get(stage.funnelId);
        if (funnel) {
          funnel.stages.push({
            id: stage.id,
            name: stage.name,
            funnelId: stage.funnelId
          });
        }
      });

    // Filtrar funnels que quedaron sin etapas después del filtrado
    const funnelsWithStages = Array.from(funnelsMap.values())
      .filter(funnel => funnel.stages.length > 0);

    return funnelsWithStages;
  } catch (error) {
    console.error('Error fetching all stages:', error);
    throw new Error('No se pudieron obtener las etapas');
  }
};

export const getStagesByFunnel = async (funnelId: string): Promise<Stage[]> => {
  try {
    const response = await api.get<Stage[]>(`/stages/funnel/${funnelId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching stages by funnel:', error);
    throw error;
  }
};

export const getStageClients = async (stageId: string): Promise<StageClient[]> => {
  try {
    const response = await api.get<StageClient[]>(`/stages/${stageId}/clients`);
    return response.data;
  } catch (error) {
    console.error('Error fetching stage clients:', error);
    throw error;
  }
};

export const updateStage = async (
  id: string,
  updateStageDto: {
    botId: string | null;
  }
): Promise<Stage> => {
  try {
    const response = await api.patch<Stage>(`/stages/${id}`, updateStageDto);
    return response.data;
  } catch (error) {
    console.error('Error updating stage:', error);
    throw error;
  }
};

export const createStage = async (data: CreateStageDto): Promise<Stage> => {
  try {
    const response = await api.post<Stage>('/stages', data);
    return response.data;
  } catch (error) {
    console.error('Error creating stage:', error);
    throw new Error('Error al crear el stage');
  }
};

export const changeStage = async (clientId: string, stageId: string, channelId?: string): Promise<void> => {
  try {
    const params = channelId ? { channelId } : {};
    await api.put(`/client-stages/client/${clientId}/change-stage/${stageId}`, {}, { params });
  } catch (error) {
    console.error('Error changing stage:', error);
    throw error;
  }
};

export const assignUserToClientStage = async (clientStageId: string, userId: string): Promise<void> => {
  try {
    await api.put(`/client-stages/${clientStageId}/assign-user/${userId}`);
  } catch (error) {
    console.error('Error assigning user to client:', error);
    throw error;
  }
};

export async function removeUserFromClientStage(clientStageId: string) {
  // 👇 Importante: usar el ID NUMÉRICO del ClientStage
  await api.put(`/client-stages/${clientStageId}/remove-user`);
}

export async function getFunnelChannels(funnelId: string): Promise<Channel[]> {
  try {
    const response = await api.get(`/funnels/${funnelId}/channels`);
    return response.data;
  } catch (error) {
    console.error('Error fetching funnel channels:', error);
    throw error;
  }
}

export async function getClientStageInFunnel(clientId: string, funnelId: string, channelId?: string) {
  const params: any = { ensure: true };
  if (channelId) {
    params.channelId = channelId;
  }
  const { data } = await api.get(`/client-stages/client/${clientId}/funnel/${funnelId}`, {
    params,
  });
  // Esperado: data.id === (number) clientStageId
  return data; 
}

export const deleteStage = async (stageId: string): Promise<void> => {
  try {
    await api.delete(`/stages/${stageId}`);
  } catch (error) {
    console.error('Error deleting stage:', error);
    throw error;
  }
};

// Nueva función para actualizar los correos de notificación de una etapa
export const updateStageNotificationEmails = async (
  stageId: string,
  emails: string[]
): Promise<Stage> => {
  try {
    const response = await api.put<Stage>(
      `/stages/${stageId}/notification-emails`,
      { notificationEmails: emails } // El cuerpo del DTO del backend espera un objeto con esta clave
    );
    return response.data;
  } catch (error) {
    console.error("Error updating stage notification emails:", error);
    throw error;
  }
};