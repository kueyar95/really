import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Contact,
  BotMessageSquare,
  MoreVertical,
  ArrowRight,
  UserPlus,
  Search,
  MessageCircle,
  X
} from "lucide-react";
import { BsWhatsapp, BsInstagram, BsMessenger, BsTelegram } from "react-icons/bs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getStagesByFunnel,
  changeStage,
  assignUserToClientStage,
  removeUserFromClientStage,
  getClientStageInFunnel
} from "@/services/Stages/queries";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { AdminService } from "@/services/Admin/queries";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StepCardItemProps {
  user: string;
  phone: string;
  date: string;
  message: string;
  assignedUser: string | null | undefined;
  clientId: string;
  currentStageId: string;
  channelId: string;
  channelType: string;
  botId: string | null;
}

export function StepCardItem({
  user,
  phone,
  date,
  assignedUser,
  clientId,
  currentStageId,
  channelId,
  channelType,
  botId,
}: StepCardItemProps) {
  const [searchParams] = useSearchParams();
  const { user: authUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isClosingConversation, setIsClosingConversation] = useState(false);
  const { toast } = useToast();
  const selectedFunnelId =
    searchParams.get("id") ||
    localStorage.getItem("lastSelectedFunnelId") ||
    "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleClientClick = (clientId: string) => {
    if (channelId) {
      navigate(`/dashboard/chats/${channelId}?clientId=${clientId}`);
    } else {
      toast({
        title: "Error",
        description: "No hay canales activos asociados a este funnel",
        variant: "destructive",
      });
    }
  };

  const { data: stages } = useQuery({
    queryKey: ["stages", selectedFunnelId],
    queryFn: () => getStagesByFunnel(selectedFunnelId),
    enabled: !!selectedFunnelId,
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => AdminService.getUsers(),
    enabled: authUser?.role === "admin" || authUser?.role === "super_admin",
  });

  // Filtrar solo usuarios con rol de vendedor y aplicar búsqueda
  const filteredUsers = users?.filter((user) =>
    (user.username?.toLowerCase().includes(searchQuery.toLowerCase()) || user.email?.toLowerCase().includes(searchQuery.toLowerCase())))
    || [];

  const changeStageMutation = useMutation({
    mutationFn: (newStageId: string) => changeStage(clientId, newStageId, channelId),
    onSuccess: () => {
      toast({
        title: "Etapa cambiada",
        description: "El cliente ha sido movido exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ["stages", selectedFunnelId] });
      queryClient.invalidateQueries({ queryKey: ["stageClients"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo cambiar la etapa del cliente",
        variant: "destructive",
      });
    },
  });

  const assignUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Resolver el ClientStage del cliente en el funnel actual
      const cs = await getClientStageInFunnel(String(clientId), String(selectedFunnelId), channelId);
      // Asegurar número (por si viene string del backend)
      const clientStageId = String(cs.id);
      if (Number.isNaN(clientStageId)) {
        throw new Error("ClientStageId inválido");
      }
      return assignUserToClientStage(clientStageId, userId);
    },
    onSuccess: () => {
      toast({
        title: "Usuario asignado",
        description: "El cliente ha sido asignado exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ["stages", selectedFunnelId] });
      queryClient.invalidateQueries({ queryKey: ["stageClients"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo asignar el usuario al cliente",
        variant: "destructive",
      });
    },
  });
  

  // Add mutation to remove user assignment
  const removeUserMutation = useMutation({
    mutationFn: async () => {
      const cs = await getClientStageInFunnel(String(clientId), String(selectedFunnelId), channelId);

      return removeUserFromClientStage(cs.id);
    },
    onSuccess: () => {
      toast({
        title: "Usuario removido",
        description: "El usuario ha sido desasignado exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ["stages", selectedFunnelId] });
      queryClient.invalidateQueries({ queryKey: ["stageClients"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo desasignar al usuario",
        variant: "destructive",
      });
    },
  });
  

  const handleAssignUser = async (userId: string) => {
    await assignUserMutation.mutate(userId);
    // Mover a la etapa de Asistencia Humana si existe
    const humanAssistanceStage = stages?.find(
      (stage) => stage.name === "Asistencia Humana"
    );
    if (humanAssistanceStage) {
      await changeStageMutation.mutate(humanAssistanceStage.id);
    }
  };

  const handleRemoveUser = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    removeUserMutation.mutate();
  };

  const isAdmin =
    authUser?.role === "admin" || authUser?.role === "super_admin";

  const getChannelIcon = () => {
    switch (channelType) {
      case "whatsapp_cloud":
      case "whatsapp_web":
        return <BsWhatsapp className="w-4 h-4 text-green-500" />;
      case "instagram":
        return <BsInstagram className="w-4 h-4 text-pink-500" />;
      case "facebook":
        return <BsMessenger className="w-4 h-4 text-blue-500" />;
      case "telegram":
        return <BsTelegram className="w-4 h-4 text-blue-400" />;
      case "web_chat":
        return <MessageCircle className="w-4 h-4 text-gray-500" />;
      default:
        return null;
    }
  };

  // Get the current stage information to check if it's bot-controlled
  const currentStage = stages?.find(stage => stage.id === currentStageId);

  const isHumanAssistanceStage = botId === null;

  const hasAssignedUser = 
    assignedUser && 
    assignedUser !== "Por asignar" && 
    assignedUser.trim() !== "" && 
    assignedUser !== "-";

  const handleCloseConversation = async () => {
    try {
      setIsClosingConversation(true);
      // Find the stage with order=0
      const initialStage = stages?.find(stage => stage.order === 0);
      
      if (!initialStage) {
        toast({
          title: "Error",
          description: "No se encontró la etapa inicial",
          variant: "destructive",
        });
        return;
      }
      
      // Move the client to the initial stage
      await changeStageMutation.mutate(initialStage.id);
      
      toast({
        title: "Conversación cerrada",
        description: "El cliente ha sido devuelto a la etapa inicial",
      });
    } catch (error) {
      console.error("Error closing conversation:", error);
      toast({
        title: "Error",
        description: "No se pudo cerrar la conversación",
        variant: "destructive",
      });
    } finally {
      setIsClosingConversation(false);
    }
  };

  return (
    <Card className="w-full rounded-lg">
      <CardHeader className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              {getChannelIcon()}
              <CardTitle
                onClick={() => handleClientClick(clientId)}
                className="text-base font-medium cursor-pointer hover:underline hover:text-blue-600 transition-colors"
              >
                {user}
              </CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">{phone}</p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">{date}</p>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-slate-100 transition-colors"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="end">
                <Tabs defaultValue="move" className="w-full">
                  <TabsList className="w-full">
                    <TabsTrigger value="move" className="flex-1">
                      Mover
                    </TabsTrigger>
                    {isAdmin && (
                      <TabsTrigger value="assign" className="flex-1">
                        Asignar
                      </TabsTrigger>
                    )}
                  </TabsList>
                  <TabsContent value="move">
                    <div className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">
                        Mover cliente
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Selecciona la etapa de destino
                      </p>
                    </div>
                    <Separator />
                    <div className="p-2">
                      {stages?.map(
                        (stage) =>
                          stage.id !== currentStageId && (
                            <Button
                              key={stage.id}
                              variant="ghost"
                              className="w-full justify-between text-sm px-2 py-1.5 h-9 hover:bg-slate-100"
                              onClick={() => changeStageMutation.mutate(stage.id)}
                            >
                              <span className="truncate">{stage.name}</span>
                              <ArrowRight className="h-4 w-4 text-slate-400" />
                            </Button>
                          )
                      )}
                    </div>
                  </TabsContent>
                  {isAdmin && (
                    <TabsContent value="assign">
                      <div className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-900">
                          Asignar usuario
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          El cliente será movido a Asistencia Humana
                        </p>
                        <div className="relative mt-2">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                          <Input
                            placeholder="Buscar usuario..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                          />
                        </div>
                      </div>
                      <Separator />
                      <div className="p-2 max-h-[200px] overflow-y-auto">
                        {filteredUsers.map((user) => (
                          <Button
                            key={user.id}
                            variant="ghost"
                            className="w-full justify-between text-sm px-2 py-1.5 h-9 hover:bg-slate-100"
                            onClick={() => handleAssignUser(user.id)}
                          >
                            <div className="flex flex-col items-start">
                              <span className="font-medium">
                                {user.username}
                              </span>
                              <span className="text-xs text-slate-500">
                                {user.email}
                              </span>
                            </div>
                            <UserPlus className="h-4 w-4 text-slate-400" />
                          </Button>
                        ))}
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
                
                {/* Add the Close Conversation button outside of tabs, at the bottom of the popover */}
                <Separator />
                <div className="p-3">
                  <Button
                    variant="destructive"
                    className="w-full justify-center text-sm h-9 gap-2"
                    onClick={() => handleCloseConversation()}
                    disabled={isClosingConversation}
                  >
                    <X size={16} />
                    <span>
                      {isClosingConversation ? "Cerrando..." : "Cerrar conversación"}
                    </span>
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isHumanAssistanceStage ? (
          <div className="flex flex-col gap-1 mb-3">
            {/* Human Assistance Stage: Always show amber badge */}
            <div className="flex items-center gap-1.5 rounded-full w-fit px-2.5 py-0.5 bg-amber-100">
              <Contact className="w-3 h-3 text-amber-500" />
              <span className="text-xs text-amber-500">Asistencia Humana</span>
            </div>
            
            {/* Show green badge if user is assigned, red badge if not */}
            {hasAssignedUser ? (
              <div className="flex items-center gap-1.5 rounded-full w-fit px-2.5 py-0.5 bg-green-100 pr-1 group">
                <UserPlus className="w-3 h-3 text-green-600" />
                <span className="text-xs text-green-600">{assignedUser}</span>
                {isAdmin && (
                  <button 
                    onClick={handleRemoveUser}
                    className="ml-1 rounded-full bg-green-200 hover:bg-red-200 p-0.5 transition-colors"
                    title="Remover asignación"
                  >
                    <X className="w-2 h-2 text-green-700 group-hover:text-red-600" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-full w-fit px-2.5 py-0.5 bg-red-200 border border-red-300">
                <X className="w-3 h-3 text-red-600" />
                <span className="text-xs font-medium text-red-600">No asignado</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-full w-fit px-2.5 py-0.5 mb-3 bg-blue-100">
            <BotMessageSquare className="w-3 h-3 text-blue-500" />
            <span className="text-xs text-blue-500">AI</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
