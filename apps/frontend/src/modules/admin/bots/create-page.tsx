import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowLeft } from "lucide-react";
import { PromptBlock, Step } from "@/services/Bots/types";
import { PromptBlocksContainer } from "./components/PromptBlocksContainer";
import { CreateAiBotDto, BotsService } from "@/services/Bots/queries";
import { BLOCK_CONFIGS } from "@/modules/admin/funnels/templates/defaultBlocks";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const AVAILABLE_FUNCTIONS = [
  { id: "getSchedule", name: "Obtener horarios disponibles" },
  { id: "createAppointment", name: "Crear cita" },
  { id: "change_stage-20", name: "Cambiar etapa a 20" },
  { id: "change_stage-21", name: "Cambiar etapa a 21" },
  { id: "getProducts", name: "Obtener productos" },
  { id: "createQuote", name: "Crear cotización" },
  { id: "change_stage", name: "Cambiar etapa" },
];

const formSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  mainConfig: z.object({
    model: z.string(),
    maxTokens: z.number().min(100).max(10000).default(1000),
    temperature: z.number().min(0).max(2).step(0.1).default(0.5),
  }),
});

export default function CreateBotPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [promptBlocks, setPromptBlocks] = useState<PromptBlock[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      mainConfig: {
        model: "gpt-4o-mini",
        maxTokens: 1000,
        temperature: 0.5,
      },
    },
  });

  const validateStepsBlock = (block: PromptBlock): Step[] | null => {
    if (!block.block_content) return null;

    try {
      const steps = JSON.parse(block.block_content);
      if (!Array.isArray(steps)) return null;

      // Validar la estructura de cada paso
      const validSteps = steps.every(
        (step) =>
          typeof step === "object" &&
          typeof step.text === "string" &&
          typeof step.number === "number" &&
          Array.isArray(step.functions)
      );

      return validSteps ? steps : null;
    } catch (error) {
      console.error("Error parsing steps:", error);
      return null;
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user?.company.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se encontró la compañía asociada.",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Find the steps block if it exists
      const stepsBlock = promptBlocks.find(
        (block) => block.block_identifier === "steps_to_follow"
      );

      let parsedSteps: Step[] | null = null;
      if (stepsBlock) {
        parsedSteps = validateStepsBlock(stepsBlock);
        if (stepsBlock.block_content && !parsedSteps) {
          toast({
            variant: "destructive",
            title: "Error de validación",
            description:
              "El formato de los pasos no es válido. Por favor, revisa la configuración.",
          });
          return;
        }
      }

      const createDto: CreateAiBotDto = {
        ...values,
        companyId: user.company.id,
        sysPrompt: promptBlocks.map((block) => ({
          block_identifier: block.block_identifier,
          block_content: block.block_content || "",
        })),
        ...(parsedSteps ? { steps: parsedSteps } : {}),
      };

      await BotsService.createBot(createDto);
      toast({
        title: "Bot creado",
        description: "El bot se ha creado correctamente.",
      });
      navigate("/dashboard/admin/bots");
    } catch (error: any) {
      console.error("Error creating bot:", error);
      toast({
        variant: "destructive",
        title: "Error al crear el bot",
        description:
          error.response?.data?.message || "Ocurrió un error al crear el bot.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard/admin/bots")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h3 className="text-2xl font-bold tracking-tight">
          Crear nuevo agente
        </h3>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nombre del bot"
                      {...field}
                      className="border rounded-md bg-white"
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <div>
              <FormLabel>Configuración del prompt</FormLabel>
              <PromptBlocksContainer
                initialBlocks={promptBlocks}
                onChange={setPromptBlocks}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mainConfig.maxTokens"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Tokens</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={100}
                        max={10000}
                        className="border rounded-md bg-white"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mainConfig.temperature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temperature</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min={0}
                        max={2}
                        className="border rounded-md bg-white"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="mainConfig.model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelo LLM</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="border rounded-md">
                        <SelectValue placeholder="Selecciona un modelo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                      <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
                      <SelectItem value="o1">o1</SelectItem>
                      <SelectItem value="o1-mini">o1-mini</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/dashboard/admin/bots")}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear Bot"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
