import { CalendarService } from '@/services/Calendar/queries';
import { useQuery } from '@tanstack/react-query';


export const useGoogleCalendarId = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['google-calendar-id'],
    queryFn: CalendarService.getCalendarId,
  });

  return {
    calendarId: data?.googleCalendarId,
    calendarName: data?.calendarName,
    isLoading,
    error,
  };
};