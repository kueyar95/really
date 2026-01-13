import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import reallyLogo from "@/assets/really-white.png";
import { createCompany } from "@/services/Admin/user";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

// Esquema de validación para el paso 1 del onboarding
const companySchema = z.object({
  companyName: z.string().min(2, { message: "El nombre de la empresa debe tener al menos 2 caracteres" }),
  website: z.string()
    .trim()
    .refine(
      (val) => {
        // Si está vacío, es válido (opcional)
        if (!val) return true;
        
        // Si ya tiene http:// o https://, validamos con URL
        if (val.startsWith('http://') || val.startsWith('https://')) {
          try {
            new URL(val);
            return true;
          } catch {
            return false;
          }
        }
        
        // Si no tiene prefijo, validamos con https:// agregado
        try {
          new URL(`https://${val}`);
          return true;
        } catch {
          return false;
        }
      },
      { message: "URL inválida" }
    )
    .optional()
    .or(z.literal(''))
});

type CompanyFormValues = z.infer<typeof companySchema>;

export function OnboardingPage() {
  const { step } = useParams<{ step: string }>();
  const currentStep = parseInt(step || "1");
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Estado para la pantalla de carga completa
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      companyName: "",
      website: ""
    }
  });

  const handleSubmit = async (values: CompanyFormValues) => {
    try {
      if (!user) {
        throw new Error("Usuario no autenticado");
      }

      setIsLoading(true);
      setIsProcessing(true); // Activar pantalla de carga completa
      setError(null);

      // Procesar el sitio web - agregar https:// si no lo tiene
      let websiteUrl = values.website ? values.website.trim() : undefined;
      if (websiteUrl && !websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
        websiteUrl = `https://${websiteUrl}`;
      }

      // 1. Crear empresa
      const company = await createCompany({
        name: values.companyName,
        website: websiteUrl || undefined
      });


      // 3. Si después de actualizar los datos del backend todavía no tenemos
      // información de la empresa, actualizamos manualmente
      const currentUser = user;
      if (setUser && currentUser && (!currentUser.company || !currentUser.company_id)) {
        setUser({
          ...currentUser,
          role: 'admin',
          company: company,
          company_id: company.id
        });
      }

      // 4. Redireccionar al dashboard
      navigate('/dashboard');
    } catch (error: unknown) {
      console.error('Error en onboarding:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error al configurar la empresa';
      setError(errorMessage);
      setIsProcessing(false); // Desactivar pantalla de carga en caso de error
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la empresa</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isLoading} placeholder="Mi Empresa" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sitio web (opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isLoading} placeholder="miempresa.com" />
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">
                      Puedes escribir la URL con o sin el prefijo https://
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creando empresa..." : "Continuar"}
              </Button>
            </form>
          </Form>
        );
      default:
        return <div>Paso no encontrado</div>;
    }
  };

  return (
    <>
      {/* Pantalla de carga completa */}
      {isProcessing && (
        <div className="flex min-h-screen items-center justify-center bg-black w-full h-full fixed inset-0 z-50">
          <div className="flex flex-col items-center gap-4">
            <img
              src={reallyLogo}
              alt="Really Logo"
              className="w-32 h-auto animate-pulse"
            />
            <Loader2 className="h-8 w-8 animate-spin text-white" />
            <p className="text-white text-sm mt-2">Configurando tu empresa...</p>
          </div>
        </div>
      )}

      <div className="flex min-h-screen">
        {/* Panel izquierdo con imagen de fondo y logo */}
        <div className="hidden lg:flex lg:w-1/2 bg-black flex-col items-center justify-center p-12 relative">
          <div className="absolute inset-0 bg-black opacity-20"></div>
          <div className="z-10 flex flex-col items-center text-center">
            <img src={reallyLogo} alt="Really Logo" className="w-64 h-auto mb-8" />
            <h2 className="text-3xl font-bold text-white mb-4">Configuración inicial</h2>
            <p className="text-white/80 text-lg max-w-md">
              Estás a pocos pasos de comenzar a utilizar Really
            </p>
          </div>
        </div>

        {/* Panel derecho con formulario */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
          <div className="w-full max-w-md">
            {/* Logo para móviles */}
            <div className="lg:hidden flex justify-center mb-8">
              <img src={reallyLogo} alt="Really Logo" className="w-40 h-auto" />
            </div>

            <div className="mb-8">
              <Progress value={currentStep * 100} className="mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Configuración de empresa
              </h1>
              <p className="text-gray-600">
                Completa los datos para crear tu empresa en Really
              </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md mb-6 text-sm">
                {error}
              </div>
            )}

            {renderStep()}
          </div>
        </div>
      </div>
    </>
  );
} 