import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseAuthService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }

  async verifyToken(token: string) {
    return await this.supabase.auth.getUser(token);
  }

  async createUser(email: string, password: string, userData?: { [key: string]: any }) {
    try {
      const { data, error } = await this.supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: userData
      });

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtiene un usuario de Supabase por su ID
   * @param supabaseUserId ID del usuario en Supabase
   * @returns Datos del usuario o null si no existe
   */
  async getUserById(supabaseUserId: string) {
    try {
      const { data, error } = await this.supabase.auth.admin.getUserById(supabaseUserId);
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al obtener usuario de Supabase:', error);
      return null;
    }
  }

  /**
   * Sube un archivo al bucket de Supabase Storage
   * @param bucket Nombre del bucket
   * @param path Ruta del archivo en el bucket
   * @param file Buffer del archivo
   * @param contentType Tipo MIME del archivo
   * @returns URL pública del archivo
   */
  async uploadFile(
    bucket: string,
    path: string,
    file: Buffer,
    contentType: string
  ): Promise<string> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(path, file, {
          contentType,
          upsert: true
        });

      if (error) throw error;

      // Obtener la URL pública
      const { data: { publicUrl } } = this.supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      return publicUrl;
    } catch (error) {
      console.error('Error al subir archivo a Supabase:', error);
      throw error;
    }
  }

  /**
   * Elimina un archivo del bucket de Supabase Storage
   * @param bucket Nombre del bucket
   * @param path Ruta del archivo en el bucket
   */
  async deleteFile(bucket: string, path: string): Promise<void> {
    try {
      const { error } = await this.supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;
    } catch (error) {
      console.error('Error al eliminar archivo de Supabase:', error);
      throw error;
    }
  }
}