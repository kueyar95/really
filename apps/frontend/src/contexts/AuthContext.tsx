import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/components/auth/supabase";
import { useNavigate } from "react-router-dom";
import { ExtendedUser, NormalizedUser } from "@/services/types";
import { UserService } from "@/services/queries";

interface AuthContextType {
  user: ExtendedUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
  setUser: (user: ExtendedUser) => void;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "really_ai_user_data";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const saveUserToStorage = (userData: ExtendedUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
  };

  const getUserFromStorage = (): ExtendedUser | null => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  };

  const clearUserFromStorage = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  const mergeUserData = async (
    supabaseUser: User,
    userData: NormalizedUser
  ): Promise<ExtendedUser> => {
    const extendedUser = {
      ...supabaseUser,
      company_id: userData.company_id,
      username: userData.username,
      role: userData.role,
      normalized_id: userData.id,
      company: userData.company,
    } as ExtendedUser;

    saveUserToStorage(extendedUser);
    return extendedUser;
  };

  const refreshUserData = async () => {
    if (!user?.id) return;

    try {
      const userData = await UserService.getUser(user.id);
      const extendedUser = await mergeUserData(user, userData);
      setUser(extendedUser);
    } catch (error) {
      console.error("Error refreshing user data:", error);
    }
  };

  // Procesar la autenticación pero sin configurar el usuario completo si no está en la base de datos
  const processUserAuthentication = async (
    supabaseUser: User,
    forceRefresh = false
  ) => {
    // Solo proceder si no estamos en la ruta de callback para evitar interferencias
    const isCallbackRoute = window.location.pathname === "/auth/callback";

    try {
      // Si estamos en la ruta de callback, no hacemos nada aquí
      if (isCallbackRoute) {
        setLoading(false);
        return;
      }

      // Intentar obtener datos del localStorage primero si no es forzado el refresh
      if (!forceRefresh) {
        const storedUser = getUserFromStorage();
        if (storedUser && storedUser.id === supabaseUser.id) {
          setUser(storedUser);
          setLoading(false);
          return;
        }
      }

      const userData = await UserService.getUser(supabaseUser.id);
      const extendedUser = await mergeUserData(supabaseUser, userData);
      setUser(extendedUser);
      setLoading(false);
    } catch (error) {
      console.error("Error al obtener datos de usuario:", error);

      if (!isCallbackRoute) {
        navigate("/auth/callback");
      }

      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);

    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        processUserAuthentication(session.user);
      } else {
        setUser(null);
        clearUserFromStorage();
        setLoading(false);
      }
    });

    // Escuchar cambios en la autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Forzar refresh de datos en cambios de autenticación
        processUserAuthentication(session.user, true);
      } else {
        setUser(null);
        clearUserFromStorage();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Error al iniciar sesión con Google:", error);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Validación adicional antes de llamar a Supabase
      if (!email || !email.trim()) {
        throw new Error('El email es requerido');
      }
      if (!password || !password.trim()) {
        throw new Error('La contraseña es requerida');
      }

      // Normalizar email (trim y lowercase)
      const normalizedEmail = email.trim().toLowerCase();
      
      console.log('Intentando iniciar sesión con:', { email: normalizedEmail });
      
      const {
        data: { session },
        error,
      } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password.trim(),
      });

      if (error) {
        console.error('Error de Supabase:', error);
        throw error;
      }

      if (session?.user) {
        const userData = await UserService.getUser(session.user.id);
        const extendedUser = await mergeUserData(session.user, userData);
        setUser(extendedUser);
      }

      return { error: null };
    } catch (error) {
      console.error('Error en signInWithEmail:', error);
      return { error: error as Error };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      clearUserFromStorage();
      navigate("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const updateUser = (newUserData: ExtendedUser) => {
    setUser(newUserData);
    saveUserToStorage(newUserData);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInWithEmail,
        logout,
        setUser: updateUser,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
