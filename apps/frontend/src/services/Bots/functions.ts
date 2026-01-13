/* eslint-disable @typescript-eslint/no-explicit-any */
import api from '../api';
import { supabase } from '@/components/auth/supabase';

export type FunctionType = 
  | "change_stage"
  | "google_calendar"
  | "custom";

// Interfaces para tipado, pero usaremos objetos planos en el servicio
export interface BaseFunctionData {
  name: string;
  description: string;
  activationDescription: string;
  parameters: Record<string, any>;
  constData: Record<string, any>;
}

// Adaptar según se ve en las imágenes del backend
export interface CreateChangeStageFunctionData extends BaseFunctionData {
  stageId: string;
}

export interface CalendarConfig {
  tokenId: string;
  calendarId: string;
  criteria: string;
}

export interface CreateGoogleCalendarFunctionData extends BaseFunctionData {
  calendarSelection: string;
  calendars: CalendarConfig[];
}

// Simplificar la estructura para que coincida con lo que espera el backend
export interface CreateFunctionData {
  type: FunctionType;
  data: CreateChangeStageFunctionData | CreateGoogleCalendarFunctionData;
}

export interface FunctionResponse {
  id: string;
  data: BaseFunctionData;
  external_name?: string;
}

export const FunctionsService = {
  // Usamos any para evitar problemas con las conversiones de tipo
  createFunction: async (data: any): Promise<any> => {
    try {
      // Usar exclusivamente la ruta /functions
      const response = await api.post('/functions', data);
      return response.data || {};
    } catch (error: any) {
      console.error('Error creando función:', error);
      
      // Información más detallada sobre el error
      if (error.response) {
        console.error('Error response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
      
      throw new Error(`No se pudo crear la función: ${error.message}`);
    }
  },

  // Obtener todas las funciones disponibles
  getFunctions: async (): Promise<any[]> => {
    try {
      // Verificar la sesión primero para asegurar que tenemos un token válido
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No hay una sesión válida para obtener funciones');
        throw new Error('No hay una sesión activa. Por favor, inicia sesión nuevamente.');
      }
      
      // Usar la ruta confirmada para obtener las funciones de la compañía
      const response = await api.get('/functions/company');
      return response.data || [];
    } catch (error: any) {
      console.error('Error obteniendo funciones:', error);
      
      if (error.response) {
        console.error('Error response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        
        // Mensajes específicos según el tipo de error
        if (error.response.status === 403) {
          throw new Error('No tienes permiso para acceder a estas funciones. Verifica que tienes los permisos necesarios.');
        } else if (error.response.status === 401) {
          throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        } else if (error.response.status === 404) {
          throw new Error('La ruta para obtener funciones no está disponible. Por favor, contacta al soporte técnico.');
        }
      }
      
      throw new Error(`No se pudieron obtener las funciones: ${error.message}`);
    }
  }
};