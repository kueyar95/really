import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { PromptBlock } from "@/services/Bots/types";
import { BLOCK_CONFIGS } from "@/modules/admin/funnels/templates/defaultBlocks";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EditBlockModalProps {
  block: PromptBlock;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, content: string) => void;
}

export function EditBlockModal({
  block,
  isOpen,
  onClose,
  onSave,
}: EditBlockModalProps) {
  const { toast } = useToast();
  const [content, setContent] = useState(block.block_content);
  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const config = BLOCK_CONFIGS[block.block_identifier];

  useEffect(() => {
    setContent(block.block_content);
    setIsDirty(false);
  }, [block.block_content]);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      await onSave(block.block_identifier, content);
      toast({
        title: "Cambios guardados",
        description: "Los cambios se han guardado correctamente.",
      });
      setIsDirty(false);
      onClose();
    } catch (error) {
      console.error("Error al guardar:", error);
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description:
          "No se pudieron guardar los cambios. Por favor, intenta nuevamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      setShowDiscardDialog(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setIsDirty(false);
    setShowDiscardDialog(false);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleCancel}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{block.block_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {config?.description || "Sin descripción"}
            </p>
            <Textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setIsDirty(true);
              }}
              placeholder={`Escribe el contenido para ${block.block_name}...`}
              className="min-h-[300px] resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar cambios?</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes cambios sin guardar. ¿Estás seguro de que quieres
              descartarlos?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDiscard}>
              Descartar cambios
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
