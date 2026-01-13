export interface Calendar {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  googleRefreshToken: string;
  googleAccessToken: string;
  startHour: string;
  endHour: string;
}

export enum EventType {
  APPOINTMENT = 'appointment',
  BLOCK = 'block',
  HOLIDAY = 'holiday'
}

export interface CalendarEvent {
  id: string;
  date: string;
  time: string;
  duration: number;
  title: string;
  type: EventType;
  clientId?: string;
  googleCalendarLink?: string;
  description?: string;
}

export interface CreateEventDto {
  title: string;
  date: string;
  startTime: string;
  duration: number;
  type: EventType;
  description?: string;
}

export interface GetEventsResponse {
  success: boolean;
  events: CalendarEvent[];
}

export interface CalendarAuthResponse {
  url: string;
}

export interface CalendarStatusResponse {
  isConnected: boolean;
}

export interface CalendarCallbackResponse {
  success: boolean;
  message: string;
}

export interface CalendarDisconnectResponse {
  success: boolean;
}

export interface GetCalendarIdResponse {
  success: boolean;
  googleCalendarId: string;
  calendarName: string;
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  timeZone?: string;
  backgroundColor?: string;
  primary: boolean;
  isConnected: boolean;
}

export interface ListCalendarsResponse {
  success: boolean;
  calendars: GoogleCalendar[];
}

export interface SelectCalendarResponse {
  success: boolean;
  message: string;
}

export interface DisconnectCalendarResponse {
  success: boolean;
  message: string;
}