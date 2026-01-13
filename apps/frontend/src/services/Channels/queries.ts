import type { Channel } from "@/services/Whatsapp/types";
import api from "../api";

/**
 * Respuesta del handshake de conexión por ID.
 * El backend decide si se reconecta en silencio o si se requiere QR.
 */
export type ConnectHandshakeResponse = {
  channelId: string;
  status: "active" | "connecting" | "awaiting_qr";
  requiresQr: boolean;
  method: "none" | "qr";
  phoneNumber?: string | null;
  qrCode?: string | null;
};

export const ChannelsService = {
  /**
   * Listar canales por compañía.
   * GET /channels?companyId=:companyId
   */
  async getChannels(companyId?: string): Promise<Channel[]>  {
    // Validar que companyId sea un UUID válido antes de hacer la petición
    if (!companyId || companyId === 'undefined' || companyId.trim() === '') {
      throw new Error('companyId es requerido y debe ser un UUID válido');
    }
    
    // Validar formato UUID básico
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(companyId)) {
      throw new Error(`companyId no tiene un formato UUID válido: ${companyId}`);
    }
    
    const { data } = await api.get<Channel[]>(`/channels?companyId=${companyId}`);
    return data;
  },

  /**
   * Iniciar creación de canal Whapi (crea canal y arranca sesión QR en background).
   * POST /channels/whapi-cloud/initiate
   */
  async initiateWhapiChannel(companyId: string): Promise<{ channelId: string }> {
    const { data } = await api.post<{ channelId: string }>(`/channels/whapi-cloud/initiate`, {
      companyId,
    });
    return data;
  },

  /**
   * Handshake de conexión por ID. Decide reconexión silenciosa o QR.
   * POST /channels/:id/connect
   */
  async connectById(channelId: string): Promise<ConnectHandshakeResponse> {
    const { data } = await api.post<ConnectHandshakeResponse>(`/channels/${channelId}/connect`);
    return data;
  },

  /**
   * Desconectar un canal por ID.
   * POST /channels/:id/disconnect
   */
  async disconnectById(channelId: string): Promise<{ success: boolean }> {
    const { data } = await api.post<{ success: boolean }>(`/channels/${channelId}/disconnect`);
    return data;
  },

  /**
   * Eliminar canal por ID (limpia recursos en proveedor cuando aplica).
   * DELETE /channels/:id
   */
  async deleteChannel(channelId: string, force: boolean = true): Promise<{ ok: true }> {
    const { data } = await api.delete<{ ok: true }>(`/channels/${channelId}`, {
      params: { force },
    });
    return data;
  },

  /**
   * Sincroniza estados reales de Whapi con BD.
   * POST /channels/whapi-cloud/sync-status
   */
  async syncWhapiStatus(companyId?: string): Promise<{ updated: number }> {
    const { data } = await api.post<{ updated: number }>(`/channels/whapi-cloud/sync-status`, {
      companyId,
    });
    return data;
  },

  /**
   * (Opcional) Extender vigencia del canal whapi.
   * POST /channels/:id/whapi-cloud/extend
   * Si no tienes este endpoint, puedes quitar este método.
   */
  async extendWhapiChannel(channelId: string, months: number): Promise<{ success: boolean }> {
    const { data } = await api.post<{ success: boolean }>(
      `/channels/${channelId}/whapi-cloud/extend`,
      { months }
    );
    return data;
  },
};
