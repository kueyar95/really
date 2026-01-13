import { AxiosError } from 'axios';
import api from '../api';
import {
  SheetsAuthResponse,
  SheetsDisconnectResponse,
  SheetsStatusResponse,
  VerifyAccessResponse
} from './types';

export class SheetsService {
  public static async getStatus() {
    try {
      const response = await api.get<SheetsStatusResponse>('/sheets/integrations/google/status');
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message);
      }
      throw new Error('Error inesperado al obtener el estado');
    }
  }

  public static async getAuthUrl() {
    try {
      const response = await api.get<SheetsAuthResponse>('/sheets/integrations/google/auth-url');
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message);
      }
      throw new Error('Error inesperado al obtener la URL de autorización');
    }
  }

  public static async handleCallback(code: string) {
    try {
      const response = await api.get(`/sheets/integrations/google/sheets/callback?code=${code}`);
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message);
      }
      throw new Error('Error inesperado al procesar la autorización');
    }
  }

  public static async disconnect() {
    try {
      const response = await api.post<SheetsDisconnectResponse>('/sheets/integrations/google/disconnect');
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message);
      }
      throw new Error('Error inesperado al desconectar Google Sheets');
    }
  }

  public static async verifyAccess(sheetUrl: string) {
    try {
      const response = await api.get<VerifyAccessResponse>('/sheets/integrations/google/verify-access', {
        params: { sheetUrl }
      });
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message);
      }
      throw new Error('Error inesperado al verificar acceso');
    }
  }
}