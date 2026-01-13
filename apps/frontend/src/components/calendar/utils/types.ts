import { CalendarEvent as ServiceCalendarEvent, CreateEventDto } from "@/services/Calendar/types";

export interface SelectionRange {
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
}

export interface CalendarEvent extends Omit<ServiceCalendarEvent, 'date'> {
  date: Date;
}

export interface CalendarDay {
  date: Date;
  isToday: boolean;
  events: CalendarEvent[];
}

export interface CalendarGridProps {
  startDate: Date;
  events: ServiceCalendarEvent[];
  blockSize: number;
  consultationDuration: number;
  onSelectionChange?: (range: SelectionRange | null) => void;
  isLoading?: boolean;
  startHour?: string;
  endHour?: string;
  calendarId?: string;
  onCreateEvent?: (data: CreateEventDto) => Promise<void>;
}