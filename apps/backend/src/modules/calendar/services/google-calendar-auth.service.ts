import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { Calendar } from '../entities/calendar.entity';
import { User } from '@/modules/users/entities/user.entity';
import { Role } from '@/modules/users/enums/role.enum';
import { GoogleCalendarService } from './google-calendar-setup.service';
import { CalendarAccess } from '../entities/calendar-access.entity';

@Injectable()
export class GoogleCalendarAuthService {
  private readonly logger = new Logger(GoogleCalendarAuthService.name);
  private oauth2Client: OAuth2Client;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Calendar)
    private readonly calendarRepository: Repository<Calendar>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly googleCalendarService: GoogleCalendarService,
    @InjectRepository(CalendarAccess)
    private readonly calendarAccessRepository: Repository<CalendarAccess>
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      this.configService.get('GOOGLE_REDIRECT_URI'),
    );
  }

  async getAuthUrl(companyId: string): Promise<string> {
    const clientId = this.configService.get('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.configService.get('GOOGLE_OAUTH_REDIRECT_URL');

    if (!clientId || !clientSecret || !redirectUri) {
      this.logger.error('Missing Google OAuth credentials');
      throw new Error('Missing Google OAuth credentials');
    }

    // Asegurarnos de que el cliente OAuth2 tenga las credenciales actualizadas
    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: companyId,
      prompt: 'consent',
      redirect_uri: redirectUri
    });
  }

  async handleCallback(code: string, companyId: string): Promise<void> {
    try {
      this.logger.debug(`Handling callback with code length: ${code.length}`);
      const { tokens } = await this.oauth2Client.getToken(code);

      if (!tokens.refresh_token) {
        throw new BadRequestException('No se recibió el refresh token de Google. Por favor, intenta autenticarte nuevamente.');
      }

      const calendarAccess = await this.calendarAccessRepository.findOne({
        where: { companyId },
      });

      if (calendarAccess) {
        await this.calendarAccessRepository.update(calendarAccess.id, {
          googleAccessToken: tokens.access_token,
          googleRefreshToken: tokens.refresh_token,
        });
      } else {
        await this.calendarAccessRepository.save({
          companyId,
          googleAccessToken: tokens.access_token,
          googleRefreshToken: tokens.refresh_token,
        });
      }
    } catch (error) {
      this.logger.error('Error en handleCallback:', error);
      if (error.message.includes('invalid_grant')) {
        throw new BadRequestException('El código de autorización ha expirado o ya fue usado. Por favor, intenta autenticarte nuevamente.');
      }
      throw new BadRequestException(error.message);
    }
  }

  async selectCalendar(userId: string, calendarId: string): Promise<Calendar> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['company']
      });

      if (!user || !user.company) {
        throw new BadRequestException('Usuario o compañía no encontrados');
      }

      if (user.role !== Role.ADMIN) {
        throw new BadRequestException('Solo los administradores pueden conectar calendarios');
      }

      const calendarAccess = await this.calendarAccessRepository.findOne({
        where: { companyId: user.company.id }
      });

      if (!calendarAccess?.googleRefreshToken) {
        throw new BadRequestException('La cuenta de Google Calendar no está conectada');
      }

      // Verificar que el calendario existe y tenemos acceso
      const googleCalendar = await this.googleCalendarService.getCalendarApi(calendarAccess.googleRefreshToken);
      try {
        await googleCalendar.calendarList.get({ calendarId });
      } catch (error) {
        throw new BadRequestException('El calendario seleccionado no existe o no tienes acceso a él');
      }

      // Verificar si ya existe un registro para este calendario
      let calendarEntity = await this.calendarRepository.findOne({
        where: {
          companyId: user.company.id,
          googleCalendarId: calendarId
        }
      });

      // Si no existe, crear uno nuevo
      if (!calendarEntity) {
        calendarEntity = this.calendarRepository.create({
          companyId: user.company.id,
          googleCalendarId: calendarId,
          startHour: '09:00',
          endHour: '18:00'
        });

        await this.calendarRepository.save(calendarEntity);
      }

      return calendarEntity;
    } catch (error) {
      this.logger.error(`Error connecting calendar: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  async removeCalendar(userId: string, calendarId: string): Promise<Calendar> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['company']
      });

      if (!user || !user.company) {
        throw new BadRequestException('Usuario o compañía no encontrados');
      }

      if (user.role !== Role.ADMIN) {
        throw new BadRequestException('Solo los administradores pueden desconectar calendarios');
      }

      const calendar = await this.calendarRepository.findOne({
        where: {
          companyId: user.company.id,
          googleCalendarId: calendarId
        }
      });

      if (!calendar) {
        throw new BadRequestException('No hay calendarios conectados para esta compañía');
      }

      // Desconectar el calendario
      await this.calendarRepository.remove(calendar);

      return calendar;
    } catch (error) {
      this.logger.error(`Error disconnecting calendar: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  async revokeAccess(userId: string): Promise<void> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['company']
      });

      if (!user || !user.company) {
        throw new BadRequestException('Usuario o compañía no encontrados');
      }

      if (user.role !== Role.ADMIN) {
        throw new BadRequestException('Solo los administradores pueden revocar el acceso al calendario');
      }

      // 1. Obtener el acceso actual
      const calendarAccess = await this.calendarAccessRepository.findOne({
        where: { companyId: user.company.id }
      });

      if (!calendarAccess) {
        throw new BadRequestException('No hay una conexión de Google Calendar para revocar');
      }

      // 2. Revocar el token en Google
      if (calendarAccess.googleAccessToken) {
        try {
          await this.oauth2Client.revokeToken(calendarAccess.googleAccessToken);
        } catch (error) {
          this.logger.warn('Error al revocar token en Google:', error.message);
        }
      }

      // 3. Eliminar todos los calendarios conectados
      await this.calendarRepository.delete({ companyId: user.company.id });

      // 4. Eliminar el acceso de la base de datos
      await this.calendarAccessRepository.delete({ companyId: user.company.id });

      this.logger.log(`Acceso revocado completamente para la compañía ${user.company.id}`);
    } catch (error) {
      this.logger.error(`Error revoking Google Calendar access: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  async isConnected(companyId: string): Promise<boolean> {
    const calendarAccess = await this.calendarAccessRepository.findOne({
      where: { companyId },
    });

    return !!calendarAccess?.googleRefreshToken;
  }

  async getAccessToken(companyId: string): Promise<string | null> {
    const calendarAccess = await this.calendarAccessRepository.findOne({
      where: { companyId },
    });

    if (!calendarAccess?.googleRefreshToken) {
      return null;
    }

    this.oauth2Client.setCredentials({
      refresh_token: calendarAccess.googleRefreshToken,
    });

    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      await this.calendarAccessRepository.update(calendarAccess.id, {
        googleAccessToken: credentials.access_token,
      });
      return credentials.access_token;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      return null;
    }
  }

  async disconnect(companyId: string): Promise<void> {
    const calendarAccess = await this.calendarAccessRepository.findOne({
      where: { companyId }
    });

    if (calendarAccess) {
      // 1. Revocar el token en Google si existe
      if (calendarAccess.googleAccessToken) {
        try {
          await this.oauth2Client.revokeToken(calendarAccess.googleAccessToken);
        } catch (error) {
          this.logger.warn('Error al revocar token en Google:', error.message);
        }
      }

      // 2. Eliminar todos los calendarios conectados
      await this.calendarRepository.delete({ companyId });

      // 3. Eliminar el acceso
      await this.calendarAccessRepository.delete({ id: calendarAccess.id });
    }
  }

  async listCalendars(refreshToken: string): Promise<any> {
    try {
      const calendarAccess = await this.calendarAccessRepository.findOne({
        where: { googleRefreshToken: refreshToken }
      });

      if (!calendarAccess) {
        throw new BadRequestException('Acceso al calendario no encontrado');
      }

      const connectedCalendars = await this.calendarRepository.find({
        where: {
          companyId: calendarAccess.companyId,
          googleCalendarId: Not(IsNull())
        }
      });

      const allCalendars = await this.googleCalendarService.listCalendars(refreshToken);

      // Mostrar todos los calendarios e indicar cuáles están conectados
      return allCalendars.map(cal => ({
        id: cal.id,
        summary: cal.summary,
        description: cal.description,
        timeZone: cal.timeZone,
        backgroundColor: cal.backgroundColor,
        primary: cal.primary || false,
        isConnected: connectedCalendars.some(c => c.googleCalendarId === cal.id)
      }));
    } catch (error) {
      this.logger.error(`Error listing calendars: ${error.message}`);
      throw new BadRequestException('Error al listar calendarios: ' + error.message);
    }
  }
}