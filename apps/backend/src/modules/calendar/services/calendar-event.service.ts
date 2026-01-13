import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DeepPartial } from 'typeorm';
import { Calendar } from '../entities/calendar.entity';
import { Event } from '../entities/event.entity';
import { CreateEventDto } from '../dto/create-event.dto';
import { GoogleCalendarService } from './google-calendar-setup.service';
import { CalendarAccess } from '../entities/calendar-access.entity';

@Injectable()
export class CalendarEventService {
  constructor(
    @InjectRepository(Calendar)
    private readonly calendarRepository: Repository<Calendar>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(CalendarAccess)
    private readonly calendarAccessRepository: Repository<CalendarAccess>,
    private readonly googleCalendarService: GoogleCalendarService
  ) {}

  async createEvent(calendarId: string, createEventDto: CreateEventDto) {
    try {
      // 1. Buscar el calendario
      const calendar = await this.calendarRepository.findOne({
        where: { googleCalendarId: calendarId },
        relations: ['company']
      });

      if (!calendar) {
        throw new NotFoundException('Calendar not found');
      }

      const calendarAccess = await this.calendarAccessRepository.findOne({
        where: { companyId: calendar.companyId }
      });

      if (!calendarAccess?.googleRefreshToken) {
        throw new HttpException(
          'El calendario no está conectado con Google Calendar',
          HttpStatus.BAD_REQUEST
        );
      }

      if (!createEventDto.targetCalendarId) {
        throw new HttpException(
          'Debe especificar en qué calendario de Google crear el evento (targetCalendarId)',
          HttpStatus.BAD_REQUEST
        );
      }

      // 2. Obtener el API de Google Calendar
      const googleCalendar = await this.googleCalendarService.getCalendarApi(calendarAccess.googleRefreshToken);

      // 3. Crear la fecha en la zona horaria de Santiago
      // Construimos una fecha directamente con la hora local de Chile
      const [year, month, day] = createEventDto.date.split('-').map(num => parseInt(num, 10));
      const [hours, minutes] = createEventDto.startTime.split(':').map(num => parseInt(num, 10));
      const startDateTime = new Date(year, month - 1, day, hours, minutes, 0);
      const endDateTime = new Date(startDateTime.getTime() + createEventDto.duration * 60000);

      // 4. Crear evento en Google Calendar
      const googleEvent = {
        summary: createEventDto.title || `${createEventDto.eventType} - ${startDateTime.toLocaleDateString()}`,
        description: createEventDto.description || `Event type: ${createEventDto.eventType}`,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'America/Santiago',
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'America/Santiago',
        },
        attendees: createEventDto.attendees?.map(attendee => ({
          email: attendee.email,
          ...(attendee.name && { displayName: attendee.name })
        })),
        conferenceData: createEventDto.createMeet ? {
          createRequest: {
            requestId: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        } : undefined,
        guestsCanModify: false,
        guestsCanInviteOthers: false,
        guestsCanSeeOtherGuests: true,
        reminders: {
          useDefault: true
        },
      };

      // 5. Insertar en Google Calendar
      let googleEventResult;
      try {
        googleEventResult = await googleCalendar.events.insert({
          calendarId: calendarId,
          requestBody: googleEvent,
          conferenceDataVersion: createEventDto.createMeet ? 1 : 0,
          sendUpdates: 'all',
        });
      } catch (error) {
        console.error('Error creating Google Calendar event:', JSON.stringify(error.response?.data || error, null, 2));
        throw new HttpException(
          'Error al crear evento en Google Calendar: ' + error.message,
          HttpStatus.BAD_REQUEST
        );
      }

      // 6. Crear evento en nuestra base de datos
      const eventData: DeepPartial<Event> = {
        calendarId: calendar.id,
        title: createEventDto.title || `${createEventDto.eventType} - ${startDateTime.toLocaleDateString()}`,
        description: createEventDto.description,
        date: startDateTime,
        startTime: createEventDto.startTime,
        duration: createEventDto.duration,
        type: createEventDto.eventType,
        clientId: createEventDto.clientId,
        metadata: {
          googleEventId: googleEventResult.data.id,
          googleCalendarId: createEventDto.targetCalendarId,
          googleCalendarLink: googleEventResult.data.htmlLink,
          conferenceData: googleEventResult.data.conferenceData
        }
      };

      const localEvent = this.eventRepository.create(eventData);
      const savedEvent = await this.eventRepository.save(localEvent);

      return {
        success: true,
        event: savedEvent,
        googleCalendarLink: googleEventResult.data.htmlLink
      };
    } catch (error) {
      console.error('Error creating event:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Error creating event',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async updateEvent(calendarId: string, eventId: string, updateData: any) {
    try {
      const event = await this.eventRepository.findOne({
        where: { id: eventId },
        relations: ['calendar']
      });

      if (!event) {
        throw new NotFoundException('Evento no encontrado');
      }

      // Obtener acceso a Google Calendar
      const calendarAccess = await this.calendarAccessRepository.findOne({
        where: { companyId: event.calendar.companyId }
      });

      if (!calendarAccess?.googleRefreshToken) {
        throw new Error('No hay acceso configurado para Google Calendar');
      }

      const googleCalendar = await this.googleCalendarService.getCalendarApi(calendarAccess.googleRefreshToken);

      // Preparar datos para Google Calendar
      let startDateTime: Date;

      // Si la fecha del evento es un string, convertirla a Date
      const eventDate = typeof event.date === 'string'
        ? new Date(event.date)
        : event.date instanceof Date
          ? event.date
          : new Date(event.date);

      if (updateData.date) {
        // Si hay nueva fecha, usarla
        const [year, month, day] = updateData.date.split('-').map(num => parseInt(num, 10));
        const timeToUse = updateData.startTime || event.startTime;
        const [hours, minutes] = timeToUse.split(':').map(num => parseInt(num, 10));
        
        // Usar fecha y hora local (no UTC)
        startDateTime = new Date(year, month - 1, day, hours, minutes, 0);
      } else {
        // Si no hay nueva fecha, usar la fecha existente
        const dateStr = eventDate.toISOString().split('T')[0];
        const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
        const timeToUse = updateData.startTime || event.startTime;
        const [hours, minutes] = timeToUse.split(':').map(num => parseInt(num, 10));
        
        // Usar fecha y hora local (no UTC)
        startDateTime = new Date(year, month - 1, day, hours, minutes, 0);
      }

      const endDateTime = new Date(startDateTime.getTime() + (event.duration * 60000));

      // Actualizar en Google Calendar
      await googleCalendar.events.patch({
        calendarId: event.metadata.googleCalendarId,
        eventId: event.metadata.googleEventId,
        requestBody: {
          summary: updateData.newTitle || updateData.title || event.title,
          description: updateData.description || event.description,
          start: {
            dateTime: startDateTime.toISOString(),
            timeZone: 'America/Santiago',
          },
          end: {
            dateTime: endDateTime.toISOString(),
            timeZone: 'America/Santiago',
          }
        },
        sendUpdates: 'all'
      });

      // Actualizar en nuestra base de datos
      Object.assign(event, {
        title: updateData.newTitle || updateData.title || event.title,
        description: updateData.description || event.description,
        date: startDateTime,
        startTime: updateData.startTime || event.startTime,
      });

      const savedEvent = await this.eventRepository.save(event);

      return savedEvent;
    } catch (error) {
      throw error;
    }
  }

  async deleteEvent(calendarId: string, eventId: string) {
    try {
      // 1. Buscar el evento y el calendario
      const [event, calendar] = await Promise.all([
        this.eventRepository.findOne({ where: { id: eventId } }),
        this.calendarRepository.findOne({
          where: { googleCalendarId: calendarId }
        })
      ]);

      if (!event || !calendar) {
        throw new NotFoundException('Event or calendar not found');
      }

      const calendarAccess = await this.calendarAccessRepository.findOne({
        where: { companyId: calendar.companyId }
      });

      // 2. Eliminar de Google Calendar
      const googleEventId = event.metadata?.googleEventId;
      const googleCalendarId = event.metadata?.googleCalendarId;

      if (googleEventId && googleCalendarId && calendarAccess?.googleRefreshToken) {
        const googleCalendar = await this.googleCalendarService.getCalendarApi(calendarAccess.googleRefreshToken);
        await googleCalendar.events.delete({
          calendarId: googleCalendarId,
          eventId: googleEventId
        });
      }

      // 3. Eliminar de nuestra base de datos
      await this.eventRepository.remove(event);

      return {
        success: true,
        message: 'Event deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting event:', error);
      throw new HttpException(
        error.message || 'Error deleting event',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async findByCalendarId(calendarId: string, startDate?: Date, endDate?: Date) {
    const where: any = { calendarId };

    if (startDate && endDate) {
      where.date = Between(startDate, endDate);
    }

    const events = await this.eventRepository.find({
      where,
      order: {
        date: 'ASC',
        startTime: 'ASC'
      }
    });

    return events.map(event => ({
      date: new Date(event.date).toISOString().split('T')[0],
      duration: event.duration,
      id: event.id,
      time: event.startTime,
      title: event.title,
      type: event.type,
      clientId: event.clientId,
      googleCalendarLink: event.metadata?.googleCalendarLink
    }));
  }

  async findEventsByDate(calendarId: string, date: string, options?: {
    includeDetails?: boolean;
    searchTerm?: string;
  }) {
    try {
      // 1. Buscar el calendario
      const calendar = await this.calendarRepository.findOne({
        where: { googleCalendarId: calendarId },
        relations: ['company']
      });

      if (!calendar) {
        throw new NotFoundException('Calendar not found');
      }

      const calendarAccess = await this.calendarAccessRepository.findOne({
        where: { companyId: calendar.companyId }
      });

      if (!calendarAccess?.googleRefreshToken) {
        throw new HttpException(
          'El calendario no está conectado con Google Calendar',
          HttpStatus.BAD_REQUEST
        );
      }

      // 2. Obtener el API de Google Calendar
      const googleCalendar = await this.googleCalendarService.getCalendarApi(calendarAccess.googleRefreshToken);

      // 3. Preparar el rango de fechas (todo el día)
      const startDateTime = new Date(`${date}T00:00:00-03:00`);
      const endDateTime = new Date(`${date}T23:59:59-03:00`);

      // 4. Obtener eventos de Google Calendar
      const response = await googleCalendar.events.list({
        calendarId: calendarId,
        timeMin: startDateTime.toISOString(),
        timeMax: endDateTime.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      // 5. Obtener eventos de nuestra base de datos para ese día
      const localEvents = await this.eventRepository.find({
        where: {
          calendarId: calendar.id,
          date: Between(startDateTime, endDateTime)
        },
        order: {
          date: 'ASC',
          startTime: 'ASC'
        }
      });

      // 6. Mapear y combinar los eventos
      const events = localEvents.map(event => {
        const googleEvent = response.data.items?.find(
          item => item.id === event.metadata?.googleEventId
        );

        return {
          id: event.id,
          title: event.title,
          startTime: event.startTime,
          duration: event.duration,
          type: event.type,
          googleEventId: event.metadata?.googleEventId,
          googleCalendarLink: event.metadata?.googleCalendarLink,
          status: googleEvent?.status || 'unknown',
          ...(options?.includeDetails && {
            description: event.description,
            metadata: event.metadata,
            attendees: googleEvent?.attendees || [],
            conferenceData: googleEvent?.conferenceData
          })
        };
      });

      // 7. Filtrar por término de búsqueda si se proporciona
      let filteredEvents = events;
      if (options?.searchTerm) {
        const searchTerm = options.searchTerm.toLowerCase();
        filteredEvents = events.filter(event =>
          event.title.toLowerCase().includes(searchTerm) ||
          event.type?.toLowerCase().includes(searchTerm)
        );
      }

      return {
        date,
        events: filteredEvents,
        total: filteredEvents.length
      };

    } catch (error) {
      console.error('Error finding events by date:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Error finding events',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async findEventsByDateRange(
    calendarId: string,
    startDate: string,
    endDate: string,
    options?: {
      includeDetails?: boolean;
      searchTerm?: string;
    }
  ) {
    try {
      // 1. Buscar el calendario
      const calendar = await this.calendarRepository.findOne({
        where: { googleCalendarId: calendarId },
        relations: ['company']
      });

      if (!calendar) {
        throw new NotFoundException('Calendar not found');
      }

      const calendarAccess = await this.calendarAccessRepository.findOne({
        where: { companyId: calendar.companyId }
      });

      if (!calendarAccess?.googleRefreshToken) {
        throw new HttpException(
          'El calendario no está conectado con Google Calendar',
          HttpStatus.BAD_REQUEST
        );
      }

      // 2. Obtener el API de Google Calendar
      const googleCalendar = await this.googleCalendarService.getCalendarApi(calendarAccess.googleRefreshToken);

      // 3. Preparar el rango de fechas
      const startDateTime = new Date(`${startDate}T00:00:00-03:00`);
      const endDateTime = new Date(`${endDate}T23:59:59-03:00`);

      // 4. Obtener eventos de Google Calendar
      const response = await googleCalendar.events.list({
        calendarId: calendarId,
        timeMin: startDateTime.toISOString(),
        timeMax: endDateTime.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      // 5. Obtener eventos de nuestra base de datos para ese rango
      const localEvents = await this.eventRepository.find({
        where: {
          calendarId: calendar.id,
          date: Between(startDateTime, endDateTime)
        },
        order: {
          date: 'ASC',
          startTime: 'ASC'
        }
      });

      // 6. Mapear y combinar los eventos
      const events = localEvents.map(event => {
        const googleEvent = response.data.items?.find(
          item => item.id === event.metadata?.googleEventId
        );

        return {
          id: event.id,
          title: event.title,
          date: new Date(event.date).toISOString().split('T')[0],
          startTime: event.startTime,
          duration: event.duration,
          type: event.type,
          googleEventId: event.metadata?.googleEventId,
          googleCalendarLink: event.metadata?.googleCalendarLink,
          status: googleEvent?.status || 'unknown',
          ...(options?.includeDetails && {
            description: event.description,
            metadata: event.metadata,
            attendees: googleEvent?.attendees || [],
            conferenceData: googleEvent?.conferenceData
          })
        };
      });

      // 7. Filtrar por término de búsqueda si se proporciona
      let filteredEvents = events;
      if (options?.searchTerm) {
        const searchTerm = options.searchTerm.toLowerCase();
        filteredEvents = events.filter(event =>
          event.title.toLowerCase().includes(searchTerm) ||
          event.type?.toLowerCase().includes(searchTerm)
        );
      }

      return {
        dateRange: {
          startDate,
          endDate
        },
        events: filteredEvents,
        total: filteredEvents.length
      };

    } catch (error) {
      throw new HttpException(
        error.message || 'Error finding events',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}