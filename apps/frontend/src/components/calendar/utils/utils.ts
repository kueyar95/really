import { format } from "date-fns"
import { CalendarEvent } from "./types"
import { EventType } from "@/services/Calendar/types"

export const START_HOUR = 7
export const END_HOUR = 20

export const createTimeBlocks = (blockSize: number): string[] => {
  const totalMinutes = (END_HOUR - START_HOUR) * 60
  const displayBlocks = Math.floor(totalMinutes / blockSize)

  return Array.from({ length: displayBlocks }, (_, index) => {
    const totalMinutesFromStart = index * blockSize
    const hours = Math.floor(totalMinutesFromStart / 60) + START_HOUR
    const minutes = totalMinutesFromStart % 60
    const time = new Date()
    time.setHours(hours)
    time.setMinutes(minutes)
    time.setSeconds(0)
    time.setMilliseconds(0)
    return format(time, "HH:mm")
  })
}

export const createAvailableBlocks = (consultationDuration: number): string[] => {
  const totalMinutes = (END_HOUR - START_HOUR) * 60

  return Array.from(
    { length: Math.floor(totalMinutes / consultationDuration) },
    (_, index) => {
      const totalMinutesFromStart = index * consultationDuration
      const hours = Math.floor(totalMinutesFromStart / 60) + START_HOUR
      const minutes = totalMinutesFromStart % 60
      const time = new Date()
      time.setHours(hours)
      time.setMinutes(minutes)
      time.setSeconds(0)
      time.setMilliseconds(0)
      return format(time, "HH:mm")
    }
  )
}

export const calculateEventHeight = (duration: number, blockSize: number): string => {
  const blockHeight = 48
  const blocks = duration / blockSize
  return `${blocks * blockHeight}px`
}

export const getEventsForBlock = (
  blockTime: string,
  events: CalendarEvent[],
  blockSize: number
) => {
  const [blockHour, blockMinute] = blockTime.split(':').map(Number)
  const blockStartMinutes = blockHour * 60 + blockMinute
  const blockEndMinutes = blockStartMinutes + blockSize

  return events.filter(e => {
    const [eventHour, eventMinute] = e.time.split(':').map(Number)
    const eventStartMinutes = eventHour * 60 + eventMinute
    const eventEndMinutes = eventStartMinutes + e.duration

    if (e.type === EventType.BLOCK) {
      // Para eventos bloqueados, verificamos si el bloque actual está dentro del rango del evento
      return blockStartMinutes >= eventStartMinutes && blockStartMinutes < eventEndMinutes
    }

    // Para otros tipos de eventos, mantenemos la lógica original
    return eventStartMinutes >= blockStartMinutes && eventStartMinutes < blockEndMinutes
  }).map(event => {
    const [eventHour, eventMinute] = event.time.split(':').map(Number)
    const eventMinutes = eventHour * 60 + eventMinute
    const relativePosition = ((eventMinutes - blockStartMinutes) / blockSize) * 48
    return { event, relativePosition }
  })
}

export const calculateEndTime = (startTime: string, blockSize: number): string => {
  const [hours, minutes] = startTime.split(':').map(Number)
  const endDate = new Date(1970, 0, 1, hours, minutes + blockSize)
  return `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`
}

export function generateTimeBlocks(startHour: string, endHour: string, blockSize: number): string[] {
  const timeBlocks: string[] = [];
  const [startHours, startMinutes] = startHour.split(':').map(Number);
  const [endHours, endMinutes] = endHour.split(':').map(Number);

  let currentHour = startHours;
  let currentMinute = startMinutes;

  while (
    currentHour < endHours ||
    (currentHour === endHours && currentMinute <= endMinutes)
  ) {
    timeBlocks.push(
      `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`
    );

    currentMinute += blockSize;
    if (currentMinute >= 60) {
      currentHour += Math.floor(currentMinute / 60);
      currentMinute = currentMinute % 60;
    }
  }

  return timeBlocks;
}