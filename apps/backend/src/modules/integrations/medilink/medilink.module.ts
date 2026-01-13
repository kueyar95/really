import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { MedilinkIntegration } from './entities/medilink-integration.entity';
import { CryptoService } from './utils/crypto.service';
import { WhatsAppTemplatesService } from './services/whatsapp-templates.service';
import medilinkConfig from '../../../config/medilink.config';
import { TimeService } from './utils/time.service';
import { MedilinkMapping } from './entities/medilink-mapping.entity';
import { PatientLink } from './entities/patient-link.entity';
import { BookingSession } from './entities/booking-session.entity';
import { MedilinkController } from './medilink.controller';
import { MedilinkService } from './medilink.service';
import { MedilinkClient } from './medilink.client';
import { E164Service } from './utils/e164.service';
import { MedilinkTools } from '../../ai-bots/tools/medilink.tools';

@Module({
  imports: [
    ConfigModule.forFeature(medilinkConfig),
    HttpModule,
    TypeOrmModule.forFeature([
      MedilinkIntegration,
      MedilinkMapping,
      PatientLink,
      BookingSession,
    ]),
  ],
  controllers: [MedilinkController],
  providers: [
    MedilinkService,
    MedilinkClient,
    CryptoService,
    E164Service,
    TimeService,
    WhatsAppTemplatesService,
    MedilinkTools,
  ],
  exports: [MedilinkService, MedilinkClient, WhatsAppTemplatesService, MedilinkTools],
})
export class MedilinkModule {}

