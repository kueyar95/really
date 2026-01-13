import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { EventType, CreateEventDto } from "@/services/Calendar/types";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  date: z.date(),
  startTime: z.string().min(1, "La hora de inicio es requerida"),
  duration: z.number().min(15, "La duración mínima es de 15 minutos"),
  type: z.nativeEnum(EventType),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateEventDto) => Promise<void>;
  defaultDate?: string;
  defaultTime?: string;
}

const timeOptions = Array.from({ length: 24 * 4 }, (_, i) => {
  const hour = Math.floor(i / 4);
  const minute = (i % 4) * 15;
  return format(new Date().setHours(hour, minute), 'HH:mm');
});

export function CreateEventModal({
  open,
  onOpenChange,
  onSubmit,
  defaultDate = "",
  defaultTime = "",
}: CreateEventModalProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      date: defaultDate ? new Date(defaultDate + "T00:00:00") : new Date(),
      startTime: defaultTime || "09:00",
      duration: 30,
      type: EventType.APPOINTMENT,
      description: "",
    },
  });

  const handleSubmit = async (data: FormValues) => {
    try {
      const localDate = new Date(data.date);
      localDate.setHours(12);

      // Aseguramos que la fecha no se ajuste por zona horaria
      const formattedDate = format(localDate, 'yyyy-MM-dd');

      await onSubmit({
        ...data,
        date: formattedDate
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error al crear el evento:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Crear Nuevo Evento</DialogTitle>
          <DialogDescription>
            Complete los detalles del evento para agregarlo a su calendario
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Título del Evento</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Reunión con cliente"
                        {...field}
                        className="h-10 px-3 py-2 border focus:border-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col mt-1">
                      <FormLabel className="text-sm font-medium">Fecha</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "h-10 px-3 py-2 border ",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
                              {field.value ? (
                                format(field.value, "PPP", { locale: es })
                              ) : (
                                <span>Seleccionar fecha</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                            className="rounded-md border"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Hora de Inicio</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10 px-3 py-2 border focus:ring focus:ring-primary/20">
                            <SelectValue>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 opacity-70" />
                                {field.value}
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={time} value={time} className="cursor-pointer">
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Duración</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        defaultValue={field.value.toString()}
                      >
                        <FormControl>
                            <SelectTrigger className="h-10 px-3 py-2 border focus:ring focus:ring-primary/20">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="15" className="cursor-pointer">15 minutos</SelectItem>
                          <SelectItem value="30" className="cursor-pointer">30 minutos</SelectItem>
                          <SelectItem value="45" className="cursor-pointer">45 minutos</SelectItem>
                          <SelectItem value="60" className="cursor-pointer">1 hora</SelectItem>
                          <SelectItem value="90" className="cursor-pointer">1.5 horas</SelectItem>
                          <SelectItem value="120" className="cursor-pointer">2 horas</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Tipo de Evento</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 px-3 py-2 border focus:ring focus:ring-primary/20">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={EventType.APPOINTMENT} className="cursor-pointer">
                            🤝 Cita
                          </SelectItem>
                          <SelectItem value={EventType.BLOCK} className="cursor-pointer">
                            🚫 Bloqueo
                          </SelectItem>
                          <SelectItem value={EventType.HOLIDAY} className="cursor-pointer">
                            🎉 Festivo
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Agregue detalles adicionales sobre el evento..."
                        className="resize-none min-h-[100px] border focus:ring focus:ring-primary/20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-10 px-4"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Crear Evento
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}