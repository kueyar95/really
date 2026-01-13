/* eslint-disable prettier/prettier */
import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';        // 👈 Scheduler en raíz
import { DiscoveryModule, Reflector } from '@nestjs/core';// 👈 Asegura Reflector/discovery

import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { FunnelsModule } from './modules/funnels/funnels.module';
import { StagesModule } from './modules/stages/stages.module';
import { ClientsModule } from './modules/clients/clients.module';
import { AiBotsModule } from './modules/ai-bots/ai-bots.module';
import { FunctionsModule } from './modules/functions/functions.module';
import { WebScrapingModule } from './modules/web-scraping/web-scraping.module';
import supabaseConfig from './auth/config/supabase.config';
import { CalendarModule } from './modules/calendar/calendar.module';
import { SheetsModule } from './modules/sheets/sheets.module';
import { EmailModule } from './modules/email/email.module';

// Entidades
import { Company } from './modules/companies/entities/company.entity';
import { User } from './modules/users/entities/user.entity';
import { Channel } from './modules/channels/persistence/entities/channel.entity';
import { Funnel } from './modules/funnels/entities/funnel.entity';
import { FunnelChannel } from './modules/funnels/entities/funnel-channel.entity';
import { Stage } from './modules/stages/entities/stage.entity';
import { Client } from './modules/clients/entities/client.entity';
import { ClientStage } from './modules/clients/entities/client-stage.entity';
import { ChatHistory } from './modules/clients/entities/chat-history.entity';
import { AiBot } from './modules/ai-bots/entities/ai-bot.entity';
import { Function } from './modules/functions/entities/function.entity';
import { BotFunction } from './modules/ai-bots/entities/bot-function.entity';
import { Calendar } from './modules/calendar/entities/calendar.entity';
import { Event } from './modules/calendar/entities/event.entity';
import { Sheet } from './modules/sheets/entities/sheet.entity';
import { CalendarAccess } from './modules/calendar/entities/calendar-access.entity';
import { WhatsAppModule } from './modules/integrations/whatsapp/whatsapp.module';
import { MedilinkModule } from './modules/integrations/medilink/medilink.module';
import { MedilinkIntegration } from './modules/integrations/medilink/entities/medilink-integration.entity';
import { MedilinkMapping } from './modules/integrations/medilink/entities/medilink-mapping.entity';
import { PatientLink } from './modules/integrations/medilink/entities/patient-link.entity';
import { BookingSession } from './modules/integrations/medilink/entities/booking-session.entity';
import * as path from 'path';


@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [supabaseConfig],
      envFilePath: [
        path.resolve(process.cwd(), 'apps/backend/.env'),
        path.resolve(process.cwd(), '.env'),
      ],
    }),

    // 👇 Asegura discovery y Reflector disponibles en el contexto global
    DiscoveryModule,

    // 👇 Registrar SIEMPRE Schedule en el módulo raíz
    ScheduleModule.forRoot(),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return {
          type: 'postgres' as const,
          url: configService.get('DATABASE_URL'),
          entities: [
            Company,
            User,
            Channel,
            Funnel,
            FunnelChannel,
            Stage,
            Client,
            ClientStage,
            ChatHistory,
            AiBot,
            Function,
            BotFunction,
            Calendar,
            CalendarAccess,
            Event,
            Sheet,
            MedilinkIntegration,
            MedilinkMapping,
            PatientLink,
            BookingSession,
          ],
          synchronize: false,
          autoLoadEntities: true,
        };
      },
      inject: [ConfigService]
    }),

    // Módulos de la aplicación
    UsersModule,
    AuthModule,
    CompaniesModule,
    ChannelsModule,
    FunnelsModule,
    StagesModule,
    ClientsModule,
    AiBotsModule,
    FunctionsModule,
    WebScrapingModule,
    CalendarModule,
    SheetsModule,
    EmailModule,
    WhatsAppModule,
    MedilinkModule,
  ],
  providers: [
    // 👇 Hace explícito el provider por si hay múltiples copias de @nestjs/core en monorepo
    Reflector,
  ],
})
export class AppModule {}
