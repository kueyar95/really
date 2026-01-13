import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/DataTable/DataTable';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { TableSkeleton } from '../../admin/users/components/TableSkeleton';
import { CompanyService } from '@/services/Super_admin/Companies/queries';
import { columns } from './components/columns';

export default function CompaniesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => CompanyService.getCompanies(),
  });

  const [searchQuery, setSearchQuery] = useState('');

  const filteredData = data?.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-4 p-8 bg-white rounded-lg shadow-sm m-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-700">Empresas</h2>
        <div className="flex items-center gap-2">
          <div className="w-72">
            <Input
              placeholder="Buscar empresa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </div>
      </div>

      <div className="border rounded-lg">
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <DataTable columns={columns} data={filteredData} />
        )}
      </div>
    </div>
  );
}
