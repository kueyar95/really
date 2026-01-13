import { useState } from "react";
import { CalendarGrid } from "./Calendar";
import { CalendarHeader } from "./CalendarHeader";
import { SelectionRange } from "../utils/types";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useGoogleCalendarId } from "@/hooks/useGoogleCalendarId";
import { CreateEventDto } from "@/services/Calendar/types";
import { Skeleton } from "@/components/ui/skeleton";

interface CalendarBaseProps {
  consultationDuration: number;
  startHour?: string;
  endHour?: string;
  onBlockTimeRange?: (range: SelectionRange) => Promise<void>;
}

const DEFAULT_BLOCK_SIZE = 60;

export function CalendarBase({
  consultationDuration,
  startHour,
  endHour,
  onBlockTimeRange
}: CalendarBaseProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [blockSize, setBlockSize] = useState(DEFAULT_BLOCK_SIZE);
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null);

  const { calendarId, isLoading: isLoadingCalendar } = useGoogleCalendarId();
  const { events, createEvent } = useCalendarEvents(calendarId, currentDate);

  const handleBlockTimeRange = async () => {
    if (!selectionRange || !onBlockTimeRange) return;

    try {
      await onBlockTimeRange(selectionRange);
      setSelectionRange(null);
    } catch (error) {
      console.error('Error al bloquear el horario:', error);
    }
  };

  const handleCreateEvent = async (data: CreateEventDto) => {
    if (!calendarId) return;
    await createEvent(data);
  };

  const nextWeek = () => setCurrentDate(date => new Date(date.setDate(date.getDate() + 7)));
  const previousWeek = () => setCurrentDate(date => new Date(date.setDate(date.getDate() - 7)));

  if (isLoadingCalendar || !calendarId) {
    return (
      <div className="space-y-4 bg-white p-4 rounded-lg border">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8" /> {/* Botón anterior */}
            <Skeleton className="h-6 w-40" /> {/* Fecha */}
            <Skeleton className="h-8 w-8" /> {/* Botón siguiente */}
          </div>
          <Skeleton className="h-9 w-32" /> {/* Botón crear evento */}
        </div>

        {/* Calendar Grid Skeleton */}
        <div className="mt-4">
          <div className="grid grid-cols-8 border rounded-lg">
            {/* Columna de horas */}
            <div className="border-r">
              <div className="h-12 border-b" /> {/* Celda vacía superior */}
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-20 border-b px-4 py-2">
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>

            {/* Columnas de días */}
            {Array.from({ length: 7 }).map((_, dayIndex) => (
              <div key={dayIndex} className="border-r last:border-r-0">
                {/* Header del día */}
                <div className="h-12 border-b p-2">
                  <div className="flex flex-col items-center gap-1">
                    <Skeleton className="h-4 w-8" /> {/* Día de semana */}
                    <Skeleton className="h-4 w-6" /> {/* Número */}
                  </div>
                </div>
                {/* Slots de tiempo */}
                {Array.from({ length: 12 }).map((_, slotIndex) => (
                  <div
                    key={slotIndex}
                    className="h-20 border-b last:border-b-0"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-white">
      <CalendarHeader
        onBlockSizeChange={setBlockSize}
        onNextWeek={nextWeek}
        onPreviousWeek={previousWeek}
        currentDate={currentDate}
        onBlockTimeRange={onBlockTimeRange ? handleBlockTimeRange : undefined}
        isRangeSelected={!!selectionRange}
        onCreateEvent={handleCreateEvent}
      />
      <CalendarGrid
        startDate={currentDate}
        events={events}
        blockSize={blockSize}
        consultationDuration={consultationDuration}
        onSelectionChange={onBlockTimeRange ? setSelectionRange : undefined}
        startHour={startHour}
        endHour={endHour}
        onCreateEvent={handleCreateEvent}
      />
    </div>
  );
}