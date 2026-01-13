import { CalendarEvent } from "@/services/Calendar/types";
import { cn } from "@/lib/utils";
import { Calendar, Clock, MapPin, User } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface EventCardProps {
  event: CalendarEvent;
  height: string;
}

export function EventCard({ event, height }: EventCardProps) {
  const getEventStyles = () => {
    switch (event.type) {
      case 'appointment':
        return {
          container: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
          title: 'text-blue-700',
          time: 'text-blue-600'
        };
      case 'block':
        return {
          container: 'bg-gray-50 border-gray-200 hover:bg-gray-100',
          title: 'text-gray-700',
          time: 'text-gray-600'
        };
      case 'holiday':
        return {
          container: 'bg-red-50 border-red-200 hover:bg-red-100',
          title: 'text-red-700',
          time: 'text-red-600'
        };
      default:
        return {
          container: 'bg-gray-50 border-gray-200',
          title: 'text-gray-700',
          time: 'text-gray-600'
        };
    }
  };

  const styles = getEventStyles();
  const isShortEvent = parseInt(height) < 40; // Consideramos evento corto si es menor a 40px

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div
          className={cn(
            "absolute inset-x-0 flex flex-col p-1 border rounded-md cursor-pointer transition-colors min-h-[24px] overflow-hidden",
            styles.container,
            isShortEvent && "justify-center items-start"
          )}
          style={{ height }}
        >
          {isShortEvent ? (
            <div className="flex items-center gap-1 w-full">
              <span className={cn("text-xs font-medium truncate flex-1", styles.title)}>
                {event.title}
              </span>
              <span className={cn("text-xs whitespace-nowrap", styles.time)}>
                {event.time}
              </span>
            </div>
          ) : (
            <>
              <div className={cn("text-xs font-medium truncate", styles.title)}>
                {event.title}
              </div>
              <div className={cn("text-xs truncate", styles.time)}>
                {event.time}
              </div>
            </>
          )}
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 opacity-70" />
            <span className="text-sm font-semibold">{event.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 opacity-70" />
            <span className="text-sm">
              {event.time} ({event.duration} minutos)
            </span>
          </div>
          {event.clientId && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 opacity-70" />
              <span className="text-sm">Cliente ID: {event.clientId}</span>
            </div>
          )}
          {event.description && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 opacity-70 mt-0.5" />
              <span className="text-sm">{event.description}</span>
            </div>
          )}
          {event.googleCalendarLink && (
            <a
              href={event.googleCalendarLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline block mt-2"
            >
              Ver en Google Calendar
            </a>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}