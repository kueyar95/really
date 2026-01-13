export class DateUtil {
  static readonly TIMEZONE = 'America/Santiago';
  static readonly LOCALE = 'es-CL';

  static createDateTime(date: string, time: string): Date {
    return new Date(`${date}T${time}:00-03:00`);
  }

  static formatTime(date: Date): string {
    return date.toLocaleTimeString(this.LOCALE, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: this.TIMEZONE
    });
  }

  static formatDate(date: Date): string {
    return date.toLocaleDateString(this.LOCALE, {
      timeZone: this.TIMEZONE
    });
  }

  static formatDateTime(date: Date): string {
    return date.toLocaleString(this.LOCALE, {
      timeZone: this.TIMEZONE,
      hour12: false
    });
  }

  static addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60000);
  }

  static isSameOrBefore(date1: Date, date2: Date): boolean {
    return date1 <= date2;
  }

  static isSameOrAfter(date1: Date, date2: Date): boolean {
    return date1 >= date2;
  }
}