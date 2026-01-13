import { Skeleton } from "@/components/ui/skeleton";

export function FunnelSkeleton() {
  return (
    <div className="space-y-6">
      {/* Search input skeleton */}
      <div className="flex justify-end">
        <Skeleton className="h-10 w-96" /> {/* Input de búsqueda */}
      </div>

      {/* Funnels list skeleton */}
      <div className="space-y-3 w-full">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="border-l-4 border-slate-300 bg-white rounded-lg shadow-sm"
          >
            <div className="p-4 mt-5">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-12 w-32 mb-2" /> {/* Nombre del funnel */}
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-3" /> {/* Icono usuarios */}
                    <Skeleton className="h-3 w-16" /> {/* "X etapas" */}
                    <Skeleton className="h-3 w-3" /> {/* Punto */}
                    <Skeleton className="h-3 w-24" /> {/* Fecha creación */}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-24" /> {/* Botón configurar */}
                  <Skeleton className="h-4 w-4" /> {/* Icono expandir */}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}