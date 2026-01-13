import { ChatMessage as ChatMessageType, MediaMessage } from '@/services/Whatsapp/types';
import ReactMarkdown from 'react-markdown';

interface MessageContentProps {
  message: string;
  media?: MediaMessage;
}

function MessageContent({ message, media }: MessageContentProps) {
  if (!media) {
    return <ReactMarkdown>{message}</ReactMarkdown>;
  }
  return (
    <div className="space-y-2">
      {message && media.type !== "sticker" && (
        <ReactMarkdown>{message}</ReactMarkdown>
      )}
    </div>
  );
}

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div className={`flex ${message.direction === "inbound" ? "justify-start" : "justify-end"}`}>
      <div className={`max-w-[70%] rounded-lg p-3 shadow-sm ${
        message.direction === "inbound" ? "bg-white text-gray-900" : "bg-[#d9fdd3] text-gray-900"
      }`}>
        <div className="text-sm whitespace-pre-wrap break-words">
          <MessageContent message={message.message} media={message.metadata?.media as MediaMessage} />
        </div>
        <p className={`text-[11px] mt-1 text-gray-500 ${message.direction === 'inbound' ? 'text-left' : 'text-right'}`}>
          {new Date(message.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}