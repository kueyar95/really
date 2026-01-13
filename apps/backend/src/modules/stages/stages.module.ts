import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StagesService } from './stages.service';
import { StagesController } from './stages.controller';
import { Stage } from './entities/stage.entity';
import { AuthModule } from '../../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { ClientStage } from '../clients/entities/client-stage.entity';
import { ClientsModule } from '../clients/clients.module';
import { Funnel } from '../funnels/entities/funnel.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Stage, ClientStage, Funnel]),
    AuthModule,
    UsersModule,
    ClientsModule
  ],
  controllers: [StagesController],
  providers: [StagesService],
  exports: [StagesService]
})
export class StagesModule {} 