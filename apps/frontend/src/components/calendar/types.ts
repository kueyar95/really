export interface CalendarEvent {
  title: string
  date: Date
  time: string
  duration: number
  type: "consultation" | "blocked"
  id: string
}

export interface CalendarDay {
  date: Date
  isToday: boolean
  events?: CalendarEvent[]
}

export interface SelectionRange {
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

export interface CalendarGridProps {
  startDate: Date
  events: CalendarEvent[]
  blockSize: number
  consultationDuration?: number
  onSelectionChange?: (range: SelectionRange | null) => void
  isLoading: boolean
  startHour?: string
  endHour?: string
  calendarId?: string
}
