import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { createStage } from "@/services/Stages/queries";
import { useState } from "react";
import { StageStatus } from "@/services/Stages/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BotsService } from "@/services/Bots/queries";

const formSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  order: z.number().min(0),
  botId: z.number().optional(),
});

interface CreateStageSheetProps {
  funnelId: string;
  companyId: string;
}

export function CreateStageSheet({ funnelId, companyId }: CreateStageSheetProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: bots } = useQuery({
    queryKey: ["bots"],
    queryFn: BotsService.getAllBots,
  });

  const createStageMutation = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) =>
      createStage({
        ...values,
        funnelId,
        status: StageStatus.ACTIVE,
        botId: values.botId?.toString() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funnel-stages", funnelId] });
      queryClient.invalidateQueries({ queryKey: ["funnels", companyId] });
      form.reset();
      setOpen(false);
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      order: 0,
      botId: undefined,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    createStageMutation.mutate(values);
  }

  return (
    bots && (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button className="flex items-center gap-2 mr-4" variant="outline">
            <PlusCircle className="h-4 w-4" />
            Crear Etapa
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Crear nueva etapa</SheetTitle>
          </SheetHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6 mt-8"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre de la etapa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descripción de la etapa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="botId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bot Asignado</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un bot" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bots?.map((bot) => (
                          <SelectItem key={bot.id} value={bot.id.toString()}>
                            {bot.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={createStageMutation.isPending}
              >
                {createStageMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  "Crear Etapa"
                )}
              </Button>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    )
  );
}
