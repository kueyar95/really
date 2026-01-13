import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CloudOff } from "lucide-react";

export function WhatsAppCloudCard() {
  return (
    <Card className="opacity-50">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <CloudOff className="w-5 h-5" />
            WhatsApp Cloud API
          </CardTitle>
          <CardDescription>
            Conecta WhatsApp Business API para enviar mensajes a gran escala
          </CardDescription>
        </div>
        <Badge variant="outline">
          Próximamente
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Esta funcionalidad estará disponible próximamente.
        </p>
      </CardContent>
    </Card>
  );
} 