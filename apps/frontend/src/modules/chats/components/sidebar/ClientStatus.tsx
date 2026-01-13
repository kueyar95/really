import { Bot, User } from "lucide-react";
import { ChatClient } from "@/services/Whatsapp/types";

interface ClientStatusProps {
  client: ChatClient;
}

export function ClientStatus({ client }: ClientStatusProps) {
  if (client.assignedUser && client.stage) {
    return (
      <div className="flex items-center gap-1.5 bg-green-50 px-2 py-0.5 rounded-full">
        <User className="w-3.5 h-3.5 text-green-500" />
        <span className="text-xs font-medium text-green-700">{client.stage.name} - {client.assignedUser.username}</span>
      </div>
    );
  }
  
  if (client.stage) {
    return (
      <div className={`flex items-center gap-2 ${client.stage.bot ? 'bg-blue-50' : 'bg-amber-50'} px-2 py-0.5 rounded-full`}>
        {client.stage.bot ? (
          <Bot className="w-3.5 h-3.5 text-blue-500" />
        ) : (
          <User className="w-3.5 h-3.5 text-amber-500" />
        )}
        <div className="flex items-center gap-1">
          <span className={`text-xs font-medium ${client.stage.bot ? 'text-blue-700' : 'text-amber-700'}`}>{client.stage.name}</span>
          {client.stage.bot ? (
            <>
              <span className="text-[10px] text-blue-700 pt-0.5">- {client.stage.bot.name}</span>
            </>
          ) : (
            <>
              <span className="text-[10px] text-amber-700 pt-0.5">- Sin asignar</span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-0.5 rounded-full">
      <Bot className="w-3.5 h-3.5 text-gray-400" />
      <span className="text-xs text-gray-500">Sin asignar</span>
    </div>
  );
}