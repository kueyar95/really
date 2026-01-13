import { Routes, Route, Navigate } from "react-router-dom";
import { Login } from "./modules/login/page";
import { Register } from "./modules/register/page";
import { Signup } from "./modules/signup/page";
import { OnboardingPage } from "./modules/onboarding/page";
import { Dashboard } from "./modules/dashboard/page";
import { Stages } from "./modules/funnels/page";
import { Chats } from "./modules/chats/page";
import { AuthLayout } from "./components/layouts/AuthLayout";
import { useAuth } from "./contexts/AuthContext";
import { AuthCallback } from "./components/auth/AuthCallback";
import { AdminRoute } from "./components/auth/AdminRoute";
import { SocketProvider } from "./contexts/SocketContext";
import { InactivityProvider } from "./contexts/InactivityContext";
import { InactivityModal } from "./components/InactivityModal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuperAdminRoute } from "./components/auth/SuperAdminRoute";
import BotsPage from "./modules/super_admin/bots/page";
import CompaniesPage from "./modules/super_admin/companies/page";
import AdminBotsPage from "./modules/admin/bots/page";
import CreateBotPage from "./modules/admin/bots/create-page";
import EditBotPage from "./modules/admin/bots/edit-page";
import FunnelsPage from "./modules/admin/funnels/page";
import CreateFunnelPage from "./modules/admin/funnels/create";
import EditFunnelPage from "./modules/admin/funnels/edit";
import UsersPage from "./modules/admin/users/page";
import Settings from "./modules/settings/page";
import { CalendarPage } from "./modules/calendar/CalendarPage";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import reallyLogo from "@/assets/really-white.png";
import TryBotPage from "./modules/admin/bots/try-page";

const queryClient = new QueryClient();

function App() {
  const { user, loading } = useAuth();

  // Efecto para borrar claves específicas del localStorage al recargar la página
  useEffect(() => {
    // Esta función se ejecutará solo cuando el componente se monte (al cargar/recargar la página)
    localStorage.removeItem("lastSelectedClient");
    localStorage.removeItem("lastSelectedFunnelId");
  }, []);

  // Mostrar un estado de carga mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black w-full h-full fixed inset-0 z-50">
        <div className="flex flex-col items-center gap-4">
          <img
            src={reallyLogo}
            alt="Really Logo"
            className="w-32 h-auto animate-pulse"
          />
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      </div>
    );
  }

  // Si el usuario tiene el rol pending_onboarding, redirigir al onboarding
  if (user && user.role === "pending_onboarding") {
    return (
      <Routes>
        <Route path="/onboarding/:step" element={<OnboardingPage />} />
        <Route path="*" element={<Navigate to="/onboarding/1" replace />} />
      </Routes>
    );
  }

  // Si hay usuario con rol normal, mostrar la aplicación
  if (user && user.role && user.role !== "pending_onboarding") {
    return (
      <SocketProvider>
        <InactivityProvider>
          <QueryClientProvider client={queryClient}>
            <Routes>
              <Route path="/dashboard" element={<AuthLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="stages" element={<Stages />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="chats" element={<Chats />}>
                  <Route path=":channelId/:clientId?" element={<Chats />} />
                </Route>
                <Route path="settings" element={<Settings />} />
                <Route element={<AdminRoute />}>
                  <Route path="admin/users" element={<UsersPage />} />
                  <Route path="admin/funnels" element={<FunnelsPage />} />
                  <Route
                    path="admin/funnels/create"
                    element={<CreateFunnelPage />}
                  />
                  <Route
                    path="admin/funnels/edit/:id"
                    element={<EditFunnelPage />}
                  />
                  <Route path="admin/bots" element={<AdminBotsPage />} />
                  <Route
                    path="admin/bots/create-bot"
                    element={<CreateBotPage />}
                  />
                  <Route
                    path="admin/bots/edit-bot/:id"
                    element={<EditBotPage />}
                  />
                  <Route path="admin/bots/try/:id" element={<TryBotPage />} />
                </Route>
                <Route element={<SuperAdminRoute />}>
                  <Route path="super/companies" element={<CompaniesPage />} />
                  <Route
                    path="super/companies/:companyId/users"
                    element={<UsersPage />}
                  />
                  <Route
                    path="super/companies/:companyId/funnels"
                    element={<FunnelsPage />}
                  />
                  <Route path="super/bots" element={<BotsPage />} />
                </Route>
              </Route>

              <Route
                path="*"
                element={
                  <Navigate
                    to={
                      user?.role === "super_admin"
                        ? "/dashboard/super/companies"
                        : "/dashboard"
                    }
                    replace
                  />
                }
              />
            </Routes>
            <InactivityModal />
          </QueryClientProvider>
        </InactivityProvider>
      </SocketProvider>
    );
  }

  // Si no hay usuario, mostrar rutas públicas
  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
