import { CalendarBase } from '@/components/calendar';

export function CalendarPage() {
  return (
    <div className="w-full h-full bg-white">
      <div className="p-8">
        <CalendarBase consultationDuration={30} />
      </div>
    </div>
  )
}
