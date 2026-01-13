import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Calendar } from './entities/calendar.entity';
import { Event } from './entities/event.entity';
import { CalendarAccess } from './entities/calendar-access.entity';
import { GoogleCalendarAuthService } from './services/google-calendar-auth.service';
import { CalendarAuthController } from './controllers/calendar-auth.controller';
import { GoogleCalendarService } from './services/google-calendar-setup.service';
import { CalendarEventService } from './services/calendar-event.service';
import { CalendarAvailabilityService } from './services/calendar-availability.service';
import { EventController } from './controllers/event.controller';
import { User } from '../users/entities/user.entity';
import { AuthModule } from '@/auth/auth.module';
import { UsersModule } from '@/modules/users/users.module';
import { UpdateEventImplementation } from '../functions/implementations/calendar/update-event';
import { ListEventsImplementation } from '../functions/implementations/calendar/list-events';
import { DeleteEventImplementation } from '../functions/implementations/calendar/delete-event';
@Module({
  imports: [
    TypeOrmModule.forFeature([Calendar, Event, User, CalendarAccess]),
    ConfigModule,
    AuthModule,
    UsersModule
  ],
  controllers: [
    CalendarAuthController,
    EventController
  ],
  providers: [
    GoogleCalendarAuthService,
    GoogleCalendarService,
    CalendarEventService,
    CalendarAvailabilityService,
    {
      provide: 'CalendarEventService',
      useExisting: CalendarEventService
    },
    {
      provide: 'CalendarAvailabilityService',
      useExisting: CalendarAvailabilityService
    },
    UpdateEventImplementation,
    ListEventsImplementation,
    DeleteEventImplementation
  ],
  exports: [
    GoogleCalendarAuthService,
    GoogleCalendarService,
    CalendarEventService,
    CalendarAvailabilityService,
    'CalendarEventService',
    'CalendarAvailabilityService',
    UpdateEventImplementation,
    ListEventsImplementation,
    DeleteEventImplementation
  ]
})
export class CalendarModule {}
