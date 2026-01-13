import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PromptCategory } from "../types/promptTypes";
import { Draggable } from "@hello-pangea/dnd";
import {
  Bot,
  MessageCircle,
  Settings,
  FileText,
  List,
  Building,
  X
} from "lucide-react";

interface PromptCategoryEditorProps {
  category: PromptCategory;
  index: number;
  onUpdate: (id: string, content: string) => void;
  onRemove: () => void;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  personification: Bot,
  possible_cases: MessageCircle,
  services_info: Settings,
  response_format: FileText,
  step_by_step: List,
  company_context: Building,
};

export function PromptCategoryEditor({
  category,
  index,
  onUpdate,
  onRemove,
}: PromptCategoryEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(category.content || category.defaultText);

  const Icon = CATEGORY_ICONS[category.id] || Bot;

  const handleSave = () => {
    onUpdate(category.id, content);
    setIsEditing(false);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Solo abrir si el clic no fue en el botón de eliminar
    if (!(e.target as HTMLElement).closest('button')) {
      setIsEditing(true);
    }
  };

  return (
    <Draggable draggableId={category.id} index={index}>
      {(provided, snapshot) => (
        <Card
          className={`
            h-full
            bg-white
            ${snapshot.isDragging
              ? 'shadow-md ring-1 ring-primary/20'
              : 'shadow-sm hover:shadow-md'
            }
          `}
          ref={provided.innerRef}
          {...provided.draggableProps}
          style={{
            ...provided.draggableProps.style,
            transform: snapshot.isDragging
              ? provided.draggableProps.style?.transform
              : 'none',
            zIndex: snapshot.isDragging ? 50 : 'auto',
          }}
          onClick={handleCardClick}
        >
          <div
            className="p-3 flex items-center justify-between cursor-grab"
            {...provided.dragHandleProps}
          >
            <div className="flex flex-col items-center gap-1 h-full justify-center flex-1 mt-2">
              <Icon className="w-8 h-8 text-primary" />
              <h3 className="text-sm font-medium text-center">{category.title}</h3>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-1 hover:bg-gray-100 rounded-full absolute top-2 right-2"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {isEditing && (
            <div className="border-t p-3">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[150px] text-sm mb-2"
                placeholder={category.defaultText}
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSave();
                  }}
                >
                  Guardar
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </Draggable>
  );
}