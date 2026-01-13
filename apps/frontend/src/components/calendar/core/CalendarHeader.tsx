import { Button } from "@/components/ui/button"
import { CalendarOff, Plus } from "lucide-react"
import { useState } from "react"
import { CreateEventModal } from "../modals/CreateEventModal"
import { CreateEventDto } from "@/services/Calendar/types"

interface CalendarHeaderProps {
  onBlockSizeChange: (size: number) => void
  onNextWeek: () => void
  onPreviousWeek: () => void
  currentDate: Date
  onBlockTimeRange?: () => void
  isRangeSelected?: boolean
  onCreateEvent?: (data: CreateEventDto) => Promise<void>
}

export function CalendarHeader({
  onBlockSizeChange,
  onNextWeek,
  onPreviousWeek,
  currentDate,
  onBlockTimeRange,
  isRangeSelected = false,
  onCreateEvent
}: CalendarHeaderProps) {
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric',
      day: 'numeric'
    })
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPreviousWeek}
          >
            ←
          </Button>

          <h2 className="text-lg font-semibold">
            {formatDate(currentDate)}
          </h2>

          <Button
            variant="ghost"
            size="icon"
            onClick={onNextWeek}
          >
            →
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {onCreateEvent && (
            <Button
              variant="outline"
              onClick={() => setShowCreateEventModal(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Crear evento
            </Button>
          )}

          {onBlockTimeRange && (
            <Button
              variant="outline"
              onClick={onBlockTimeRange}
              disabled={!isRangeSelected}
              className="gap-2"
            >
              <CalendarOff className="h-4 w-4" />
              Bloquear horario
            </Button>
          )}

          {/* <Select
            defaultValue="60"
            onValueChange={(value) => onBlockSizeChange(Number(value))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Seleccionar intervalo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 minutos</SelectItem>
              <SelectItem value="30">30 minutos</SelectItem>
              <SelectItem value="60">1 hora</SelectItem>
            </SelectContent>
          </Select> */}
        </div>
      </div>

      {onCreateEvent && (
        <CreateEventModal
          open={showCreateEventModal}
          onOpenChange={setShowCreateEventModal}
          onSubmit={onCreateEvent}
        />
      )}
    </>
  )
}
