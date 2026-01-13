import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/layouts/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ToastProvider } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
export function AuthLayout() {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <SidebarProvider defaultOpen={false}>
        <ToastProvider>
          <div className="relative flex min-h-screen w-full">
            <AppSidebar />
            <SidebarInset className="bg-gray-50 w-[calc(100%-256px)]">
              <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-white w-full">
                <div className="flex items-center gap-2 w-full px-4 md:px-6 lg:px-8">
                  <Skeleton className="h-8 w-64" />
                </div>
              </header>
              <div className="w-full">
                <Skeleton className="h-full w-full" />
              </div>
            </SidebarInset>
          </div>
        </ToastProvider>
      </SidebarProvider>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <ToastProvider>
        <div className="relative flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset className="bg-gray-50 w-[calc(100%-256px)]">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-white">
              <div className="flex items-center gap-2 w-full px-4 md:px-6 lg:px-8">
                <div className="flex items-center gap-2 w-full justify-between">
                  <h2 className="text-lg font-medium">
                    {`Bienvenido ${
                      user?.username
                        ? user.username.charAt(0).toUpperCase() +
                          user.username.slice(1)
                        : user?.email ?? ""
                    } 👋`}
                  </h2>
                  <p className="text-sm text-gray-500">{user?.company?.name}</p>
                </div>
              </div>
            </header>
            <div className="w-full bg-white flex-1">
              <ScrollArea className="h-full">
                <Outlet />
              </ScrollArea>
            </div>
          </SidebarInset>
        </div>
      </ToastProvider>
    </SidebarProvider>
  );
}
