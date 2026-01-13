import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton() {
  return (
    <div className="space-y-8">
      {/* Grupo de Super Administradores */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-40" /> {/* Título del grupo */}
          <div className="h-px flex-1 bg-gray-100" />
          <Skeleton className="h-5 w-8" /> {/* Contador */}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="border-l-4 border-blue-200 bg-white rounded-lg shadow-sm p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" /> {/* Avatar */}
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" /> {/* Nombre */}
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-3" /> {/* Icono email */}
                      <Skeleton className="h-4 w-40" /> {/* Email */}
                    </div>
                  </div>
                </div>
                <Skeleton className="h-8 w-8" /> {/* Botón de menú */}
              </div>
              <div className="mt-4">
                <Skeleton className="h-6 w-20" /> {/* Badge de rol */}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grupo de Administradores */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-32" />
          <div className="h-px flex-1 bg-gray-100" />
          <Skeleton className="h-5 w-8" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="border-l-4 border-slate-300 bg-white rounded-lg shadow-sm p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-3" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                  </div>
                </div>
                <Skeleton className="h-8 w-8" />
              </div>
              <div className="mt-4">
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}