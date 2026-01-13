import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [messageInput, setMessageInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    onSendMessage(messageInput.trim());
    setMessageInput("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex-none p-4 bg-[#f0f2f5] border-t">
      <div className="flex items-center gap-2">
        <Input
          type="text"
          placeholder="Escribe un mensaje..."
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          disabled={disabled}
          className="bg-white border-0 text-gray-900 placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-full"
        />
        <Button
          type="submit"
          disabled={!messageInput.trim() || disabled}
          className="bg-[#00a884] hover:bg-[#00a884]/90 text-white h-10 w-10 rounded-full"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </form>
  );
}