import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
      <Input
        type="text"
        placeholder="Buscar chat..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-8 h-8 text-sm bg-white border-gray-200"
      />
    </div>
  );
}