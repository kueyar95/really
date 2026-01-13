import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StepCardItem } from "./StepCardItem";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { ChevronLeft, ChevronRight, Bot, Edit, User, Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getStageClients } from "@/services/Stages/queries";
import { StepCardSkeleton } from "./StepCardSkeleton";
import { Chat, StageClient } from "@/services/Stages/types";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationSettingsModal } from "./NotificationSettingsModal";

interface StepCardProps {
  id: string;
  title: string;
  description: string;
  quantity: number;
  respondedBy: string;
  botId: string | null;
  notificationEmails?: string[];
}

export function StepCard({
  id,
  title,
  description,
  quantity,
  respondedBy,
  botId,
  notificationEmails,
}: StepCardProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage: number = 4;
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  const { data: clients, isLoading: isLoadingClients } = useQuery({
    queryKey: ["stageClients", id],
    queryFn: async () => {
      const data = await getStageClients(id);
      return data;
    },
  });

  const chats: Chat[] =
    clients?.map((client: StageClient) => ({
      user: client.name,
      phone: client.phone,
      date: new Date(client.assignedAt || Date.now())
        .toISOString()
        .split("T")[0],
      message: `Email: ${client.email}`,
      assignedUser: client.assignedUser?.username,
      clientId: client.id,
      channelId: client.funnelChannel.channelId,
      channelType: client.funnelChannel.channel.type,
    })) || [];

  const totalPages: number = Math.ceil(chats.length / itemsPerPage);
  const visiblePages = 4;

  const currentItems = chats.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const calculatePageRange = () => {
    const start = Math.max(1, currentPage - Math.floor(visiblePages / 2));
    const end = Math.min(totalPages, start + visiblePages - 1);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  };

  const pageRange = calculatePageRange();

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrev = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (isLoadingClients) {
    return <StepCardSkeleton />;
  }

  return (
    <>
      <Card className="min-w-[360px] w-[360px] h-fit rounded-2xl">
        <CardHeader className="p-4 h-[98px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {respondedBy === "bot" ? (
                <Bot className="h-7 w-7 text-blue-600 bg-blue-100 p-1 rounded-sm" />
              ) : (
                <User className="h-7 w-7 text-amber-500 bg-amber-100 p-1 rounded-sm" />
              )}
              <CardTitle
                className={`text-base font-medium ${
                  respondedBy === "bot" ? "text-blue-600" : "text-amber-500"
                }`}
              >
                {title}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && respondedBy === "bot" && botId && (
                <Link to={`/dashboard/admin/bots/edit-bot/${botId}`}>
                  <Edit className="h-4 w-4 text-gray-500 cursor-pointer hover:text-gray-700" />
                </Link>
              )}
              {isAdmin && respondedBy === "human" && (
                <button
                  onClick={() => setIsNotificationModalOpen(true)}
                  className="p-1 hover:bg-gray-200 rounded"
                  aria-label="Configurar notificaciones"
                >
                  <Bell className="h-4 w-4 text-gray-500 cursor-pointer hover:text-gray-700" />
                </button>
              )}
              <p className="text-sm text-muted-foreground">{quantity}</p>
            </div>
          </div>
          <CardDescription>
            {description.length > 50
              ? description.slice(0, 50) + "..." + description.length.toString()
              : description}
          </CardDescription>
        </CardHeader>
        <Separator orientation="horizontal" />
        <CardContent className="p-4 min-h-[700px]">
          <div className="flex flex-col gap-4">
            {currentItems.map((chat, index) => (
              <StepCardItem
                key={index}
                user={chat?.user}
                phone={chat?.phone}
                date={chat?.date}
                channelId={chat?.channelId}
                channelType={chat?.channelType}
                message={chat?.message}
                assignedUser={chat?.assignedUser}
                clientId={chat?.clientId}
                currentStageId={id}
                botId={botId}
              />
            ))}
          </div>
        </CardContent>
        <Separator orientation="horizontal" />
        <CardFooter className="p-4">
          <Pagination className="w-full" key={id} id={id}>
            <PaginationContent className="w-full justify-between">
              <PaginationItem>
                <PaginationLink onClick={handlePrev} className={`px-3 py-1`}>
                  <ChevronLeft />
                </PaginationLink>
              </PaginationItem>

              {pageRange.map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 border rounded cursor-default select-none ${
                      page === currentPage ? "border-gray-800" : ""
                    }`}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationLink onClick={handleNext} className={`px-3 py-1`}>
                  <ChevronRight />
                </PaginationLink>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </CardFooter>
      </Card>
      {isAdmin && respondedBy === "human" && (
        <NotificationSettingsModal
          isOpen={isNotificationModalOpen}
          onClose={() => setIsNotificationModalOpen(false)}
          stageId={id}
          stageName={title}
          initialEmails={notificationEmails || []}
        />
      )}
    </>
  );
}
