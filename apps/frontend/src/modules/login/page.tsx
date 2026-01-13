import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { useState } from 'react';
import { supabase } from '@/components/auth/supabase';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from 'lucide-react';
import reallyLogo from '@/assets/really-white.png';

const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Email inválido')
    .required('El email es requerido'),
  password: Yup.string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .required('La contraseña es requerida'),
});

export function Login() {
  const { user, loading, signInWithEmail } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);
  const navigate = useNavigate();

  if (loading || (user && !user.role)) {
    return (
      <div className="fixed inset-0 z-50 flex min-h-screen w-full h-full items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <img src={reallyLogo} alt="Really Logo" className="w-32 h-auto animate-pulse" />
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      </div>
    );
  }

  if (user && user.role) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
    } catch (error) {
      // Error al iniciar sesión con Google
    }
  };

  const handleEmailLogin = async (values: { email: string; password: string }) => {
    try {
      setLoginError(null);
      
      // Validación adicional
      if (!values.email || !values.email.trim()) {
        setLoginError('Por favor ingresa tu correo electrónico.');
        return;
      }
      
      if (!values.password || !values.password.trim()) {
        setLoginError('Por favor ingresa tu contraseña.');
        return;
      }

      console.log('Iniciando sesión con:', { email: values.email });
      
      const { error } = await signInWithEmail(values.email, values.password);

      if (error) {
        const errorMessage = error.message || 'Error desconocido';
        console.error('Error de autenticación completo:', error);
        
        // Handle specific authentication error cases
        if (errorMessage.includes('Invalid login credentials') || errorMessage.includes('invalid_credentials')) {
          setLoginError('Email o contraseña incorrectos. Por favor verifica tus credenciales.');
        } else if (errorMessage.includes('Email not confirmed') || errorMessage.includes('email_not_confirmed')) {
          setLoginError('Tu correo electrónico no ha sido confirmado. Por favor revisa tu bandeja de entrada.');
        } else if (errorMessage.includes('User not found')) {
          setLoginError('No se encontró una cuenta con este correo electrónico.');
        } else if (errorMessage.includes('400') || errorMessage.includes('Bad Request')) {
          setLoginError(`Error en la solicitud: ${errorMessage}. Por favor verifica que todos los campos estén completos.`);
        } else {
          setLoginError(`Error de autenticación: ${errorMessage}`);
        }
        return;
      }
      navigate('/dashboard');
    } catch (error) {
      console.error('Error inesperado:', error);
      setLoginError('Ocurrió un error inesperado al iniciar sesión. Por favor intenta nuevamente.');
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
              Iniciar sesión
            </h1>
            <p className="text-gray-600">
              Ingresa tus credenciales para acceder a tu cuenta
            </p>
          </div>

          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={loginSchema}
            onSubmit={handleEmailLogin}
          >
            {({ errors, touched, isSubmitting, handleChange, values }) => (
              <Form className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700 block">
                    Correo electrónico
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={values.email}
                    onChange={handleChange}
                    placeholder="tu@email.com"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors duration-200"
                  />
                  {errors.email && touched.email && (
                    <p className="text-xs italic text-red-600">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700 block">
                      Contraseña
                    </Label>
                    <Link to="/forgot-password" className="text-sm text-gray-600 hover:text-black">
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={values.password}
                    onChange={handleChange}
                    placeholder="Tu contraseña"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors duration-200"
                  />
                  {errors.password && touched.password && (
                    <p className="text-xs italic text-red-600">{errors.password}</p>
                  )}
                </div>

                {loginError && (
                  <div className="bg-gray-100 border border-gray-300 px-4 py-3 rounded-lg">
                    <p className="text-xs italic text-red-600">{loginError}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full py-3 bg-black hover:bg-gray-800 text-white font-medium rounded-lg transition-colors duration-200"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Iniciando sesión...</span>
                    </div>
                  ) : (
                    'Iniciar sesión'
                  )}
                </Button>
              </Form>
            )}
          </Formik>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-gray-500">O continúa con</span>
            </div>
          </div>

          <Button
            onClick={handleGoogleLogin}
            className="w-full py-3 flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg transition-colors duration-200"
            variant="outline"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </Button>

          <div className="text-center mt-6 space-y-2">
            <p className="text-sm text-gray-600">
              ¿No tienes una cuenta?{" "}
              <Link to="/signup" className="text-blue-600 hover:underline">
                ¡Crear cuenta!
              </Link>
            </p>
            <p className="text-sm text-gray-600">
              ¿Tienes una invitación?{" "}
              <Link to="/register" className="text-blue-600 hover:underline">
                Registrar empresa
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}