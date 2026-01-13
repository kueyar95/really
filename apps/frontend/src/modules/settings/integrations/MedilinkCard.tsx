import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, CheckCircle2 } from "lucide-react";

interface MedilinkCardProps {
  isConnected: boolean;
  isInvalidToken: boolean;
  isLoading: boolean;
  onClick: () => void;
}

export function MedilinkCard({ isConnected, isInvalidToken, isLoading, onClick }: MedilinkCardProps) {
  const getStatusBadge = () => {
    if (isLoading) {
      return <Badge variant="outline" className="gap-1">
        <Activity className="w-3 h-3 animate-pulse" />
        Cargando...
      </Badge>;
    }

    if (isInvalidToken) {
      return <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="w-3 h-3" />
        Token Inválido
      </Badge>;
    }

    if (isConnected) {
      return <Badge variant="default" className="gap-1 bg-green-500">
        <CheckCircle2 className="w-3 h-3" />
        Conectado
      </Badge>;
    }

    return <Badge variant="secondary">
      Desconectado
    </Badge>;
  };

  return (
    <Card 
      className="cursor-pointer hover:border-primary transition-colors"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="bg-blue-500/10 p-3 rounded-lg">
            <svg className="h-8 w-8 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              <path d="M12 16h.01" />
              <path d="M12 12h.01" />
              <path d="M8 16h.01" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="flex items-center gap-2">
                Medilink
              </CardTitle>
              {getStatusBadge()}
            </div>
            <CardDescription>
              Integración con Medilink para agendamiento de citas médicas
            </CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

