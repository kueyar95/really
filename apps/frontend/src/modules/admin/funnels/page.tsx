import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from "@tanstack/react-query";
import { getFunnels } from "@/services/Funnels/queries";
import { Button } from "@/components/ui/button";
import { Plus, XCircle } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { FunnelsTable } from "./components/FunnelsTable";
import { FunnelSkeleton } from "./components/FunnelSkeleton";

export default function FunnelsPage() {
  const { user } = useAuth();
  const params = useParams();
  const companyId = user?.role === 'super_admin' ? String(params.companyId) : user?.company.id;
  const isSuperAdmin = user?.role === 'super_admin';

  const { data: funnels, isLoading, error, refetch } = useQuery({
    queryKey: ["funnels", companyId],
    queryFn: () => getFunnels({ companyId: companyId! }),
    enabled: !!companyId,
  });

  if (error) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col items-center justify-center gap-4 p-8">
          <div className="text-destructive">
            <XCircle className="h-12 w-12" />
          </div>
          <h3 className="text-xl font-semibold">Error al cargar los datos</h3>
          <p className="text-muted-foreground text-center">
            Ocurrió un error al cargar la información. Por favor, intenta nuevamente.
          </p>
          <Button onClick={() => refetch()}>Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">
            Administrador de Funnels
          </h3>
          <p className="text-base text-muted-foreground">
            Gestiona y optimiza tus funnels de conversión.
            {funnels && (
              <span className="ml-2 text-sm text-muted-foreground">
                ({funnels.length} {funnels.length === 1 ? 'funnel' : 'funnels'})
              </span>
            )}
          </p>
        </div>
        {!isSuperAdmin && (
          <Link to="/dashboard/admin/funnels/create">
            <Button>
              Crear Funnel
              <Plus className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        )}
      </div>

      {isLoading ? (
        <FunnelSkeleton />
      ) : (
        <FunnelsTable
          companyId={companyId}
          funnels={funnels || []}
          isLoading={isLoading}
          refetch={refetch}
        />
      )}
    </div>
  );
}