import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users } from "lucide-react";

export type AssignmentFilterValue = "all" | "assigned" | "unassigned";

interface AssignmentFilterProps {
  value: AssignmentFilterValue;
  onChange: (value: AssignmentFilterValue) => void;
}

export function AssignmentFilter({ value, onChange }: AssignmentFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full h-7 px-2.5 text-xs bg-white border border-gray-200 hover:bg-gray-50 transition-colors duration-200 focus:ring-1 focus:ring-[#00a884] focus:ring-offset-0 rounded-full shadow-sm">
        <div className="flex items-center gap-2">
          {value === "all" && <Users className="h-3.5 w-3.5 text-gray-500 shrink-0" />}
          {value === "assigned" && <div className="h-2 w-2 rounded-full bg-[#00a884] shrink-0" />}
          {value === "unassigned" && <div className="h-2 w-2 rounded-full border-2 border-gray-400 shrink-0" />}
          <SelectValue className="truncate">
            {value === "all" && "Ver todos"}
            {value === "assigned" && "Con agente"}
            {value === "unassigned" && "Sin agente"}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent side="bottom" align="end" className="w-[120px]">
        <SelectItem value="all" className="text-xs py-2">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-gray-500" />
            <span>Ver todos</span>
          </div>
        </SelectItem>
        <SelectItem value="assigned" className="text-xs py-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#00a884]" />
            <span>Con agente</span>
          </div>
        </SelectItem>
        <SelectItem value="unassigned" className="text-xs py-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full border-2 border-gray-400" />
            <span>Sin agente</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}