/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getFunnelsWithBots } from "@/services/Funnels/queries";
import { FunnelWithBots } from "@/services/Funnels/types";
import { AiBot } from "@/services/Bots/types";
import { BotsService, BotWithFunnelInfo } from "@/services/Bots/queries";
import { ManageStagesModal } from "./components/ManageStagesModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateStage } from "@/services/Stages/queries";
import { BotsTable } from "./components/BotsTable";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

type BotFilter = "all" | "assigned" | "unassigned" | string;

export default function AdminBotsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [botFilter, setBotFilter] = useState<BotFilter>("all");
  const [managingStagesBot, setManagingStagesBot] = useState<AiBot | null>(
    null
  );

  const {
    data: funnels,
    isLoading: isLoadingFunnels,
    error: funnelsError,
    refetch: refetchFunnels,
  } = useQuery<FunnelWithBots[]>({
    queryKey: ["funnels-with-bots"],
    queryFn: () => getFunnelsWithBots(user?.company?.id || ""),
    enabled: !!user?.company?.id,
  });

  const {
    data: companyBots,
    isLoading: isLoadingBots,
    error: botsError,
    refetch: refetchBots,
  } = useQuery<BotWithFunnelInfo[]>({
    queryKey: ["company-bots-with-funnels"],
    queryFn: () => BotsService.getCompanyBotsWithFunnels(),
    enabled: !!user?.company?.id,
  });

  const isLoading = isLoadingFunnels || isLoadingBots;
  const hasError = funnelsError || botsError;

  const refetch = () => {
    refetchFunnels();
    refetchBots();
  };

  const assignedBotIds = new Set(
    funnels?.flatMap((f) => f.stages.map((s) => s.botId)).filter(Boolean) || []
  );

  const assignedBots =
    companyBots?.filter((bot) => assignedBotIds.has(bot.id)) || [];
  const unassignedBots =
    companyBots?.filter((bot) => !assignedBotIds.has(bot.id)) || [];

  // Get unique funnel IDs for filtering
  const funnelOptions =
    funnels?.map((funnel) => ({
      id: funnel.id,
      name: funnel.name,
    })) || [];

  const botsToShow = () => {
    switch (botFilter) {
      case "assigned":
        return assignedBots;
      case "unassigned":
        return unassignedBots;
      case "all":
        return companyBots || [];
      default:
        // Filter by funnel ID
        return (
          companyBots?.filter((bot) =>
            bot.funnels?.some((funnel) => funnel.id === botFilter)
          ) || []
        );
    }
  };

  const handleManageStages = async (botId: string, stageIds: string[]) => {
    try {
      // Get current stages assigned to this bot
      const currentStages =
        funnels?.flatMap((f) => f.stages).filter((s) => s.botId === botId) ||
        [];

      const currentStageIds = new Set(currentStages.map((s) => s.id));
      const newStageIds = new Set(stageIds);

      // Find stages to assign and unassign
      const stagesToAssign = stageIds.filter((id) => !currentStageIds.has(id));
      const stagesToUnassign = Array.from(currentStageIds).filter(
        (id) => !newStageIds.has(id)
      );

      // Update all stages
      const updatePromises = [
        ...stagesToAssign.map((stageId) => updateStage(stageId, { botId })),
        ...stagesToUnassign.map((stageId) =>
          updateStage(stageId, { botId: null })
        ),
      ];

      await Promise.all(updatePromises);
      toast({
        title: "Etapas actualizadas",
        description: "Las etapas se han actualizado correctamente.",
      });
      refetch();
    } catch (error) {
      console.error("Error managing stages:", error);
      toast({
        variant: "destructive",
        title: "Error al actualizar etapas",
        description:
          "No se pudieron actualizar las etapas. Por favor, intenta nuevamente.",
      });
    }
  };

  const handleEditBot = (bot: AiBot) => {
    navigate(`/dashboard/admin/bots/edit-bot/${bot.id}`);
  };

  const handleTryBot = (bot: AiBot) => {
    navigate(`/dashboard/admin/bots/try/${bot.id}`);
  };

  if (hasError) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col items-center justify-center gap-4 p-8">
          <div className="text-destructive">
            <XCircle className="h-12 w-12" />
          </div>
          <h3 className="text-xl font-semibold">Error al cargar los datos</h3>
          <p className="text-muted-foreground text-center">
            Ocurrió un error al cargar la información. Por favor, intenta
            nuevamente.
          </p>
          <Button onClick={refetch}>Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">
            Administrador de Agentes
          </h3>
          <p className="text-base text-muted-foreground">
            Conecta y gestiona tus agentes de IA.
          </p>
        </div>
        <Link to="/dashboard/admin/bots/create-bot">
          <Button>
            Crear Agente
            <Plus className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <Select
          value={botFilter}
          onValueChange={(value: BotFilter) => setBotFilter(value)}
        >
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Filtrar bots" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los bots</SelectItem>
            <SelectItem value="assigned">Bots asignados</SelectItem>
            <SelectItem value="unassigned">Bots sin asignar</SelectItem>
            <SelectItem value="divider" disabled>
              <div className="h-px bg-muted my-1" />
            </SelectItem>
            {funnelOptions.map((funnel) => (
              <SelectItem key={funnel.id} value={funnel.id}>
                Funnel: {funnel.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-8">
        {isLoading ? (
          <div className="space-y-5">
            {[1, 2].map((group) => (
              <div key={group} className="space-y-3">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                  <div className="w-4 h-4 rounded-full bg-gray-200 animate-pulse" />
                  <div className="h-5 w-32 bg-gray-200 rounded-md animate-pulse" />
                  <div className="h-4 w-16 bg-gray-200 rounded-full ml-2 animate-pulse" />
                </div>

                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between animate-pulse"
                    style={{ borderLeft: "4px solid #e2e8f0" }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-gray-100">
                        <div className="h-6 w-6 bg-gray-200 rounded" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-5 w-32 bg-gray-200 rounded" />
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-24 bg-gray-200 rounded" />
                          <div className="h-4 w-4 bg-gray-200 rounded-full" />
                          <div className="h-4 w-16 bg-gray-200 rounded" />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-20 bg-gray-200 rounded" />
                          <div className="h-4 w-12 bg-gray-200 rounded-full" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-20 bg-gray-200 rounded" />
                      <div className="h-8 w-24 bg-gray-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <BotsTable
            bots={botsToShow()}
            onEditBot={handleEditBot}
            onTryBot={handleTryBot}
            onManageStages={setManagingStagesBot}
            funnels={funnels || []}
          />
        )}
      </div>

      <ManageStagesModal
        bot={managingStagesBot}
        isOpen={!!managingStagesBot}
        onClose={() => setManagingStagesBot(null)}
        onSave={handleManageStages}
        funnels={funnels || []}
      />
    </div>
  );
}
