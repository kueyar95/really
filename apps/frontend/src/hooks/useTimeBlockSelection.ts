import { useState, useEffect } from "react";
import { format } from "date-fns";
import { SelectionRange } from "@/components/calendar/utils/types";
import { calculateEndTime } from "@/components/calendar/utils/utils";

interface UseTimeBlockSelectionProps {
  availableBlocks: string[];
  blockSize: number;
  onSelectionChange?: (range: SelectionRange | null) => void;
}

export function useTimeBlockSelection({
  availableBlocks,
  blockSize,
  onSelectionChange
}: UseTimeBlockSelectionProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsSelecting(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const updateSelection = (day: Date, startIndex: number, endIndex: number) => {
    const [start, end] = [
      Math.min(startIndex, endIndex),
      Math.max(startIndex, endIndex)
    ];

    onSelectionChange?.({
      startDate: day,
      endDate: day,
      startTime: availableBlocks[start],
      endTime: calculateEndTime(availableBlocks[end], blockSize)
    });
  };

  const handleBlockMouseDown = (day: Date, time: string) => {
    if (!availableBlocks.includes(time)) return;

    const timeIndex = availableBlocks.indexOf(time);
    setSelectedDay(day);
    setSelectionStart(timeIndex);
    setSelectionEnd(timeIndex);
    setIsSelecting(true);
    updateSelection(day, timeIndex, timeIndex);
  };

  const isBlockSelected = (day: Date, time: string) => {
    if (!selectedDay || selectionStart === null || selectionEnd === null) return false;
    if (format(day, 'yyyy-MM-dd') !== format(selectedDay, 'yyyy-MM-dd')) return false;
    if (!availableBlocks.includes(time)) return false;

    const timeIndex = availableBlocks.indexOf(time);
    const [start, end] = [
      Math.min(selectionStart, selectionEnd),
      Math.max(selectionStart, selectionEnd)
    ];

    return timeIndex >= start && timeIndex <= end;
  };

  const clearSelection = () => {
    setSelectionStart(null);
    setSelectionEnd(null);
    onSelectionChange?.(null);
  };

  return {
    isSelecting,
    handleBlockMouseDown,
    isBlockSelected,
    clearSelection
  };
}