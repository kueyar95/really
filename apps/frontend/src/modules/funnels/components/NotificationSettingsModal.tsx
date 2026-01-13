import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Bell, Plus, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { updateStageNotificationEmails } from "@/services/Stages/queries";
import { Stage } from "@/services/Stages/types";

// --- QUERIES CONCEPTUALES ---
// Estas funciones deberían interactuar con tu backend.
// Deberás implementarlas en tus archivos de servicios.

// async function getStageNotificationEmails(stageId: string): Promise<string[]> {
//   console.log(`[Conceptual] Obteniendo emails para stageId: ${stageId}`);
//   // Ejemplo: return await api.get(`/stages/${stageId}/notification-emails`);
//   // Por ahora, simularemos datos para el ejemplo:
//   if (stageId === "human-stage-1") {
//     return ["test1@example.com", "test2@example.com"];
//   }
//   return [];
// }

// async function addStageNotificationEmail(params: { stageId: string; email: string }): Promise<void> {
//   console.log(`[Conceptual] Agregando email ${params.email} para stageId: ${params.stageId}`);
//   // Ejemplo: return await api.post(`/stages/${params.stageId}/notification-emails`, { email: params.email });
// }

// async function removeStageNotificationEmail(params: { stageId: string; email: string }): Promise<void> {
//   console.log(`[Conceptual] Eliminando email ${params.email} para stageId: ${params.stageId}`);
//   // Ejemplo: return await api.delete(`/stages/${params.stageId}/notification-emails`, { data: { email: params.email } });
// }
// --- FIN QUERIES CONCEPTUALES ---

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stageId: string;
  stageName: string;
  initialEmails?: string[];
}

export function NotificationSettingsModal({
  isOpen,
  onClose,
  stageId,
  stageName,
  initialEmails = [],
}: NotificationSettingsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState("");
  const [emails, setEmails] = useState<string[]>(initialEmails);

  useEffect(() => {
    setEmails(initialEmails || []);
  }, [initialEmails]);

  const updateEmailsMutation = useMutation({
    mutationFn: (updatedEmails: string[]) => 
      updateStageNotificationEmails(stageId, updatedEmails),
    onSuccess: (data: Stage) => {
      toast({
        title: "Configuración guardada",
        description: "Los correos de notificación han sido actualizados.",
      });
      setEmails(data.notificationEmails || []); 
      
      queryClient.invalidateQueries({ queryKey: ["stages", localStorage.getItem("lastSelectedFunnelId")] });
      queryClient.invalidateQueries({ queryKey: ["stageClients", stageId] });
      queryClient.invalidateQueries({ queryKey: ["funnels"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error al guardar",
        description: error.message || "No se pudo actualizar la configuración de notificación.",
        variant: "destructive",
      });
    },
  });

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !/\S+@\S+\.\S+/.test(newEmail)) {
      toast({
        title: "Correo inválido",
        description: "Por favor, ingresa una dirección de correo válida.",
        variant: "destructive",
      });
      return;
    }
    if (emails.includes(newEmail)) {
      toast({
        title: "Correo duplicado",
        description: "Esta dirección de correo ya ha sido agregada.",
      });
      setNewEmail("");
      return;
    }

    const updatedEmails = [...emails, newEmail];
    updateEmailsMutation.mutate(updatedEmails);
    setNewEmail("");
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    const updatedEmails = emails.filter((email) => email !== emailToRemove);
    updateEmailsMutation.mutate(updatedEmails);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-600" />
            <DialogTitle className="text-xl">Notificaciones para "{stageName}"</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Agrega o elimina correos electrónicos para recibir notificaciones
            cuando un nuevo lead ingrese a esta etapa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAddEmail}>
          <div className="flex gap-2 py-4">
            <Input
              type="email"
              placeholder="ejemplo@correo.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-grow"
            />
            <Button type="submit" variant="default" size="icon" aria-label="Agregar correo">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </form>

        {emails.length > 0 ? (
          <>
            <p className="text-sm font-medium text-gray-700 mb-2">Correos configurados:</p>
            <ScrollArea className="h-[150px] w-full rounded-md border p-3 bg-gray-50">
              <ul className="space-y-2">
                {emails.map((email) => (
                  <li
                    key={email}
                    className="flex items-center justify-between text-sm p-2 rounded-md bg-white shadow-sm"
                  >
                    <span className="truncate" title={email}>{email}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:bg-red-100"
                      onClick={() => handleRemoveEmail(email)}
                      aria-label={`Eliminar ${email}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </>
        ) : (
          <p className="text-sm text-gray-500 py-4 text-center">
            No hay correos configurados para esta etapa.
          </p>
        )}

        <DialogFooter className="pt-6">
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose}>Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}