import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Navigate } from 'react-router-dom';
import { Loader } from '@/components/ui/loader';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { useState } from 'react';
import { AdminService } from '@/services/Admin/queries';
import { SupabaseService } from '@/services/Supabase/queries';
import { useMutation } from '@tanstack/react-query';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from 'sonner'
import reallyLogo from '@/assets/really-white.png';
import { Link } from 'react-router-dom';

const registerSchema = Yup.object().shape({
  email: Yup.string()
    .email('Email inválido')
    .required('El email es requerido'),
  password: Yup.string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .required('La contraseña es requerida'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Las contraseñas deben coincidir')
    .required('Confirma tu contraseña'),
});

export function Register() {
  const { user, loading, signInWithEmail } = useAuth();
  const [registerError, setRegisterError] = useState<string | null>(null);

  const registerMutation = useMutation({
    mutationFn: async (values: { email: string; password: string }) => {
      // 1. Verificar si el usuario existe en nuestra base de datos y obtener sus datos
      const { exists, id, userData } = await AdminService.checkEmail(values.email);

      if (!exists || !userData) {
        throw new Error('No tienes permiso para registrarte. Contacta al administrador.');
      }

      // 2. Crear usuario en Supabase
      const supabaseUser = await SupabaseService.createUser({
        email: values.email,
        password: values.password,
        userId: id,
      });

      // 3. Actualizar el usuario con el supabaseId
      await AdminService.updateUserSupabaseId(id, supabaseUser.id);

      // 4. Iniciar sesión automáticamente
      const { error: signInError } = await signInWithEmail(values.email, values.password);
      if (signInError) throw signInError;

      return { id, ...userData };
    },
    onSuccess: () => {
      toast.success('Registro completado exitosamente');
      // El AuthContext se encargará de la redirección
    },
    onError: (error: Error) => {
      setRegisterError(error.message);
    },
  });

  if (loading) {
    return <Loader />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleRegister = async (values: { email: string; password: string; confirmPassword: string }) => {
    setRegisterError(null);
    registerMutation.mutate(values);
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

          <div className="mt-8 w-full">
            <Formik
              initialValues={{ email: '', password: '', confirmPassword: '' }}
              validationSchema={registerSchema}
              onSubmit={handleRegister}
            >
              {({ errors, touched, isSubmitting, handleChange, values }) => (
                <Form className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Correo electrónico
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={values.email}
                      onChange={handleChange}
                      placeholder="tu@email.com"
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                      disabled={registerMutation.isPending}
                    />
                    {errors.email && touched.email && (
                      <p className="text-sm text-red-500">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Contraseña
                    </Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={values.password}
                      onChange={handleChange}
                      placeholder="Tu contraseña"
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                      disabled={registerMutation.isPending}
                    />
                    {errors.password && touched.password && (
                      <p className="text-sm text-red-500">{errors.password}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                      Confirmar contraseña
                    </Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={values.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirma tu contraseña"
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                      disabled={registerMutation.isPending}
                    />
                    {errors.confirmPassword && touched.confirmPassword && (
                      <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                    )}
                  </div>

                  {registerError && (
                    <p className="text-sm text-red-500 text-center">{registerError}</p>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting || registerMutation.isPending}
                  >
                    {registerMutation.isPending ? 'Registrando...' : 'Completar registro'}
                  </Button>
                </Form>
              )}
            </Formik>
          </div>

          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              ¿Ya tienes una cuenta?{" "}
              <Link to="/login" className="text-blue-600 hover:underline">
                Iniciar sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}