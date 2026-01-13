import { ChatClient } from "@/services/Whatsapp/types";
import { ChannelIcon } from "./ChannelIcon";
import { ClientStatus } from "./ClientStatus";
import { User } from "lucide-react";

interface ClientItemProps {
  client: ChatClient;
  isSelected: boolean;
  onClick: () => void;
  lastMessage?: {
    message: string;
    createdAt: string;
  };
}

export function ClientItem({ client, isSelected, onClick, lastMessage }: ClientItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors ${
        isSelected ? "bg-gray-50" : ""
      }`}
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
        <User className="w-6 h-6 text-gray-500" />
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-[70%]">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {client.name}
            </h3>
            <ChannelIcon type={client.channel?.type || ''} />
          </div>
          {lastMessage?.createdAt && (
            <span className="text-xs text-gray-500 shrink-0">
              {new Date(lastMessage.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          )}
        </div>

        <ClientStatus client={client} />

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-xs text-gray-600 truncate">
            {lastMessage?.message?.slice(0, 40)}
            {lastMessage?.message?.length && lastMessage?.message?.length > 40 ? '...' : ''}
          </span>
          {/* Aquí podrías agregar badges de mensajes no leídos u otros indicadores */}
        </div>
      </div>
    </button>
  );
}