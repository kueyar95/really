import api from '../api';
import { NormalizedUser } from '../types';

interface CreateUserData {
  email: string;
  username: string;
  password?: string;
  role: string;
  companyId: string;
  supabaseId: string;
}

export class AdminService {
  public static async getUsers() {
    try {
      const response = await api.get<NormalizedUser[]>('/users/company');
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  public static async createUser(userData: CreateUserData) {
    try {
      const response = await api.post<NormalizedUser>('/users', userData);
      return response.data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  public static async updateUserSupabaseId(userId: string, supabaseId: string) {
    try {
      const response = await api.patch<NormalizedUser>(`/users/${userId}`, {
        supabase_id: supabaseId,
      });
      return response.data;
    } catch (error) {
      console.error('Error updating user supabase_id:', error);
      throw error;
    }
  }

  public static async checkEmail(email: string) {
    try {
      const response = await api.get<{
        id: string,
        exists: boolean,
        userData?: {
          username: string;
          role: string;
          companyId: string;
        }
      }>(`/users/check-email/${email}`);
      return response.data;
    } catch (error) {
      console.error('Error checking email:', error);
      throw error;
    }
  }
}