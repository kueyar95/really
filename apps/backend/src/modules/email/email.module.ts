import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';

@Module({
  imports: [ConfigModule], // Importar ConfigModule para que EmailService pueda inyectar ConfigService
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {} 