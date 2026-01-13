import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";
import { Loader } from "@/components/ui/loader";
import { createUserSignup } from "@/services/Admin/user";
import { UserService } from "@/services/queries";
import { useAuth } from "@/contexts/AuthContext";

export function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("Procesando autenticación...");
  const { setUser } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setMessage("Verificando sesión...");

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setError("No se encontró una sesión activa");
          navigate("/login?error=no_session");
          return;
        }

        setMessage("Verificando usuario en base de datos...");

        try {
          const userData = await UserService.getUser(session.user.id);

          if (userData) {
            // El usuario ya existe, actualizamos el contexto y storage
            const extendedUser = {
              ...session.user,
              company_id: userData.company_id,
              username: userData.username,
              role: userData.role,
              normalized_id: userData.id,
              company: userData.company,
            };

            setUser(extendedUser);

            // Redirigir según el rol
            if (userData.role === "pending_onboarding") {
              navigate("/onboarding/1");
            } else {
              navigate("/dashboard");
            }
            return;
          }
        } catch (error) {
          setMessage("Creando usuario en la base de datos...");

          try {
            const newUserData = {
              supabaseId: session.user.id,
              username:
                session.user.user_metadata.name ||
                session.user.email?.split("@")[0] ||
                "Usuario",
              email: session.user.email || "",
            };
            await createUserSignup(newUserData);

            try {
              const freshUserData = await UserService.getUser(session.user.id);

              if (freshUserData) {
                const extendedUser = {
                  ...session.user,
                  company_id: freshUserData.company_id,
                  username: freshUserData.username,
                  role: freshUserData.role,
                  normalized_id: freshUserData.id,
                  company: freshUserData.company,
                };

                setUser(extendedUser);

                if (freshUserData.role === "pending_onboarding") {
                  navigate("/onboarding/1");
                } else {
                  navigate("/dashboard");
                }
                return;
              }
            } catch (getFreshUserError) {
              console.error(
                "Error al obtener usuario recién creado:",
                getFreshUserError
              );
            }

            navigate("/onboarding/1");
          } catch (createError) {
            console.error("Error al crear usuario:", createError);
            setError("Error al crear usuario en la base de datos");
            navigate("/login?error=user_creation_failed");
          }
        }
      } catch (generalError) {
        console.error("Error procesando callback:", generalError);
        setError("Error al procesar la autenticación");
        navigate("/login?error=unexpected");
      }
    };

    handleAuthCallback();
  }, [navigate, setUser]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <Loader />
      <p className="mt-4 text-gray-600">{message}</p>
      {error && <p className="mt-2 text-red-600">{error}</p>}
    </div>
  );
}
