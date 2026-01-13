import { Badge } from '@/components/ui/badge';
import { ChatClient } from '@/services/Whatsapp/types';
import { User, X } from 'lucide-react';
import { changeStage, getStagesByFunnel, getClientStageInFunnel, removeUserFromClientStage } from '@/services/Stages/queries';
import { WhatsAppService } from '@/services/Whatsapp/queries';
import { useToast } from '@/hooks/use-toast';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ExtendedUser } from '@/services/types';

interface ChatHeaderProps {
  client: ChatClient;
}

async function getFunnelId(user: ExtendedUser, queryClient: QueryClient, client: ChatClient) {
  
  const companyData = await queryClient.fetchQuery({
    queryKey: ['company-chats', user.company.id],
    queryFn: async () => {
      return await WhatsAppService.findByCompanyId(user.company.id);
    }
  });

  for (const funnel of companyData.funnels || []) {
    const channelExists = funnel.channels.some((channel: any) => 
      channel.id === client.channel.id
    );
    if (channelExists) {
      return funnel.id;
    }
  }
  throw new Error('Could not determine funnel ID');
}


export function ChatHeader({ client }: ChatHeaderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isClosing, setIsClosing] = useState(false);

  const handleCloseConversation = async () => {
    if (!client || !client.stage) return;

    try {
      setIsClosing(true);
      
      if (!user?.company?.id) {
        throw new Error('Company ID not found');
      }    

      const funnelId = await getFunnelId(user, queryClient, client);
      const stages = await getStagesByFunnel(funnelId);
      const initialStage = stages.find((stage) => stage.order === 0);
      
      if (!initialStage) {
        throw new Error('No initial stage found (order 0)');
      }
      
      // Cambiar el stage del cliente en el canal específico
      await changeStage(client.id.toString(), initialStage.id, client.channel?.id);
      // Tras mover a etapa inicial, quitar asignación para reactivar bot
      const clientStage = await getClientStageInFunnel(
        String(client.id), 
        funnelId, 
        client.channel?.id
      );
      console.log('DEBUG clientStage?.id:', clientStage?.id);

      await removeUserFromClientStage(clientStage?.id);
      queryClient.invalidateQueries({ queryKey: ['company-chats'] });
      
      toast({
        title: "Conversación cerrada",
        description: "El lead ha sido devuelto a la etapa inicial",
      });
    } catch (error) {
      console.error('Error closing conversation:', error);
      toast({
        title: "Error al cerrar conversación",
        description: "Por favor, inténtelo de nuevo",
        variant: "destructive",
      });
    } finally {
      setIsClosing(false);
    }
  };
  
  console.log("client: ", client);
  return (
    <header className="flex-none h-16 items-center py-2 border-b border-gray-200 bg-[#ffffff] w-full px-4 md:px-6">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-4">
          <div className="bg-gray-100 p-2 rounded-full">
            <User className="h-8 w-8 text-gray-500" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[15px] font-medium text-gray-900">
              {client.name}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {client.phone}
              </span>
              {client.stage && (
                <Badge className="text-[10px] bg-[#00a884] text-white px-1.5 py-0.5 font-normal rounded">
                  {client.stage.name}
                </Badge>
              )}
              {client.assignedUser && (
                <Badge variant="outline" className="text-[10px] border-[#00a884] text-[#00a884] px-1.5 py-0.5 font-normal rounded">
                  {client.assignedUser.username}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {/* Close conversation button with light red color */}
        {client.stage && !client.stage.bot && (
          <button 
            onClick={handleCloseConversation}
            disabled={isClosing}
          className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
        >
          <X className="h-4 w-4" />
          <span className="text-sm font-medium">
            {isClosing ? 'Cerrando...' : 'Cerrar conversación'}
            </span>
          </button>
        )}
      </div>
    </header>
  );
}