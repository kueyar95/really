import { MetricCard } from "@/modules/dashboard/components/MetricCard";
import { ReportChart } from "@/modules/dashboard/components/ReportChart";
import { HorizontalBarChart } from "@/modules/dashboard/components/HorizontalBarChart";
import { Filter, Users, MessageSquare, MessagesSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ChannelsService } from "@/services/Channels/queries";
import { useAuth } from "@/contexts/AuthContext";

export function Dashboard() {
  const companyId = useAuth().user?.company_id;
  const { data: channels } = useQuery({
    queryKey: ["channels"],
    queryFn: () => ChannelsService.getChannels(companyId!),
  });

  useEffect(() => {}, [channels]);

  const metricCards = [
    {
      title: "Usuarios nuevos",
      value: 3500,
      change: 6,
      period: "Últimos 7 días",
      icon: Users,
    },
    {
      title: "Conversiones",
      value: 1204,
      change: 40,
      period: "Últimos 7 días",
      icon: Filter,
    },
    {
      title: "Chats",
      value: 6300,
      change: 16,
      period: "Últimos 7 días",
      icon: MessagesSquare,
    },
    {
      title: "Mensajes recibidos",
      value: 10401,
      change: 32,
      period: "Últimos 7 días",
      icon: MessageSquare,
    },
  ];

  return (
    <div className="container mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
      <div className="flex flex-1 flex-col gap-8">
        <div className="grid auto-rows-min gap-6 grid-cols-1 xs:grid-cols-2 md:grid-cols-4">
          {metricCards.map((card, index) => (
            <MetricCard
              key={index}
              value={card.value}
              change={card.change}
              period={card.period}
              title={card.title}
              icon={card.icon}
            />
          ))}
        </div>
        <div className="grid gap-6 grid-cols-1 md:grid-cols-8">
          <div className="rounded-2xl bg-gray-400 md:col-span-5">
            <ReportChart />
          </div>
          <div className="rounded-2xl bg-gray-400 md:col-span-3">
            <HorizontalBarChart />
          </div>
        </div>
      </div>
    </div>
  );
}
