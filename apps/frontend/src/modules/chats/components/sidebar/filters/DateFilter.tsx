import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as DatePicker } from "@/components/ui/calendar";
import { useEffect, useState } from "react";

export type DateFilterValue = "all" | "today" | "3days" | "7days" | "30days" | "exact";

interface DateFilterProps {
  value: DateFilterValue;
  exactDate?: Date;
  onChange: (value: DateFilterValue, exactDate?: Date) => void;
}

export function DateFilter({ value, exactDate, onChange }: DateFilterProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const handleOptionClick = (selectedValue: DateFilterValue) => {
    if (selectedValue === "exact") {
      setShowCalendar(true);
    } else {
      onChange(selectedValue);
      setShowCalendar(false);
      setPopoverOpen(false);
    }
  };

  const handleCalendarClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (value === "exact" && !exactDate) {
      return; // No cerrar si está en modo exacto y no hay fecha seleccionada
    }
    setShowCalendar(false);
  };

  return (
    <div className="relative">
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`w-full h-7 px-2.5 text-xs bg-white border-gray-200 hover:bg-gray-50 transition-colors duration-200 focus:ring-1 focus:ring-[#00a884] focus:ring-offset-0 rounded-full shadow-sm justify-start ${
              value === "exact" ? "text-[#00a884]" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              {value === "exact" ? (
                <>
                  <div className="h-2 w-2 rounded-full bg-[#00a884] shrink-0" />
                  <span className="truncate">
                    {exactDate ? format(exactDate, "d 'de' MMMM", { locale: es }) : "Fecha exacta"}
                  </span>
                </>
              ) : (
                <>
                  <Calendar className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                  <span className="truncate">
                    {value === "all" && "Todas las fechas"}
                    {value === "today" && "Hoy"}
                    {value === "3days" && "Últimos 3 días"}
                    {value === "7days" && "Últimos 7 días"}
                    {value === "30days" && "Últimos 30 días"}
                  </span>
                </>
              )}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="end" className="w-[240px] p-2">
          <div className="flex flex-col gap-1">
            <button
              className="w-full flex items-center gap-2 text-xs py-2 px-2 hover:bg-gray-100 rounded-md transition-colors"
              onClick={() => handleOptionClick("all")}
            >
              <Calendar className="h-3.5 w-3.5 text-gray-500" />
              <span>Todas las fechas</span>
            </button>
            <button
              className="w-full flex items-center gap-2 text-xs py-2 px-2 hover:bg-gray-100 rounded-md transition-colors"
              onClick={() => handleOptionClick("today")}
            >
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span>Hoy</span>
            </button>
            <button
              className="w-full flex items-center gap-2 text-xs py-2 px-2 hover:bg-gray-100 rounded-md transition-colors"
              onClick={() => handleOptionClick("3days")}
            >
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>Últimos 3 días</span>
            </button>
            <button
              className="w-full flex items-center gap-2 text-xs py-2 px-2 hover:bg-gray-100 rounded-md transition-colors"
              onClick={() => handleOptionClick("7days")}
            >
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <span>Últimos 7 días</span>
            </button>
            <button
              className="w-full flex items-center gap-2 text-xs py-2 px-2 hover:bg-gray-100 rounded-md transition-colors"
              onClick={() => handleOptionClick("30days")}
            >
              <div className="h-2 w-2 rounded-full bg-purple-500" />
              <span>Últimos 30 días</span>
            </button>
            <button
              className="w-full flex items-center gap-2 text-xs py-2 px-2 hover:bg-gray-100 rounded-md transition-colors"
              onClick={() => handleOptionClick("exact")}
            >
              <div className="h-2 w-2 rounded-full bg-[#00a884]" />
              <span>Fecha exacta</span>
            </button>
          </div>
      {(showCalendar || value === "exact") && (
          <div
            onClick={handleCalendarClose}
            className="absolute bg-white rounded-md shadow-lg border p-3"
            style={{ top: 0, left: '100%', marginLeft: '3px'}}
          >

            <DatePicker
              mode="single"
              selected={exactDate}
              onSelect={(date) => {
                if (date) {
                  onChange("exact", date);
                  setShowCalendar(false);
                  setPopoverOpen(false);
                }
              }}
              className="rounded-md border"
              locale={es}
            />
          </div>
      )}
        </PopoverContent>
      </Popover>

    </div>
  );
}

export function isWithinDateRange(date: Date, filter: DateFilterValue, exactDate?: Date): boolean {
  const normalizeDate = (d: Date) => {
    const normalized = new Date(d);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };

  const today = normalizeDate(new Date());
  const targetDate = normalizeDate(date);

  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(today.getDate() - 3);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const normalizedExactDate = exactDate ? normalizeDate(exactDate) : null;

  switch (filter) {
    case "all":
      return true;
    case "today":
      return targetDate.getTime() === today.getTime();
    case "3days":
      return targetDate >= threeDaysAgo;
    case "7days":
      return targetDate >= sevenDaysAgo;
    case "30days":
      return targetDate >= thirtyDaysAgo;
    case "exact":
      if (!normalizedExactDate) return false;
      return targetDate.getTime() === normalizedExactDate.getTime();
    default:
      return true;
  }
}