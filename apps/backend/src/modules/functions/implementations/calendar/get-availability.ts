/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { Function } from '../../entities/function.entity';
import { GoogleCalendarAvailabilityConstData } from '../../core/types/function.types';

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
export class GetAvailabilityImplementation {
  private readonly logger = new Logger(GetAvailabilityImplementation.name);

  constructor(
    @Inject(forwardRef(() => 'CalendarAvailabilityService'))
    private calendarAvailabilityService: any,
  ) {}

  async execute(
    function_: Function, // const data and more
    args: Record<string, any>, // args from LLM, parameters variables
    context: CalendarContext
  ): Promise<CalendarResult> {
    try {
      this.logger.log(`Ejecutando GetAvailabilityImplementation con args: ${JSON.stringify(args)}`);
      const constData = function_.constData as GoogleCalendarAvailabilityConstData;
      
      // Validar fecha
      if (!args.date) {
        throw new Error('Se requiere una fecha para consultar disponibilidad');
      }

      // Validar formato de fecha
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(args.date)) {
        throw new Error('El formato de fecha debe ser YYYY-MM-DD');
      }

      // Convertir duración si viene en formato "Xh" a minutos
      let durationMinutes = constData.duration || 60;
      if (args.duration) {
        if (typeof args.duration === 'string') {
          const durationMatch = args.duration.match(/(\d+)h/);
          if (durationMatch) {
            durationMinutes = parseInt(durationMatch[1], 10) * 60;
          } else if (!isNaN(parseInt(args.duration, 10))) {
            durationMinutes = parseInt(args.duration, 10);
          }
        } else if (typeof args.duration === 'number') {
          durationMinutes = args.duration;
        }
      }
      
      // Determinar rango de fechas para la consulta
      const startDate = args.date;
      
      // Si se proporciona un rango específico, usamos eso
      // Si no se proporciona fecha de fin, usar la fecha de inicio + 1 día
      const endDate = args.endDate || new Date(new Date(startDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Seleccionar el calendario configurado
      const calendarId = constData.calendarId;
      if (!calendarId) {
        throw new Error('No hay calendarios configurados');
      }

      this.logger.log(`Consultando disponibilidad para el calendario ${calendarId} desde ${startDate} hasta ${endDate}`);
      
      // Obtener disponibilidad usando el servicio existente
      const availableSlots = await this.calendarAvailabilityService.getAvailableSlots(
        calendarId,
        startDate,
        endDate
      );

      // Filtrar slots según la duración requerida si es necesario
      // Aquí podríamos agregar lógica adicional para filtrar por duración si el servicio no lo hace

      this.logger.log(`Disponibilidad obtenida: ${JSON.stringify(availableSlots)}`);

      return {
        success: true,
        data: {
          date: args.date,
          endDate: endDate,
          duration: durationMinutes,
          availableSlots
        },
        metadata: {
          calendarId: calendarId,
          calendarName: constData.name 
        }
      };
    } catch (error) {
      this.logger.error(`Error en GetAvailabilityImplementation: ${error.message}`);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }
} 