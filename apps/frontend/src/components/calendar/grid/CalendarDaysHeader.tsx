import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { CalendarDay } from '../utils/types';

interface CalendarDaysHeaderProps {
  days: CalendarDay[]
  workDays?: string[]
}

const DAYS_OF_WEEK = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado"
]

export function CalendarDaysHeader({ days, workDays = [] }: CalendarDaysHeaderProps) {
  const isWorkDay = (date: Date) => {
    const dayName = DAYS_OF_WEEK[date.getDay()];
    return workDays.includes(dayName);
  }

  return (
    <div className="grid grid-cols-[auto_repeat(7,1fr)] border-b">
      <div className="w-20 border-r" />
      {days.map((day, i) => (
        <div key={i} className={cn(
          "py-3 text-center font-medium",
          !isWorkDay(day.date) && "text-muted-foreground line-through"
        )}>
          <div>{format(day.date, "EEE", { locale: es })}</div>
          <div className={cn(
            "w-8 h-8 mx-auto flex items-center justify-center rounded-full",
            day.isToday && "bg-primary text-primary-foreground"
          )}>
            {format(day.date, "d")}
          </div>
        </div>
      ))}
    </div>
  )
}