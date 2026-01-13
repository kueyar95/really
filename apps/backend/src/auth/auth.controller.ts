import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { SupabaseAuthService } from './supabase.service';
import { UsersService } from '../modules/users/users.service';
import { IsString, IsEmail, IsNotEmpty, IsNumber } from 'class-validator';
import { UUID } from 'crypto';
import { Public } from './decorators/public.decorator';

class CreateSupabaseUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}

class PublicSignupDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  username: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly supabaseAuthService: SupabaseAuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('create-supabase-user')
  @Public() // <-- AÑADIR ESTA LÍNEA
  async createSupabaseUser(@Body() createUserDto: CreateSupabaseUserDto) {
    const supabaseUser = await this.supabaseAuthService.createUser(
      createUserDto.email,
      createUserDto.password
    );

    await this.usersService.updateSupabaseId(
      createUserDto.userId,
      supabaseUser.user.id as UUID
    );

    return supabaseUser;
  }

  /**
   * Registro público: crea usuario en Supabase (confirmado) y en nuestra BD
   */
  @Post('signup-public')
  @Public()
  async signupPublic(@Body() dto: PublicSignupDto) {
    try {
      // 1) Crear usuario en Supabase con confirmación automática
      const supabaseUser = await this.supabaseAuthService.createUser(
        dto.email,
        dto.password,
        { username: dto.username }
      );

      const supabaseId = supabaseUser?.user?.id as UUID;
      if (!supabaseId) {
        throw new BadRequestException('No se pudo crear el usuario en Supabase');
      }

      // 2) Crear usuario en nuestra base de datos (pending_onboarding)
      const user = await this.usersService.createAfterSignup({
        supabaseId,
        email: dto.email,
        username: dto.username,
      });

      return { ok: true, user, supabaseId };
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Error en registro público');
    }
  }
}