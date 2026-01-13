import { CalendarService } from '@/services/Calendar/queries';
import { useQuery } from '@tanstack/react-query';

export const useGoogleCalendarList = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['google-calendars-list'],
    queryFn: CalendarService.listCalendars,
    enabled: true,
  });

  return {
    calendars: data?.calendars || [],
    isLoading,
    error,
    refetch,
  };
};