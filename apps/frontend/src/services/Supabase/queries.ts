import api from '../api';

interface CreateSupabaseUserData {
  email: string;
  password: string;
  userId: string;
}

export class SupabaseService {
  public static async createUser(userData: CreateSupabaseUserData) {
    try {
      const response = await api.post('/auth/create-supabase-user', userData);
      return response.data;
    } catch (error) {
      console.error('Error creating Supabase user:', error);
      throw error;
    }
  }

  public static async publicSignup(data: { email: string; password: string; username: string }) {
    try {
      const response = await api.post('/auth/signup-public', data);
      return response.data;
    } catch (error) {
      console.error('Error on public signup:', error);
      throw error;
    }
  }
}