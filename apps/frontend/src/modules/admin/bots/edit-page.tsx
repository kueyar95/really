/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AiBot, PromptBlock, Step } from "@/services/Bots/types";
import { Trash2, Loader2, ArrowLeft, Bot } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { PromptBlocksContainer } from "./components/PromptBlocksContainer";
import { Separator } from "@/components/ui/separator";
import { BLOCK_CONFIGS } from "@/modules/admin/funnels/templates/defaultBlocks";
import { useNavigate, useParams } from "react-router-dom";
import { BotsService } from "@/services/Bots/queries";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Extender el tipo AiBot para el DTO de actualización
// type UpdateBotDto = Omit<Partial<AiBot>, "steps"> & {
//   steps?: Step[] | null;
// };

interface FormData {
  name: string;
  mainConfig: {
    model: string;
    maxTokens: number;
    temperature: number;
  };
}

export default function EditBotPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    mainConfig: {
      model: "",
      maxTokens: 0,
      temperature: 0,
    },
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeletingDialog, setShowDeletingDialog] = useState(false);
  const [deleteStep, setDeleteStep] = useState<string>("");
  const [promptBlocks, setPromptBlocks] = useState<PromptBlock[]>([]);
  // Estado para controlar la visibilidad de las opciones de configuración del LLM
  const [isEditingSteps, setIsEditingSteps] = useState(false);

  const { data: bot, isLoading: isBotLoading } = useQuery<AiBot>({
    queryKey: ["bot", id],
    queryFn: () => BotsService.getBot(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (bot) {
      setFormData({
        name: bot.name,
        mainConfig: {
          model: bot.mainConfig?.model || "",
          maxTokens: bot.mainConfig?.maxTokens || 0,
          temperature: bot.mainConfig?.temperature || 0,
        },
      });

      // Convertir los steps del bot a un bloque de steps
      const blocks = [...(bot.sysPrompt || [])];
      const stepsBlockIndex = blocks.findIndex(
        (block) => block.block_identifier === "steps_to_follow"
      );

      if (bot.steps && bot.steps.length > 0) {
        try {
          const stepsBlock = {
            block_identifier: "steps_to_follow",
            block_name: BLOCK_CONFIGS.steps_to_follow.block_name,
            block_content: JSON.stringify(bot.steps, null, 2),
          };

          if (stepsBlockIndex >= 0) {
            blocks[stepsBlockIndex] = stepsBlock;
          } else {
            blocks.push(stepsBlock);
          }
        } catch (error) {
          console.error("Error stringifying steps:", error);
          // En caso de error, crear un bloque con array vacío
          const stepsBlock = {
            block_identifier: "steps_to_follow",
            block_name: BLOCK_CONFIGS.steps_to_follow.block_name,
            block_content: "[]",
          };

          if (stepsBlockIndex >= 0) {
            blocks[stepsBlockIndex] = stepsBlock;
          } else {
            blocks.push(stepsBlock);
          }
        }
      } else {
        // Si no hay pasos, asegurarse de que haya un bloque con array vacío
        const stepsBlock = {
          block_identifier: "steps_to_follow",
          block_name: BLOCK_CONFIGS.steps_to_follow.block_name,
          block_content: "[]",
        };

        if (stepsBlockIndex >= 0) {
          blocks[stepsBlockIndex] = stepsBlock;
        } else {
          blocks.push(stepsBlock);
        }
      }

      setPromptBlocks(blocks);
    }
  }, [bot]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !bot) return;

    setIsLoading(true);
    try {
      // Find the steps block if it exists
      const stepsBlock = promptBlocks.find(
        (block) => block.block_identifier === "steps_to_follow"
      );

      let parsedSteps: Step[] | null = null;
      if (stepsBlock && stepsBlock.block_content) {
        try {
          // Si el contenido está vacío o es solo espacios en blanco, tratarlo como un array vacío
          const content = stepsBlock.block_content.trim();
          if (!content || content === "[]") {
            parsedSteps = [];
          } else {
            const steps = JSON.parse(content);
            if (Array.isArray(steps)) {
              // Validar la estructura de cada paso
              const validSteps = steps.every(
                (step) =>
                  typeof step === "object" &&
                  typeof step.text === "string" &&
                  typeof step.number === "number" &&
                  Array.isArray(step.functions)
              );

              if (validSteps) {
                parsedSteps = steps;
              } else {
                toast({
                  variant: "destructive",
                  title: "Error de validación",
                  description:
                    "El formato de los pasos no es válido. Por favor, revisa la configuración.",
                });
                setIsLoading(false);
                return;
              }
            }
          }
        } catch (error) {
          console.error("Error parsing steps:", error);
          toast({
            variant: "destructive",
            title: "Error de validación",
            description:
              "El formato de los pasos no es válido. Por favor, revisa la configuración.",
          });
          setIsLoading(false);
          return;
        }
      }

      const updateDto: Partial<AiBot> = {
        name: formData.name,
        mainConfig: {
          model: formData.mainConfig.model,
          maxTokens: formData.mainConfig.maxTokens,
          temperature: formData.mainConfig.temperature,
        },
        sysPrompt: promptBlocks.map((block) => ({
          block_identifier: block.block_identifier,
          block_content: block.block_content || "",
        })),
        // Si no hay pasos válidos, omitimos el campo
        ...(parsedSteps ? { steps: parsedSteps } : {}),
      };

      // Actualizar el bot primero
      await BotsService.updateBot(id, updateDto);
      toast({
        title: "Bot actualizado",
        description: "El bot se ha actualizado correctamente.",
      });
      navigate("/dashboard/admin/bots");
    } catch (error: any) {
      console.error("Error updating bot:", error);
      let errorMessage = "No se pudo actualizar el bot. ";

      if (error.response) {
        // Error de respuesta del servidor
        switch (error.response.status) {
          case 400:
            errorMessage +=
              "Los datos enviados no son válidos. Por favor, verifica la información.";
            console.error("Detalles del error:", error.response.data);
            break;
          case 401:
            errorMessage += "No tienes autorización para realizar esta acción.";
            break;
          case 404:
            errorMessage += "No se encontró el bot especificado.";
            break;
          default:
            errorMessage += "Por favor, intenta nuevamente.";
        }
      } else if (error.request) {
        // Error de red
        errorMessage +=
          "No se pudo conectar con el servidor. Verifica tu conexión.";
      } else {
        errorMessage += "Por favor, intenta nuevamente.";
      }

      toast({
        variant: "destructive",
        title: "Error al actualizar el bot",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    setIsDeleting(true);
    setShowDeletingDialog(true);
    try {
      setDeleteStep("Eliminando bot...");
      await BotsService.deleteBot(id);

      setDeleteStep("¡Bot eliminado exitosamente!");
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Pequeña pausa para mostrar el mensaje de éxito

      toast({
        title: "Bot eliminado",
        description: "El bot se ha eliminado correctamente.",
      });
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setShowDeletingDialog(false);
      navigate("/dashboard/admin/bots");
    } catch (error: any) {
      console.error("Error deleting bot:", error);
      toast({
        variant: "destructive",
        title: "Error al eliminar el bot",
        description:
          error.response?.data?.message ||
          "No se pudo eliminar el bot. Por favor, intenta nuevamente.",
      });
      setIsDeleting(false);
      setShowDeletingDialog(false);
    }
  };

  if (isBotLoading) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="text-center">
          <h3 className="text-2xl font-bold">Bot no encontrado</h3>
          <Button
            onClick={() => navigate("/dashboard/admin/bots")}
            className="mt-4"
          >
            Volver a la lista de bots
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h3 className="text-2xl font-bold tracking-tight">
              Editar Bot: {bot.name}
            </h3>
          </div>
          <div>
            <Button
              variant="outline"
              onClick={() => navigate(`/dashboard/admin/bots/try/${id}`)}
            >
              <Bot className="h-4 w-4 mr-2" />
              Probar Bot
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="border rounded-md bg-white"
                autoComplete="off"
              />
            </div>
          </div>

          <Separator />

          <div>
            <Label>Configuración del prompt</Label>
            <PromptBlocksContainer
              initialBlocks={promptBlocks}
              onChange={setPromptBlocks}
              onEditingStepsChange={setIsEditingSteps}
            />
          </div>

          {!isEditingSteps && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxTokens">Max Tokens</Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    min="100"
                    max="10000"
                    value={formData.mainConfig?.maxTokens}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        mainConfig: {
                          ...formData.mainConfig,
                          maxTokens: parseInt(e.target.value),
                        },
                      })
                    }
                    className="border rounded-md bg-white"
                  />
                </div>
                <div>
                  <Label htmlFor="temperature">Temperature</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={formData.mainConfig?.temperature}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        mainConfig: {
                          ...formData.mainConfig,
                          temperature: parseFloat(e.target.value),
                        },
                      })
                    }
                    className="border rounded-md bg-white"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="model">Modelo LLM</Label>
                <Select
                  value={formData.mainConfig?.model}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      mainConfig: {
                        ...formData.mainConfig,
                        model: value,
                      },
                    })
                  }
                >
                  <SelectTrigger id="model" className="border rounded-md">
                    <SelectValue placeholder="Selecciona un modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                    <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
                    <SelectItem value="o1">o1</SelectItem>
                    <SelectItem value="o1-mini">o1-mini</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-between items-center">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar Bot
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/dashboard/admin/bots")}
                    type="button"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading}>
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
              </div>
            </>
          )}
        </form>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mt-4">
                Esta acción no se puede deshacer. Para confirmar, escribe el
                nombre del funnel en minúsculas:{" "}
                <span className="font-medium">{bot.name.toLowerCase()}</span>
              </p>
              <Input
                id="confirmDelete"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="Escribe el nombre en minúsculas"
                className="mt-2 border rounded-md focus:border-primary text-primary"
                autoComplete="off"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={
                deleteConfirmation.toLowerCase() !== bot.name.toLowerCase() ||
                isDeleting
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar Bot"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de progreso de eliminación */}
      <Dialog open={showDeletingDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminando Bot</DialogTitle>
            <DialogDescription className="space-y-4">
              <div className="flex items-center gap-3 mt-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-sm">{deleteStep}</p>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
