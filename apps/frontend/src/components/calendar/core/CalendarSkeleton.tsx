import { Skeleton } from "@/components/ui/skeleton"

export function CalendarSkeleton() {
  return (
    <div className="w-full">
      <div className="min-w-[800px] border rounded-lg">
        {/* Header del calendario */}
        <div className="grid grid-cols-[auto_repeat(7,1fr)] border-b">
          <div className="w-20 p-4">
            <Skeleton className="h-6 w-full" />
          </div>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="p-4 text-center border-l">
              <Skeleton className="h-6 w-full" />
            </div>
          ))}
        </div>

        {/* Cuerpo del calendario */}
        <div className="grid grid-cols-[auto_repeat(7,1fr)]">
          {/* Columna de horas */}
          <div className="w-20">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="h-12 border-b px-4">
                <Skeleton className="h-4 w-12 mt-3" />
              </div>
            ))}
          </div>

          {/* Columnas de días */}
          {Array.from({ length: 7 }).map((_, dayIndex) => (
            <div key={dayIndex} className="border-l">
              {Array.from({ length: 24 }).map((_, hourIndex) => (
                <div key={hourIndex} className="border-b h-12">
                  <Skeleton className="h-full w-full opacity-10" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}