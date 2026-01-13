import { AiBot } from "@/services/Bots/types";
import { BotWithFunnelInfo } from "@/services/Bots/queries";
import { Button } from "@/components/ui/button";
import { Bot, Pencil, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FunnelWithBots } from "@/services/Funnels/types";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface BotsTableProps {
  bots: BotWithFunnelInfo[];
  onEditBot: (bot: AiBot) => void;
  onTryBot: (bot: AiBot) => void;
  onManageStages: (bot: AiBot) => void;
  funnels: FunnelWithBots[];
}

// Helper function to generate a distinct color based on string
const generateColorFromString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Using pastel colors for better UI
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 80%)`;
};

export function BotsTable({
  bots,
  onEditBot,
  onTryBot,
  onManageStages,
  funnels,
}: BotsTableProps) {
  // Create a map of funnel colors
  const funnelColors = useMemo(() => {
    const colorMap = new Map<string, string>();
    funnels.forEach((funnel) => {
      colorMap.set(funnel.id, generateColorFromString(funnel.id));
    });
    return colorMap;
  }, [funnels]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Group bots by funnel
  const botsByFunnel = useMemo(() => {
    const grouped = new Map<string, BotWithFunnelInfo[]>();

    // Add a special group for unassigned bots
    grouped.set("unassigned", []);

    // Group bots by funnel
    bots.forEach((bot) => {
      if (!bot.funnels || bot.funnels.length === 0) {
        const unassigned = grouped.get("unassigned") || [];
        unassigned.push(bot);
        grouped.set("unassigned", unassigned);
      } else {
        bot.funnels.forEach((funnel) => {
          if (!grouped.has(funnel.id)) {
            grouped.set(funnel.id, []);
          }
          const funnelBots = grouped.get(funnel.id) || [];
          funnelBots.push(bot);
          grouped.set(funnel.id, funnelBots);
        });
      }
    });

    return grouped;
  }, [bots]);

  if (bots.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
        No hay bots para mostrar
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Display bots grouped by funnel */}
      {Array.from(botsByFunnel.entries()).map(([funnelId, funnelBots]) => {
        if (funnelBots.length === 0) return null;

        const funnel = funnels.find((f) => f.id === funnelId);
        const funnelName = funnel ? funnel.name : "Sin asignar";
        const funnelColor =
          funnelId === "unassigned"
            ? "hsl(0, 0%, 90%)" // Gray for unassigned
            : funnelColors.get(funnelId) || "hsl(0, 0%, 90%)";

        return (
          <div key={funnelId} className="space-y-2">
            <div
              className="flex items-center gap-2 mb-3 pb-2 border-b"
              style={{ borderColor: `${funnelColor}40` }}
            >
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: funnelColor }}
              />
              <h3 className="font-semibold text-base">{funnelName}</h3>
              <Badge variant="outline" className="ml-2 text-xs font-normal">
                {funnelBots.length} {funnelBots.length === 1 ? "bot" : "bots"}
              </Badge>
            </div>

            <div className="space-y-2">
              {funnelBots.map((bot) => (
                <div
                  key={bot.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between hover:border-primary/20 transition-colors group"
                  style={{
                    borderLeft: `4px solid ${funnelColor}`,
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="p-3 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${funnelColor}40` }} // Using 40% opacity
                    >
                      <Bot className="h-6 w-6" style={{ color: funnelColor }} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-medium">{bot.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>AI Model: {bot.mainConfig?.model || "-"}</span>
                        <span>•</span>
                        <span>Temp: {bot.mainConfig?.temperature || "-"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">
                          {formatDate(bot.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={() => onTryBot(bot)}
                    >
                      <Bot className="h-4 w-4" />
                      <span>Probar</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditBot(bot)}
                    >
                      <Pencil className="h-4 w-4" />
                      <span>Editar</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={() => onManageStages(bot)}
                    >
                      <Users className="h-4 w-4" />
                      <span>Gestionar etapas</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
