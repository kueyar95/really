import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { Function } from '../../entities/function.entity';
import { GoogleCalendarListEventsConstData } from '../../core/types/calendar.types';

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

interface DateRange {
  startDate: string;
  endDate: string;
  description: string;
}

@Injectable()
export class ListEventsImplementation {
  private readonly logger = new Logger(ListEventsImplementation.name);

  constructor(
    @Inject(forwardRef(() => 'CalendarEventService'))
    private calendarEventService: any,
  ) {}

  private getWeekRange(date: Date = new Date()): DateRange {
    const curr = new Date(date);
    const first = curr.getDate() - curr.getDay();
    const last = first + 6;

    const firstDay = new Date(curr.setDate(first));
    const lastDay = new Date(curr.setDate(last));

    return {
      startDate: firstDay.toISOString().split('T')[0],
      endDate: lastDay.toISOString().split('T')[0],
      description: 'esta semana'
    };
  }

  private getDateRange(args: Record<string, any>): DateRange | null {
    // Si se especifica una fecha específica, convertirla a rango del mismo día
    if (args.date) {
      return {
        startDate: args.date,
        endDate: args.date,
        description: `el día ${args.date}`
      };
    }

    // Si se especifica un rango explícito
    if (args.startDate && args.endDate) {
      // Si es el mismo día
      if (args.startDate === args.endDate) {
        return {
          startDate: args.startDate,
          endDate: args.endDate,
          description: `el día ${args.startDate}`
        };
      }
      // Si es un rango
      return {
        startDate: args.startDate,
        endDate: args.endDate,
        description: `desde ${args.startDate} hasta ${args.endDate}`
      };
    }

    // Si se pide la semana actual
    if (args.period === 'week' || args.period === 'semana') {
      return this.getWeekRange();
    }

    return null;
  }

  async execute(
    function_: Function,
    args: Record<string, any>,
    context: CalendarContext
  ): Promise<CalendarResult> {
    try {
      const constData = function_.constData as GoogleCalendarListEventsConstData;

      // Si viene solo date, convertirlo a startDate y endDate
      if (args.date && !args.startDate && !args.endDate) {
        args.startDate = args.date;
        args.endDate = args.date;
      }

      const dateRange = this.getDateRange(args);
      if (!dateRange) {
        return {
          success: false,
          data: {
            step: 'missing_date',
            message: 'Se requiere especificar una fecha, un rango de fechas o un período (ej: "semana")'
          },
          error: 'Se requiere especificar una fecha o rango'
        };
      }

      // Validar formato de fechas
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateRange.startDate) || !dateRegex.test(dateRange.endDate)) {
        return {
          success: false,
          data: {
            step: 'invalid_date',
            message: 'El formato de fecha debe ser YYYY-MM-DD'
          },
          error: 'El formato de fecha debe ser YYYY-MM-DD'
        };
      }

      const calendarId = constData.calendarId;
      if (!calendarId) {
        return {
          success: false,
          data: {
            step: 'no_calendar',
            message: 'No hay calendarios configurados'
          },
          error: 'No hay calendarios configurados'
        };
      }

      // Obtener eventos para el rango de fechas
      const events = await this.calendarEventService.findEventsByDateRange(
        calendarId,
        dateRange.startDate,
        dateRange.endDate,
        { includeDetails: true }
      );

      if (!events.events?.length) {
        return {
          success: true,
          data: {
            step: 'no_events',
            message: `No se encontraron eventos para ${dateRange.description}`,
            dateRange
          }
        };
      }

      // Agrupar eventos por fecha
      const eventsByDate = events.events.reduce((acc, event) => {
        const date = event.date.split('T')[0];
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push({
          id: event.id,
          title: event.title,
          time: event.startTime,
          duration: event.duration,
          type: event.type,
          // Solo incluir descripción si se solicita detalles
          ...(args.includeDetails && { description: event.description })
        });
        return acc;
      }, {});

      return {
        success: true,
        data: {
          step: 'events_found',
          message: `Eventos encontrados para ${dateRange.description}`,
          dateRange,
          eventsByDate,
          totalEvents: events.events.length
        }
      };
    } catch (error) {
      this.logger.error('Error listando eventos:', error);
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