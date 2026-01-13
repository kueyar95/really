import { useMutation, useQuery } from '@tanstack/react-query';
import { CalendarService } from '@/services/Calendar/queries';
import { CreateEventDto } from '@/services/Calendar/types';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { useToast } from './use-toast';

export const useCalendarEvents = (calendarId?: string, currentDate?: Date) => {
  const { toast } = useToast();

  const { data: eventsData, refetch: refetchEvents } = useQuery({
    queryKey: ['calendar-events', calendarId, format(currentDate || new Date(), 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!calendarId || !currentDate) return null;

      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });

      const startDate = format(start, 'yyyy-MM-dd');
      const endDate = format(end, 'yyyy-MM-dd');

      return CalendarService.getEvents(calendarId, startDate, endDate);
    },
    enabled: !!calendarId && !!currentDate,
  });

  const { mutateAsync: createEvent } = useMutation({
    mutationFn: async (data: CreateEventDto) => {
      if (!calendarId) throw new Error('No hay un calendario seleccionado');
      return CalendarService.createEvent(calendarId, data);
    },
    onSuccess: () => {
      refetchEvents();
      toast({
        title: 'Éxito',
        description: 'Evento creado correctamente',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });

  return {
    events: eventsData?.events || [],
    createEvent,
  };
};