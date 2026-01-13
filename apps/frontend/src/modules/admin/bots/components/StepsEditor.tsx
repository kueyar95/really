import { Step } from "../types/promptTypes";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowUp,
  ArrowDown,
  Plus,
  X,
  Trash2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface StepsEditorProps {
  steps: Step[];
  availableFunctions: { id: string; name: string }[];
  onChange: (steps: Step[]) => void;
}

export function StepsEditor({
  steps,
  availableFunctions,
  onChange,
}: StepsEditorProps) {

  const handleAddStep = () => {
    const newStep: Step = {
      text: "",
      number: steps.length + 1,
      functions: [],
    };
    onChange([...steps, newStep]);
  };

  const handleUpdateStep = (index: number, updatedStep: Partial<Step>) => {
    const newSteps = steps.map((step, i) =>
      i === index ? { ...step, ...updatedStep } : step
    );
    onChange(newSteps);
  };

  const handleRemoveStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    // Reajustar los números
    const reorderedSteps = newSteps.map((step, i) => ({
      ...step,
      number: i + 1,
    }));
    onChange(reorderedSteps);
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

    // Actualizar los números
    const reorderedSteps = newSteps.map((step, i) => ({
      ...step,
      number: i + 1,
    }));
    onChange(reorderedSteps);
  };

  const handleAddFunction = (stepIndex: number, functionId: string) => {
    const step = steps[stepIndex];
    
    // Verificar si la función ya existe
    const functionExists = step.functions.some(f => 
      typeof f === 'string' ? f === functionId : f.id === functionId
    );
    
    if (functionExists) return;

    // Buscar la función completa
    const functionObj = availableFunctions.find(f => f.id === functionId);
    if (!functionObj) return;

    // Crear el objeto de función
    const functionToAdd = {
      id: functionObj.id,
      name: functionObj.name,
      external_name: `${functionObj.id.substring(0, 8)}_change_stage`,
      description: "Función para el asistente",
      activation: "Activación de la función"
    };

    handleUpdateStep(stepIndex, {
      functions: [...step.functions, functionToAdd],
    });
  };

  const handleRemoveFunction = (stepIndex: number, functionId: string) => {
    const step = steps[stepIndex];
    
    handleUpdateStep(stepIndex, {
      functions: step.functions.filter(f => 
        typeof f === 'string' ? f !== functionId : f.id !== functionId
      ),
    });
  };

  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div
          key={index}
          className="relative border rounded-lg p-4 hover:border-primary transition-colors"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium">{step.number}</span>
            </div>
            <div className="flex-1 space-y-2">
              <Textarea
                value={step.text}
                onChange={(e) =>
                  handleUpdateStep(index, { text: e.target.value })
                }
                placeholder="Describe el paso..."
                className="min-h-[100px]"
              />
              <div className="flex flex-wrap gap-2 items-center">
                <Select
                  onValueChange={(value) => handleAddFunction(index, value)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Agregar función" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFunctions
                      .filter(fn => !step.functions.some(f => 
                        typeof f === 'string' ? f === fn.id : f.id === fn.id
                      ))
                      .map((fn) => (
                        <SelectItem key={fn.id} value={fn.id}>
                          {fn.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2">
                  {step.functions.map((func) => {
                    // Asegurar que estamos manejando el objeto correctamente
                    const funcId = typeof func === 'string' ? func : func.id;
                    const funcName = typeof func === 'string' ? 
                      (availableFunctions.find(f => f.id === func)?.name || func) : 
                      func.name;
                      
                    return (
                      <Badge
                        key={funcId}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {funcName}
                        <button
                          onClick={() => handleRemoveFunction(index, funcId)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleMoveStep(index, "up")}
                disabled={index === 0}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleMoveStep(index, "down")}
                disabled={index === steps.length - 1}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveStep(index)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
      <Button
        onClick={handleAddStep}
        type="button"
        variant="outline"
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Agregar paso
      </Button>
    </div>
  );
}
