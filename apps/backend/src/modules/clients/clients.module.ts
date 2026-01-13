import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from './entities/client.entity';
import { ClientStage } from './entities/client-stage.entity';
import { ChatHistory } from './entities/chat-history.entity';
import { Funnel } from '../funnels/entities/funnel.entity';
import { ClientsController } from './controllers/clients.controller';
import { ClientStageController } from './controllers/client-stage.controller';
import { ChatHistoryController } from './controllers/chat-history.controller';
import { ClientsService } from './services/clients.service';
import { ClientStageService } from './services/client-stage.service';
import { ChatHistoryService } from './services/chat-history.service';
import { AuthModule } from '../../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Client,
      ClientStage,
      ChatHistory,
      Funnel
    ]),
    AuthModule,
    UsersModule
  ],
  controllers: [
    ClientsController,
    ClientStageController,
    ChatHistoryController
  ],
  providers: [
    ClientsService,
    ClientStageService,
    ChatHistoryService
  ],
  exports: [
    ClientsService,
    ClientStageService,
    ChatHistoryService
  ]
})
export class ClientsModule {}
