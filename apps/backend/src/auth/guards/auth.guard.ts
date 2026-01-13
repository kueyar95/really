import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Inject, forwardRef, Logger } from '@nestjs/common';
import { SupabaseAuthService } from '../supabase.service';
import { UsersService } from '../../modules/users/users.service';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  constructor(
    private supabaseAuthService: SupabaseAuthService,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    private reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    if (req.method === 'OPTIONS') return true; // ¡deja pasar el preflight!
    // Verificar si la ruta está marcada como pública
    const isPublic = this.reflector.get<boolean>(IS_PUBLIC_KEY, context.getHandler());
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    // this.logger.debug(`Petición a la ruta: ${request.method} ${request.url}`);

    const token = this.extractTokenFromHeader(request);

    if (!token) {
      //this.logger.error('Token no proporcionado');
      throw new UnauthorizedException('Token no proporcionado');
    }

    try {
      // this.logger.debug('Verificando token con Supabase');
       const { data, error } = await this.supabaseAuthService.verifyToken(token);

      if (error) {
        //this.logger.error(`Error al verificar token: ${error.message}`);
        throw error;
      }

      if (!data || !data.user) {
        //this.logger.error('Token válido pero no se encontró usuario en Supabase');
        throw new UnauthorizedException('Usuario no encontrado en Supabase');
      }

      // Obtener el usuario de nuestra base de datos
      try {
        const dbUser = await this.usersService.findBySupabaseId(data.user.id);
        // Añadir el usuario completo a la request para uso posterior
        request['user'] = dbUser;
        return true;
      } catch (dbError) {
        //this.logger.error(`Error al buscar usuario en base de datos: ${dbError.message}`);
        throw new UnauthorizedException('Usuario no encontrado en base de datos');
      }
    } catch (error) {
      //this.logger.error(`Error de autenticación: ${error.message}`);
      throw new UnauthorizedException('Error de autenticación: ' + error.message);
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    const result = type === 'Bearer' ? token : undefined;

    if (!result) {
      //this.logger.warn('Token inválido o no proporcionado en el formato correcto');
    }

    return result;
  }
}