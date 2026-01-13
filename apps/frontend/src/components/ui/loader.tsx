import { Loader2 } from "lucide-react";

export function Loader() {
  return (
    <div className="h-[calc(100vh-64px)] w-full flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    </div>
  );
}
