import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger('WsAuthGuard');
  private readonly supabase: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_KEY!; // service_role o al menos una key server-side
    this.supabase = createClient(url, key);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();

    try {
      const { token, source } = this.extractTokenFromHandshake(client);

      if (!token) {
        this.logger.error('Token no proporcionado en handshake', {
          id: client.id,
          sourcesTried: ['headers.authorization', 'auth.authorization', 'auth.token', 'query.token'],
          headersAuth: client.handshake?.headers?.authorization,
          authAuth: client.handshake?.auth?.authorization,
          authTokenPresent: !!client.handshake?.auth?.token,
          queryTokenPresent: !!client.handshake?.query?.token,
        });
        throw new WsException('Token no proporcionado');
      }

      // Valida el JWT contra Supabase
      const { data: { user }, error } = await this.supabase.auth.getUser(token);

      if (error || !user) {
        this.logger.error('Token inválido', { id: client.id, source, error: error?.message });
        throw new WsException('Token inválido');
      }

      // Adjunta el usuario para uso posterior en gateways
      client.data = { ...(client.data || {}), user };

      this.logger.log(`WS auth OK (user ${user.id}) via ${source}`);
      return true;
    } catch (err) {
      this.logger.error('Error de autenticación WebSocket:', err);
      throw new WsException('No autorizado');
    }
  }

  /**
   * Lee el token desde: headers.authorization | auth.authorization | auth.token | query.token
   * Acepta formatos "Bearer x.y.z" o "x.y.z".
   */
  private extractTokenFromHandshake(client: Socket): { token?: string; source?: string } {
    const h = client.handshake || ({} as any);

    const fromHeader = h.headers?.authorization as string | undefined;        // "Bearer xxx"
    if (fromHeader) {
      const token = this.normalizeBearer(fromHeader);
      if (token) return { token, source: 'headers.authorization' };
    }

    const fromAuthAuth = h.auth?.authorization as string | undefined;          // "Bearer xxx"
    if (fromAuthAuth) {
      const token = this.normalizeBearer(fromAuthAuth);
      if (token) return { token, source: 'auth.authorization' };
    }

    const fromAuthToken = h.auth?.token as string | undefined;                 // "xxx" (sin Bearer)
    if (fromAuthToken) {
      return { token: fromAuthToken, source: 'auth.token' };
    }

    // Socket.IO envía query como Record<string, any>; puede venir como string o string[]
    const rawQueryToken = h.query?.token as string | string[] | undefined;
    if (Array.isArray(rawQueryToken) ? rawQueryToken[0] : rawQueryToken) {
      const value = Array.isArray(rawQueryToken) ? rawQueryToken[0] : rawQueryToken!;
      const token = this.normalizeBearer(value) || value; // acepta Bearer o raw
      return { token, source: 'query.token' };
    }

    return { token: undefined, source: undefined };
  }

  private normalizeBearer(input: string): string | undefined {
    if (!input) return undefined;
    const trimmed = input.trim();
    if (trimmed.toLowerCase().startsWith('bearer ')) return trimmed.slice(7).trim();
    // si vino un JWT "crudo" en authorization (sin 'Bearer'), también lo aceptamos
    if (trimmed.split('.').length === 3) return trimmed;
    return undefined;
  }
}
