import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { Function } from '../../entities/function.entity';
import { GoogleCalendarDeleteEventConstData } from '../../core/types/calendar.types';

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
export class DeleteEventImplementation {
  private readonly logger = new Logger(DeleteEventImplementation.name);

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
      const constData = function_.constData as GoogleCalendarDeleteEventConstData;

      // Validar que tenemos los datos necesarios
      if (!args.title || !args.date) {
        return {
          success: false,
          data: {
            step: 'missing_data',
            message: 'Se requiere el título y la fecha del evento para eliminarlo'
          },
          error: 'Se requiere el título y la fecha del evento para eliminarlo'
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

      // Buscar el evento específico por título
      const eventToDelete = eventsResult.events.find(
        (e: any) => e.title.toLowerCase() === args.title.toLowerCase()
      );

      if (!eventToDelete) {
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

      // Eliminar el evento
      await this.calendarEventService.deleteEvent(
        constData.calendarId,
        eventToDelete.id
      );

      return {
        success: true,
        data: {
          step: 'event_deleted',
          message: 'Evento eliminado exitosamente',
          event: {
            id: eventToDelete.id,
            title: eventToDelete.title,
            date: args.date,
            startTime: eventToDelete.startTime
          }
        }
      };

    } catch (error) {
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