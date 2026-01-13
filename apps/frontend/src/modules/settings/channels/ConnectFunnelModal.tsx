import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFunnels, updateFunnel } from "@/services/Funnels/queries";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";

interface ConnectFunnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelId?: string; // Optional channel ID
}

export function ConnectFunnelModal({ isOpen, onClose, channelId }: ConnectFunnelModalProps) {
  const { user } = useAuth();
  const companyId = user?.company?.id;
  const queryClient = useQueryClient();
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Reset selected funnel when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedFunnelId("");
      setError(null);
    }
  }, [isOpen]);
  //testdecomentario
  // Fetch real funnels from company
  const { data: funnels, isLoading } = useQuery({
    queryKey: ["funnels", companyId],
    queryFn: async () => {
      try {
        if (!companyId) {
          throw new Error("No company ID available");
        }
        return await getFunnels({ companyId });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error fetching funnels";
        console.error("Error fetching funnels:", errorMessage);
        setError(errorMessage);
        return [];
      }
    },
    enabled: !!companyId && isOpen,
  });

  // Update funnel mutation
  const updateFunnelMutation = useMutation({
    mutationFn: (data: { funnelId: string, channelIds: string[] }) =>
      updateFunnel(data.funnelId, { channelIds: data.channelIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funnel-channels", selectedFunnelId] });
      queryClient.invalidateQueries({ queryKey: ["funnels", companyId] });
      toast.success("Canal conectado al funnel exitosamente");
      onClose();
    },
    onError: (err) => {
      console.error("Error updating funnel:", err);
      toast.error("Error al conectar el canal al funnel");
    },
  });

  const handleConnectToFunnel = () => {
    if (!selectedFunnelId || !channelId) {
      if (!channelId) {
        console.error("No channel ID provided");
        setError("No se ha proporcionado un canal para conectar");
      }
      return;
    }
    
    try {
      const selectedFunnel = funnels?.find(funnel => funnel.id === selectedFunnelId);
      if (!selectedFunnel) {
        setError("No se ha encontrado el funnel seleccionado");
        return;
      }
      
      // Add the channel to the funnel if it's not already there
      // Los canales vienen como array de objetos, no como channelIds
      const existingChannelIds = selectedFunnel.channels 
        ? selectedFunnel.channels.map((channel: any) => channel.id)
        : selectedFunnel.channelIds || [];
      
      if (!existingChannelIds.includes(channelId)) {
        const newChannelIds = [...existingChannelIds, channelId];
        updateFunnelMutation.mutate({ funnelId: selectedFunnelId, channelIds: newChannelIds });
      } else {
        toast.info("Este canal ya está conectado al funnel seleccionado");
        onClose();
      }
    } catch (err) {
      console.error("Error in handleConnectToFunnel:", err);
      setError("Error al conectar el canal al funnel");
    }
  };

  const handleCreateNewFunnel = () => {
    // Close this modal and navigate to funnel creation
    onClose();
    // Use window.location to navigate to the funnel creation page
    window.location.href = '/admin/funnels/create';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar canal a un funnel</DialogTitle>
          <DialogDescription>
            Conecta tu canal recién configurado a un funnel existente o crea uno nuevo.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 p-3 rounded-md text-red-600 text-sm mb-3">
            Error: {error}
          </div>
        )}

        <div className="flex flex-col space-y-4 py-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Selecciona un funnel</h3>
            {isLoading || updateFunnelMutation.isPending ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">
                  {updateFunnelMutation.isPending ? "Conectando canal..." : "Cargando funnels..."}
                </span>
              </div>
            ) : funnels && funnels.length > 0 ? (
              <Select
                value={selectedFunnelId}
                onValueChange={setSelectedFunnelId}
                disabled={updateFunnelMutation.isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar funnel existente" />
                </SelectTrigger>
                <SelectContent>
                  {funnels.map((funnel) => (
                    <SelectItem key={funnel.id} value={funnel.id}>
                      {funnel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-center py-3 text-sm text-muted-foreground bg-muted/50 rounded-md">
                No hay funnels disponibles. Crea uno nuevo.
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <div className="flex-1 h-px bg-gray-200" />
            <div className="text-xs text-gray-500">o</div>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleCreateNewFunnel}
            disabled={updateFunnelMutation.isPending}
          >
            Crear nuevo funnel
          </Button>
        </div>

        <DialogFooter>
          <Button 
            variant="ghost" 
            onClick={onClose}
            disabled={updateFunnelMutation.isPending}
          >
            Más tarde
          </Button>
          <Button 
            onClick={handleConnectToFunnel} 
            disabled={!selectedFunnelId || updateFunnelMutation.isPending || isLoading}
            className="gap-2"
          >
            {updateFunnelMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                Conectar
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 