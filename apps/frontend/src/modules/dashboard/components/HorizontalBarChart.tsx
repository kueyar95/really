import { TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartData = [
  { step: "Saludo", stages: 186, fill: "#93c5fd" },
  { step: "Escoger especialidad", stages: 405, fill: "#60a5fa" },
  { step: "Agendar cita", stages: 237, fill: "#3b82f6" },
  { step: "Confirmación", stages: 209, fill: "#2563eb" },
  { step: "Pago", stages: 214, fill: "#1d4ed8" },
  { step: "Asistencia humana", stages: 145, fill: "#1e40af" },
];

const chartConfig = {
  stages: {
    label: "Etapas",
    color: "#3b82f6",
  },
  label: {
    color: "hsl(var(--background))",
  },
} satisfies ChartConfig;

export function HorizontalBarChart() {
  return (
    <Card className="rounded-2xl h-full flex flex-col">
      <CardHeader>
        <CardTitle>Etapas</CardTitle>
        <CardDescription>Usuarios totales: 10.3K</CardDescription>
      </CardHeader>
      <CardContent className="h-full">
        <ChartContainer config={chartConfig} className="max-w-full h-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{
              right: 16,
            }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="step"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
              hide
            />
            <XAxis dataKey="stages" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Bar
              dataKey="stages"
              layout="vertical"
              fill="var(--color-stages)"
              radius={4}
              height={100}
            >
              <LabelList
                dataKey="step"
                position="insideLeft"
                offset={8}
                className="fill-[--color-label]"
                fontSize={12}
              />
              <LabelList
                dataKey="stages"
                position="right"
                offset={8}
                className="fill-foreground"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          Tendencia al alza del 6% esta semana{" "}
          <TrendingUp className="h-4 w-4 text-green-500" />
        </div>
        <div className="leading-none text-muted-foreground">
          Mostrando etapas totales de la semana
        </div>
      </CardFooter>
    </Card>
  );
}
