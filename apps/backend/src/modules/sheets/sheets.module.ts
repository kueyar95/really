import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Sheet } from './entities/sheet.entity';
import { GoogleSheetsAuthService } from './services/google-sheets-auth.service';
import { GoogleSheetsService } from './services/google-sheets.service';
import { SheetsAuthController } from './controllers/sheets-auth.controller';
import { User } from '../users/entities/user.entity';
import { AuthModule } from '@/auth/auth.module';
import { UsersModule } from '@/modules/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sheet, User]),
    ConfigModule,
    AuthModule,
    UsersModule
  ],
  controllers: [
    SheetsAuthController
  ],
  providers: [
    GoogleSheetsAuthService,
    GoogleSheetsService
  ],
  exports: [
    GoogleSheetsAuthService,
    GoogleSheetsService,
    TypeOrmModule
  ]
})
export class SheetsModule {}