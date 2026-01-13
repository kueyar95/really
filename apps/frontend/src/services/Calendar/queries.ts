import { AxiosError } from 'axios';
import api from '../api';
import {
  CalendarAuthResponse,
  CalendarCallbackResponse,
  CalendarDisconnectResponse,
  CalendarStatusResponse,
  GetEventsResponse,
  CreateEventDto,
  CalendarEvent,
  GetCalendarIdResponse,
  ListCalendarsResponse,
  SelectCalendarResponse,
  DisconnectCalendarResponse
} from './types';

export class CalendarService {
  public static async getEvents(calendarId: string, startDate: string, endDate: string) {
    try {
      const response = await api.get<GetEventsResponse>(
        `/calendar/${calendarId}/events`,
        { params: { startDate, endDate } }
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message);
      }
      throw new Error('Error inesperado al obtener los eventos');
    }
  }

  public static async createEvent(calendarId: string, eventData: CreateEventDto) {
    try {
      const response = await api.post<CalendarEvent>(
        `/calendar/${calendarId}/events`,
        eventData
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message);
      }
      throw new Error('Error inesperado al crear el evento');
    }
  }

  public static async getAuthUrl() {
    try {
      const response = await api.get<CalendarAuthResponse>('/calendar/integrations/google/auth-url');
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message);
      }
      throw new Error('Error inesperado al obtener la URL de autorización');
    }
  }

  public static async handleCallback(code: string, state: string) {
    try {
      const response = await api.get<CalendarCallbackResponse>(
        `/calendar/integrations/google/callback?code=${code}&state=${state}`
      );
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
      const response = await api.post<CalendarDisconnectResponse>(
        '/calendar/integrations/google/disconnect'
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message);
      }
      throw new Error('Error inesperado al desconectar la integración de Google Calendar');
    }
  }

  public static async getStatus() {
    try {
      const response = await api.get<CalendarStatusResponse>('/calendar/integrations/google/status');
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message);
      }
      throw new Error('Error inesperado al obtener el estado de la conexión');
    }
  }

  public static async getCalendarId() {
    try {
      const response = await api.get<GetCalendarIdResponse>('/calendar/integrations/google/calendar-id');
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message);
      }
      throw new Error('Error inesperado al obtener el ID del calendario');
    }
  }

  public static async listCalendars() {
    try {
      const response = await api.get<ListCalendarsResponse>('/calendar/integrations/google/calendars');
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message);
      }
      throw new Error('Error inesperado al obtener la lista de calendarios');
    }
  }

  public static async selectCalendar(calendarId: string) {
    try {
      const response = await api.post<SelectCalendarResponse>(
        '/calendar/integrations/google/select-calendar',
        { calendarId }
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message);
      }
      throw new Error('Error inesperado al seleccionar el calendario');
    }
  }

  public static async disconnectCalendar(calendarId: string) {
    try {
      const response = await api.post<DisconnectCalendarResponse>(
        '/calendar/integrations/google/disconnect-calendar',
        { calendarId }
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message);
      }
      throw new Error('Error inesperado al desconectar el calendario');
    }
  }
}