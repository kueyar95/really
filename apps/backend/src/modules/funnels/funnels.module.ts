import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FunnelsService } from './services/funnels.service';
import { BotMessageProcessorService } from './services/bot-message-processor.service';
import { ClientStageManagerService } from './services/client-stage-manager.service';
import { FunnelsController } from './funnels.controller';
import { Funnel } from './entities/funnel.entity';
import { FunnelChannel } from './entities/funnel-channel.entity';
import { Channel } from '../channels/persistence/entities/channel.entity';
import { Stage } from '../stages/entities/stage.entity';
import { ClientStage } from '../clients/entities/client-stage.entity';
import { ChatHistory } from '../clients/entities/chat-history.entity';
import { AuthModule } from '../../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { ChannelsModule } from '../channels/channels.module';
import { OpenAIModule } from '../ai/open-ai.module';
import { FunctionsModule } from '../functions/functions.module';
import { OpenAIService } from '../ai/services/openai.service';
import { EmailModule } from '../email/email.module';
import { EmailService } from '../email/email.service';
import { MedilinkModule } from '../integrations/medilink/medilink.module';
import { MedilinkIntegration } from '../integrations/medilink/entities/medilink-integration.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Funnel,
      FunnelChannel,
      Channel,
      Stage,
      ClientStage,
      ChatHistory,
      MedilinkIntegration
    ]),
    forwardRef(() => ChannelsModule),
    OpenAIModule,
    AuthModule,
    UsersModule,
    forwardRef(() => FunctionsModule),
    EmailModule,
    MedilinkModule
  ],
  controllers: [FunnelsController],
  providers: [
    FunnelsService,
    BotMessageProcessorService,
    ClientStageManagerService,
    OpenAIService,
    EmailService,
  ],
  exports: [
    FunnelsService,
    ClientStageManagerService,
    BotMessageProcessorService
  ]
})
export class FunnelsModule {}
