import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const chartData = [
  {
    day: "Lunes",
    newUsers: 245,
    newConversion: 89,
    newChats: 167,
    newMessages: 278,
  },
  {
    day: "Martes",
    newUsers: 156,
    newConversion: 203,
    newChats: 45,
    newMessages: 189,
  },
  {
    day: "Miercoles",
    newUsers: 283,
    newConversion: 134,
    newChats: 267,
    newMessages: 92,
  },
  {
    day: "Jueves",
    newUsers: 178,
    newConversion: 123,
    newChats: 123,
    newMessages: 245,
  },
  {
    day: "Viernes",
    newUsers: 89,
    newConversion: 167,
    newChats: 289,
    newMessages: 156,
  },
  {
    day: "Sabado",
    newUsers: 234,
    newConversion: 78,
    newChats: 198,
    newMessages: 267,
  },
  {
    day: "Domingo",
    newUsers: 145,
    newConversion: 212,
    newChats: 167,
    newMessages: 98,
  },
];

const chartConfig = {
  newUsers: {
    label: "Nuevos usuarios",
    color: "#2563eb",
  },
  newConversion: {
    label: "Conversion",
    color: "#16a34a",
  },
  newChats: {
    label: "Nuevos chats",
    color: "#eab308",
  },
  newMessages: {
    label: "Nuevos mensajes",
    color: "#7c3aed",
  },
} satisfies ChartConfig;

export function ReportChart() {
  const [option, setOption] = useState<keyof typeof chartConfig>("newUsers");

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Reporte</CardTitle>
          <CardDescription>Últimos 7 días</CardDescription>
        </div>
        <Select
          value={option}
          onValueChange={(value) => {
            setOption(value as keyof typeof chartConfig);
          }}
        >
          <SelectTrigger className="w-[164px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="newUsers">Usuarios</SelectItem>
              <SelectItem value="newConversion">Conversiones</SelectItem>
              <SelectItem value="newChats">Chats</SelectItem>
              <SelectItem value="newMessages">Mensajes</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: -20,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.toString()}
              interval="preserveStartEnd"
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              key={option}
              dataKey={option}
              stroke={chartConfig[option].color}
              fill={chartConfig[option].color}
              fillOpacity={0.2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 font-medium leading-none">
              Tendencia al alza del 6% esta semana{" "}
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 leading-none text-muted-foreground">
              Lunes - Domingo
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
