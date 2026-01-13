import { useState } from 'react';
import { LockIcon, Scissors } from 'lucide-react'
import { cn } from "@/lib/utils"
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PatientDetails } from './PatientDetails';
import { CalendarEvent } from '../types';

interface EventBadgeProps {
  event: CalendarEvent
  height: string
  onClick?: (event: CalendarEvent) => void
  onEventClick?: () => void
  style?: React.CSSProperties
}

export function EventBadge({ event, height, onClick, onEventClick, style }: EventBadgeProps) {
  const [shouldFetch, setShouldFetch] = useState(false);


  if (event.type === "blocked") {
    return (
      <Button
        variant="default"
        className={cn(
          "w-[calc(100%)] absolute z-20 shadow-lg",
          "text-[10px] font-semibold text-white p-0",
          "bg-gray-500 hover:bg-gray-600"
        )}
        style={{ height, ...style }}
      >
        <div className="flex items-center justify-between w-full px-2 h-full text-xs">
          <LockIcon className="!w-6 !h-6 bg-white rounded-full p-1 text-gray-500 text-xl shrink-0"/>
          <span className="truncate">{event.title}</span>
        </div>
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={event.type === "consultation" ? "secondary" : "default"}
          className={cn(
            "w-[calc(100%)] absolute z-20 shadow-lg border-l-2 border-blue-500",
            "text-[10px] font-semibold text-white p-0",
            "bg-blue-500 hover:bg-blue-600",
          )}
          style={{ height, ...style }}
          onClick={() => {
            setShouldFetch(true);
            onClick?.(event);
            onEventClick?.();
          }}
        >
          <div className="flex items-center justify-between w-full pr-2  h-full text-xs">
            <Scissors className="!w-6 !h-6 bg-slate-50 rounded-l p-1 text-blue-400 text-xl shrink-0"/>
            <span className="truncate">{event.title}</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        {shouldFetch && <PatientDetails patient={{ nombre: "Juan", paterno: "Perez", materno: "Gonzalez", email: "juan@gmail.com" }} isLoading={false} />}
      </PopoverContent>
    </Popover>
  )
}