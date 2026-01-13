/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { PromptBlock, Step } from "@/services/Bots/types";
import {
  DEFAULT_PROMPT_BLOCKS,
  BLOCK_CONFIGS,
} from "@/modules/admin/funnels/templates/defaultBlocks";
import { PromptBlockEditor, BLOCK_EMOJIS } from "./PromptBlockEditor";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Plus,
  Search,
  ArrowUp,
  ArrowDown,
  Trash2,
  ChevronDown,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CreateChangeStageFunctionModal } from "./modals/CreateChangeStageFunctionModal";
import { CreateCalendarFunctionModal } from "./modals/CreateCalendarFunctionModal";
import { FunctionsService } from "@/services/Bots/functions";
import { useQuery } from "@tanstack/react-query";
import { BotsService } from "@/services/Bots/queries";
import { useParams } from "react-router-dom";
import { CreateSheetFunctionModal } from './modals/sheets/CreateSheetFunctionModal';

// Definir el tipo BotFunction aquí ya que no lo importaremos más
type BotFunction = {
  constData?: any;
  id: string;
  name: string;
  description?: string;
  category?: "stage" | "scheduling" | "quotes" | "custom" | "google_sheet";
  activationDescription?: string;
  external_name?: string;
};


interface PromptBlocksContainerProps {
  initialBlocks?: PromptBlock[];
  onChange: (blocks: PromptBlock[]) => void;
  onEditingStepsChange?: (isEditing: boolean) => void;
}

// Agregar un objeto para mapear las categorías a nombres en español
const CATEGORY_NAMES = {
  stage: "Cambio de Etapa",
  scheduling: "Google Calendar",
  sheet: "Hoja de cálculo",
  quotes: "Cotizaciones",
  custom: "Personalizado",
} as const;

export function PromptBlocksContainer({
  initialBlocks,
  onChange,
  onEditingStepsChange,
}: PromptBlocksContainerProps) {
  const { toast } = useToast();
  const [blocks, setBlocks] = useState<PromptBlock[]>([]);
  const [showCustomBlockModal, setShowCustomBlockModal] = useState(false);
  const [newBlockName, setNewBlockName] = useState("");
  const [newBlockDescription, setNewBlockDescription] = useState("");
  const { id } = useParams();

  // Estados para la edición de pasos integrada
  const [editingSteps, setEditingSteps] = useState(false);
  const [currentBlock, setCurrentBlock] = useState<PromptBlock | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [openAccordion, setOpenAccordion] = useState<string | null>("stage");
  const [customFunctions, setCustomFunctions] = useState<BotFunction[]>([]);
  const [showNewFunctionForm, setShowNewFunctionForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Agregamos estos nuevos estados para el modal de cambio de etapa
  const [showChangeStageModal, setShowChangeStageModal] = useState(false);
  const [showCalendarFunctionModal, setShowCalendarFunctionModal] =
    useState(false);
  const [showSheetFunctionModal, setShowSheetFunctionModal] = useState(false);

  // Usar React Query para obtener las funciones
  const { data: functionsList, isLoading: isLoadingFunctions } = useQuery({
    queryKey: ["functions"],
    queryFn: FunctionsService.getFunctions,
  });

  // Cargar las funciones cuando cambia functionsList
  useEffect(() => {
    if (functionsList && Array.isArray(functionsList)) {
      try {
        // Transformar los datos en el formato BotFunction
        const transformedFunctions = functionsList.map((func: any) => {
          // Normalizar el tipo a minúsculas para asegurar consistencia
          const funcType =
            typeof func.type === "string" ? func.type.toLowerCase() : "";

          let category: "stage" | "scheduling" | "quotes" | "custom" = "custom";

          if (funcType === "change_stage") {
            category = "stage";
          } else if (funcType === "google_calendar") {
            category = "scheduling";
          }

          return {
            id: func.id,
            name: func.name || func.data?.name || "Sin nombre",
            external_name: func.external_name || func.data?.external_name || "",
            description: func.description || func.data?.description || "",
            activationDescription:
              func.activationDescription ||
              func.data?.activationDescription ||
              "",
            category,
            parameters: func.parameters || func.data?.parameters || {},
            constData: func.constData || func.data?.constData || {},
          };
        });

        setCustomFunctions(transformedFunctions);

        const categories = Array.from(
          new Set(transformedFunctions.map((fn) => fn.category))
        ) as ("stage" | "scheduling" | "quotes" | "custom")[];

        if (categories.length > 0 && !openAccordion) {
          setOpenAccordion(categories[0]);
        }
      } catch (error) {
        console.error("Error procesando funciones:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Error al procesar las funciones cargadas.",
        });
      }
    }
  }, [functionsList, toast]);

  useEffect(() => {
    if (!initialBlocks) {
      setBlocks([]);
      return;
    }

    // Crear una copia profunda de los bloques iniciales
    const initialBlocksCopy = initialBlocks.map((block) => ({
      block_identifier: block.block_identifier,
      block_name:
        BLOCK_CONFIGS[block.block_identifier]?.block_name ||
        block.block_identifier,
      block_content: block.block_content,
    }));

    setBlocks(initialBlocksCopy);
  }, [initialBlocks]);

  // Cargar los pasos cuando cambia el bloque actual
  useEffect(() => {
    if (currentBlock && currentBlock.block_identifier === "steps_to_follow") {
      try {
        // Si el contenido del bloque está vacío o es sólo espacios en blanco, inicializar con un array vacío
        if (
          !currentBlock.block_content ||
          currentBlock.block_content.trim() === ""
        ) {
          setSteps([]);
          return;
        }

        // Si el contenido es un string "[]", inicializar con un array vacío
        if (currentBlock.block_content.trim() === "[]") {
          setSteps([]);
          return;
        }

        const parsedSteps = JSON.parse(currentBlock.block_content);
        // Verificar que sea un array
        if (Array.isArray(parsedSteps)) {
          setSteps(parsedSteps);
        } else {
          console.error("El contenido de los pasos no es un array válido");
          toast({
            variant: "destructive",
            title: "Error al cargar los pasos",
            description:
              "El formato de los pasos no es válido. Se inicializará vacío.",
          });
          setSteps([]);
        }
      } catch (e) {
        console.error("Error parsing steps:", e);
        toast({
          variant: "destructive",
          title: "Error al cargar los pasos",
          description:
            "El formato de los pasos no es válido. Se inicializará vacío.",
        });
        setSteps([]);
      }
    }
  }, [currentBlock, toast]);

  const availableBlocks = DEFAULT_PROMPT_BLOCKS.filter(
    (block) =>
      !blocks.some((b) => b.block_identifier === block.block_identifier)
  ).sort((a, b) => {
    const orderA = BLOCK_CONFIGS[a.block_identifier]?.order || 0;
    const orderB = BLOCK_CONFIGS[b.block_identifier]?.order || 0;
    return orderA - orderB;
  });

  const updateBlocks = (newBlocks: PromptBlock[]) => {
    const orderedBlocks = newBlocks.sort((a, b) => {
      const orderA = BLOCK_CONFIGS[a.block_identifier]?.order || 0;
      const orderB = BLOCK_CONFIGS[b.block_identifier]?.order || 0;
      return orderA - orderB;
    });

    setBlocks(orderedBlocks);
    onChange(orderedBlocks);
  };

  const handleAddBlock = (blockToAdd: PromptBlock) => {
    const newBlock: PromptBlock = {
      block_identifier: blockToAdd.block_identifier,
      block_name:
        BLOCK_CONFIGS[blockToAdd.block_identifier]?.block_name ||
        blockToAdd.block_identifier,
      block_content: "",
    };

    const updatedBlocks = [...blocks, newBlock];
    updateBlocks(updatedBlocks);
  };

  const handleAddCustomBlock = () => {
    if (!newBlockName.trim()) return;

    const blockIdentifier = `custom_${Date.now()}`;
    const newBlock: PromptBlock = {
      block_identifier: blockIdentifier,
      block_name: newBlockName.trim(),
      block_content: "",
    };

    // Agregar temporalmente la configuración del bloque personalizado
    BLOCK_CONFIGS[blockIdentifier] = {
      description: newBlockDescription.trim() || "Bloque personalizado",
      block_name: newBlockName.trim(),
      order: Object.keys(BLOCK_CONFIGS).length + 1,
    };

    // Agregar el emoji para el bloque personalizado
    BLOCK_EMOJIS[blockIdentifier] = "📝";

    const updatedBlocks = [...blocks, newBlock];
    updateBlocks(updatedBlocks);

    // Limpiar el formulario
    setNewBlockName("");
    setNewBlockDescription("");
    setShowCustomBlockModal(false);
  };

  const handleUpdateBlock = (id: string, content: string) => {
    const updatedBlocks = blocks.map((block) =>
      block.block_identifier === id
        ? {
            ...block,
            block_content: content,
            block_name:
              BLOCK_CONFIGS[block.block_identifier]?.block_name ||
              block.block_identifier,
          }
        : block
    );
    setBlocks(updatedBlocks);
    // Solo notificamos el cambio al padre cuando se actualiza el estado local
    onChange(updatedBlocks);
  };

  const handleRemoveBlock = (id: string) => {
    const updatedBlocks = blocks.filter(
      (block) => block.block_identifier !== id
    );
    updateBlocks(updatedBlocks);

    // Si es un bloque personalizado, limpiamos su configuración
    if (id.startsWith("custom_")) {
      delete BLOCK_CONFIGS[id];
      delete BLOCK_EMOJIS[id];
    }
  };

  // Funciones para edición de pasos
  const startEditingSteps = (block: PromptBlock) => {
    setCurrentBlock(block);
    setEditingSteps(true);
    // Notificar al componente padre
    if (onEditingStepsChange) {
      onEditingStepsChange(true);
    }
  };

  const handleSaveSteps = async () => {
    if (!currentBlock) return;

    try {
      setIsLoading(true);

      const stepsResponse = await BotsService.updateBotSteps(id || "", steps);
      const response = stepsResponse as unknown as {
        block_identifier?: string;
        block_content?: string
      };

      // Determinar qué contenido usar para actualizar el bloque
      let blockContent: string;

      if (response && typeof response.block_content === 'string') {
        // Si la respuesta tiene block_content como string, usamos ese valor directamente
        blockContent = response.block_content;
      } else if (Array.isArray(stepsResponse)) {
        // Si la respuesta es un array, lo convertimos a JSON
        blockContent = JSON.stringify(stepsResponse, null, 2);
      } else {
        // Para cualquier otro caso, convertimos la respuesta completa a JSON
        blockContent = JSON.stringify(stepsResponse, null, 2);
      }

      // Actualizar el bloque con el contenido determinado
      await handleUpdateBlock(currentBlock.block_identifier, blockContent);

      toast({
        title: "Cambios guardados",
        description: "Los pasos se han guardado correctamente.",
      });
      setEditingSteps(false);
      setCurrentBlock(null);
      // Notificar al componente padre
      if (onEditingStepsChange) {
        onEditingStepsChange(false);
      }
    } catch (error) {
      console.error("Error al guardar:", error);
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description:
          "No se pudieron guardar los cambios. Por favor, intenta nuevamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStep = () => {
    const newStep: Step = {
      text: "",
      number: steps.length + 1,
      functions: [],
    };
    setSteps([...steps, newStep]);
  };

  const handleUpdateStep = (index: number, updatedStep: Partial<Step>) => {
    const newSteps = steps.map((step, i) =>
      i === index ? { ...step, ...updatedStep } : step
    );
    setSteps(newSteps);
  };

  const handleRemoveStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    const reorderedSteps = newSteps.map((step, i) => ({
      ...step,
      number: i + 1,
    }));
    setSteps(reorderedSteps);
  };

  const handleMoveStep = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === steps.length - 1)
    )
      return;

    const newSteps = [...steps];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [
      newSteps[targetIndex],
      newSteps[index],
    ];

    const reorderedSteps = newSteps.map((step, i) => ({
      ...step,
      number: i + 1,
    }));
    setSteps(reorderedSteps);
  };

  const handleAddFunction = (stepIndex: number, functionId: string) => {
    const step = steps[stepIndex];

    // Verificar si la función ya existe en el paso
    const functionExists = step.functions.some(f =>
      typeof f === 'string' ? f === functionId : f.id === functionId
    );

    if (!functionId || functionExists) return;

    // Encontrar la función completa basada en el ID
    const functionObj = customFunctions.find(f => f.id === functionId);
    if (!functionObj) return;

    // Crear el objeto de función con todas las propiedades necesarias
    const functionToAdd = {
      id: functionObj.id,
      name: functionObj.name,
      external_name: functionObj.external_name || `${functionObj.id.substring(0, 8)}_change_stage`,
      description: functionObj.description || "",
      activation: functionObj.activationDescription || ""
    };

    const newSteps = [...steps];
    newSteps[stepIndex] = {
      ...step,
      functions: [...step.functions, functionToAdd],
    };
    setSteps(newSteps);
  };

  const handleRemoveFunction = (stepIndex: number, functionId: string) => {
    const step = steps[stepIndex];

    // Verificar si existe alguna función con ese ID
    const functionExists = step.functions.some(f =>
      typeof f === 'string' ? f === functionId : f.id === functionId
    );

    if (!functionId || !functionExists) return;

    const newSteps = [...steps];
    newSteps[stepIndex] = {
      ...step,
      functions: step.functions.filter(f =>
        typeof f === 'string' ? f !== functionId : f.id !== functionId
      ),
    };
    setSteps(newSteps);
  };

  // Combinar funciones disponibles con funciones personalizadas
  const allFunctions = customFunctions;

  // Filtrar funciones basadas en búsqueda
  const filteredFunctions = allFunctions.filter((fn) => {
    const matchesSearch =
      fn.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fn.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Obtener categorías únicas
  const categories = Array.from(
    new Set(allFunctions.map((fn) => fn.category))
  ) as ("scheduling" | "quotes" | "stage" | "custom")[];

  // Obtener todas las funciones usadas en los steps
  const usedFunctions = new Set(steps.flatMap((step) => step.functions));

  // Mantener solo el handleFunctionCreated que maneja la respuesta de los modales
  const handleFunctionCreated = (newFunction: BotFunction) => {
    setCustomFunctions([...customFunctions, newFunction]);
    setShowNewFunctionForm(false);
    setShowChangeStageModal(false);
    setShowCalendarFunctionModal(false);
  };

  // Renderizado condicional para modo normal vs modo edición de pasos
  if (editingSteps && currentBlock) {
    // Vista de edición de pasos
    const config = BLOCK_CONFIGS[currentBlock.block_identifier];

    return (
      <>
        <div className="flex gap-6 h-[600px]">
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">{currentBlock.block_name}</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingSteps(false);
                    // Notificar al componente padre
                    if (onEditingStepsChange) {
                      onEditingStepsChange(false);
                    }
                  }}
                  type="button"
                >
                  Volver
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveSteps}
                  disabled={isLoading}
                  type="button"
                >
                  {isLoading ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {config?.description || "Sin descripción"}
            </p>
            <ScrollArea className="h-[60vh]">
              <div className="space-y-4 pr-4">
                {steps.map((step, index) => (
                  <div
                    key={index}
                    className="relative border rounded-lg p-4 hover:border-primary transition-colors"
                  >
                    <div className="space-y-4">
                      {/* Header del paso */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {step.number}
                            </span>
                          </div>
                          <h4 className="font-medium">Paso {step.number}</h4>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMoveStep(index, "up")}
                            disabled={index === 0}
                            type="button"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMoveStep(index, "down")}
                            disabled={index === steps.length - 1}
                            type="button"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveStep(index)}
                            className="text-destructive hover:text-destructive"
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Descripción del paso */}
                      <div>
                        <Label className="text-sm mb-2">
                          Descripción del paso
                        </Label>
                        <Textarea
                          value={step.text}
                          onChange={(e) =>
                            handleUpdateStep(index, {
                              text: e.target.value,
                            })
                          }
                          placeholder="Describe qué debe hacer el asistente en este paso..."
                          className="min-h-[100px]"
                        />
                      </div>

                      {/* Funciones asociadas */}
                      <div>
                        <Label className="text-sm mb-2">
                          Funciones asociadas
                        </Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {step.functions.map((func) => {
                            // Asegurar que func sea un objeto con id y name
                            const funcId = typeof func === 'string' ? func : func.id;
                            const funcName = typeof func === 'string' ?
                              (allFunctions.find(f => f.id === func)?.name || func) :
                              func.name;

                            // Buscar información adicional de la función si está disponible
                            const fnDetails = allFunctions.find(
                              (f) => f.id === funcId
                            );
                            const isStageFunction = fnDetails?.category === "stage";
                            const isCalendarFunction = fnDetails?.category === "scheduling";
                            const calendarType = fnDetails?.constData?.type;

                            return (
                              <Badge
                                key={funcId}
                                variant="secondary"
                                className={`flex items-center gap-1 py-1 px-2 ${
                                  isCalendarFunction && calendarType === "get-availability" 
                                    ? "bg-blue-100 text-blue-800 hover:bg-blue-200" 
                                    : isCalendarFunction && calendarType === "create-event"
                                    ? "bg-green-100 text-green-800 hover:bg-green-200"
                                    : isCalendarFunction && calendarType === "list-events"
                                    ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                    : isCalendarFunction && calendarType === "update-event"
                                    ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                                    : isCalendarFunction && calendarType === "delete-event"
                                    ? "bg-red-100 text-red-800 hover:bg-red-200"
                                    : ""
                                }`}
                              >
                                {funcName}
                                {isCalendarFunction && (
                                  <span className="ml-1 text-[10px] opacity-80">
                                    {calendarType === "get-availability" ? "🔍" 
                                    : calendarType === "create-event" ? "📅"
                                    : calendarType === "list-events" ? "📋"
                                    : calendarType === "update-event" ? "✏️"
                                    : calendarType === "delete-event" ? "🗑️"
                                    : "📅"}
                                  </span>
                                )}
                                {(isStageFunction || isCalendarFunction) && (
                                  <button
                                    onClick={() =>
                                      handleRemoveFunction(index, funcId)
                                    }
                                    className="ml-1 hover:text-destructive"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </Badge>
                            );
                          })}
                          <Select
                            onValueChange={(value) => {
                              handleAddFunction(index, value);
                              // Reiniciar el valor del Select después de agregar la función
                              const selectElement = document.querySelector(
                                `[data-step-index="${index}"]`
                              );
                              if (selectElement) {
                                (selectElement as HTMLSelectElement).value = "";
                              }
                            }}
                            value=""
                          >
                            <SelectTrigger
                              className="h-7 w-[200px] text-sm"
                              data-step-index={index}
                            >
                              <SelectValue placeholder="Agregar función" />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredFunctions
                                .filter((fn) => !step.functions.some(f =>
                                  typeof f === 'string' ? f === fn.id : f.id === fn.id
                                ))
                                .map((fn) => (
                                  <SelectItem key={fn.id} value={fn.id}>
                                    <div className="flex flex-col">
                                      <span>{fn.name}</span>
                                      {fn.description && (
                                        <span className="text-xs text-muted-foreground">
                                          {fn.description}
                                        </span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  onClick={handleAddStep}
                  variant="outline"
                  className="w-full"
                  type="button"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar paso
                </Button>
              </div>
            </ScrollArea>
          </div>

          <div className="w-80 border-l pl-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Funciones</h3>
              {/* Buscador */}
              <div>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 border rounded-md"
                  />
                </div>
              </div>

              {/* Indicador de carga */}
              {isLoadingFunctions ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    Cargando funciones...
                  </span>
                </div>
              ) : functionsList && functionsList.length > 0 ? (
                /* Acordeones por categoría */
                <ScrollArea className="h-[380px]">
                  <div className="space-y-3 pr-4">
                    {categories.length > 0 ? (
                      categories.map((category) => (
                        <Collapsible
                          key={category}
                          open={openAccordion === category}
                          onOpenChange={(isOpen) =>
                            setOpenAccordion(isOpen ? category : null)
                          }
                          className="border rounded-md overflow-hidden"
                        >
                          <CollapsibleTrigger className="w-full bg-muted px-3 py-2 font-medium text-sm flex justify-between items-center hover:bg-muted/80 transition-colors">
                            <span>{CATEGORY_NAMES[category]}</span>
                            <ChevronDown
                              className={`h-4 w-4 transition-transform duration-200 ${
                                openAccordion === category ? "rotate-180" : ""
                              }`}
                            />
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="p-2 space-y-2">
                              {filteredFunctions
                                .filter((fn) => fn.category === category)
                                .map((fn) => (
                                  <div
                                    key={fn.id}
                                    className={`p-2 border rounded-md text-sm ${
                                      usedFunctions.has(fn.id)
                                        ? "border-primary bg-primary/5"
                                        : ""
                                    }`}
                                  >
                                    <div className="font-medium">{fn.name}</div>
                                    {fn.description && (
                                      <div className="text-xs text-muted-foreground">
                                        {fn.description}
                                      </div>
                                    )}
                                    {fn.category === "stage" && (
                                      <><div className="text-xs text-muted-foreground mt-1">
                                        Funnel: {fn.constData?._funnelName}
                                      </div><div className="text-xs text-muted-foreground mt-1">
                                          Etapa: {fn.constData?._stageName}
                                        </div></>
                                    )}
                                    {fn.category === "scheduling" && (
                                      <div className="text-xs bg-muted px-2 py-1 rounded mt-1 flex justify-between items-center">
                                        <span>
                                          {fn.constData?.type === "get-availability" 
                                            ? "Consulta de disponibilidad"
                                            : fn.constData?.type === "create-event"
                                            ? "Creación de eventos"
                                            : fn.constData?.type === "list-events"
                                            ? "Lista de eventos"
                                            : fn.constData?.type === "update-event"
                                            ? "Actualizar evento"
                                            : fn.constData?.type === "delete-event"
                                            ? "Eliminar evento"
                                            : "Calendario"}
                                        </span>
                                        {fn.constData?.type === "get-availability" ? (
                                          <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full text-[10px]">
                                            Duración: {fn.constData?.duration || "60"} min
                                          </span>
                                        ) : fn.constData?.type === "create-event" ? (
                                          <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full text-[10px]">
                                            {fn.constData?.createMeet ? "Con Google Meet" : "Sin videoconferencia"}
                                          </span>
                                        ) : fn.constData?.type === "list-events" ? (
                                          <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full text-[10px]">
                                            Listado
                                          </span>
                                        ) : fn.constData?.type === "update-event" ? (
                                          <span className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full text-[10px]">
                                            Actualización
                                          </span>
                                        ) : (
                                          <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full text-[10px]">
                                            Eliminación
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              {filteredFunctions.filter(
                                (fn) => fn.category === category
                              ).length === 0 && (
                                <div className="text-center py-4 text-muted-foreground">
                                  No hay funciones en esta categoría
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        Crea una nueva función para tu asistente
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-10 text-muted-foreground space-y-2">
                  <p>No tienes funciones creadas</p>
                </div>
              )}

              {/* Botón para crear nueva función */}
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setShowNewFunctionForm(true)}
                type="button"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear nueva función
              </Button>
            </div>
          </div>
        </div>

        {/* Modal para crear nueva función */}
        <Dialog
          open={showNewFunctionForm}
          onOpenChange={setShowNewFunctionForm}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear nueva función</DialogTitle>
              <DialogDescription>
                Selecciona el tipo de función que deseas crear
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <Button
                variant="outline"
                className="flex flex-col h-auto p-4 justify-start items-center space-y-2"
                onClick={() => {
                  setShowNewFunctionForm(false);
                  setShowChangeStageModal(true);
                }}
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <div className="text-blue-500">🔄</div>
                </div>
                <div className="font-medium text-center">Cambio de Etapa</div>
                <div className="text-xs text-muted-foreground text-center">
                  Mover a otra etapa del funnel
                </div>
              </Button>

              <Button
                variant="outline"
                className="flex flex-col h-auto p-4 justify-start items-center space-y-2"
                onClick={() => {
                  setShowNewFunctionForm(false);
                  setShowCalendarFunctionModal(true);
                }}
              >
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <div className="text-green-500">📅</div>
                </div>
                <div className="font-medium text-center">Calendario</div>
                <div className="text-xs text-muted-foreground text-center">
                  Interactuar con Google Calendar
                </div>
              </Button>

              <Button
                variant="outline"
                className="flex flex-col h-auto p-4 justify-start items-center space-y-2"
                onClick={() => {
                  setShowNewFunctionForm(false);
                  setShowSheetFunctionModal(true);
                }}
              >
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <div className="text-yellow-500">📊</div>
                </div>
                <div className="font-medium text-center">Hoja de cálculo</div>
                <div className="text-xs text-muted-foreground text-center text-wrap">
                  Leer y escribir en una hoja de cálculo
                </div>
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Agregar los modales de creación de funciones */}
        <CreateChangeStageFunctionModal
          isOpen={showChangeStageModal}
          onClose={() => setShowChangeStageModal(false)}
          onFunctionCreated={handleFunctionCreated}
        />

        <CreateCalendarFunctionModal
          isOpen={showCalendarFunctionModal}
          onClose={() => setShowCalendarFunctionModal(false)}
          onFunctionCreated={handleFunctionCreated}
        />

        <CreateSheetFunctionModal
          isOpen={showSheetFunctionModal}
          onClose={() => setShowSheetFunctionModal(false)}
          onFunctionCreated={handleFunctionCreated}
        />
      </>
    );
  }

  // Vista normal de bloques
  return (
    <>
      <div className="flex gap-6 h-[600px]">
        <div className="flex-1 flex flex-col">
          <ScrollArea>
            <div className="grid grid-cols-2 gap-4 p-1">
              {blocks
                .sort((a, b) => {
                  const orderA = BLOCK_CONFIGS[a.block_identifier]?.order || 0;
                  const orderB = BLOCK_CONFIGS[b.block_identifier]?.order || 0;
                  return orderA - orderB;
                })
                .map((block, index) => (
                  <PromptBlockEditor
                    key={block.block_identifier}
                    block={block}
                    index={index}
                    onUpdate={handleUpdateBlock}
                    onRemove={() => handleRemoveBlock(block.block_identifier)}
                    onEditSteps={
                      block.block_identifier === "steps_to_follow"
                        ? () => startEditingSteps(block)
                        : undefined
                    }
                  />
                ))}
              {blocks.length === 0 && (
                <div className="col-span-2 border-2 border-dashed border-gray-200 rounded-lg h-32 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">
                    Selecciona una categoría para comenzar
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="w-[300px] border-l pl-6 flex flex-col">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium mb-2">
                Categorías Disponibles
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCustomBlockModal(true)}
                className="mb-2"
              >
                <Plus className="h-4 w-4 mr-1" />
                Personalizado
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Selecciona una categoría para agregarla a tu asistente
            </p>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-2">
              {availableBlocks.map((block) => {
                const emoji = BLOCK_EMOJIS[block.block_identifier];
                const config = BLOCK_CONFIGS[block.block_identifier];
                return (
                  <Card
                    key={block.block_identifier}
                    className="p-3 cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleAddBlock(block)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{emoji}</span>
                      <div>
                        <p className="text-sm font-medium">
                          {block.block_name}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {config?.description || "Sin descripción"}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
              {availableBlocks.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay más categorías disponibles
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      <Dialog
        open={showCustomBlockModal}
        onOpenChange={setShowCustomBlockModal}
      >
        <DialogContent aria-describedby="custom-block-modal-description">
          <DialogHeader>
            <DialogTitle>Crear bloque personalizado</DialogTitle>
            <DialogDescription id="custom-block-modal-description">
              Define un nuevo bloque con tu propio nombre y descripción
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="blockName">Nombre del bloque</Label>
              <Input
                id="blockName"
                placeholder="Ej: Instrucciones específicas"
                value={newBlockName}
                onChange={(e) => setNewBlockName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blockDescription">Descripción (opcional)</Label>
              <Textarea
                id="blockDescription"
                placeholder="Describe el propósito de este bloque"
                value={newBlockDescription}
                onChange={(e) => setNewBlockDescription(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCustomBlockModal(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleAddCustomBlock}>Crear bloque</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
