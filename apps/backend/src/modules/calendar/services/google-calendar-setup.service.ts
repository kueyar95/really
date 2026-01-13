import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private oauth2Client: OAuth2Client;

  constructor(private configService: ConfigService) {
    const clientId = this.configService.get('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.configService.get('GOOGLE_OAUTH_REDIRECT_URL');

    if (!clientId || !clientSecret || !redirectUri) {
      this.logger.error('Missing Google OAuth credentials');
      throw new Error('Missing Google OAuth credentials');
    }

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
  }

  async getCalendarApi(refreshToken?: string) {
    try {
      let auth;

      if (refreshToken) {
        // Usar OAuth2 si se proporciona un refresh token
        this.oauth2Client.setCredentials({
          refresh_token: refreshToken
        });
        auth = this.oauth2Client;
      }

      return google.calendar({
        version: 'v3',
        auth
      });
    } catch (error) {
      this.logger.error('Error getting calendar API:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      if (error.response?.data?.error) {
        const googleError = error.response.data.error;
        throw new Error(`Error de Google Calendar: ${googleError.message || googleError.reason || JSON.stringify(googleError)}`);
      }

      throw new Error('Error al obtener el API de Google Calendar: ' + error.message);
    }
  }

  async createEvent(calendarId: string, eventData: any) {
    const calendar = await this.getCalendarApi();
    return await calendar.events.insert({
      calendarId: calendarId,
      requestBody: eventData,
    });
  }

  async deleteEvent(calendarId: string, eventId: string) {
    const calendar = await this.getCalendarApi();
    return await calendar.events.delete({
      calendarId: calendarId,
      eventId: eventId,
    });
  }

  async getEvents(calendarId: string, timeMin?: Date, timeMax?: Date) {
    const calendar = await this.getCalendarApi();
    return await calendar.events.list({
      calendarId: calendarId,
      timeMin: timeMin?.toISOString(),
      timeMax: timeMax?.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
  }

  async listCalendars(refreshToken: string) {
    try {
      const calendar = await this.getCalendarApi(refreshToken);
      const response = await calendar.calendarList.list();
      return response.data.items.map(cal => ({
        id: cal.id,
        summary: cal.summary,
        description: cal.description,
        timeZone: cal.timeZone,
        backgroundColor: cal.backgroundColor,
        primary: cal.primary || false
      }));
    } catch (error) {
      this.logger.error('Error al listar calendarios:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      if (error.response?.data?.error) {
        const googleError = error.response.data.error;
        throw new Error(`Error de Google Calendar: ${googleError.message || googleError.reason || JSON.stringify(googleError)}`);
      }

      throw new Error('Error al listar calendarios de Google Calendar: ' + error.message);
    }
  }
}