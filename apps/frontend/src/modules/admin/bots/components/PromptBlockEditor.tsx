import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PromptBlock } from "@/services/Bots/types";
import { X, Cog } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditBlockModal } from "./EditBlockModal";
import { BLOCK_CONFIGS } from "@/modules/admin/funnels/templates/defaultBlocks";

interface PromptBlockEditorProps {
  block: PromptBlock;
  index: number;
  onUpdate: (id: string, content: string) => void;
  onRemove: () => void;
  onEditSteps?: () => void;
}

export const BLOCK_EMOJIS: Record<string, string> = {
  personification: "🤖",
  objective: "🎯",
  communication_context: "💭",
  steps_to_follow: "👣",
  possible_cases: "📋",
  predefined_behavior: "⚙️",
  business_info: "🏪",
  products_info: "📦",
  important_info: "ℹ️",
  response_format: "📝",
  dont_do: "⛔",
};

export function PromptBlockEditor({
  block,
  index,
  onUpdate,
  onRemove,
  onEditSteps,
}: PromptBlockEditorProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const emoji = BLOCK_EMOJIS[block.block_identifier] || "📄";
  const config = BLOCK_CONFIGS[block.block_identifier];
  const isStepsBlock = block.block_identifier === "steps_to_follow";

  const handleEditClick = () => {
    if (isStepsBlock && onEditSteps) {
      onEditSteps();
    } else {
      setIsEditModalOpen(true);
    }
  };

  return (
    <>
      <div className="relative h-32">
        <Card
          className={cn(
            "h-full transition-all duration-200 hover:border-primary",
            block.block_content && "border-green-400"
          )}
        >
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{emoji}</span>
                <CardTitle className="text-sm font-medium">
                  {block.block_name}
                </CardTitle>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleEditClick}
                  className="h-6 w-6 hover:bg-muted"
                >
                  <Cog className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onRemove}
                  className="h-6 w-6 hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {block.block_identifier !== "steps_to_follow" ? (
              <pre className="text-xs text-muted-foreground line-clamp-3 font-sans whitespace-pre-wrap">
                {block.block_content}
              </pre>
            ) : (
              <p className="text-xs text-muted-foreground line-clamp-3">
                Describe el flujo de conversación ideal para tu asistente,
                agregando pasos y funciones según sea necesario.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {(!isStepsBlock || !onEditSteps) && (
        <EditBlockModal
          block={block}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={onUpdate}
        />
      )}
    </>
  );
}
