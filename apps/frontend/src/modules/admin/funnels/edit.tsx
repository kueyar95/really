import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getFunnel,
  updateFunnel,
  updateStage,
  deleteFunnel,
} from "@/services/Funnels/queries";
import {
  getStagesByFunnel,
  deleteStage,
  createStage,
} from "@/services/Stages/queries";
import { Stage, StageStatus } from "@/services/Stages/types";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Bot,
  Loader2,
  Save,
  User,
  Plus,
  Trash2,
  Edit,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BotsService } from "@/services/Bots/queries";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function EditFunnelPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStep, setDeleteStep] = useState<string>("");
  const [showDeletingDialog, setShowDeletingDialog] = useState(false);
  // Asumimos que el usuario es administrador por defecto
  const [isAdmin] = useState(true);

  // Fetch funnel data
  const { data: funnel, isLoading: isLoadingFunnel } = useQuery({
    queryKey: ["funnel", id],
    queryFn: () => getFunnel(id!),
    enabled: !!id,
  });

  // Fetch stages data
  const { data: stages, isLoading: isLoadingStages } = useQuery({
    queryKey: ["stages", id],
    queryFn: () => getStagesByFunnel(id!),
    enabled: !!id,
  });

  const [funnelData, setFunnelData] = useState({
    name: "",
    description: "",
  });

  const [stagesData, setStagesData] = useState<Stage[]>([]);

  useEffect(() => {
    if (funnel) {
      setFunnelData({
        name: funnel.name,
        description: funnel.description || "",
      });
    }
  }, [funnel]);

  useEffect(() => {
    if (stages) {
      setStagesData(stages);
    }
  }, [stages]);

  const updateFunnelMutation = useMutation({
    mutationFn: async () => {
      setIsEditing(true);
      try {
        // Update funnel
        await updateFunnel(id!, {
          name: funnelData.name,
          description: funnelData.description,
          isActive: funnel?.isActive || true,
        });

        // Update stages
        await Promise.all(
          stagesData.map((stage) =>
            updateStage(stage.id, {
              name: stage.name,
              description: stage.description || "",
              order: stage.order,
              botId: stage.botId,
              status: stage.status,
            })
          )
        );

        toast.success("Funnel actualizado exitosamente");
        queryClient.invalidateQueries({ queryKey: ["funnel", id] });
        queryClient.invalidateQueries({ queryKey: ["stages", id] });
        
        // Redirigir al usuario a la página de listado de funnels
        navigate("/dashboard/admin/funnels");
      } catch (error) {
        console.error("Error updating funnel:", error);
        toast.error("Error al actualizar el funnel");
      } finally {
        setIsEditing(false);
      }
    },
  });

  const handleStageUpdate = (stageId: string, field: string, value: string) => {
    setStagesData((prev) =>
      prev.map((stage) =>
        stage.id === stageId ? { ...stage, [field]: value } : stage
      )
    );
  };

  const deleteStageDialog = (stageId: string, stageName: string) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción eliminará la etapa "{stageName}" y no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={async () => {
              try {
                await deleteStage(stageId);
                toast.success("Etapa eliminada exitosamente");
                queryClient.invalidateQueries({ queryKey: ["stages", id] });
              } catch (error) {
                console.error("Error deleting stage:", error);
                toast.error("Error al eliminar la etapa");
              }
            }}
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const createStageMutation = useMutation({
    mutationFn: async () => {
      try {
        const newStage = await createStage({
          name: "Nueva etapa",
          description: "",
          funnelId: id!,
          order: stagesData.length,
          status: StageStatus.ACTIVE,
        });
        toast.success("Etapa creada exitosamente");
        queryClient.invalidateQueries({ queryKey: ["stages", id] });
        return newStage;
      } catch (error) {
        console.error("Error creating stage:", error);
        toast.error("Error al crear la etapa");
        throw error;
      }
    },
  });

  // Add bots query
  const { data: bots } = useQuery({
    queryKey: ["bots"],
    queryFn: BotsService.getAllBots,
  });

  // Add bot assignment mutation
  const assignBotMutation = useMutation({
    mutationFn: async ({
      stageId,
      botId,
    }: {
      stageId: string;
      botId: string | null;
    }) => {
      try {
        await updateStage(stageId, {
          botId,
        });
        toast.success("Bot asignado exitosamente");
        queryClient.invalidateQueries({ queryKey: ["stages", id] });
      } catch (error) {
        console.error("Error assigning bot:", error);
        toast.error("Error al asignar el bot");
        throw error;
      }
    },
  });

  const deleteFunnelMutation = useMutation({
    mutationFn: async () => {
      setIsDeleting(true);
      setShowDeletingDialog(true);
      try {
        // Mostrar progreso de eliminación de etapas
        setDeleteStep("Eliminando etapas del funnel...");
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Pequeña pausa para mostrar el progreso

        // Eliminar el funnel (esto eliminará las etapas en cascada)
        setDeleteStep("Eliminando funnel...");
        await deleteFunnel(id!);

        setDeleteStep("¡Funnel eliminado exitosamente!");
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Pausa para mostrar el éxito

        toast.success("Funnel eliminado exitosamente");
        navigate("/dashboard/admin/funnels");
      } catch (error) {
        console.error("Error deleting funnel:", error);
        toast.error("Error al eliminar el funnel");
      } finally {
        setIsDeleting(false);
        setShowDeletingDialog(false);
        setDeleteStep("");
      }
    },
  });

  const handleDeleteFunnel = () => {
    if (deleteConfirmation.toLowerCase() === funnelData.name.toLowerCase()) {
      deleteFunnelMutation.mutate();
    } else {
      toast.error("El nombre del funnel no coincide");
    }
  };

  if (isLoadingFunnel || isLoadingStages) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-full mx-auto">
      <div className="mb-6">
        <Link to="/dashboard/admin/funnels">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Funnels
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Editar Funnel</h1>
            <p className="text-sm text-muted-foreground">
              Modifica la información del funnel y sus etapas
            </p>
          </div>
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Funnel
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-4">
                    <p>Esta acción eliminará:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>El funnel "{funnelData.name}"</li>
                      <li>
                        Todas las etapas asociadas al funnel (
                        {stagesData.length} etapas)
                      </li>
                      <li className="text-muted-foreground">
                        Los bots asignados permanecerán en el sistema pero serán
                        desvinculados de las etapas
                      </li>
                    </ul>
                    <p className="mt-4">
                      Esta acción no se puede deshacer. Para confirmar, escribe
                      el nombre del funnel en minúsculas:{" "}
                      <span className="font-medium">
                        {funnelData.name.toLowerCase()}
                      </span>
                    </p>
                    <Input
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      placeholder="Nombre del funnel"
                      className="mt-2 border border-gray-200 rounded-md"
                    />
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteConfirmation("")}>
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteFunnel}
                    disabled={
                      deleteConfirmation.toLowerCase() !==
                        funnelData.name.toLowerCase() || isDeleting
                    }
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Eliminando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar Funnel
                      </>
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              onClick={() => updateFunnelMutation.mutate()}
              disabled={isEditing}
            >
              {isEditing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar cambios
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Información del Funnel</CardTitle>
            <CardDescription>
              Información básica sobre el funnel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre del funnel</label>
              <Input
                value={funnelData.name}
                onChange={(e) =>
                  setFunnelData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Nombre del funnel"
                className="mt-1.5 border border-gray-200 rounded-md"
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                Descripción del funnel
              </label>
              <Textarea
                value={funnelData.description}
                onChange={(e) =>
                  setFunnelData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Descripción del funnel"
                className="mt-1.5 shadow-none"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Etapas del funnel</h2>
          <Button
            onClick={() => createStageMutation.mutate()}
            disabled={createStageMutation.isPending}
          >
            {createStageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Agregar etapa
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stagesData.map((stage) => (
            <Card key={stage.id} className="w-full">
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {stage.botId ? (
                      <Bot className="h-7 w-7 text-blue-600 bg-blue-100 p-1 rounded-sm" />
                    ) : (
                      <User className="h-7 w-7 text-amber-500 bg-amber-100 p-1 rounded-sm" />
                    )}
                    <div className="space-y-1.5">
                      <Input
                        value={stage.name}
                        onChange={(e) =>
                          handleStageUpdate(stage.id, "name", e.target.value)
                        }
                        placeholder="Nombre de la etapa"
                        className="h-8"
                      />
                    </div>
                  </div>
                  {deleteStageDialog(stage.id, stage.name)}
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="p-4 space-y-4">
                <Textarea
                  value={stage.description || ""}
                  onChange={(e) =>
                    handleStageUpdate(stage.id, "description", e.target.value)
                  }
                  placeholder="Descripción de la etapa"
                  className="min-h-[100px] resize-none"
                />
                <div>
                  <label className="text-sm font-medium">Bot asignado</label>
                  <div className="flex items-center gap-2">
                    <Select
                      defaultValue={stage.botId || undefined}
                      onValueChange={(value) =>
                        assignBotMutation.mutate({
                          stageId: stage.id,
                          botId: value || null,
                        })
                      }
                    >
                      <SelectTrigger className="mt-1.5 w-full">
                        <SelectValue placeholder="Sin bot" />
                      </SelectTrigger>
                      <SelectContent>
                        {bots?.map((bot) => (
                          <SelectItem key={bot.id} value={bot.id}>
                            {bot.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isAdmin && stage.botId && (
                      <Link to={`/dashboard/admin/bots/edit-bot/${stage.botId}`}>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="mt-1.5"
                          title="Editar bot"
                        >
                          <Edit className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Dialog de progreso de eliminación */}
      <Dialog open={showDeletingDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminando Funnel</DialogTitle>
            <DialogDescription className="space-y-4">
              <div className="flex items-center gap-3 mt-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-sm">{deleteStep}</p>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
