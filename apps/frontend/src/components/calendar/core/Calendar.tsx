import { format, startOfWeek, addDays, parse } from "date-fns"
import { CalendarDaysHeader } from "../grid/CalendarDaysHeader"
import { TimeColumn } from "../grid/TimeColumn"
import { CalendarGridProps, CalendarDay, CalendarEvent } from "../utils/types"
import { createTimeBlocks, createAvailableBlocks } from "../utils/utils"
import { CalendarSkeleton } from "./CalendarSkeleton"
import { TimeBlock } from "../grid/TimeBlock"
import { useTimeBlockSelection } from '@/hooks/useTimeBlockSelection'

const DAYS_OF_WEEK = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado"
]

export function CalendarGrid({
  startDate,
  events,
  blockSize,
  consultationDuration = 30,
  onSelectionChange,
  isLoading,
  startHour,
  endHour,
  onCreateEvent
}: CalendarGridProps) {

  const workDays = {
    indices: [0, 1, 2, 3, 4, 5, 6],
    names: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
  }

  const timeBlocks = createTimeBlocks(blockSize)
  const availableBlocks = createAvailableBlocks(consultationDuration)

  const {
    handleBlockMouseDown,
    isBlockSelected,
    clearSelection
  } = useTimeBlockSelection({
    availableBlocks,
    blockSize,
    onSelectionChange
  });

  if (isLoading) {
    return <CalendarSkeleton />
  }

  const weekStart = startOfWeek(startDate, { weekStartsOn: 1 })
  const days: CalendarDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const dateStr = format(date, 'yyyy-MM-dd');

    const dayEvents: CalendarEvent[] = events
      .filter(event => event.date === dateStr)
      .map(event => ({
        ...event,
        date: parse(event.date, 'yyyy-MM-dd', new Date())
      }));

    return {
      date,
      isToday: format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'),
      events: dayEvents
    };
  });

  const isNonWorkingDay = (date: Date) => {
    if (!workDays) return false;
    const dayName = DAYS_OF_WEEK[date.getDay()];
    return !workDays.names.includes(dayName);
  }

  const isOutsideWorkingHours = (time: string) => {
    const effectiveStartHour = startHour
    const effectiveEndHour = endHour

    if (!effectiveStartHour || !effectiveEndHour) return false;
    return time < effectiveStartHour || time > effectiveEndHour;
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[800px] border rounded-lg">
        <CalendarDaysHeader days={days} workDays={workDays.names} />
        <div className="grid grid-cols-[auto_repeat(7,1fr)]">
          <TimeColumn timeBlocks={timeBlocks} />
          {days.map((day) => (
            <div key={day.date.toISOString()} className="border-r relative">
              {timeBlocks.map(time => (
                <TimeBlock
                  key={time}
                  day={day}
                  time={time}
                  blockSize={blockSize}
                  isAvailable={availableBlocks.includes(time)}
                  isOutside={isOutsideWorkingHours(time)}
                  isNonWorking={isNonWorkingDay(day.date)}
                  isSelected={isBlockSelected(day.date, time)}
                  onMouseDown={() => handleBlockMouseDown(day.date, time)}
                  onClearSelection={clearSelection}
                  onCreateEvent={onCreateEvent}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

