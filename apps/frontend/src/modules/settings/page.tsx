import { useSearchParams } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Settings as SetImage, MessageSquare, Blocks } from "lucide-react";
import { GeneralTab } from "./tabs/GeneralTab";
import { ChannelsTab } from "./tabs/ChannelsTab";
import { IntegrationsTab } from "./tabs/IntegrationsTab";

interface SidebarNavItem {
  title: string;
  value: string;
  icon: React.ReactNode;
}

const sidebarNavItems: SidebarNavItem[] = [
  {
    title: "General",
    value: "general",
    icon: <SetImage className="w-4 h-4" />,
  },
  {
    title: "Canales y Cuentas",
    value: "channels",
    icon: <MessageSquare className="w-4 h-4" />,
  },
  {
    title: "Integraciones",
    value: "integrations",
    icon: <Blocks className="w-4 h-4" />,
  },
];

function SidebarNav() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "general";

  return (
    <nav className="flex flex-col gap-4">
      {sidebarNavItems.map((item) => (
        <Button
          key={item.value}
          className={cn(
            "bg-transparent text-primary shadow-none justify-start",
            tab === item.value && "bg-primary text-white",
            tab !== item.value && "hover:bg-gray-100"
          )}
          onClick={() => setSearchParams({ tab: item.value })}
        >
          {item.icon}
          <span className="ml-2">{item.title}</span>
        </Button>
      ))}
    </nav>
  );
}

export default function Settings() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "general";

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h3 className="text-2xl font-bold tracking-tight mb-2">
          Configuración
        </h3>
        <p className="text-base text-muted-foreground">
          Administra la configuración de tu cuenta y establece tus preferencias.
        </p>
      </div>
      <Separator className="my-6" />

      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="lg:w-1/5">
          <SidebarNav />
        </aside>
        <div className="flex-1 lg:max-w-4xl">
          {tab === "general" && <GeneralTab />}
          {tab === "channels" && <ChannelsTab />}
          {tab === "integrations" && <IntegrationsTab />}
        </div>
      </div>
    </div>
  );
}
