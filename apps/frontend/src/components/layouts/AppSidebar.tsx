import { useAuth } from "@/contexts/AuthContext";
import {
  Columns3,
  House,
  LogOut,
  MessageSquareMore,
  Users,
  Building,
  Bot,
  Settings,
} from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import reallyLogo from "@/assets/really-black.png";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

export function AppSidebar() {
  const { logout, user } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === "admin";
  const isSuperAdmin = user?.role === "super_admin";
  const [isCollapsed, setIsCollapsed] = useState(true);
  
  const menuMainItems = [
    {
      title: "Dashboard",
      icon: House,
      path: "/dashboard",
    },
    {
      title: "Etapas",
      icon: Columns3,
      path: "/dashboard/stages",
    },
    {
      title: "Chats",
      icon: MessageSquareMore,
      path: "/dashboard/chats",
    },
    // {
    //   title: "Calendar",
    //   icon: Calendar,
    //   path: "/dashboard/calendar",
    // },
  ];

  const adminMenuItems = [
    {
      title: "Usuarios",
      icon: Users,
      path: "/dashboard/admin/users",
    },
    {
      title: "Embudos",
      icon: Columns3,
      path: "/dashboard/admin/funnels",
    },
    {
      title: "Agentes",
      icon: Bot,
      path: "/dashboard/admin/bots",
    },
    // {
    //   title: "Chatbot",
    //   icon: BotMessageSquare,
    //   path: "/dashboard/admin/chat-bot",
    // },
  ];

  const superAdminMenuItems = [
    {
      title: "Empresas",
      icon: Building,
      path: "/dashboard/super/companies",
    },
    {
      title: "Bots",
      icon: Bot,
      path: "/dashboard/super/bots",
    },
  ];

  return (
    <Sidebar collapsible="icon" className="fixed z-50">
      <SidebarHeader
        className={`py-5 px-6 flex flex-row-reverse items-center justify-between gap-2 ${
          isCollapsed ? "px-2 mx-auto" : ""
        }`}
      >
        <SidebarTrigger
          className="w-6 h-6"
          onClick={() => setIsCollapsed(!isCollapsed)}
        />
        <img
          src={reallyLogo}
          alt="Logo de Severa"
          className={`h-12 ${isCollapsed ? "hidden" : ""}`}
        />
      </SidebarHeader>

      <SidebarContent className="justify-between">
        <div>
          {!isSuperAdmin && (
            <>
              <div>
                <p
                  className={`uppercase text-[11px] ml-4 mt-4 mb-2 text-slate-600 ${
                    isCollapsed ? "hidden" : ""
                  }`}
                >
                  Menu Principal
                </p>
                <SidebarMenu
                  className={`px-4 gap-2 ${
                    isCollapsed ? "px-2 mx-auto mt-6" : ""
                  }`}
                >
                  {menuMainItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={
                          item.path === "/dashboard"
                            ? location.pathname === "/dashboard"
                            : location.pathname.startsWith(item.path)
                        }
                        tooltip={item.title}
                      >
                        <Link to={item.path}>
                          <item.icon className="w-4 h-4 min-w-4 min-h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </div>

              {isAdmin && (
                <div>
                  {isCollapsed && (
                    <Separator
                      orientation="horizontal"
                      className="w-8 mx-auto my-4"
                    />
                  )}
                  <p
                    className={`uppercase text-[11px] ml-4 mt-4 mb-2 text-slate-600 ${
                      isCollapsed ? "hidden" : ""
                    }`}
                  >
                    Admin
                  </p>
                  <SidebarMenu
                    className={`px-4 gap-2 ${isCollapsed ? "px-2" : ""}`}
                  >
                    {adminMenuItems.map((item) => (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          asChild
                          isActive={location.pathname === item.path}
                          tooltip={item.title}
                        >
                          <Link to={item.path}>
                            <item.icon className="w-4 h-4 min-w-4 min-h-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </div>
              )}
            </>
          )}

          {isSuperAdmin && (
            <>
              <p className="uppercase text-[11px] ml-6 mt-4 mb-2 text-slate-600">
                Super Admin
              </p>
              <SidebarMenu className="px-4 gap-2">
                {superAdminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.path}
                      tooltip={item.title}
                    >
                      <Link to={item.path}>
                        <item.icon className="w-4 h-4 min-w-4 min-h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </>
          )}
        </div>

        <div className="mb-6">
          <SidebarMenu className={`px-4 gap-2 ${isCollapsed ? "px-2" : ""}`}>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={location.pathname === "/dashboard/settings"}
                tooltip="Ajustes"
              >
                <Link to="/dashboard/settings">
                  <Settings className="w-4 h-4 min-w-4 min-h-4" />
                  <span>Ajustes</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={logout}
                tooltip="Cerrar Sesión"
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <p
            className={`mt-6 px-4 text-xs text-muted-foreground ${
              isCollapsed ? "hidden" : ""
            }`}
          >
            By Really
          </p>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
