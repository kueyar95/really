/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { Function } from '../../entities/function.entity';
import { GoogleCalendarCreateEventConstData } from '../../core/types/function.types';

interface CalendarContext {
  companyId: string;
  clientId: string;
  chatHistory?: { role: string; content: string }[];
}

interface CalendarResult {
  success: boolean;
  data: any;
  error?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class CreateEventImplementation {
  private readonly logger = new Logger(CreateEventImplementation.name);

  constructor(
    @Inject(forwardRef(() => 'CalendarEventService'))
    private calendarEventService: any,
  ) {}

  async execute(
    function_: Function,
    args: Record<string, any>,
    context: CalendarContext
  ): Promise<CalendarResult> {
    try {
      this.logger.log(`Ejecutando CreateEventImplementation con args: ${JSON.stringify(args)}`);
      const constData = function_.constData as GoogleCalendarCreateEventConstData;

      // Validar parámetros requeridos
      if (!args.startTime && !args.date) {
        throw new Error('Se requiere la fecha y hora de inicio para crear un evento');
      }
      const calendarId = constData.calendarId;
      if (!calendarId) {
        throw new Error('No hay calendarios configurados');
      }

      let dateStr: string;
      let timeStr: string;

      // Manejar diferentes formatos de fecha/hora
      if (args.startTime) {
        // Si viene como ISO string completo (2023-01-01T10:00:00Z)
        if (args.startTime.includes('T')) {
          const startTime = new Date(args.startTime);
          dateStr = startTime.toISOString().split('T')[0];
          timeStr = startTime.toISOString().split('T')[1].substring(0, 5);
        } 
        // Si viene como objeto con date y time
        else if (args.date && args.startTime) {
          dateStr = args.date;
          timeStr = args.startTime;
        }
      } else if (args.date && args.time) {
        dateStr = args.date;
        timeStr = args.time;
      } else {
        throw new Error('Formato de fecha y hora inválido');
      }
      
      // Validar formato de fecha
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateStr)) {
        throw new Error('El formato de fecha debe ser YYYY-MM-DD');
      }

      // Validar formato de hora
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(timeStr)) {
        throw new Error('El formato de hora debe ser HH:MM en formato 24 horas');
      }
      
      // Determinar duración del evento
      let duration = 60; // Valor por defecto: 1 hora
      if (constData.duration) {
        duration = parseInt(constData.duration, 10);
      }

      // Determinar título del evento
      const title = args.title || args.name || constData.eventName || 'Reunión programada';
      
      // Determinar descripción del evento
      let description = '';
      if (constData.description) {
        description = constData.description || '';
      } else {
        description = args.description || constData.description || '';
      }
      
      // Agregar invitados si está configurado para incluir al cliente
      const attendees: Array<{email: string, name?: string}> = [];
      
      if (args.email) {
        attendees.push({
          email: args.email,
          name: args.attendeeName || args.name // Usar el nombre si está disponible
        });
      }
      
      // Preparar datos para crear el evento
      const eventData = {
        date: dateStr,
        startTime: timeStr,
        duration: duration,
        title: title,
        description: description,
        type: args.type || 'meeting',
        clientId: context.clientId,
        targetCalendarId: calendarId,
        attendees: attendees.length > 0 ? attendees : undefined,
        createMeet: constData.createMeet === true,
        metadata: {
          source: 'ai_function'
        }
      };

      this.logger.log(`Creando evento con datos: ${JSON.stringify(eventData)}`);

      // Crear el evento usando el servicio existente
      const result = await this.calendarEventService.createEvent(
        calendarId,
        eventData
      );

      this.logger.log(`Evento creado exitosamente: ${JSON.stringify(result)}`);

      return {
        success: true,
        data: {
          eventId: result.event.id,
          googleCalendarLink: result.googleCalendarLink,
          date: dateStr,
          startTime: timeStr,
          title: eventData.title,
          duration: duration,
          attendees: eventData.attendees,
          hasMeet: eventData.createMeet
        },
        metadata: {
          calendarId: calendarId,
          calendarName: 'Calendario principal'
        }
      };
    } catch (error) {
      this.logger.error(`Error en CreateEventImplementation: ${error.message}`);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }
}