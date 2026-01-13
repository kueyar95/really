import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Building2,
  Users,
  Stethoscope,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { useMedilink, useMedilinkBranches, useMedilinkProfessionals } from '@/hooks/useMedilink';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface MedilinkConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ConnectionFormData {
  accessToken: string;
  baseUrl: string;
  rateLimitPerMin: number;
}

export function MedilinkConfigModal({ open, onOpenChange }: MedilinkConfigModalProps) {
  const {
    isConnected,
    isInvalidToken,
    isLoading,
    isConnecting,
    isDisconnecting,
    metadata,
    connect,
    validate,
    disconnect,
    refetch,
  } = useMedilink();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ConnectionFormData>({
    defaultValues: {
      baseUrl: 'https://api.medilink.healthatom.com/api/v1',
      rateLimitPerMin: 20,
    },
  });

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const onSubmit = async (data: ConnectionFormData) => {
    await connect(data);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      await validate();
      setTestResult({
        success: true,
        message: 'Conexión válida con Medilink',
      });
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.response?.data?.message || 'Error al probar la conexión',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (confirm('¿Estás seguro de que deseas desconectar Medilink?')) {
      await disconnect('Desconectado desde la UI');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-blue-500/10 p-3 rounded-lg">
              <svg className="h-10 w-10 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                <path d="M12 16h.01" />
                <path d="M12 12h.01" />
                <path d="M8 16h.01" />
              </svg>
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2">
                Medilink
                {isConnected && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                {isInvalidToken && <AlertCircle className="w-5 h-5 text-red-500" />}
              </DialogTitle>
              <DialogDescription>
                Gestiona la integración con Medilink para agendamiento de citas médicas
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue={isConnected ? "status" : "connect"} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="connect">Conexión</TabsTrigger>
            <TabsTrigger value="status" disabled={!isConnected}>Estado</TabsTrigger>
            <TabsTrigger value="metadata" disabled={!isConnected}>Catálogos</TabsTrigger>
          </TabsList>

          {/* Tab de Conexión */}
          <TabsContent value="connect" className="flex-1 overflow-auto space-y-4">
            {/* Alerta de configuración faltante */}
            <Alert variant="default" className="border-amber-500 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-900">Configuración del Servidor Requerida</AlertTitle>
              <AlertDescription className="text-amber-800 text-sm">
                <p className="mb-2">
                  Antes de conectar Medilink, el administrador del sistema debe configurar la variable de entorno:
                </p>
                <code className="block bg-amber-100 p-2 rounded text-xs font-mono mb-2">
                  MEDILINK_ENCRYPTION_KEY_B64
                </code>
                <p className="text-xs">
                  📄 Consulta el archivo <strong>MEDILINK_ENV_SETUP.md</strong> en el backend para instrucciones detalladas.
                </p>
              </AlertDescription>
            </Alert>

            {isInvalidToken && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  El token de acceso es inválido. Por favor, genera un nuevo token en Medilink.
                </AlertDescription>
              </Alert>
            )}

            {isConnected && !isInvalidToken && (
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription>
                  Integración conectada y funcionando correctamente.
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accessToken">Token de Acceso *</Label>
                <Input
                  id="accessToken"
                  type="password"
                  placeholder="Pega aquí tu token de Medilink"
                  {...register('accessToken', {
                    required: 'El token es obligatorio',
                  })}
                  disabled={isConnecting}
                />
                {errors.accessToken && (
                  <p className="text-sm text-red-500">{errors.accessToken.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Genera el token en Medilink: Administrador → Configuración API → + Agregar cliente → Ver token → Generar
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="baseUrl">URL Base de la API</Label>
                <Select
                  value={watch('baseUrl')}
                  onValueChange={(value) => setValue('baseUrl', value)}
                  disabled={isConnecting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="https://api.medilink.healthatom.com/api/v1">
                      Medilink v1 (api.medilink.healthatom.com)
                    </SelectItem>
                    <SelectItem value="https://api.medilink2.healthatom.com/api/v5">
                      Medilink v2/v5 (api.medilink2.healthatom.com)
                    </SelectItem>
                    <SelectItem value="https://api.medilink2.healthatom.com/api/v6">
                      Medilink v2/v6 (api.medilink2.healthatom.com)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Selecciona la versión de Medilink que usa tu clínica
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rateLimitPerMin">Límite de Requests/Minuto</Label>
                <Input
                  id="rateLimitPerMin"
                  type="number"
                  min="1"
                  max="60"
                  {...register('rateLimitPerMin', {
                    valueAsNumber: true,
                    min: { value: 1, message: 'Mínimo 1' },
                    max: { value: 60, message: 'Máximo 60' },
                  })}
                  disabled={isConnecting}
                />
                {errors.rateLimitPerMin && (
                  <p className="text-sm text-red-500">{errors.rateLimitPerMin.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Controla la velocidad de requests para evitar límites de Medilink
                </p>
              </div>

              {testResult && (
                <Alert variant={testResult.success ? "default" : "destructive"}>
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>{testResult.message}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isConnecting || isLoading}
                >
                  {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isConnected ? 'Actualizar Conexión' : 'Conectar Medilink'}
                </Button>

                {isConnected && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                  >
                    {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Probar Conexión
                  </Button>
                )}
              </div>

              {isConnected && (
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                >
                  {isDisconnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Desconectar Medilink
                </Button>
              )}
            </form>

            <div className="pt-4 border-t space-y-2">
              <h4 className="text-sm font-medium">Ayuda</h4>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>• El token se almacena cifrado con AES-256-GCM</p>
                <p>• Solo usuarios admin pueden conectar integraciones</p>
                <p>• Cada empresa puede tener su propio token de Medilink</p>
                <p>
                  • Documentación:{' '}
                  <a 
                    href="https://api.medilink.healthatom.com/docs" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    api.medilink.healthatom.com
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Tab de Estado */}
          <TabsContent value="status" className="flex-1 overflow-auto space-y-4">
            {metadata && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Estado de la Integración</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Estado</p>
                        <div className="flex items-center gap-2 mt-1">
                          {metadata.status === 'connected' && (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                              <span className="text-sm font-medium text-green-500">Conectado</span>
                            </>
                          )}
                          {metadata.status === 'invalid_token' && (
                            <>
                              <AlertCircle className="w-4 h-4 text-red-500" />
                              <span className="text-sm font-medium text-red-500">Token Inválido</span>
                            </>
                          )}
                          {metadata.status === 'revoked' && (
                            <>
                              <AlertCircle className="w-4 h-4 text-gray-500" />
                              <span className="text-sm font-medium text-gray-500">Revocado</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">URL Base</p>
                        <p className="text-sm font-medium mt-1 truncate">{metadata.baseUrl}</p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Rate Limit</p>
                        <p className="text-sm font-medium mt-1">
                          {metadata.rateLimitPerMin} req/min
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Última Conexión</p>
                        <p className="text-sm font-medium mt-1">
                          {metadata.lastSuccessAt 
                            ? new Date(metadata.lastSuccessAt).toLocaleString('es-ES')
                            : 'N/A'
                          }
                        </p>
                      </div>
                    </div>

                    {metadata.lastErrorAt && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          <strong>Último error ({new Date(metadata.lastErrorAt).toLocaleString('es-ES')}):</strong>
                          <br />
                          {metadata.lastError || 'Error desconocido'}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => refetch()}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Actualizar Estado
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                  >
                    {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Probar Conexión
                  </Button>
                </div>

                {testResult && (
                  <Alert variant={testResult.success ? "default" : "destructive"}>
                    {testResult.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertDescription>{testResult.message}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </TabsContent>

          {/* Tab de Catálogos (Metadata) */}
          <TabsContent value="metadata" className="flex-1 overflow-auto">
            <MedilinkCatalogsView />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Componente para mostrar catálogos de Medilink
function MedilinkCatalogsView() {
  const { isConnected } = useMedilink();
  const { data: branches, isLoading: isLoadingBranches, refetch: refetchBranches } = useMedilinkBranches(isConnected);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const { data: professionals, isLoading: isLoadingProfessionals } = useMedilinkProfessionals(selectedBranch, isConnected);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <div>
          <h3 className="text-lg font-medium">No Conectado</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Conecta primero Medilink desde el tab "Conexión" para ver los catálogos disponibles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sucursales */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Sucursales
            </CardTitle>
            <CardDescription>
              {branches?.length || 0} sucursales disponibles
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetchBranches()}
            disabled={isLoadingBranches}
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingBranches ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            {isLoadingBranches ? (
              <div className="flex items-center justify-center h-[200px]">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : branches && branches.length > 0 ? (
              <div className="space-y-2">
                {branches.map((branch) => (
                  <div
                    key={branch.id}
                    className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => setSelectedBranch(branch.id.toString())}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{branch.nombre}</p>
                        {branch.direccion && (
                          <p className="text-xs text-muted-foreground">{branch.direccion}</p>
                        )}
                      </div>
                      <Badge variant="outline">ID: {branch.id}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                <p className="text-sm">No se encontraron sucursales</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Profesionales */}
      {selectedBranch && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="w-4 h-4" />
              Profesionales
            </CardTitle>
            <CardDescription>
              {professionals?.length || 0} profesionales en sucursal seleccionada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              {isLoadingProfessionals ? (
                <div className="flex items-center justify-center h-[200px]">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : professionals && professionals.length > 0 ? (
                <div className="space-y-2">
                  {professionals.map((prof) => (
                    <div
                      key={prof.id}
                      className="p-3 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            {prof.nombre} {prof.apellidos}
                          </p>
                          {prof.especialidad && (
                            <p className="text-xs text-muted-foreground">{prof.especialidad}</p>
                          )}
                        </div>
                        <Badge variant="outline">ID: {prof.id}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                  <p className="text-sm">No se encontraron profesionales</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <div className="pt-4 border-t">
        <h4 className="text-sm font-medium mb-3">Características</h4>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 rounded-md mt-0.5">
              <svg className="h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium">Agendamiento Automático</p>
              <p className="text-xs text-muted-foreground">
                Los bots pueden agendar, reagendar y cancelar citas directamente en Medilink
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="p-2 bg-green-50 rounded-md mt-0.5">
              <svg className="h-4 w-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium">Notificaciones WhatsApp</p>
              <p className="text-xs text-muted-foreground">
                Envío automático de plantillas al crear, reagendar o cancelar citas
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="p-2 bg-purple-50 rounded-md mt-0.5">
              <svg className="h-4 w-4 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium">Gestión de Pacientes</p>
              <p className="text-xs text-muted-foreground">
                Búsqueda y creación automática de pacientes con datos mínimos
              </p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}

