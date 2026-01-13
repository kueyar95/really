import { ColumnDef } from "@tanstack/react-table"
import { AiBot, FunctionsConfig } from "@/services/Bots/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Pencil, Trash } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export const columns: ColumnDef<AiBot>[] = [
  {
    accessorKey: "name",
    header: "Nombre",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "ragConfig",
    header: "Configuración RAG",
    cell: ({ row }) => {
      const config = row.getValue("ragConfig");
      return (
        <Badge variant="outline">
          {config ? 'Configurado' : 'Sin configurar'}
        </Badge>
      );
    },
  },
  {
    accessorKey: "functionsConfig",
    header: "Funciones",
    cell: ({ row }) => {
      const config = row.getValue("functionsConfig") as FunctionsConfig | undefined;
      return (
        <Badge variant="outline">
          {config?.enabled ? 'Configurado' : 'Sin configurar'}
        </Badge>
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
    cell: () => {
      // const bot = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">
              <Trash className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];