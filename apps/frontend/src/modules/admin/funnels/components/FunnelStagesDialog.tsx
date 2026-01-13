import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getStagesByFunnel } from "@/services/Stages/queries";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { CreateStageSheet } from "./CreateStageSheet";
import { useAuth } from "@/contexts/AuthContext";

interface FunnelStagesDialogProps {
  funnelId: string;
  stagesCount: number;
  funnelName: string;
  companyId: string;
}

export function FunnelStagesDialog({
  funnelId,
  stagesCount,
  funnelName,
  companyId,
}: FunnelStagesDialogProps) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const [open, setOpen] = useState(false);

  const { data: stages, isLoading } = useQuery({
    queryKey: ["funnel-stages", funnelId],
    queryFn: () => getStagesByFunnel(funnelId),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {stagesCount} etapas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[600px]">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Etapas de {funnelName}</DialogTitle>
          {isSuperAdmin && (
            <CreateStageSheet funnelId={funnelId} companyId={companyId} />
          )}
        </DialogHeader>
        <div className="mt-4">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {stages?.map((stage) => (
                  <div
                    key={stage.id}
                    className="p-4 rounded-lg border space-y-2 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{stage.name}</h4>
                      <Badge variant={stage.botId ? "default" : "secondary"}>
                        {stage.botId ? stage.bot?.name : "Human"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {stage.description || "Sin descripción"}
                    </p>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">
                        {stage.clientCount || 0} clientes
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(stage.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
