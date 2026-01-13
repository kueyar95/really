import { MessageSquare } from "lucide-react";

export function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center h-full"
      style={{
        backgroundImage: "url('/bg_wa_chat.jpg')",
        backgroundRepeat: "repeat",
        backgroundSize: "contain",
        backgroundColor: "#efeae2",
      }}
    >
      <div className="flex flex-col items-center gap-4 max-w-[400px] text-center p-6">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
          <MessageSquare className="w-7 h-7 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500">
          Selecciona un chat para comenzar
        </p>
      </div>
    </div>
  );
}