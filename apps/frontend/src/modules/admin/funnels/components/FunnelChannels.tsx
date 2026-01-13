import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFunnelChannels, updateFunnel } from "@/services/Funnels/queries";
import { ChannelsService } from "@/services/Channels/queries";
import { Channel } from "@/services/Channels/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, MessageCircle, Phone } from "lucide-react";
import { BsWhatsapp, BsInstagram, BsMessenger, BsTelegram } from "react-icons/bs";
import { toast } from "sonner";

interface FunnelChannelsProps {
  funnelId: string;
  companyId: string;
}

interface FunnelChannelResponse {
  id: string;
  channelId: string;
  channel: Channel;
}

export function FunnelChannels({ funnelId, companyId }: FunnelChannelsProps) {
  const queryClient = useQueryClient();

  const { data: funnelChannels, isLoading: isLoadingFunnelChannels } = useQuery<FunnelChannelResponse[]>({
    queryKey: ["funnel-channels", funnelId],
    queryFn: () => getFunnelChannels(funnelId),
  });

  const { data: availableChannels, isLoading: isLoadingAvailableChannels } = useQuery<Channel[]>({
    queryKey: ["company-channels", companyId],
    queryFn: () => ChannelsService.getChannels(companyId) as unknown as any,
  });

  const updateFunnelMutation = useMutation({
    mutationFn: (channelIds: string[]) =>
      updateFunnel(funnelId, { channelIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funnel-channels", funnelId] });
      toast.success("Canales actualizados exitosamente");
    },
    onError: () => {
      toast.error("Error al actualizar los canales");
    },
  });

  const handleAddChannel = (channelId: string) => {
    if (!funnelChannels) return;
    const newChannelIds = [...funnelChannels.map(c => c.channel.id), channelId];
    updateFunnelMutation.mutate(newChannelIds);
  };

  const handleRemoveChannel = (channelId: string) => {
    if (!funnelChannels) return;
    const newChannelIds = funnelChannels
      .map(c => c.channel.id)
      .filter(id => id !== channelId);
    updateFunnelMutation.mutate(newChannelIds);
  };

  if (isLoadingFunnelChannels || isLoadingAvailableChannels) {
    return <div>Cargando canales...</div>;
  }

  const availableChannelsForSelect = availableChannels?.filter(
    channel => !funnelChannels?.find(fc => fc.channel.id === channel.id)
  );

  const getChannelIcon = (type: string) => {
    switch (type) {
      case "whatsapp_cloud":
      case "whatsapp_web":
        return <BsWhatsapp className="h-5 w-5 text-green-500" />;
      case "instagram":
        return <BsInstagram className="h-5 w-5 text-pink-500" />;
      case "facebook":
        return <BsMessenger className="h-5 w-5 text-blue-500" />;
      case "telegram":
        return <BsTelegram className="h-5 w-5 text-blue-400" />;
      case "web_chat":
      default:
        return <MessageCircle className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select
          onValueChange={handleAddChannel}
          disabled={updateFunnelMutation.isPending}
        >
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Agregar nuevo canal" />
          </SelectTrigger>
          <SelectContent>
            {availableChannelsForSelect?.map((channel) => (
              <SelectItem key={channel.id} value={channel.id}>
                <div className="flex items-center gap-2">
                  {getChannelIcon(channel.type)}
                  <span>{channel.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {funnelChannels?.map(({ channel }) => (
          <div
            key={channel.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-primary/20 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                {getChannelIcon(channel.type)}
              </div>
              <div className="space-y-1">
                <h4 className="font-medium text-sm">{channel.name}</h4>
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-500">{channel.number}</span>
                  <Badge
                    variant={channel.status === 'active' ? 'secondary' : 'outline'}
                    className="text-[10px] px-1 py-0"
                  >
                    {channel.status}
                  </Badge>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleRemoveChannel(channel.id)}
              disabled={updateFunnelMutation.isPending}
            >
              <X className="h-4 w-4 text-gray-400 hover:text-red-400" />
            </Button>
          </div>
        ))}
      </div>

      {funnelChannels?.length === 0 && (
        <div className="text-center py-6 text-gray-500 bg-gray-50/50 rounded-lg border border-dashed">
          No hay canales asignados a este funnel
        </div>
      )}
    </div>
  );
}