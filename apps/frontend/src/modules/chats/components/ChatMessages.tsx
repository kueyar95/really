import { ChatMessage } from '@/services/Whatsapp/types';
import { ChatMessage as ChatMessageComponent } from './ChatMessage';
import { MessageSkeleton } from './MessageSkeleton';
import { useEffect, useRef, useState } from 'react';

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Use a state value to track messages length for forcing re-renders
  const [messagesLength, setMessagesLength] = useState(messages?.length || 0);
  
  // Debug: Log cuando cambian los mensajes
  useEffect(() => {
    console.log('[ChatMessages] Renderizado:', {
      messagesCount: messages?.length || 0,
      isLoading,
      messages: messages?.slice(0, 3).map(m => ({ id: m.id, message: m.message.substring(0, 50) }))
    });
  }, [messages, isLoading]);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages?.length !== messagesLength) {
      setMessagesLength(messages?.length || 0);
      
      // Scroll to bottom with a small delay to ensure DOM has updated
      const scrollTimer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
      return () => clearTimeout(scrollTimer);
    }
  }, [messages, messagesLength]);

  return (
    <div className="flex flex-col min-h-full justify-end">
      <div className="flex flex-col gap-2 p-4">
        {isLoading ? (
          <MessageSkeleton />
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessageComponent key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
    </div>
  );
}