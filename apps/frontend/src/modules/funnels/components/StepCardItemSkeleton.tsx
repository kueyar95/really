import { Skeleton } from "@/components/ui/skeleton";

export function StepCardItemSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" /> {/* Nombre */}
          <Skeleton className="h-4 w-28" /> {/* Teléfono */}
        </div>
        <Skeleton className="h-4 w-20" /> {/* Fecha */}
      </div>
      <Skeleton className="h-4 w-full" /> {/* Mensaje */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-32" /> {/* Respondido por */}
      </div>
    </div>
  );
}