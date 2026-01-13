import { ColumnDef } from "@tanstack/react-table"
import { NormalizedUser } from "@/services/types"
import { Badge } from '@/components/ui/badge'

export const columns: ColumnDef<NormalizedUser>[] = [
  {
    accessorKey: "username",
    header: "Username",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("username")}</div>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <div className="text-gray-600">{row.getValue("email")}</div>
    ),
  },
  {
    accessorKey: "role",
    header: "Rol",
    cell: ({ row }) => {
      const role = row.getValue("role") as string
      return (
        <Badge variant={role === 'admin' ? 'destructive' : 'default'}>
          {role === 'admin' ? 'Administrador' : role}
        </Badge>
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
]