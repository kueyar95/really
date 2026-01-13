import { ColumnDef } from "@tanstack/react-table"
import { Funnel } from "@/services/Funnels/types"
import { Badge } from '@/components/ui/badge'
import { FunnelStagesDialog } from "./FunnelStagesDialog"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { deleteFunnel } from "@/services/Funnels/queries"


export const columns: ColumnDef<Funnel>[] = [
  {
    accessorKey: "name",
    header: "Nombre",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "description",
    header: "Descripción",
    cell: ({ row }) => (
      <div className="text-gray-600">{row.getValue("description") || "-"}</div>
    ),
  },
  {
    accessorKey: "isActive",
    header: "Estado",
    cell: ({ row }) => {
      const isActive = row.getValue("isActive") as boolean
      return (
        <Badge variant={isActive ? 'default' : 'secondary'}>
          {isActive ? 'Activo' : 'Inactivo'}
        </Badge>
      )
    },
  },
  {
    accessorKey: "stages",
    header: "Etapas",
    cell: ({ row }) => {
      const funnelId = row.original.id;
      const companyId = row.original.companyId;
      const stagesCount = row.original.stages?.length || 0;
      const funnelName = row.original.name;

      return (
        <FunnelStagesDialog
          funnelId={funnelId}
          stagesCount={stagesCount}
          funnelName={funnelName}
          companyId={companyId}
        />
      );
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
  {
    id: "actions",
    cell: ({ row }) => {
      const funnel = row.original



      const handleDelete = async () => {
        try {
          await deleteFunnel(funnel.id)
          toast.success("Funnel eliminado exitosamente")
        } catch (error) {
          toast.error("Error al eliminar el funnel")
        }
      }

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDelete} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]