import { useEffect } from "react";
import { getFunnels } from "@/services/Funnels/queries";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useStageEvents } from "@/hooks/useStageEvents";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getStagesByFunnel } from "@/services/Stages/queries";
import { StepCardSkeleton } from "../funnels/components/StepCardSkeleton";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { StepCard } from "../funnels/components/StepCard";

export function Leads() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedFunnelId =
    searchParams.get("id") ||
    localStorage.getItem("lastSelectedFunnelId") ||
    null;
  const { toast } = useToast();

  const { data: funnels } = useQuery({
    queryKey: ["funnels", user?.company_id],
    queryFn: () => getFunnels({ companyId: user!.company_id }),
  });

  const {
    data: stages,
    isLoading: isLoadingStages,
    refetch: refetchStages,
  } = useQuery({
    queryKey: ["stages", selectedFunnelId],
    queryFn: async () => {
      return await getStagesByFunnel(String(selectedFunnelId));
    },
    enabled: !!selectedFunnelId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (funnels && funnels.length > 0 && !selectedFunnelId) {
      const firstFunnelId = funnels[0].id.toString();
      navigate(`/dashboard/leads?id=${firstFunnelId}`, { replace: true });
      localStorage.setItem("lastSelectedFunnelId", firstFunnelId);
    }
  }, [funnels, selectedFunnelId, navigate]);

  const handleFunnelChange = (value: string) => {
    navigate(`/dashboard/leads?id=${value}`);
    localStorage.setItem("lastSelectedFunnelId", value);
  };

  useStageEvents({
    funnelId: selectedFunnelId ? String(selectedFunnelId) : "",
    onNewClient: async (client) => {
      toast({
        title: "Nuevo cliente",
        description: `${client.name} ha sido agregado al funnel`,
      });
      await refetchStages();
    },
    onClientMoved: async (data) => {
      toast({
        title: "Cliente movido",
        description: `${data.client.name} ha sido movido a una nueva etapa`,
      });
      await refetchStages();
    },
  });

  return (
    <div className="mx-auto w-full py-4 md:py-6 lg:py-8">
      <div className="px-4 mb-4 md:px-6 lg:px-8 flex items-center gap-4 justify-between">
        <Select
          value={selectedFunnelId || ""}
          onValueChange={handleFunnelChange}
        >
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Selecciona un funnel" />
          </SelectTrigger>
          <SelectContent>
            {funnels?.map((funnel) => (
              <SelectItem key={funnel.id} value={funnel.id.toString()}>
                {funnel.name}
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

      {isLoadingStages && (
        <div className="h-fit overflow-x-scroll overflow-y-hidden">
          <div className="w-fit flex gap-4 px-4 pb-2 md:px-6 lg:px-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <StepCardSkeleton key={i} />
            ))}
          </div>
        </div>
      )}

      <div className="h-fit overflow-x-scroll overflow-y-hidden">
        <div className="w-fit flex gap-4 px-4 pb-2 md:px-6 lg:px-8">
          {isLoadingStages
            ? Array.from({ length: 3 }).map((_, i) => (
                <StepCardSkeleton key={i} />
              ))
            : stages?.map((stage) => {
                const hasBotId = !!stage.botId && stage.botId !== "";
                const botIdToPass = hasBotId ? String(stage.botId) : null;

                return (
                  <StepCard
                    key={stage.id}
                    id={stage.id.toString()}
                    respondedBy={hasBotId ? "bot" : "human"}
                    title={stage.name}
                    description={stage.description || ""}
                    quantity={stage.clientStages?.length || 0}
                    botId={botIdToPass}
                  />
                );
              })}
        </div>
      </div>
    </div>
  );
}
