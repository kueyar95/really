import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { SheetField } from "@/services/Sheets/types";
import { FIELD_TYPES } from "./types";
import { cn } from "@/lib/utils";

interface SheetFieldsEditorProps {
  fields: SheetField[];
  onFieldsChange: (fields: SheetField[]) => void;
}

export function SheetFieldsEditor({ fields, onFieldsChange }: SheetFieldsEditorProps) {
  const addField = () => {
    onFieldsChange([
      ...fields,
      {
        name: "",
        type: "string",
        description: "",
        required: false,
      },
    ]);
  };

  const updateField = (index: number, field: Partial<SheetField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...field };
    onFieldsChange(newFields);
  };

  const removeField = (index: number) => {
    onFieldsChange(fields.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Campos a registrar</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addField}
          className="flex items-center gap-1 hover:bg-primary/10"
        >
          <Plus className="h-4 w-4" />
          Agregar campo
        </Button>
      </div>

      <div className="space-y-3">
        {fields.map((field, index) => (
          <Card
            key={index}
            className={cn(
              "group relative transition-all hover:shadow-md",
              "border border-border/50 hover:border-primary/50"
            )}
          >
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="cursor-move opacity-50 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FieldNameInput field={field} onUpdate={(updates) => updateField(index, updates)} />
                    <FieldTypeSelect field={field} onUpdate={(updates) => updateField(index, updates)} />
                  </div>

                  <FieldDescriptionInput field={field} onUpdate={(updates) => updateField(index, updates)} />
                  <FieldRequiredSwitch
                    field={field}
                    onUpdate={(updates) => updateField(index, updates)}
                    onRemove={() => removeField(index)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {fields.length === 0 && <EmptyState onAddField={addField} />}
      </div>
    </div>
  );
}

function FieldNameInput({ field, onUpdate }: { field: SheetField; onUpdate: (updates: Partial<SheetField>) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">Nombre del campo</Label>
      <Input
        value={field.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        placeholder="Ej: nombre_cliente"
        className="h-9 bg-secondary/80 border-secondary-foreground/10 hover:border-primary/30 focus:border-primary"
      />
    </div>
  );
}

function FieldTypeSelect({ field, onUpdate }: { field: SheetField; onUpdate: (updates: Partial<SheetField>) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">Tipo de dato</Label>
      <Select
        value={field.type}
        onValueChange={(value) => onUpdate({ type: value as SheetField["type"] })}
      >
        <SelectTrigger className="h-9 bg-secondary/80 border-secondary-foreground/10 hover:border-primary/30 focus:border-primary">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FIELD_TYPES.map((type) => (
            <SelectItem
              key={type.value}
              value={type.value}
              className="text-sm cursor-pointer hover:bg-secondary/50"
            >
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FieldDescriptionInput({ field, onUpdate }: { field: SheetField; onUpdate: (updates: Partial<SheetField>) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">Descripción</Label>
      <Input
        value={field.description}
        onChange={(e) => onUpdate({ description: e.target.value })}
        placeholder="Describe este campo..."
        className="h-9 bg-secondary/80 border-secondary-foreground/10 hover:border-primary/30 focus:border-primary"
      />
    </div>
  );
}

function FieldRequiredSwitch({ field, onUpdate, onRemove }: { field: SheetField; onUpdate: (updates: Partial<SheetField>) => void; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between pt-1">
      <div className="flex items-center space-x-2">
        <Switch
          checked={field.required}
          onCheckedChange={(checked) => onUpdate({ required: checked })}
          className="data-[state=checked]:bg-primary"
        />
        <Label className="text-xs font-medium cursor-pointer select-none">Campo requerido</Label>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function EmptyState({ onAddField }: { onAddField: () => void }) {
  return (
    <Card className="border border-dashed">
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-sm text-muted-foreground">No hay campos configurados</div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onAddField}
          className="mt-2 hover:bg-primary/10"
        >
          <Plus className="mr-1 h-4 w-4" />
          Agregar el primer campo
        </Button>
      </CardContent>
    </Card>
  );
}