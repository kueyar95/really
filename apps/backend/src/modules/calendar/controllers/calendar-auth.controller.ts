import { Controller, Get, Post, Query, UseGuards, Req, NotFoundException, BadRequestException, Body } from '@nestjs/common';
import { GoogleCalendarAuthService } from '../services/google-calendar-auth.service';
import { SupabaseAuthGuard } from '@/auth/guards/auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Calendar } from '../entities/calendar.entity';
import { User } from '@/modules/users/entities/user.entity';
import { CalendarAccess } from '../entities/calendar-access.entity';
import { Logger } from '@nestjs/common';

@Controller('calendar/integrations/google')
@UseGuards(SupabaseAuthGuard)
export class CalendarAuthController {
  private readonly logger = new Logger(CalendarAuthController.name);

  constructor(
    private readonly googleCalendarAuthService: GoogleCalendarAuthService,
    @InjectRepository(Calendar)
    private readonly calendarRepository: Repository<Calendar>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(CalendarAccess)
    private readonly calendarAccessRepository: Repository<CalendarAccess>
  ) {}

  @Get('auth-url')
  async getGoogleAuthUrl(@Req() req: any) {
    const user = await this.userRepository.findOne({
      where: { id: req.user.id },
      relations: ['company']
    });
    const url = await this.googleCalendarAuthService.getAuthUrl(user.company.id);
    return { url };
  }

  @Get('callback')
  async handleGoogleCallback(
    @Query('code') code: string,
    @Query('state') state: string,

  ) {
    try {
      if (!code) {
        throw new BadRequestException('No se recibió el código de autorización');
      }

      if (!state) {
        throw new BadRequestException('No se recibió el ID de la compañía');
      }

      await this.googleCalendarAuthService.handleCallback(code, state);
      return {
        success: true,
        message: 'Calendario conectado exitosamente'
      };
    } catch (error) {
      this.logger.error('Error en callback de Google Calendar:', error);
      throw new BadRequestException(error.message);
    }
  }

  @Post('disconnect')
  async disconnectGoogle(@Req() req: any) {
    try {
      const userId = req.user.id;
      await this.googleCalendarAuthService.revokeAccess(userId);
      return {
        success: true,
        message: 'Conexión con Google Calendar revocada exitosamente'
      };
    } catch (error) {
      this.logger.error('Error al desconectar Google Calendar:', error);
      throw new BadRequestException(error.message);
    }
  }

  @Get('status')
  async getGoogleConnectionStatus(@Req() req: any) {
    const userId = req.user.id;
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['company']
    });

    if (!user?.company) {
      return { isConnected: false };
    }

    const isConnected = await this.googleCalendarAuthService.isConnected(user.company.id);
    return { isConnected };
  }

  @Get('calendar-id')
  async getGoogleCalendarId(@Req() req: any) {
    const userId = req.user.id;
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['company']
    });

    if (!user || !user.company) {
      throw new NotFoundException('Usuario o compañía no encontrados');
    }

    const calendars = await this.calendarRepository.find({
      where: { companyId: user.company.id },
      relations: ['company']
    });

    if (!calendars.length) {
      throw new NotFoundException('No se encontraron calendarios configurados para esta compañía');
    }

    return {
      success: true,
      calendars: calendars.map(calendar => ({
        id: calendar.id,
        googleCalendarId: calendar.googleCalendarId,
        calendarName: `${calendar.company.name}`
      }))
    };
  }

  @Post('select-calendar')
  async selectCalendar(@Req() req: any, @Body('calendarId') calendarId: string) {
    if (!calendarId) {
      throw new BadRequestException('El ID del calendario es requerido');
    }

    const calendar = await this.googleCalendarAuthService.selectCalendar(req.user.id, calendarId);

    return {
      success: true,
      message: 'Calendario agregado exitosamente',
      calendar
    };
  }

  @Post('remove-calendar')
  async removeCalendar(@Req() req: any, @Body('calendarId') calendarId: string) {
    if (!calendarId) {
      throw new BadRequestException('El ID del calendario es requerido');
    }

    await this.calendarRepository.delete({ googleCalendarId: calendarId });

    return {
      success: true,
      message: 'Calendario removido exitosamente'
    };
  }

  @Get('calendars')
  async listCalendars(@Req() req: any) {
    const userId = req.user.id;
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['company']
    });

    if (!user || !user.company) {
      throw new NotFoundException('Usuario o compañía no encontrados');
    }

    const calendarAccess = await this.calendarAccessRepository.findOne({
      where: { companyId: user.company.id }
    });

    if (!calendarAccess?.googleRefreshToken) {
      throw new NotFoundException('No hay una cuenta de Google Calendar conectada para esta compañía');
    }

    const calendars = await this.googleCalendarAuthService.listCalendars(calendarAccess.googleRefreshToken);
    return {
      success: true,
      calendars
    };
  }

  @Post('connect-calendar')
  async connectCalendar(@Req() req: any, @Body('calendarId') calendarId: string) {
    if (!calendarId) {
      throw new BadRequestException('El ID del calendario es requerido');
    }

    const calendar = await this.googleCalendarAuthService.selectCalendar(req.user.id, calendarId);

    return {
      success: true,
      message: 'Calendario conectado exitosamente',
      calendar
    };
  }

  @Post('disconnect-calendar')
  async disconnectCalendar(@Req() req: any, @Body('calendarId') calendarId: string) {
    try {
      if (!calendarId) {
        throw new BadRequestException('El ID del calendario es requerido');
      }

      const user = await this.userRepository.findOne({
        where: { id: req.user.id },
        relations: ['company']
      });

      if (!user?.company) {
        throw new BadRequestException('Usuario o compañía no encontrados');
      }

      // Solo eliminamos el calendario específico
      await this.calendarRepository.delete({
        companyId: user.company.id,
        googleCalendarId: calendarId
      });

      return {
        success: true,
        message: 'Calendario desconectado exitosamente'
      };
    } catch (error) {
      this.logger.error('Error al desconectar calendario:', error);
      throw new BadRequestException(error.message);
    }
  }
}