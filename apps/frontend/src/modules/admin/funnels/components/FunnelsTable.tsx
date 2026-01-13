import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Funnel } from "@/services/Funnels/types";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  Users,
  Settings,
  Search,
  Pencil,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FunnelChannels } from "./FunnelChannels";
import { FunnelSkeleton } from "./FunnelSkeleton";
import { useNavigate } from "react-router-dom";

interface FunnelsTableProps {
  companyId?: string;
  funnels: Funnel[];
  isLoading: boolean;
  refetch: () => void;
}

interface StageType {
  id: string;
  name: string;
  type: string;
  order: number;
  botId?: string | null;
}

export function FunnelsTable({
  companyId,
  funnels,
  isLoading,
}: FunnelsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFunnels, setExpandedFunnels] = useState<Set<string>>(
    new Set()
  );
  const navigate = useNavigate();

  const filteredData = funnels.filter((funnel) =>
    funnel.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFunnel = (funnelId: string) => {
    const newExpanded = new Set(expandedFunnels);
    if (newExpanded.has(funnelId)) {
      newExpanded.delete(funnelId);
    } else {
      newExpanded.add(funnelId);
    }
    setExpandedFunnels(newExpanded);
  };

  // Función para generar un color basado en el ID del funnel
  const generateColor = (id: string) => {
    const colors = [
      "border-slate-300 bg-slate-50/50",
      "border-gray-300 bg-gray-50/50",
      "border-zinc-300 bg-zinc-50/50",
      "border-stone-300 bg-stone-50/50",
      "border-neutral-300 bg-neutral-50/50",
      "border-blue-200 bg-blue-50/30",
    ];
    const index = Math.abs(
      id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    );
    return colors[index % colors.length];
  };

  if (funnels.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
        No hayFunnels para mostrar
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-end gap-4">
        <div className="relative w-full sm:w-96 border border-gray-200 rounded-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar funnel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
      </div>

      {isLoading ? (
        <FunnelSkeleton />
      ) : (
        <div className="space-y-4">
          {filteredData.map((funnel) => {
            const isExpanded = expandedFunnels.has(funnel.id);
            const colorClass = generateColor(funnel.id);

            return (
              <Collapsible
                key={funnel.id}
                open={isExpanded}
                onOpenChange={() => toggleFunnel(funnel.id)}
              >
                <div
                  className={`border-l-4 ${colorClass} bg-white rounded-lg border border-gray-200 transition-all duration-200 hover:border-primary`}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-start">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {funnel.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                              <Users className="h-4 w-4" />
                              <span>{funnel.stages.length} etapas</span>
                              <span>•</span>
                              <span>
                                Creado el{" "}
                                {new Date(
                                  funnel.createdAt
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(
                                `/dashboard/admin/funnels/edit/${funnel.id}`
                              );
                            }}
                          >
                            <Settings className="h-4 w-4" />
                            Configurar
                          </Button>
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-6 pb-6 border-t space-y-6">
                      {/* Sección de etapas */}
                      <div className="pt-4 space-y-4">
                        <h4 className="font-medium text-sm text-gray-700">
                          Etapas del funnel
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {funnel.stages
                            .sort(
                              (a: StageType, b: StageType) => a.order - b.order
                            )
                            .map((stage: StageType) => (
                              <div
                                key={stage.id}
                                className="group relative p-4 border rounded-lg hover:shadow-sm transition-all duration-200 bg-white"
                              >
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                                        <span className="text-sm font-medium text-gray-600">
                                          {stage.order + 1}
                                        </span>
                                      </div>
                                      <span className="font-medium text-gray-900">
                                        {stage.name}
                                      </span>
                                    </div>
                                    <Badge
                                      variant="secondary"
                                      className="text-xs bg-gray-100 text-gray-700"
                                    >
                                      {stage.type}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-b-lg bg-gradient-to-r from-transparent via-gray-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Sección de canales */}
                      <div className="space-y-4 pt-2 border-t">
                        <h4 className="font-medium text-sm text-gray-700 pt-4">
                          Canales asignados
                        </h4>
                        <FunnelChannels
                          funnelId={funnel.id}
                          companyId={companyId!}
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
