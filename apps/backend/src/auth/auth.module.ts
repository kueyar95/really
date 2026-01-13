import { Module, forwardRef } from '@nestjs/common';
import { SupabaseAuthService } from './supabase.service';
import { UsersModule } from '../modules/users/users.module';
import { SupabaseAuthGuard } from './guards/auth.guard';
import { AuthController } from './auth.controller';

@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [AuthController],
  providers: [SupabaseAuthService, SupabaseAuthGuard],
  exports: [SupabaseAuthService, SupabaseAuthGuard],
})
export class AuthModule {}
