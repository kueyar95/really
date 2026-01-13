import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Bot, MessageSquare, Settings, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { BotsService } from "@/services/Bots/queries";
import { AiBot, PromptBlock } from "@/services/Bots/types";
import { SystemPromptBlock } from "./components/SystemPromptBlock";
import api from "@/services/api";

interface Message {
  content: string;
  isBot: boolean;
  timestamp: Date;
}

const blockNameTranslation = {
  personification: "Personificación",
  objective: "Objetivo",
  predefined_behavior: "Comportamiento predefinido",
  response_format: "Formato de respuesta",
  steps_to_follow: "Pasos a seguir",
  possible_cases: "Casos posibles",
  business_info: "Información de la empresa",
  products_info: "Información de los productos",
  important_info: "Información importante",
  dont_do: "No hacer",
  communication_context: "Contexto de comunicación",
};

export default function TryBotPage() {
  const { id } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    data: botInfo,
    isLoading,
    error,
  } = useQuery<AiBot>({
    queryKey: ["ai-bot", id],
    queryFn: () => BotsService.getBot(id!),
    enabled: !!id,
  });

  // Handle query error
  if (error) {
    toast({
      title: "Error",
      description: "No se pudo cargar la información del bot",
      variant: "destructive",
    });
  }

  const getSystemPrompt = (blocks?: PromptBlock[]): PromptBlock[] => {
    if (!blocks || blocks.length === 0) return [];

    const translatedBlocks = blocks.map((block) => ({
      ...block,
      block_name: block.block_name ? block.block_name : blockNameTranslation[block.block_identifier as keyof typeof blockNameTranslation]
    }));

    return translatedBlocks;
  };

  const getSystemPromptContent = (blocks?: PromptBlock[]): string => {
    if (!blocks || blocks.length === 0) return "";
    return blocks
      .filter((block) => block.block_content.trim() !== "")
      .map((block) => `${block.block_identifier}:\n${block.block_content}`)
      .join("\n\n");
  };

  const formatChatHistoryForAPI = (
    messages: Message[]
  ): any[] => {
    return messages.map((msg) => ({
      role: msg.isBot ? "assistant" : "user",
      content: msg.content,
    }));
  };

  const clearChatHistory = () => {
    setMessages([]);
    toast({
      title: "Chat limpiado",
      description: "Se ha borrado el historial del chat",
    });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !botInfo || !botInfo.mainConfig) return;

    const newMessage: Message = {
      content: inputMessage,
      isBot: false,
      timestamp: new Date(),
    };

    const newMessages = [...messages, newMessage];
    setMessages(newMessages);
    setInputMessage("");
    setIsSending(true);

    try {
      // Prepare the request payload
      const payload = {
        message: inputMessage,
        chatHistory: formatChatHistoryForAPI(newMessages),
        systemPrompt: getSystemPromptContent(botInfo.sysPrompt),
        botConfig: {
          model: botInfo.mainConfig.model || "gpt-4-turbo-preview",
          maxTokens: botInfo.mainConfig.maxTokens || 1000,
          temperature: botInfo.mainConfig.temperature || 0.7,
        }
      };

      // Make request to your backend
      const response = await api.post('/ai-bots/try-chat', payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = response.data;
      
      if (data.content) {
        const botMessage: Message = {
          content: data.content,
          isBot: true,
          timestamp: new Date(),
        };
        setMessages([...newMessages, botMessage]);
      } else {
        throw new Error("No response from bot");
      }
    } catch (error) {
      console.error("Error calling chat endpoint:", error);
      // Revert the user's message if there's an error
      setMessages(messages);
      toast({
        title: "Error",
        description: "No se pudo obtener la respuesta del bot",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Improved scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Also scroll when sending state changes (for loading indicator)
  useEffect(() => {
    scrollToBottom();
  }, [isSending]);

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Cargando información del bot...</span>
        </div>
      </div>
    );
  }

  if (!botInfo || !botInfo.mainConfig) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="flex items-center gap-2">
          <span>
            No se encontró la información del bot o está mal configurado
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-4 p-4">
      {/* Bot Info Sidebar */}
      <Card className="w-1/3 p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Bot className="h-8 w-8" />
          <div className="flex items-center justify-between w-full">
            <span className="font-semibold text-lg">{botInfo.name}</span>
            <Button
              variant="outline"
              size="icon"
              className="ml-1"
              onClick={() => navigate(`/dashboard/admin/bots/edit-bot/${id}`)}
              title="Editar bot"
            >
              <Settings className="h-4 w-4" />
            </Button>
            {/* <p className="text-sm text-muted-foreground">ID: {botInfo.id}</p> */}
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div>
            <h3 className="text-md font-medium mb-2">Configuración del modelo</h3>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-bold text-foreground text-sm">Modelo:</span> {botInfo.mainConfig.model}
              </p>
              <p className="text-sm">
                <span className="font-bold text-foreground text-sm">Temperatura:</span> {botInfo.mainConfig.temperature}
              </p>
              <p className="text-sm">
                <span className="font-bold text-foreground text-sm">Máximo de tokens:</span> {botInfo.mainConfig.maxTokens}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Prompt del sistema</h3>
            <ScrollArea className="h-[calc(100vh-24rem)]">
              <div className="space-y-2 pr-4">
                <div className="flex flex-col gap-2">
                  {getSystemPrompt(botInfo.sysPrompt).map((block, index: number) => (
                    <SystemPromptBlock 
                      key={index} 
                      block={block} 
                      onClick={() => {}} 
                    />
                  ))}
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 px-6 py-4">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <h2 className="font-semibold">Conversa con {botInfo.name}</h2>
            </div>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearChatHistory}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpiar chat
              </Button>
            )}
          </div>

          <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <p>No hay mensajes. Comienza la conversación...</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex",
                      message.isBot ? "justify-start" : "justify-end"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-lg py-2 px-4 max-w-[70%]",
                        message.isBot
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-primary text-primary-foreground"
                      )}
                    >
                      <div className="flex flex-col">
                        <p className="text-sm whitespace-pre-line">{message.content}</p>
                        <span className="text-xs font-light opacity-70">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {isSending && (
                  <div className="flex justify-start">
                    <div className="rounded-lg py-2 px-4 bg-secondary text-secondary-foreground">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">
                          El bot está escribiendo...
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {/* Add an invisible element at the end to scroll to */}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          <div className="flex gap-2 mt-6 border-t pt-4">
            <Input
              placeholder="Escribe tu mensaje..."
              value={inputMessage}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setInputMessage(e.target.value)
              }
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isSending}
              className="flex-1"
            />
            <Button onClick={handleSendMessage} disabled={isSending}>
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Enviar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
