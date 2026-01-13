import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Function } from './entities/function.entity';
import { FunctionsService } from './functions.service';
import { ChangeStageImplementation } from './implementations/stage/change-stage';
import { GetAvailabilityImplementation } from './implementations/calendar/get-availability';
import { CreateEventImplementation } from './implementations/calendar/create-event';
import { UpdateEventImplementation } from './implementations/calendar/update-event';
import { ListEventsImplementation } from './implementations/calendar/list-events';
import { DeleteEventImplementation } from './implementations/calendar/delete-event';
import { ClientStageService } from '../clients/services/client-stage.service';
import { ClientStage } from '../clients/entities/client-stage.entity';
import { ChatHistory } from '../clients/entities/chat-history.entity';
import { ChannelsModule } from '../channels/channels.module';
import { FunctionsController } from './functions.controller';
import { AuthModule } from '@/auth/auth.module';
import { UsersModule } from '@/modules/users/users.module';
import { Stage } from '../stages/entities/stage.entity';
import { Funnel } from '../funnels/entities/funnel.entity';
import { CalendarModule } from '../calendar/calendar.module';
import { SheetsModule } from '../sheets/sheets.module';
import { AddRowImplementation } from './implementations/sheet/add-row';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Function,
      ClientStage,
      ChatHistory,
      Stage,
      Funnel
    ]),
    forwardRef(() => ChannelsModule),
    forwardRef(() => CalendarModule),
    AuthModule,
    UsersModule,
    SheetsModule
  ],
  providers: [
    FunctionsService,
    ChangeStageImplementation,
    GetAvailabilityImplementation,
    CreateEventImplementation,
    ListEventsImplementation,
    UpdateEventImplementation,
    DeleteEventImplementation,
    ClientStageService,
    AddRowImplementation
  ],
  controllers: [FunctionsController],
  exports: [
    FunctionsService,
    ChangeStageImplementation,
    GetAvailabilityImplementation,
    CreateEventImplementation,
    UpdateEventImplementation,
    ListEventsImplementation,
    DeleteEventImplementation,
    TypeOrmModule.forFeature([Stage, Funnel]),
    SheetsModule
  ]
})
export class FunctionsModule {}
