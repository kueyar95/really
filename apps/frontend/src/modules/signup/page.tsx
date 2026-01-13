import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import reallyLogo from "@/assets/really-white.png";
import { supabase } from "@/components/auth/supabase";
import { createUserSignup } from "@/services/Admin/user";
import { SupabaseService } from "@/services/Supabase/queries";

// Esquema de validación
const signupSchema = z.object({
  username: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres" }),
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"]
});

type SignupFormValues = z.infer<typeof signupSchema>;

export function Signup() {
  const [signupError, setSignupError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithEmail } = useAuth();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: ""
    }
  });

  const handleSignup = async (values: SignupFormValues) => {
    try {
      setIsLoading(true);
      setSignupError(null);
  
      // 1. Intentar registro a través del backend público
      let supabaseId: string | null = null;
      
      try {
        const result = await SupabaseService.publicSignup({
          email: values.email,
          password: values.password,
          username: values.username,
        });
        supabaseId = result?.supabaseId || result?.user?.supabaseId || result?.user?.id || null;
        
      } catch (err: any) {
        // Verificar el mensaje de error del backend
        const backendMsg = err?.response?.data?.message || err?.message || '';
        const msgString = typeof backendMsg === 'string' ? backendMsg : String(backendMsg);
        
        // Buscar múltiples patrones que indiquen usuario duplicado
        const isDuplicate = msgString.toLowerCase().includes('already') || 
                          msgString.toLowerCase().includes('registered') ||
                          msgString.toLowerCase().includes('exists') ||
                          msgString.toLowerCase().includes('duplicate');
        
        if (isDuplicate) {
          setSignupError('Este email ya está registrado. Inicia sesión o usa otro correo.');
          // IMPORTANTE: Lanzar error para salir del try principal
          throw new Error('USER_ALREADY_EXISTS');
        }
        
        // Solo intentar fallback local en entornos no-productivos Y si NO es duplicado
        if (!window.location.origin.includes('app.really.cl')) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: values.email,
            password: values.password,
          });
          
          if (signUpError) {
            // Verificar si el error de Supabase también indica usuario existente
            if (signUpError.message?.toLowerCase().includes('already registered') ||
                signUpError.message?.toLowerCase().includes('user already exists')) {
              setSignupError('Este email ya está registrado. Inicia sesión o usa otro correo.');
              throw new Error('USER_ALREADY_EXISTS');
            }
            throw new Error(signUpError.message || 'Error al crear la cuenta en Supabase');
          }
          
          supabaseId = signUpData.user?.id || null;
        } else {
          // En producción, si falla el publicSignup, no continuar
          throw new Error('Error al crear la cuenta');
        }
      }
  
      // Si llegamos aquí, el usuario NO existe y tenemos un supabaseId
      if (!supabaseId) {
        throw new Error('No se pudo crear la cuenta de usuario');
      }
  
      // 2. Si el endpoint público ya creó el usuario en nuestra BD, no repetir
      if (!window.location.origin.includes('app.really.cl')) {
        // Entorno local: crear registro en nuestra BD
        await createUserSignup({
          supabaseId: supabaseId,
          username: values.username,
          email: values.email
        });
      }
  
      // 3. Iniciar sesión automáticamente
      const { error } = await signInWithEmail(values.email, values.password);
  
      if (error) {
        throw new Error('Error al iniciar sesión automáticamente');
      }
  
      // 4. El App.tsx se encargará de redirigir al onboarding automáticamente
      // cuando detecte el rol pending_onboarding
  
    } catch (error: unknown) {
      console.error('Error en el registro:', error);
      
      // No sobrescribir el mensaje de error si ya se estableció (usuario duplicado)
      if (!signupError) {
        const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error al crear la cuenta';
        // No mostrar "USER_ALREADY_EXISTS" como mensaje al usuario
        if (errorMessage !== 'USER_ALREADY_EXISTS') {
          setSignupError(errorMessage);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Panel izquierdo con imagen de fondo y logo */}
      <div className="hidden lg:flex lg:w-1/2 bg-black flex-col items-center justify-center p-12 relative">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="z-10 flex flex-col items-center text-center">
          <img src={reallyLogo} alt="Really Logo" className="w-64 h-auto mb-8" />
          <h2 className="text-3xl font-bold text-white mb-4">Bienvenido a Really</h2>
          <p className="text-white/80 text-lg max-w-md">
            La plataforma donde realmente vendes más y mejor.
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

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Crear una cuenta
            </h1>
            <p className="text-gray-600">
              Completa el formulario para comenzar a utilizar Really
            </p>
          </div>

          {signupError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md mb-6 text-sm">
              {signupError}
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSignup)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isLoading} placeholder="Tu nombre" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isLoading} type="email" placeholder="correo@ejemplo.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isLoading} type="password" placeholder="******" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar contraseña</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isLoading} type="password" placeholder="******" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creando cuenta..." : "Crear cuenta"}
              </Button>

              <div className="text-center mt-6">
                <p className="text-sm text-gray-600">
                  ¿Ya tienes una cuenta?{" "}
                  <Link to="/login" className="text-blue-600 hover:underline">
                    Iniciar sesión
                  </Link>
                </p>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}