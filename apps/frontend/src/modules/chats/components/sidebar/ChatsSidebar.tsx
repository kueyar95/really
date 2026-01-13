import { Sidebar, SidebarContent, SidebarHeader } from "@/components/ui/sidebar";
import { useState, useMemo, useEffect } from "react";
import { ChatClient, ChatMessage } from "@/services/Whatsapp/types";
import { Funnel } from "@/modules/chats/types";
import { ClientItem } from "./ClientItem";
import { ChannelSelector } from "./ChannelSelector";
import { SearchBar } from "./SearchBar";
import { AssignmentFilter, AssignmentFilterValue } from './filters/AssignmentFilter';
import { DateFilter, DateFilterValue, isWithinDateRange } from './filters/DateFilter';
import { MessageSquare, Search } from "lucide-react";

interface ChatsSidebarProps {
  clients: Array<{
    client: ChatClient;
    messages: ChatMessage[];
    lastMessage: {
      message: string;
      direction: 'inbound' | 'outbound';
      createdAt: string;
    };
  }>;
  selectedClient?: ChatClient;
  onSelectClient: (client: ChatClient) => void;
  channels?: Funnel[];
  selectedChannel?: string;
  onChannelChange: (channelId: string, funnelId?: string) => void;
  isConnected?: boolean;
  isLoading?: boolean;
}

function getSelectedName(selectedChannel: string | undefined, channels: Funnel[]): string {
  if (!selectedChannel || !channels) return "";
  const [type, id] = selectedChannel.split(':');
  if (!type || !id) return "";

  try {
    for (const funnel of channels) {
      if (!funnel?.id) continue;
      if (type === 'funnel' && funnel.id === id) return funnel.name || "";
      if (type === 'channel' && Array.isArray(funnel.channels)) {
        const channel = funnel.channels.find(c => c && String(c.id) === id);
        if (channel?.name) return channel.name;
      }
    }
  } catch (error) {
    console.error('Error al obtener nombre del canal:', error);
  }
  return "";
}

function filterClients(clients: ChatsSidebarProps['clients'], filters: {
  searchQuery: string;
  assignmentFilter: AssignmentFilterValue;
  dateFilter: DateFilterValue;
  exactDate?: Date;
}) {
  return clients.filter((clientData) => {
    const matchesSearch = !filters.searchQuery.trim() || (
      clientData.client.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      clientData.client.phone.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      clientData.lastMessage?.message.toLowerCase().includes(filters.searchQuery.toLowerCase())
    );

    const matchesAssignment =
      filters.assignmentFilter === "all" ||
      (filters.assignmentFilter === "assigned" && clientData.client.assignedUser) ||
      (filters.assignmentFilter === "unassigned" && !clientData.client.assignedUser);

    const matchesDate =
      filters.dateFilter === "all" ||
      (clientData.lastMessage?.createdAt &&
        isWithinDateRange(new Date(clientData.lastMessage.createdAt), filters.dateFilter, filters.exactDate));

    return matchesSearch && matchesAssignment && matchesDate;
  });
}

export function ChatsSidebar({
  clients = [],
  selectedClient,
  onSelectClient,
  channels = [],
  selectedChannel,
  onChannelChange,
  isLoading = false,
}: ChatsSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilterValue>("all");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("all");
  const [exactDate, setExactDate] = useState<Date>();

  useEffect(() => {
    if (channels.length > 0 && !selectedChannel) {
      const firstFunnel = channels[0];
      onChannelChange(firstFunnel.id, firstFunnel.id);
    }
  }, [channels, selectedChannel, onChannelChange]);

  const selectedName = useMemo(() => getSelectedName(selectedChannel, channels), [selectedChannel, channels]);
  const filteredClients = useMemo(() => filterClients(clients, {
    searchQuery,
    assignmentFilter,
    dateFilter,
    exactDate
  }), [clients, searchQuery, assignmentFilter, dateFilter, exactDate]);

  return (
    <Sidebar className="relative h-[calc(100vh-64px)] w-96 bg-white text-gray-800 border-r border-gray-100">
      <SidebarHeader className="py-5 px-3 border-b bg-[#ffffff]">
        <div className="space-y-4">
          <ChannelSelector
            channels={channels}
            selectedChannel={selectedChannel}
            onChannelChange={onChannelChange}
            selectedName={selectedName}
          />
          <div className="space-y-2">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
            <div className="flex gap-2">
              <AssignmentFilter value={assignmentFilter} onChange={setAssignmentFilter} />
              <DateFilter value={dateFilter} exactDate={exactDate} onChange={(v, d) => {
                setDateFilter(v);
                setExactDate(d);
              }} />
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full py-10 space-y-4">
            <div className="animate-spin">
              <MessageSquare className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">Cargando chats...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-10 space-y-4">
            <Search className="w-8 h-8 text-gray-400" />
            <div className="text-center">
              <p className="text-sm text-gray-500">No se encontraron chats</p>
              {searchQuery && (
                <p className="text-xs text-gray-400 mt-1">
                  Intenta con otros términos de búsqueda
                </p>
              )}
            </div>
          </div>
        ) : (
          filteredClients.map((clientData) => (
            <ClientItem
              key={`${clientData.client.id}-${clientData.client.channel?.id}`}
              client={clientData.client}
              isSelected={
                selectedClient?.id === clientData.client.id &&
                selectedClient?.channel?.id === clientData.client.channel?.id
              }
              onClick={() => onSelectClient(clientData.client)}
              lastMessage={clientData.lastMessage}
            />
          ))
        )}
      </SidebarContent>
    </Sidebar>
  );
}