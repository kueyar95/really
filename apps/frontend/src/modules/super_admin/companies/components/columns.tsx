import { ColumnDef } from "@tanstack/react-table"
import { Company } from "@/services/Super_admin/Companies/types"
import { Button } from "@/components/ui/button"
import { Bot } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { UserStatsButton } from "./UserStatsButton"
import { FunnelStatsButton } from './FunnelStatsButton'

export const columns: ColumnDef<Company>[] = [
  {
    accessorKey: "name",
    header: "Nombre",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "stats",
    header: "Estadísticas",
    cell: ({ row }) => {
      const company = row.original;
      return (
        <div className="flex items-center gap-4">
          <UserStatsButton
            companyId={company.id}
            usersCount={company.users?.length || 0}
          />

          <FunnelStatsButton
            companyId={company.id}
            funnelsCount={company.funnels?.length || 0}
          />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="space-x-1">
                  <Bot className="h-4 w-4" />
                  <span>{company.aiBots?.length || 0}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Bots</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )
    },
  },
  {
    accessorKey: "createdAt",
    header: "Fecha de creación",
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"));
      return (
        <div className="text-gray-600">
          {date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      );
    },
  },
];