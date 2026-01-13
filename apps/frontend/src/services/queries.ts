import api from './api';
import { NormalizedUser } from './types';
import { AxiosError } from 'axios';

export class UserService {
  public static async getUser(supabaseId: string) {
    try {
      const response = await api.get<NormalizedUser>(
        `/users/supabase/${supabaseId}`
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message);
      }
      throw new Error('Error inesperado');
    }
  }
}