import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Info } from "lucide-react";

export function GeneralTab() {
  const [waitTime, setWaitTime] = useState(7);
  const [splitMessages, setSplitMessages] = useState(false);
  const [maxContextMessages, setMaxContextMessages] = useState(15);
  const [maxContextHours, setMaxContextHours] = useState(24);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Funcionamiento de la Inteligencia Artificial</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Tiempo de Espera */}
        <Card>
          <CardHeader>
            <CardTitle>Tiempo de Espera para Recibir Mensajes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Slider
                value={[waitTime]}
                onValueChange={(values: number[]) => setWaitTime(values[0])}
                max={15}
                step={1}
              />
              <p className="text-center text-sm font-medium">
                {waitTime} Segundos de Espera
              </p>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4 mt-0.5" />
                <p>Este es el tiempo que nuestro sistema esperará los mensajes del cliente. Es especialmente útil cuando las personas escriben textos cortos en mensajes separados.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Separar Mensajes */}
        <Card>
          <CardHeader>
            <CardTitle>Separar Mensajes en las Respuestas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Función de Mensajes Separados {splitMessages ? 'Activada' : 'Desactivada'}</p>
                <Switch
                  checked={splitMessages}
                  onCheckedChange={setSplitMessages}
                />
              </div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4 mt-0.5" />
                <p>Para entregar respuestas más naturales, predeterminamos que cada una sea separada en diferentes mensajes. Desactiva esta opción si deseas respuestas en párrafos únicos.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contexto en el Historial */}
        <Card>
          <CardHeader>
            <CardTitle>Contexto en el Historial de Chat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="text-sm font-medium">
                  Umbral Máximo de Mensajes para el Contexto
                </label>
                <Input
                  type="number"
                  value={maxContextMessages}
                  onChange={(e) => setMaxContextMessages(Number(e.target.value))}
                  min={1}
                  max={50}
                />
              </div>
              <div className="space-y-4">
                <label className="text-sm font-medium">
                  Umbral en Horas Máximas para Entender el Contexto
                </label>
                <Input
                  type="number"
                  value={maxContextHours}
                  onChange={(e) => setMaxContextHours(Number(e.target.value))}
                  min={1}
                  max={72}
                />
              </div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4 mt-0.5" />
                <p>Al chatear es importante asegurar que una conversación sea lo suficientemente consistente. Por esto, es necesario que la Inteligencia Artificial vaya memorizando un contexto. Esta configuración establece cuántos mensajes anteriores al más reciente son considerados para entender la conversación.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button>
          Guardar Cambios
        </Button>
      </div>
    </div>
  );
}