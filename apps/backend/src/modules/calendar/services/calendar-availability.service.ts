import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Calendar } from '../entities/calendar.entity';
import { GoogleCalendarService } from './google-calendar-setup.service';
import { CalendarAccess } from '../entities/calendar-access.entity';

@Injectable()
export class CalendarAvailabilityService {
  constructor(
    @InjectRepository(Calendar)
    private readonly calendarRepository: Repository<Calendar>,
    @InjectRepository(CalendarAccess)
    private readonly calendarAccessRepository: Repository<CalendarAccess>,
    private readonly googleCalendarService: GoogleCalendarService
  ) {}

  async getAvailableSlots(calendarId: string, startDate: string, endDate: string) {
    try {
      const calendarFound = await this.calendarRepository.findOne({
        where: { googleCalendarId: calendarId },
        relations: ['company']
      });

      if (!calendarFound) {
        throw new NotFoundException('Calendar not found');
      }
      
      // Verificar que los horarios estén configurados correctamente
      const startHour = calendarFound.startHour || '09:00';
      const endHour = calendarFound.endHour || '18:00';

      const calendarAccess = await this.calendarAccessRepository.findOne({
        where: { companyId: calendarFound.companyId }
      });

      if (!calendarAccess?.googleRefreshToken) {
        throw new NotFoundException('No hay una cuenta de Google Calendar conectada');
      }

      const calendar = await this.googleCalendarService.getCalendarApi(calendarAccess.googleRefreshToken);
      
      // Asegurar que las fechas tengan el formato correcto
      const startDateTime = new Date(`${startDate}T${startHour}:00`);
      const endDateTime = new Date(`${endDate}T${endHour}:00`);

      // Obtener tanto los días bloqueados como los rangos de horas bloqueados
      const events = await calendar.events.list({
        calendarId: calendarId,
        timeMin: startDateTime.toISOString(),
        timeMax: endDateTime.toISOString(),
        singleEvents: true,
      });

      // Como alternativa, tratemos todos los eventos como ocupados sin filtrar por tipo
      // Esto nos dará una visión más completa de la ocupación real del calendario
      const busyEvents = events.data.items || [];

      const blockedDays = new Set(
        events.data.items?.filter(event => event.extendedProperties?.private?.type === 'blocked_day')
          .map(event => event.start.date) || []
      );

      const blockedTimeRanges = events.data.items?.filter(event =>
        event.extendedProperties?.private?.type === 'blocked_time_range'
      ) || [];

      // Generar array de fechas entre start y end
      const dates = this.getDatesInRange(startDate, endDate);
      
      const availabilityByDate = {};

      for (const date of dates) {
        if (blockedDays.has(date)) {
          availabilityByDate[date] = {
            isBlocked: true,
            reason: events.data.items.find(e => e.start.date === date)?.description || 'Día no disponible',
            availableSlots: []
          };
          continue;
        }

        const now = new Date();
        const currentDate = new Date(date);

        // Si la fecha es anterior a hoy, saltamos
        if (currentDate < new Date(now.toISOString().split('T')[0])) {
          continue;
        }

        const dayStart = new Date(`${date}T${startHour}:00`);
        const dayEnd = new Date(`${date}T${endHour}:00`);

        // Si es hoy, ajustamos la hora de inicio al momento actual
        if (date === now.toISOString().split('T')[0]) {
          if (now > dayStart) {
            dayStart.setTime(now.getTime());
            // Redondear al siguiente slot disponible
            const minutes = dayStart.getMinutes();
            const roundedMinutes = Math.ceil(minutes / 60) * 60;
            dayStart.setMinutes(roundedMinutes);
          }
        }

        // Primera aproximación: Usamos freebusy para obtener los slots ocupados
        let busySlots = [];
        if (dayStart < dayEnd) {
          try {
            const busyResponse = await calendar.freebusy.query({
              requestBody: {
                timeMin: dayStart.toISOString(),
                timeMax: dayEnd.toISOString(),
                items: [{ id: calendarId }]
              }
            });
            busySlots = busyResponse?.data.calendars[calendarId].busy || [];
          } catch (error) {
            console.error(`Error al consultar freebusy API: ${error.message}`);
          }
        }

        // Segunda aproximación: Usar los eventos del día para marcar ocupado
        const dayEvents = busyEvents.filter(event => {
          // Eventos de todo el día
          if (event.start.date === date) return true;
          
          // Eventos con hora específica
          if (event.start.dateTime) {
            const eventDate = new Date(event.start.dateTime);
            return eventDate.toISOString().split('T')[0] === date;
          }
          return false;
        });
        
        // Convertir eventos a rangos ocupados
        const eventBusySlots = dayEvents.map(event => {
          if (event.start.date) {
            // Evento de todo el día
            return {
              start: `${date}T00:00:00Z`,
              end: `${date}T23:59:59Z`
            };
          } else {
            return {
              start: event.start.dateTime,
              end: event.end.dateTime
            };
          }
        });
        
        // Combinar con los rangos bloqueados
        busySlots = [...busySlots, ...eventBusySlots];
        
        // Agregar los rangos bloqueados del día actual
        const dayBlockedRanges = blockedTimeRanges
          .filter(event => event.start.dateTime?.startsWith(date))
          .map(event => ({
            start: event.start.dateTime,
            end: event.end.dateTime
          }));

        busySlots.push(...dayBlockedRanges);

        const availableSlots = [];
        const currentSlot = new Date(dayStart);
        currentSlot.setSeconds(0, 0);

        // Si no hay slots ocupados, simplemente generar todos los slots disponibles
        if (busySlots.length === 0) {
          while (currentSlot < dayEnd) {
            const slotEnd = new Date(currentSlot.getTime() + 60 * 60000);
            slotEnd.setSeconds(0, 0);
            
            availableSlots.push({
              start: this.formatTime(currentSlot),
              end: this.formatTime(slotEnd)
            });
            
            currentSlot.setTime(slotEnd.getTime());
          }
        } else {
          // Si hay slots ocupados, verificar cada slot
          while (currentSlot < dayEnd) {
            const slotEnd = new Date(currentSlot.getTime() + 60 * 60000);
            slotEnd.setSeconds(0, 0);
  
            const isSlotBusy = busySlots.some(busySlot => {
              const busyStart = new Date(busySlot.start);
              const busyEnd = new Date(busySlot.end);
              
              // Verificar si hay solapamiento
              return (currentSlot < busyEnd && slotEnd > busyStart);
            });
  
            if (!isSlotBusy) {
              availableSlots.push({
                start: this.formatTime(currentSlot),
                end: this.formatTime(slotEnd)
              });
            }
  
            currentSlot.setTime(slotEnd.getTime());
            currentSlot.setSeconds(0, 0);
          }
        }

        availabilityByDate[date] = {
          isBlocked: false,
          availableSlots
        };
      }

      return availabilityByDate;
    } catch (error) {
      console.error('Error getting available slots:', error);
      throw new Error('Error al obtener slots disponibles');
    }
  }

  private getDatesInRange(startDate: string, endDate: string): string[] {
    const dates = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
}