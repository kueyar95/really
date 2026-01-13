/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { createFunnel, analyzeSite } from "@/services/Funnels/queries";
import { createStage, updateStage } from "@/services/Stages/queries";
import { StageStatus } from "@/services/Stages/types";
import { AiBot } from "@/services/Bots/types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { BotsService } from "@/services/Bots/queries";
import { templates } from "./templates/funnelTemplates";
import { Template } from "./templates/types";
import { WebScrapingStatus } from "./components/WebScrapingStatus";
import { cn } from "@/lib/utils";
import { FunctionsService } from "@/services/Bots/functions";

const formSchema = z.object({
  website: z.string().optional(),
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});


const DEFAULT_BOT_CONFIG = {
  model: "gpt-4o-mini",
  maxTokens: 500,
  temperature: 0.7,
};

interface Block {
  block_identifier: string;
  block_name?: string;
  block_content: string;
}

interface Step {
  number: number;
  text: string;
  functions?: any[];
}

interface Stage {
  name: string;
  description: string;
  order: number;
  bot: {
    name: string;
    sysPrompt: Block[];
    steps: Step[];
    model: string;
    maxTokens: number;
    temperature: number;
  } | null;
}

interface FunnelConfig {
  template: Template | null;
  name: string;
  description: string;
  website: string;
  isActive: boolean;
  stages: Stage[];
}

export default function CreateFunnelPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [step, setStep] = useState<"template" | "funnel">("template");
  const [isPersonalizing, setIsPersonalizing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreatingFunnel, setIsCreatingFunnel] = useState(false);
  const [scrapingProcessId, setScrapingProcessId] = useState<string | null>(
    null
  );
  const [isCompleted, setIsCompleted] = useState(false);
  const [scrapingResult, setScrapingResult] = useState<{
    filledTemplate: {
      description: string;
      name: string;
      stages: Array<{
        stage: string;
        blocks: Block[];
        steps: Step[];
      }>;
    };
  } | null>(null);

  const [funnelConfig, setFunnelConfig] = useState<FunnelConfig>({
    template: null,
    name: "",
    description: "",
    website: "",
    isActive: true,
    stages: [],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      website: "",
      name: "",
      description: "",
      isActive: true,
    },
  });

  const handleTemplateSelect = (template: Template) => {
    setFunnelConfig({
      template,
      name: template.name,
      description: template.description,
      website: "",
      isActive: true,
      stages: template.stages.map((stage, index) => ({
        name: stage.name,
        description: stage.description,
        order: index,
        bot: stage.bot
          ? {
              name: stage.bot.name,
              sysPrompt: stage.bot.sysPrompt.map((block) => ({
                ...block,
                block_content: block.block_content,
              })),
              steps:
                stage.bot.steps?.map((step) => ({
                  number: step.number,
                  text: step.text,
                  functions: step.functions || [],
                })) || [],
              model: stage.bot.model || DEFAULT_BOT_CONFIG.model,
              maxTokens: stage.bot.maxTokens || DEFAULT_BOT_CONFIG.maxTokens,
              temperature:
                stage.bot.temperature || DEFAULT_BOT_CONFIG.temperature,
            }
          : null,
      })),
    });
    setStep("funnel");
  };

  const handleCreateFunnel = async () => {
    const result = await form.trigger();
    if (result) {
      try {
        setIsCreatingFunnel(true);

        // Si hay un resultado de scraping guardado, aplicar cambios al funnelConfig directamente
        let configToUse = { ...funnelConfig };

        if (scrapingResult) {
          const { filledTemplate } = scrapingResult;

          // Crear una copia profunda para evitar modificar el estado original
          configToUse = JSON.parse(JSON.stringify(funnelConfig));

          // Aplicar los cambios del scraping directamente
          configToUse.name = filledTemplate.name || configToUse.name;
          configToUse.description =
            filledTemplate.description || configToUse.description;

          // Actualizar las etapas con la información del scraping
          configToUse.stages = configToUse.stages.map((originalStage) => {
            // Encontrar el stage correspondiente en el resultado del scraping
            const scrapedStage = filledTemplate.stages.find(
              (s) => s.stage === originalStage.name.toLowerCase()
            );

            // Si no hay bot o no encontramos el stage, mantener como está
            if (!originalStage.bot || !scrapedStage) return originalStage;

            // Actualizar los bloques del bot
            const updatedSysPrompt = originalStage.bot.sysPrompt.map(
              (block) => {
                const scrapedBlock = scrapedStage.blocks.find(
                  (b) => b.block_identifier === block.block_identifier
                );

                if (scrapedBlock) {
                  return {
                    ...block,
                    block_content: scrapedBlock.block_content,
                  };
                }
                return block;
              }
            );

            // Crear un nuevo objeto bot con los bloques actualizados
            return {
              ...originalStage,
              bot: {
                ...originalStage.bot,
                sysPrompt: updatedSysPrompt,
                steps: scrapedStage.steps.map((step) => ({
                  number: step.number,
                  text: step.text,
                  functions: step.functions || [],
                })),
              },
            };
          });
        }

        if (!user?.company.id) throw new Error("No company ID found");
        if (!configToUse.template) throw new Error("No template selected");

        const values = form.getValues();

        // 1. Crear el funnel
        const createdFunnel = await createFunnel({
          name: values.name || configToUse.name,
          description: values.description || configToUse.description || "",
          isActive: values.isActive,
          companyId: user.company.id,
          channelIds: [],
        });

        // 2. Crear las etapas (sin bots inicialmente)
        const createdStages = await Promise.all(
          configToUse.stages.map((stage, index) =>
            createStage({
              name: stage.name,
              description: stage.description,
              funnelId: createdFunnel.id,
              order: index,
              status: StageStatus.ACTIVE,
              botId: null, // Inicialmente sin bot
            })
          )
        );

        // 3. Crear las funciones (ahora tenemos los IDs de las etapas)
        const createdFunctions = await Promise.all(
          configToUse.template.functions
            ?.map(
              async (func: {
                type: string;
                name: string;
                description: string;
                activation: string;
                to_stage: number;
                step_number: number;
              }) => {
                if (func.type === "change_stage") {
                  // Encontrar la etapa destino por su orden
                  const targetStage = createdStages[func.to_stage];
                  if (!targetStage) {
                    console.error(
                      `No se encontró la etapa con orden ${func.to_stage}`
                    );
                    return null;
                  }

                  // Crear la función con la estructura correcta
                  const functionData = {
                    type: "change_stage",
                    data: {
                      name: func.name,
                      description: func.description,
                      activationDescription: func.activation,
                      parameters: {},
                      constData: {},
                      stageId: targetStage.id,
                    },
                  };

                  const createdFunction = await FunctionsService.createFunction(
                    functionData
                  );

                  return {
                    id: createdFunction.id,
                    name: func.name,
                    description: func.description,
                    activation: func.activation,
                    step_number: func.step_number,
                    external_name: `${createdFunction.id.slice(
                      0,
                      8
                    )}_change_stage`,
                  };
                }
                return null;
              }
            )
            .filter(Boolean) || []
        );

        // Crear un mapa de funciones por step_number
        const functionsByStep = new Map(
          createdFunctions.map((func: any) => [func.step_number, func])
        );

        // 4. Crear los bots usando la información actualizada
        const createdBots = await Promise.all(
          configToUse.stages
            .filter((stage) => stage.bot !== null)
            .map(async (stage) => {
              const botData = {
                companyId: user.company.id,
                name: stage.bot!.name,
                sysPrompt: stage.bot!.sysPrompt.map((block) => ({
                  block_identifier: block.block_identifier,
                  block_content: block.block_content || "", // Asegurarnos de que nunca sea undefined
                })),
                mainConfig: {
                  model: stage.bot!.model || DEFAULT_BOT_CONFIG.model,
                  maxTokens:
                    stage.bot!.maxTokens || DEFAULT_BOT_CONFIG.maxTokens,
                  temperature:
                    stage.bot!.temperature || DEFAULT_BOT_CONFIG.temperature,
                },
                steps: stage.bot!.steps.map((step) => ({
                  number: step.number,
                  text: step.text || "", // Asegurarnos de que nunca sea undefined
                  functions: [],
                })),
              };

              try {
                const bot = await BotsService.createBot(botData);

                if (stage.bot!.steps) {
                  const updatedSteps = stage.bot!.steps.map((step) => {
                    const functionForStep = functionsByStep.get(step.number);
                    return {
                      number: step.number,
                      text: step.text || "", // Asegurarnos de que nunca sea undefined
                      functions: functionForStep
                        ? [
                            {
                              id: functionForStep.id,
                              name: functionForStep.name,
                              description: functionForStep.description,
                              activation: functionForStep.activation,
                              external_name: functionForStep.external_name,
                            },
                          ]
                        : [],
                    };
                  });

                  await BotsService.updateBotSteps(bot.id, updatedSteps);
                }

                return bot;
              } catch (error) {
                console.error("❌ Error al crear bot:", {
                  etapa: stage.name,
                  error: error,
                });
                throw error;
              }
            })
        );

        // 5. Actualizar las etapas con sus bots
        const botIndexMap = configToUse.stages.reduce((map, stage, index) => {
          if (stage.bot !== null) {
            map.set(index, createdBots[map.size]);
          }
          return map;
        }, new Map<number, AiBot>());

        await Promise.all(
          createdStages.map((stage, index) => {
            const bot = botIndexMap.get(index);
            if (bot) {
              return updateStage(stage.id, {
                botId: bot.id,
              });
            }
            return Promise.resolve();
          })
        );

        queryClient.invalidateQueries({ queryKey: ["funnels"] });
        toast.success("Funnel creado exitosamente con sus etapas");
        navigate(`/dashboard/admin/funnels/edit/${createdFunnel.id}`);
      } catch (error) {
        console.error("Error:", error);
        toast.error("Error al crear el funnel");
      } finally {
        setIsCreatingFunnel(false);
      }
    }
  };

  const handlePersonalize = async () => {
    const { website } = form.getValues();
    if (!website || website.trim() === "") {
      toast.error("Por favor ingresa una URL para personalizar");
      return;
    }

    // Validar formato de URL
    try {
      new URL(website);
    } catch {
      toast.error("Por favor ingresa una URL válida");
      return;
    }

    if (!funnelConfig.template) {
      toast.error("Por favor selecciona una plantilla primero");
      return;
    }

    setIsPersonalizing(true);
    setIsCompleted(false);
    try {
      const result = await analyzeSite(website, funnelConfig.template.id);
      setScrapingProcessId(result.jobId);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al iniciar el análisis del sitio web");
      setIsPersonalizing(false);
      setIsCompleted(false);
    }
  };

  const handleScrapingStatusChange = (isProcessing: boolean) => {
    setIsProcessing(isProcessing);
  };

  const handleScrapingComplete = (result: {
    success?: boolean;
    data?: {
      templateId: string;
      filledTemplate: {
        description: string;
        name: string;
        stages: Array<{
          stage: string;
          blocks: Block[];
          steps: Step[];
        }>;
      };
      timings: {
        total: string;
      };
    };
    error?: string;
  }) => {
    setIsPersonalizing(false);

    if (result.error || !result.success || !result.data?.filledTemplate) {
      setIsCompleted(false);
      toast.error(
        `Error al personalizar: ${result.error || "Error desconocido"}`
      );
      return;
    }

    const { filledTemplate, timings } = result.data;
    setIsCompleted(true);
    setScrapingResult({ filledTemplate }); // Guardar el resultado

    // Actualizar el estado del funnel con la plantilla personalizada
    setFunnelConfig((prev) => {
      if (!prev.template) {
        console.error("No hay template seleccionado");
        return prev;
      }
      const updatedStages = prev.stages.map((originalStage) => {
        // Encontrar el stage correspondiente en la respuesta del scraping
        const scrapedStage = filledTemplate.stages.find(
          (s) => s.stage === originalStage.name.toLowerCase()
        );

        // Si no hay bot configurado o no encontramos el stage en el scraping, mantener el stage como está
        if (!originalStage.bot || !scrapedStage) return originalStage;

        // Actualizar los bloques del bot
        const updatedSysPrompt = originalStage.bot.sysPrompt.map((block) => {
          // Buscar si existe un bloque actualizado en el scraping
          const scrapedBlock = scrapedStage.blocks.find(
            (b) => b.block_identifier === block.block_identifier
          );

          // Si encontramos el bloque en el scraping, actualizar su contenido
          if (scrapedBlock) {
            return {
              ...block,
              block_content: scrapedBlock.block_content,
            };
          }

          return block;
        });

        // Actualizar los steps si vienen en el scraping
        let updatedSteps = originalStage.bot.steps || [];
        if (scrapedStage.steps && scrapedStage.steps.length > 0) {
          updatedSteps = scrapedStage.steps.map((step) => ({
            number: step.number,
            text: step.text,
            functions: step.functions || [],
          }));
        }

        return {
          ...originalStage,
          bot: {
            ...originalStage.bot,
            sysPrompt: updatedSysPrompt,
            steps: updatedSteps,
          },
        };
      });

      const newConfig = {
        ...prev,
        name: filledTemplate.name || prev.name,
        description: filledTemplate.description || prev.description,
        stages: updatedStages,
      };

      return newConfig;
    });

    // Actualizar el formulario
    if (filledTemplate.name) {
      form.setValue("name", filledTemplate.name);
    }
    if (filledTemplate.description) {
      form.setValue("description", filledTemplate.description);
    }

    toast.success(
      `¡Plantilla personalizada exitosamente!${
        timings?.total ? ` (Tiempo total: ${timings.total})` : ""
      }`
    );
  };

  const updateBotsWithScrapingResult = () => {
    if (!scrapingResult) return;

    const { filledTemplate } = scrapingResult;
    setFunnelConfig((prev) => {
      if (!prev.template) {
        console.error("No hay template seleccionado");
        return prev;
      }

      const updatedStages = prev.stages.map((originalStage) => {
        const scrapedStage = filledTemplate.stages.find(
          (s) => s.stage === originalStage.name.toLowerCase()
        );

        if (!originalStage.bot || !scrapedStage) return originalStage;

        const updatedSysPrompt = originalStage.bot.sysPrompt.map((block) => {
          const scrapedBlock = scrapedStage.blocks.find(
            (b) => b.block_identifier === block.block_identifier
          );

          if (scrapedBlock) {
            return {
              ...block,
              block_content: scrapedBlock.block_content,
            };
          }
          return block;
        });

        return {
          ...originalStage,
          bot: {
            ...originalStage.bot,
            sysPrompt: updatedSysPrompt,
            steps: scrapedStage.steps.map((step) => ({
              number: step.number,
              text: step.text,
              functions: step.functions || [],
            })),
          },
        };
      });

      return {
        ...prev,
        stages: updatedStages,
      };
    });
  };

  return (
    <div className="p-8 max-w-full mx-auto">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => {
            if (step === "funnel") {
              setStep("template");
              // Reiniciar el estado del funnel
              setFunnelConfig({
                template: null,
                name: "",
                description: "",
                website: "",
                isActive: true,
                stages: [],
              });
              // Reiniciar el formulario
              form.reset({
                website: "",
                name: "",
                description: "",
                isActive: true,
              });
            } else {
              navigate("/dashboard/admin/funnels");
            }
          }}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {step === "funnel" ? "Volver a plantillas" : "Volver a Funnels"}
        </Button>
        <h1 className="text-2xl font-bold">
          {step === "template"
            ? "Selecciona una plantilla"
            : "Información del funnel"}
        </h1>
      </div>

      {step === "template" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((template) => (
            <Card
              key={template.id}
              className={`cursor-pointer hover:border-primary transition-colors`}
              onClick={() => handleTemplateSelect(template)}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <span className="text-2xl h-10 w-10 flex items-center justify-center bg-muted rounded-md">
                    {template.icon}
                  </span>
                  <div>
                    <CardTitle>{template.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {template.description}
                    </p>
                  </div>
                </div>
              </CardHeader>
              {template.stages.length > 0 && (
                <CardContent>
                  <p className="font-medium mb-2">Etapas incluidas:</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {template.stages.map((stage) => (
                      <li key={stage.name}>• {stage.name}</li>
                    ))}
                  </ul>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-2xl h-10 w-10 flex items-center justify-center bg-muted rounded-md">
                {funnelConfig.template?.icon}
              </span>
              <div>
                <CardTitle>Plantilla: {funnelConfig.template?.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {funnelConfig.template?.description}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <p className="text-sm font-bold">Etapas del funnel</p>
              <ol className="list-decimal list-inside">
                {funnelConfig.template?.stages.map((stage, index) => (
                  <li key={index} className="text-sm text-muted-foreground">
                    {stage.name}
                  </li>
                ))}
              </ol>
            </div>
            <Form {...form}>
              <form className="space-y-6">
                <div className="space-y-6">
                  {funnelConfig.template?.id !== "blank" && (
                    <>
                      <div className="flex gap-4">
                        <FormField
                          control={form.control}
                          name="website"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel>Página web</FormLabel>
                              <div className="flex gap-2">
                                <FormControl>
                                  <Input
                                    placeholder="https://example.com"
                                    className="border border-input rounded-md"
                                    {...field}
                                  />
                                </FormControl>
                                <Button
                                  type="button"
                                  onClick={handlePersonalize}
                                  disabled={isPersonalizing || isCompleted}
                                  className={cn(
                                    isCompleted &&
                                      "bg-green-600 hover:bg-green-700"
                                  )}
                                >
                                  {isPersonalizing ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Personalizando...
                                    </>
                                  ) : isCompleted ? (
                                    <>
                                      <CheckCircle2 className="mr-2 h-4 w-4" />
                                      Personalizado
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="mr-2 h-4 w-4" />
                                      Personalizar con IA
                                    </>
                                  )}
                                </Button>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {scrapingProcessId && (
                        <WebScrapingStatus
                          jobId={scrapingProcessId}
                          onComplete={handleScrapingComplete}
                          onStatusChange={handleScrapingStatusChange}
                          onClose={() => setScrapingProcessId(null)}
                          isCompleted={isCompleted}
                        />
                      )}
                    </>
                  )}

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre del funnel</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nombre del funnel"
                            className="border border-input rounded-md"
                            autoComplete="off"
                            {...field}
                          />
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
                        <FormLabel>Descripción del funnel</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descripción del funnel"
                            className="resize-none border border-input rounded-md"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <FormLabel>Activo</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={handleCreateFunnel}
                    disabled={
                      isProcessing || isPersonalizing || isCreatingFunnel
                    }
                  >
                    {isCreatingFunnel ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creando funnel...
                      </>
                    ) : isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      "Crear Funnel"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
