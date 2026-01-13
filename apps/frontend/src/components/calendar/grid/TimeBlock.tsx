import { cn } from "@/lib/utils";
import { CalendarDay } from "../utils/types";
import { EventCard } from "../events/EventCard";
import { format } from "date-fns";
import { CreateEventModal } from "../modals/CreateEventModal";
import { useState } from "react";
import { CreateEventDto } from "@/services/Calendar/types";

interface TimeBlockProps {
  day: CalendarDay;
  time: string;
  blockSize: number;
  isAvailable: boolean;
  isOutside: boolean;
  isNonWorking: boolean;
  isSelected: boolean;
  onMouseDown: () => void;
  onClearSelection: () => void;
  onCreateEvent?: (data: CreateEventDto) => Promise<void>;
}

export function TimeBlock({
  day,
  time,
  blockSize,
  isAvailable,
  isOutside,
  isNonWorking,
  isSelected,
  onMouseDown,
  onClearSelection,
  onCreateEvent
}: TimeBlockProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const event = day.events?.find(e => e.time === time);

  const handleClick = (e: React.MouseEvent) => {
    if (isOutside || isNonWorking || event) return;

    if (e.detail === 2 && onCreateEvent) {
      setShowCreateModal(true);
    } else {
      onMouseDown();
      setTimeout(onClearSelection, 100);
    }
  };

  const handleCreateEvent = async (data: CreateEventDto) => {
    if (onCreateEvent) {
      await onCreateEvent(data);
    }
  };

  return (
    <>
      <div
        className={cn(
          "border-b h-12 transition-all relative",
          isAvailable && !event && !isOutside && !isNonWorking && "cursor-pointer",
          isSelected && "bg-primary/30 border-primary border-2 shadow-md",
          (isOutside || isNonWorking) && "bg-[repeating-linear-gradient(45deg,#f0f0f0,#f0f0f0_10px,#fafafa_10px,#fafafa_20px)] cursor-not-allowed",
          !isOutside && !isNonWorking && !isSelected && !event && "hover:bg-gray-50 hover:border-primary/50"
        )}
        onClick={handleClick}
        onMouseUp={onClearSelection}
      >
        {event && (
          <EventCard
            event={{
              ...event,
              date: format(event.date, 'yyyy-MM-dd')
            }}
            height={`${(event.duration / 60) * (blockSize / 60) * 48}px`}
          />
        )}
      </div>

      {showCreateModal && (
        <CreateEventModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onSubmit={handleCreateEvent}
          defaultDate={format(day.date, 'yyyy-MM-dd')}
          defaultTime={time}
        />
      )}
    </>
  );
}