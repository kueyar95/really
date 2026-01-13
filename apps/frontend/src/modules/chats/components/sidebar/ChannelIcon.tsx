import { MessageSquare } from "lucide-react";
import { BsWhatsapp, BsInstagram, BsMessenger, BsTelegram } from "react-icons/bs";

interface ChannelIconProps {
  type: string;
}

export function ChannelIcon({ type }: ChannelIconProps) {
  switch (type) {
    case 'whatsapp_cloud':
    case 'whatsapp_baileys':
      return <BsWhatsapp className="w-4 h-4 text-green-500" />;
    case 'instagram':
      return <BsInstagram className="w-4 h-4 text-pink-500" />;
    case 'facebook':
      return <BsMessenger className="w-4 h-4 text-blue-500" />;
    case 'telegram':
      return <BsTelegram className="w-4 h-4 text-blue-400" />;
    default:
      return <MessageSquare className="w-4 h-4 text-gray-500" />;
  }
}