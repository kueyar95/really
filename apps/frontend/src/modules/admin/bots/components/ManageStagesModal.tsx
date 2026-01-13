import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AiBot } from "@/services/Bots/types";
import { FunnelWithBots } from "@/services/Funnels/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ManageStagesModalProps {
  bot: AiBot | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (botId: string, stageIds: string[]) => Promise<void>;
  funnels: FunnelWithBots[];
}

interface FormData {
  assignedStageIds: string[];
}

export function ManageStagesModal({
  bot,
  isOpen,
  onClose,
  onSave,
  funnels,
}: ManageStagesModalProps) {
  const [formData, setFormData] = useState<FormData>({
    assignedStageIds: [],
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (bot) {
      const currentAssignedStageIds =
        funnels
          ?.flatMap((f) => f.stages)
          .filter((s) => s.botId === bot.id)
          .map((s) => s.id) || [];

      setFormData({
        assignedStageIds: currentAssignedStageIds,
      });
    }
  }, [bot, funnels]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bot) return;

    setIsLoading(true);
    try {
      await onSave(bot.id, formData.assignedStageIds);
      onClose();
    } catch (error) {
      console.error("Error saving stage assignments:", error);
    }
    setIsLoading(false);
  };

  const handleStageToggle = (stageId: string) => {
    setFormData((prev) => {
      const isCurrentlyAssigned = prev.assignedStageIds.includes(stageId);
      return {
        assignedStageIds: isCurrentlyAssigned
          ? prev.assignedStageIds.filter((id) => id !== stageId)
          : [...prev.assignedStageIds, stageId],
      };
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent
        className="sm:max-w-[425px]"
        aria-describedby="manage-stages-modal-description"
      >
        <DialogHeader>
          <DialogTitle>Gestionar Etapas</DialogTitle>
          <DialogDescription id="manage-stages-modal-description">
            Selecciona las etapas que quieres asignar a este bot.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <ScrollArea className="h-[300px] pr-4">
            <Accordion type="single" collapsible className="w-full">
              {funnels.map((funnel) => (
                <AccordionItem key={funnel.id} value={funnel.id.toString()}>
                  <AccordionTrigger className="text-sm">
                    {funnel.name}{" "}
                    <Badge variant="secondary" className="ml-2">
                      {funnel.stages.length}
                    </Badge>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {funnel.stages.map((stage) => (
                        <div
                          key={stage.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`stage-${stage.id}`}
                            checked={formData.assignedStageIds.includes(
                              stage.id
                            )}
                            onCheckedChange={() => handleStageToggle(stage.id)}
                          />
                          <label
                            htmlFor={`stage-${stage.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {stage.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollArea>

          <div className="mt-4 flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
