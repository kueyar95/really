import { useQuery } from '@tanstack/react-query';
import { AdminService } from '@/services/Admin/queries';
import { CompanyService } from '@/services/Super_admin/Companies/queries';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { CreateUserSheet } from './CreateUserSheet';
import { TableSkeleton } from './TableSkeleton';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Mail, Search } from 'lucide-react';

interface UsersTableProps {
  companyId?: string;
}

enum Role {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  VENDEDOR = 'vendedor',
  SUPERVISOR = 'supervisor',
  PENDING_ONBOARDING = 'pending_onboarding'
}

export default function UsersTable({ companyId }: UsersTableProps) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const { data, isLoading } = useQuery({
    queryKey: ['users', companyId],
    queryFn: () => {
      if (isSuperAdmin && companyId) {
        return CompanyService.getCompanyUsers(companyId);
      }
      return AdminService.getUsers();
    },
    enabled: !isSuperAdmin || (isSuperAdmin && !!companyId),
  });

  const [searchQuery, setSearchQuery] = useState('');

  const filteredData = data?.filter(user =>
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Obtener los roles existentes en los datos
  const existingRoles = Array.from(new Set(filteredData.map(user => user.role || 'other')));

  // Orden preferido de roles (solo los que existen)
  const roleOrder = [
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.SUPERVISOR,
    Role.VENDEDOR,
    Role.PENDING_ONBOARDING,
    'other'
  ].filter(role => existingRoles.includes(role));

  const getRoleTitle = (role: string) => {
    const titles = {
      [Role.SUPER_ADMIN]: 'Super Administradores',
      [Role.ADMIN]: 'Administradores',
      [Role.VENDEDOR]: 'Vendedores',
      [Role.SUPERVISOR]: 'Supervisores',
      [Role.PENDING_ONBOARDING]: 'Pendientes de Onboarding',
      other: 'Otros usuarios'
    };
    return titles[role as keyof typeof titles] || 'Otros usuarios';
  };

  const getRoleColor = (role: string) => {
    const colors = {
      [Role.ADMIN]: 'border-slate-300 bg-slate-50/50',
      [Role.SUPER_ADMIN]: 'border-blue-200 bg-blue-50/30',
      [Role.VENDEDOR]: 'border-gray-300 bg-gray-50/50',
      [Role.SUPERVISOR]: 'border-stone-300 bg-stone-50/50',
      [Role.PENDING_ONBOARDING]: 'border-amber-200 bg-amber-50/30',
      default: 'border-neutral-300 bg-neutral-50/50'
    };
    return colors[role as keyof typeof colors] || colors.default;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  // Función para agrupar usuarios por rol
  const groupedUsers = filteredData.reduce((acc, user) => {
    const role = user.role || 'other';
    if (!acc[role]) {
      acc[role] = [];
    }
    acc[role].push(user);
    return acc;
  }, {} as Record<string, typeof filteredData>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full bg-gray-50 border-gray-200 focus:bg-white transition-colors"
          />
        </div>
        {!isSuperAdmin && (
          <div className="w-full sm:w-auto">
            <CreateUserSheet />
          </div>
        )}
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="space-y-8">
          {roleOrder.map(role => {
            const users = groupedUsers[role] || [];
            if (users.length === 0) return null;

            return (
              <div key={role} className="space-y-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-medium text-gray-700">{getRoleTitle(role)}</h3>
                  <div className="h-px flex-1 bg-gray-100" />
                  <span className="text-sm text-gray-500">{users.length}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className={`border-l-4 ${getRoleColor(user.role)} bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(user.username || '')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-medium text-gray-900">{user.username}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Mail className="h-3 w-3" />
                              <span>{user.email}</span>
                            </div>
                          </div>
                        </div>
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700 font-normal">
                          {user.role}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}