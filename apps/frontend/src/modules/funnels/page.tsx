import { StepCard } from "@/modules/funnels/components/StepCard";
import { useEffect } from "react";
import { getFunnels } from "@/services/Funnels/queries";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStageEvents } from "@/hooks/useStageEvents";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getStagesByFunnel,
  getFunnelChannels,
} from "@/services/Stages/queries";
import { StepCardSkeleton } from "./components/StepCardSkeleton";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Stage } from "@/services/Stages/types";

export function Stages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedFunnelId =
    searchParams.get("id") ||
    localStorage.getItem("lastSelectedFunnelId") ||
    null;
  const { toast } = useToast();

  const { data: funnels, isLoading: isLoadingFunnels } = useQuery({
    queryKey: ["funnels", user?.company_id],
    queryFn: () => getFunnels({ companyId: user!.company_id }),
  });

  const {
    data: stages,
    isLoading: isLoadingStages,
    refetch: refetchStages,
  } = useQuery({
    queryKey: ["stages", selectedFunnelId],
    queryFn: () => getStagesByFunnel(selectedFunnelId || ""),
    enabled: !!selectedFunnelId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Obtener los canales del funnel
  const { data: funnelChannels } = useQuery({
    queryKey: ["funnel-channels", selectedFunnelId],
    queryFn: () => getFunnelChannels(selectedFunnelId || ""),
    enabled: !!selectedFunnelId,
  });


  // Efecto para seleccionar automáticamente el primer funnel cuando se carga la página
  useEffect(() => {
    if (funnels && funnels.length > 0 && !selectedFunnelId) {
      const firstFunnelId = funnels[0].id.toString();
      navigate(`/dashboard/stages?id=${firstFunnelId}`, { replace: true });
      localStorage.setItem("lastSelectedFunnelId", firstFunnelId);
    }
  }, [funnels, selectedFunnelId, navigate]);

  const handleFunnelChange = (value: string) => {
    navigate(`/dashboard/stages?id=${value}`);
    localStorage.setItem("lastSelectedFunnelId", value);
  };

  // Configurar eventos de etapas en tiempo real
  useStageEvents({
    funnelId: selectedFunnelId ? selectedFunnelId : "",
    onNewClient: async (client) => {
      toast({
        title: "Nuevo cliente en etapa",
        description: `${client.name} ha sido agregado a la etapa`,
      });
      await refetchStages();
    },
    onClientMoved: async (data) => {
      toast({
        title: "Cliente movido de etapa",
        description: `${data.client.name} ha sido movido a una nueva etapa`,
      });
      await refetchStages();
    },
  });

  return (
    <div className="mx-auto w-full py-4 md:py-6 lg:py-8">
      <div className="px-4 mb-8 md:px-6 lg:px-8">
        <div className="flex flex-col gap-2 mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Selecciona un Pipeline
          </h3>
          <p className="text-sm text-muted-foreground">
            Visualiza y gestiona las etapas de tu pipeline de ventas
          </p>
        </div>

        <div className="flex items-center gap-6 justify-between">
          <Select
            value={selectedFunnelId || undefined}
            onValueChange={handleFunnelChange}
            disabled={isLoadingFunnels}
          >
            <SelectTrigger className="w-[400px] h-[50px] bg-white">
              <SelectValue
                placeholder={
                  isLoadingFunnels
                    ? "Cargando pipelines..."
                    : funnels?.length === 0
                    ? "No hay pipelines disponibles"
                    : "Selecciona un pipeline"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {funnels?.map((funnel) => (
                <SelectItem
                  key={funnel.id}
                  value={funnel.id.toString()}
                  className="py-3"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{funnel.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {funnel.stages?.length || 0} etapas
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {user?.role === "admin" && (
            <Button onClick={() => navigate("/dashboard/admin/funnels/create")}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear Pipeline
            </Button>
          )}
        </div>
      </div>

      <div className="h-full overflow-x-scroll overflow-y-hidden">
        <div className="w-fit flex gap-4 px-4 pb-2 md:px-6 lg:px-8">
          {isLoadingStages
            ? Array.from({ length: 3 }).map((_, i) => (
                <StepCardSkeleton key={i} />
              ))
            : stages?.map((stage: Stage) => (
                <StepCard
                  key={stage.id}
                  id={stage.id.toString()}
                  respondedBy={stage.botId ? "bot" : "human"}
                  title={stage.name}
                  description={stage.description || ""}
                  quantity={stage.clientStages?.length || 0}
                  botId={stage.botId}
                  notificationEmails={stage.notificationEmails || []}
                />
              ))}
        </div>
      </div>
    </div>
  );
}
