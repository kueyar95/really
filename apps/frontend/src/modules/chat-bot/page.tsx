"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ChatBotService } from "@/services/chat-bot/queries";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatBotPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "¡Hola! ¿En qué puedo ayudarte hoy?" },
  ]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (input.trim() && user?.id) {
      try {
        setIsLoading(true);
        // Agregar mensaje del usuario
        setMessages((prev) => [...prev, { role: "user", content: input }]);

        // Enviar mensaje al backend
        const response = await ChatBotService.sendMessage({
          input: input.trim(),
          sessionId: sessionId || "default-session",
        });

        // Agregar respuesta del asistente
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: response },
        ]);
        setInput("");
      } catch (error) {
        console.error("Error al enviar mensaje:", error);
        // Opcional: Mostrar mensaje de error al usuario
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <Card className="w-full">
        <CardHeader className="space-y-2">
          <Input
            placeholder="Session ID"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
          />
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-4 h-[500px] overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`rounded-lg px-4 py-2 max-w-[80%] ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
          </div>
        </CardContent>

        <CardFooter className="space-x-2">
          <Input
            placeholder="Escribe tu mensaje..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !isLoading) {
                handleSend();
              }
            }}
            disabled={isLoading}
          />
          <Button onClick={handleSend} disabled={isLoading}>
            {isLoading ? "Enviando..." : "Enviar"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
