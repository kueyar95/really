import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { AdminService } from "@/services/Admin/queries"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from '@/contexts/AuthContext'

export function CreateUserSheet() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    role: "vendedor",
    companyId: user?.company.id || "",
  })

  const queryClient = useQueryClient()

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Crear usuario en la base de datos
      return await AdminService.createUser({
        email: data.email,
        username: data.username,
        supabaseId: '', // Se llenará cuando el usuario se registre
        role: data.role,
        companyId: data.companyId,
      })
    },
    onSuccess: () => {
      toast.success('Usuario creado exitosamente')
      toast.message(
        'Información importante',
        {
          description: 'El usuario podrá registrarse usando este correo electrónico en la página de registro.'
        }
      )
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setFormData({
        username: "",
        email: "",
        role: "vendedor",
        companyId: user?.company.id || "",
      })
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    createUserMutation.mutate(formData)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Crear usuario
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-[425px]">
        <SheetHeader>
          <SheetTitle>Crear Nuevo Usuario</SheetTitle>
          <SheetDescription>
            Crea un nuevo usuario. El usuario podrá completar su registro usando este correo electrónico.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium text-gray-700">Nombre de usuario</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Ingresa el nombre de usuario"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              disabled={createUserMutation.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Ingresa el correo electrónico"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              disabled={createUserMutation.isPending}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={createUserMutation.isPending}
          >
            {createUserMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando usuario...
              </>
            ) : (
              "Crear Usuario"
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}