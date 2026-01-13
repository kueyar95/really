import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChannelStatus } from "@/services/Whatsapp/types";
import { AlertCircle, Loader2, Phone, RefreshCw } from "lucide-react";

interface WhatsAppWebCardProps {
  status: ChannelStatus;
  phoneNumber: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  error: string | null;
  isLoading?: boolean;
}

export function WhatsAppWebCard({
  status,
  phoneNumber,
  onConnect,
  onDisconnect,
  error,
  isLoading = false
}: WhatsAppWebCardProps) {
  const getStatusColor = (status: ChannelStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'not_configured':
      case 'inactive':
        return 'bg-gray-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: ChannelStatus) => {
    switch (status) {
      case 'active':
        return 'Conectado';
      case 'connecting':
        return 'Conectando...';
      case 'not_configured':
        return 'No configurado';
      case 'inactive':
        return 'Desconectado';
      case 'error':
        return 'Error';
      default:
        return 'Desconocido';
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            WhatsApp Web
          </CardTitle>
          <CardDescription>
            Conecta WhatsApp Web para enviar y recibir mensajes
          </CardDescription>
        </div>
        <Badge className={getStatusColor(status)}>
          {getStatusText(status)}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {phoneNumber && (
            <div className="text-sm text-muted-foreground">
              Número conectado: {phoneNumber}
            </div>
          )}

          <div className="flex justify-end gap-2">
            {status === 'active' ? (
              <Button
                variant="destructive"
                onClick={onDisconnect}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Desconectando...
                  </>
                ) : (
                  'Desconectar'
                )}
              </Button>
            ) : status === 'connecting' || isLoading ? (
              <Button disabled>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Conectando...
              </Button>
            ) : status === 'error' ? (
              <Button
                variant="outline"
                onClick={onConnect}
                disabled={isLoading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reintentar
              </Button>
            ) : (
              <Button 
                onClick={onConnect}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  'Conectar WhatsApp'
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 