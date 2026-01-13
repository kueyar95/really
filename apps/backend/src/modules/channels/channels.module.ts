import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { Channel } from './persistence/entities/channel.entity';

import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';

import { WhatsAppGateway } from './infrastructure/gateway/whatsapp.gateway';
import { WsAuthGuard } from './infrastructure/guards/ws-auth.guard';
import { CompaniesModule } from '../companies/companies.module';

import { CompanyAccessService } from './core/services/company-access.service';
import { ChannelManagerService } from './core/services/channel-manager.service';
import { MessageProcessorService } from './core/services/message-processor.service';

import { WhapiCloudService } from './providers/api/whapi-cloud/whapi-cloud.service';
import { WhapiCloudStrategy } from './providers/api/whapi-cloud/whapi-cloud.strategy';
import { FunnelChannel } from '../funnels/entities/funnel-channel.entity';

import { WhapiHeartbeatService } from './providers/api/whapi-cloud/whapi-heartbeat.service';
import { WhapiRecoveryService } from './providers/api/whapi-cloud/whapi-recovery.service';
import { Client } from '../clients/entities/client.entity';
import { ChatHistory } from '../clients/entities/chat-history.entity';
import { WhatsAppBaileysService } from './providers/socket/whatsapp-baileys-DEPRECATED/whatsapp-baileys.service';
import { WhatsAppBaileysStrategy } from './providers/socket/whatsapp-baileys-DEPRECATED/whatsapp-baileys.strategy';
import { User } from '../users/entities/user.entity';
import { Company } from '../companies/entities/company.entity';
import { WhatsAppWebService } from './providers/socket/whatsapp-web-DEPRECATED/whatsapp-web.service';
import { WhatsAppWebStrategy } from './providers/socket/whatsapp-web-DEPRECATED/whatsapp-web.strategy';
import { WhatsAppCloudService } from './providers/api/whatsapp-cloud/whatsapp-cloud.service';
import { WhatsAppCloudStrategy } from './providers/api/whatsapp-cloud/whatsapp-cloud.strategy';
import { ClientsModule } from '../clients/clients.module';
import { FunnelsModule } from '../funnels/funnels.module';
import { AiBotsModule } from '../ai-bots/ai-bots.module';
import { AuthModule } from '../../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Channel, Client, ChatHistory, User, Company, FunnelChannel,
    ]),
    HttpModule,
    CompaniesModule,
    ClientsModule,
    FunnelsModule,
    AiBotsModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [ChannelsController],
  providers: [
    ChannelsService,
    CompanyAccessService,
    ChannelManagerService,
    MessageProcessorService,

    WhapiCloudService,
    WhapiCloudStrategy,
    WhatsAppBaileysService,
    WhatsAppBaileysStrategy,
    WhatsAppCloudService,
    WhatsAppCloudStrategy,

    WhatsAppGateway,
    WsAuthGuard,

    WhatsAppWebService,
    WhatsAppWebStrategy,

    WhapiHeartbeatService,
    WhapiRecoveryService,
  ],
  exports: [
    ChannelsService, // 👈 NECESARIO
    WhapiCloudService,
    WhapiCloudStrategy,
    WhatsAppGateway,
    WhapiHeartbeatService,
    WhapiRecoveryService,
    CompanyAccessService,
    ChannelManagerService,
    MessageProcessorService,
    WhatsAppBaileysService,
    WhatsAppBaileysStrategy,
  ],
})
export class ChannelsModule {}
