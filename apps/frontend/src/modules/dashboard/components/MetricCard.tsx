import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  value: number;
  change: number;
  period?: string;
  title?: string;
  icon?: LucideIcon;
}

export function MetricCard({
  value = 3500,
  change = 6,
  period = "Últimos 7 días",
  title = "Usuarios nuevos",
  icon,
}: MetricCardProps) {
  let textValue: string;

  if (value > 1000) {
    textValue = `${(value / 1000).toFixed(1)}K`;
  } else if (value > 1000000) {
    textValue = `${(value / 1000000).toFixed(1)}M`;
  } else if (value > 1000000000) {
    textValue = `${(value / 1000000000).toFixed(1)}MM`;
  } else {
    textValue = value.toString();
  }

  return (
    <Card className="w-full min-w-48 rounded-2xl">
      <CardContent className="p-5 w-full h-full">
        <div className="flex flex-col justify-between h-full">
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
            {icon &&
              React.createElement(icon, {
                className: "min-h-5 min-w-5 h-5 w-5",
              })}
            <span className="text-base font-medium text-foreground min-w-28">
              {title}
            </span>
          </div>
          <div className="mt-4">
            <div className="text-sm text-muted-foreground">{period}</div>
            <div className="flex items-baseline gap-3">
              <div className="text-2xl font-semibold">{textValue}</div>
              <span
                className={`flex items-center text-sm ${
                  change >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {change >= 0 ? "↑" : "↓"}
                {Math.abs(change)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
