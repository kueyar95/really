import { useAuth } from '@/contexts/AuthContext';
import UsersTable from './components/UsersTable';
import { useParams } from 'react-router-dom';

export default function UsersPage() {
  const { user } = useAuth();
  const params = useParams();
  const companyId = user?.role === 'super_admin' ? String(params.companyId) : user?.company.id;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">
            Administrador de Usuarios
          </h3>
          <p className="text-base text-muted-foreground">
            Gestiona los usuarios y sus permisos en el sistema.
          </p>
        </div>
      </div>
      <UsersTable companyId={companyId} />
    </div>
  );
}
