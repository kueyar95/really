import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader } from "@/components/ui/loader";

export function AdminRoute() {
  const { loading, user } = useAuth();

  if (loading) {
    return <Loader />;
  }

  // Verificamos si el usuario tiene rol de administrador
  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}