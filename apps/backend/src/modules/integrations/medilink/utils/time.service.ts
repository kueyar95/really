import { Injectable } from '@nestjs/common';

@Injectable()
export class TimeService {
  /**
   * Convierte una fecha Date a formato YYYY-MM-DD
   */
  toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Convierte una hora Date a formato HH:MM
   */
  toTimeString(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Parsea una fecha en formato YYYY-MM-DD
   */
  parseDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  /**
   * Parsea una hora en formato HH:MM y la aplica a una fecha
   */
  parseTime(timeStr: string, baseDate?: Date): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = baseDate ? new Date(baseDate) : new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  /**
   * Combina fecha y hora en un Date
   */
  combineDateAndTime(dateStr: string, timeStr: string): Date {
    const date = this.parseDate(dateStr);
    const [hours, minutes] = timeStr.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  /**
   * Agrega minutos a una fecha/hora
   */
  addMinutes(date: Date, minutes: number): Date {
    const result = new Date(date);
    result.setMinutes(result.getMinutes() + minutes);
    return result;
  }

  /**
   * Calcula la diferencia en minutos entre dos fechas
   */
  diffMinutes(date1: Date, date2: Date): number {
    const diff = Math.abs(date2.getTime() - date1.getTime());
    return Math.floor(diff / (1000 * 60));
  }

  /**
   * Formatea fecha y hora para mostrar
   */
  formatDateTime(date: Date): string {
    const dateStr = this.toDateString(date);
    const timeStr = this.toTimeString(date);
    return `${dateStr} ${timeStr}`;
  }

  /**
   * Obtiene el inicio del día (00:00:00)
   */
  startOfDay(date: Date = new Date()): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * Obtiene el fin del día (23:59:59)
   */
  endOfDay(date: Date = new Date()): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  /**
   * Verifica si una fecha/hora está en el pasado
   */
  isPast(date: Date): boolean {
    return date.getTime() < Date.now();
  }

  /**
   * Verifica si una fecha/hora está en el futuro
   */
  isFuture(date: Date): boolean {
    return date.getTime() > Date.now();
  }

  /**
   * Obtiene el día de la semana en español
   */
  getDayName(date: Date): string {
    const days = [
      'Domingo',
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
    ];
    return days[date.getDay()];
  }

  /**
   * Obtiene el nombre del mes en español
   */
  getMonthName(date: Date): string {
    const months = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    return months[date.getMonth()];
  }

  /**
   * Formatea una fecha en formato legible
   * Ej: "Lunes 15 de Marzo, 2024"
   */
  formatDateReadable(date: Date): string {
    const dayName = this.getDayName(date);
    const day = date.getDate();
    const monthName = this.getMonthName(date);
    const year = date.getFullYear();
    return `${dayName} ${day} de ${monthName}, ${year}`;
  }

  /**
   * Genera rangos de tiempo disponibles
   */
  generateTimeSlots(
    startTime: string,
    endTime: string,
    durationMinutes: number,
    intervalMinutes: number = 0,
  ): string[] {
    const slots: string[] = [];
    const start = this.parseTime(startTime);
    const end = this.parseTime(endTime);
    const slotDuration = durationMinutes + intervalMinutes;

    let current = new Date(start);
    while (current.getTime() + durationMinutes * 60 * 1000 <= end.getTime()) {
      slots.push(this.toTimeString(current));
      current = this.addMinutes(current, slotDuration);
    }

    return slots;
  }

  /**
   * Devuelve la fecha actual en formato YYYY-MM-DD
   */
  getCurrentDate(): string {
    return this.toDateString(new Date());
  }

  /**
   * Suma días a una fecha YYYY-MM-DD y devuelve YYYY-MM-DD
   */
  addDays(dateYmd: string | Date, days: number): string {
    const baseDate = typeof dateYmd === 'string' ? this.parseDate(dateYmd) : new Date(dateYmd);
    const result = new Date(baseDate);
    result.setDate(result.getDate() + days);
    return this.toDateString(result);
  }
}
