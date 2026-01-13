import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Funnel } from "@/modules/chats/types";
import { MessageSquare, Workflow } from "lucide-react";
import { ChannelIcon } from "./ChannelIcon";

interface ChannelSelectorProps {
  channels: Funnel[];
  selectedChannel?: string;
  onChannelChange: (channelId: string, funnelId?: string) => void;
  selectedName: string;
}

export function ChannelSelector({ channels, selectedChannel, onChannelChange, selectedName }: ChannelSelectorProps) {
  return (
    <Select
      value={selectedChannel}
      onValueChange={(value) => {
        const [type, id] = value.split(':');
        onChannelChange(id, type === 'funnel' ? id : undefined);
      }}
    >
      <SelectTrigger className="w-full bg-white border-gray-200 focus:ring-[#00a884] focus:ring-offset-0">
        <div className="flex items-center gap-2">
          {selectedChannel ? (
            <>
              {selectedChannel.startsWith('funnel:') ? (
                <Workflow className="w-4 h-4 text-[#00a884]" />
              ) : (
                <ChannelIcon type={channels.find(f =>
                  f.channels.some(c => `channel:${c.id}` === selectedChannel)
                )?.channels.find(c => `channel:${c.id}` === selectedChannel)?.type || ''} />
              )}
              <span className="truncate">{selectedName}</span>
            </>
          ) : (
            <>
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Selecciona un funnel o canal</span>
            </>
          )}
        </div>
      </SelectTrigger>
      <SelectContent>
        {channels.map((funnel) => (
          <SelectGroup key={funnel.id}>
            <SelectItem
              value={`funnel:${funnel.id}`}
              className="font-medium text-gray-900"
            >
              <div className="flex items-center gap-2">
                <Workflow className="w-4 h-4 text-[#00a884]" />
                {funnel.name}
              </div>
            </SelectItem>
            {funnel.channels?.map((channel) => (
              <SelectItem
                key={channel.id}
                value={`channel:${channel.id}`}
                className="pl-6 text-sm"
              >
                <div className="flex items-center gap-2">
                  <ChannelIcon type={channel.type} />
                  {channel.name}
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}