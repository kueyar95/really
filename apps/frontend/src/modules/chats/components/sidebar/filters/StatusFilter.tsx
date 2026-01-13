import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageCircle } from "lucide-react";

export type StatusFilterValue = "all" | "open" | "closed";

interface StatusFilterProps {
  value: StatusFilterValue;
  onChange: (value: StatusFilterValue) => void;
}

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full h-7 px-2.5 text-xs bg-white border border-gray-200 hover:bg-gray-50 transition-colors duration-200 focus:ring-1 focus:ring-[#00a884] focus:ring-offset-0 rounded-full shadow-sm">
        <div className="flex items-center gap-2">
          {value === "all" && <MessageCircle className="h-3.5 w-3.5 text-gray-500 shrink-0" />}
          {value === "open" && <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />}
          {value === "closed" && <div className="h-2 w-2 rounded-full bg-gray-400 shrink-0" />}
          <SelectValue className="truncate">
            {value === "all" && "Ver todos"}
            {value === "open" && "Abiertos"}
            {value === "closed" && "Cerrados"}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent side="bottom" align="end" className="w-[120px]">
        <SelectItem value="all" className="text-xs py-2">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-3.5 w-3.5 text-gray-500" />
            <span>Ver todos</span>
          </div>
        </SelectItem>
        <SelectItem value="open" className="text-xs py-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span>Abiertos</span>
          </div>
        </SelectItem>
        <SelectItem value="closed" className="text-xs py-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-gray-400" />
            <span>Cerrados</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}