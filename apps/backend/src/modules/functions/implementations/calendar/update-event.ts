import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { Function } from '../../entities/function.entity';
import { GoogleCalendarUpdateEventConstData } from '../../core/types/calendar.types';

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

interface EventChanges {
  startTime?: string;
  date?: string;
  title?: string;
  description?: string;
}

@Injectable()
export class UpdateEventImplementation {
  private readonly logger = new Logger(UpdateEventImplementation.name);

  constructor(
    @Inject(forwardRef(() => 'CalendarEventService'))
    private calendarEventService: any
  ) {}

  async execute(
    function_: Function,
    args: Record<string, any>,
    context: CalendarContext
  ): Promise<CalendarResult> {
    try {
      const constData = function_.constData as GoogleCalendarUpdateEventConstData;

      // Validar que tenemos los datos necesarios
      if (!args.title || !args.date) {
        return {
          success: false,
          data: {
            step: 'missing_data',
            message: 'Se requiere el título actual y la fecha del evento para actualizarlo'
          },
          error: 'Se requiere el título actual y la fecha del evento para actualizarlo'
        };
      }

      // Validar formato de fecha
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(args.date)) {
        return {
          success: false,
          data: {
            step: 'invalid_date',
            message: 'El formato de fecha debe ser YYYY-MM-DD'
          },
          error: 'El formato de fecha debe ser YYYY-MM-DD'
        };
      }

      // Buscar eventos para la fecha especificada
      const eventsResult = await this.calendarEventService.findEventsByDate(
        constData.calendarId,
        args.date,
        { includeDetails: true }
      );

      if (!eventsResult.events?.length) {
        return {
          success: false,
          data: {
            step: 'no_events',
            message: `No hay eventos programados para la fecha ${args.date}`
          },
          error: `No hay eventos programados para la fecha ${args.date}`
        };
      }

      // Buscar el evento específico por título actual
      const eventToUpdate = eventsResult.events.find(
        (e: any) => e.title.toLowerCase() === args.title.toLowerCase()
      );

      if (!eventToUpdate) {
        return {
          success: false,
          data: {
            step: 'event_not_found',
            message: `No se encontró el evento "${args.title}" para la fecha ${args.date}`,
            availableEvents: eventsResult.events.map(e => ({
              title: e.title,
              time: e.startTime
            }))
          },
          error: `No se encontró el evento "${args.title}" para la fecha ${args.date}`
        };
      }

      // Preparar los cambios
      const updateData: EventChanges = {};

      if (args.startTime) {
        // Validar formato de hora
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!timeRegex.test(args.startTime)) {
          return {
            success: false,
            data: {
              step: 'invalid_time',
              message: 'El formato de hora debe ser HH:MM en formato 24 horas'
            },
            error: 'El formato de hora debe ser HH:MM en formato 24 horas'
          };
        }
        updateData.startTime = args.startTime;
      }

      // Validar y agregar nueva fecha si se proporciona
      if (args.newDate) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(args.newDate)) {
          return {
            success: false,
            data: {
              step: 'invalid_date',
              message: 'El formato de fecha debe ser YYYY-MM-DD'
            },
            error: 'El formato de fecha debe ser YYYY-MM-DD'
          };
        }
        updateData.date = args.newDate;
      }

      if (args.description) {
        updateData.description = args.description;
      }

      // Usar newTitle para actualizar el título si está presente
      if (args.newTitle) {
        updateData.title = args.newTitle;
      }

      // Si no hay cambios, retornar error
      if (Object.keys(updateData).length === 0) {
        return {
          success: false,
          data: {
            step: 'no_changes',
            message: 'No se especificaron cambios para actualizar el evento',
            currentEvent: {
              title: eventToUpdate.title,
              time: eventToUpdate.startTime,
              description: eventToUpdate.description
            }
          },
          error: 'No se especificaron cambios para actualizar el evento'
        };
      }

      // Actualizar el evento
      const updatedEvent = await this.calendarEventService.updateEvent(
        constData.calendarId,
        eventToUpdate.id,
        updateData
      );

      return {
        success: true,
        data: {
          step: 'event_updated',
          message: 'Evento actualizado exitosamente',
          event: {
            id: updatedEvent.id,
            title: updatedEvent.title,
            date: updatedEvent.date,
            startTime: updatedEvent.startTime,
            description: updatedEvent.description,
            googleCalendarLink: updatedEvent.metadata?.googleCalendarLink
          },
          changes: Object.keys(updateData)
        }
      };

    } catch (error) {
      this.logger.error('Error actualizando evento:', error);
      return {
        success: false,
        data: {
          step: 'error',
          message: error.message
        },
        error: error.message
      };
    }
  }
}
