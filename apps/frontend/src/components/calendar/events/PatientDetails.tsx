import { UserIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface PatientDetailsProps {
  patient: {
    nombre: string;
    paterno: string;
    materno: string;
    email: string;
  } | undefined;
  isLoading: boolean;
}

function PatientSkeleton() {
  return (
    <div className="grid gap-4">
      <div className="flex items-center space-x-2">
        <Skeleton className="w-6 h-6 rounded-full" />
        <div>
          <Skeleton className="h-4 w-[150px]" />
          <Skeleton className="h-3 w-[100px] mt-1" />
        </div>
      </div>
      <div className="grid gap-2">
        <div className="grid grid-cols-3 items-center gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-[180px] col-span-2" />
        </div>
        <div className="grid grid-cols-3 items-center gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-[180px] col-span-2" />
        </div>
        <div className="grid grid-cols-3 items-center gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-[180px] col-span-2" />
        </div>
        <Skeleton className="h-9 w-full mt-2" />
      </div>
    </div>
  )
}

export function PatientDetails({ patient, isLoading }: PatientDetailsProps) {
  if (isLoading) return <PatientSkeleton />;
  if (!patient) return null;

  return (
    <div className="grid gap-4">
      <div className="flex items-center space-x-2">
        <UserIcon className="w-6 h-6 text-gray-500" />
        <div>
          <h4 className="font-medium leading-none">{patient.nombre} {patient.paterno} {patient.materno}</h4>
          <p className="text-sm text-muted-foreground">
            Detalles del cliente
          </p>
        </div>
      </div>
      <div className="grid gap-2">
        <div className="grid grid-cols-3 items-center gap-4">
          <span className="text-sm">Nombre:</span>
          <span className="col-span-2 text-sm font-medium">{patient.nombre} {patient.paterno} {patient.materno}</span>
        </div>
        <div className="grid grid-cols-3 items-center gap-4">
          <span className="text-sm">Email:</span>
          <span className="col-span-2 text-sm font-medium">{patient.email}</span>
        </div>
        <div className="grid grid-cols-3 items-center gap-4">
          <span className="text-sm">Duración:</span>
          <span className="col-span-2 text-sm font-medium">30 minutos</span>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => window.location.href = `/user/1`}
        >
          Ver perfil del usuario
        </Button>
      </div>
    </div>
  );
}