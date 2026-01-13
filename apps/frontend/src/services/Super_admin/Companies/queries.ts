import { NormalizedUser } from '@/services/types';
import api from '../../api';
import { Company, CreateCompanyDto, UpdateCompanyDto } from './types';

export const CompanyService = {

  getCompanies: async (): Promise<Company[]> => {
    try {
      const response = await api.get<Company[]>('/companies');
      return response.data;
    } catch (error) {
      console.error('Error fetching companies:', error);
      throw new Error('Error al obtener las compañías');
    }
  },

  getCompany: async (id: string): Promise<Company> => {
    try {
      const response = await api.get<Company>(`/companies/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching company:', error);
      throw new Error('Error al obtener la compañía');
    }
  },

  createCompany: async (data: CreateCompanyDto): Promise<Company> => {
    try {
      const response = await api.post<Company>('/companies', data);
      return response.data;
    } catch (error) {
      console.error('Error creating company:', error);
      throw new Error('Error al crear la compañía');
    }
  },

  updateCompany: async (id: string, data: UpdateCompanyDto): Promise<Company> => {
    try {
      const response = await api.patch<Company>(`/companies/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating company:', error);
      throw new Error('Error al actualizar la compañía');
    }
  },

  deleteCompany: async (id: string): Promise<void> => {
    try {
      await api.delete(`/companies/${id}`);
    } catch (error) {
      console.error('Error deleting company:', error);
      throw new Error('Error al eliminar la compañía');
    }
  },

  getCompanyUsers: async (companyId: string): Promise<NormalizedUser[]> => {
    try {
      const response = await api.get<NormalizedUser[]>(`/users/company/${companyId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching company users:', error);
      throw new Error('Error al obtener los usuarios de la compañía');
    }
  },
};
