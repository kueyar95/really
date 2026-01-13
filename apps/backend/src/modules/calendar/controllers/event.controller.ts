import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { CalendarEventService } from '../services/calendar-event.service';
import { CreateEventDto } from '../dto/create-event.dto';
import { SupabaseAuthGuard } from '@/auth/guards/auth.guard';
import { EventType } from '../entities/event.entity';

@Controller('calendar/:calendarId/events')
export class EventController {
  constructor(private readonly calendarEventService: CalendarEventService) {}

  @Post('generate-test-events')
  async generateTestEvents(
    @Param('calendarId') calendarId: string
  ) {
    if (!calendarId) {
      throw new BadRequestException('Se requiere el ID del calendario');
    }

    const today = new Date();
    const createdEvents = [];
    const errors = [];

    for (let i = 0; i < 5; i++) {
      const startTime = `${13 + i}:00`;
      const eventDto: CreateEventDto = {
        title: `Evento de prueba ${i + 1}`,
        date: today.toISOString().split('T')[0],
        startTime,
        duration: 45,
        type: EventType.APPOINTMENT,
        eventType: EventType.APPOINTMENT,
        description: `Evento de prueba generado automáticamente #${i + 1}`,
        targetCalendarId: calendarId
      };

      try {
        const result = await this.calendarEventService.createEvent(calendarId, eventDto);
        if (result && result.event) {
          createdEvents.push(result.event);
        } else {
          errors.push(`Error al crear el evento ${i + 1}: No se recibió respuesta del servicio`);
        }
      } catch (error) {
        console.error(`Error creating test event ${i + 1}:`, error);
        errors.push(`Error al crear el evento ${i + 1}: ${error.message}`);
      }
    }

    if (createdEvents.length === 0) {
      throw new BadRequestException({
        message: 'No se pudo crear ningún evento de prueba',
        errors: errors
      });
    }

    return {
      success: true,
      message: `Se crearon ${createdEvents.length} eventos de prueba`,
      eventsCreated: createdEvents,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  @Post()
  @UseGuards(SupabaseAuthGuard)
  async create(
    @Param('calendarId') calendarId: string,
    @Body() createEventDto: CreateEventDto
  ) {
    const result = await this.calendarEventService.createEvent(calendarId, createEventDto);
    return result;
  }

  @Get()
  async findAll(
    @Param('calendarId') calendarId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const events = await this.calendarEventService.findByCalendarId(
      calendarId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    return {
      success: true,
      events
    };
  }

  @Get(':id')
  async findOne(
    @Param('calendarId') calendarId: string,
    @Param('id') id: string
  ) {
    const event = await this.calendarEventService.findByCalendarId(calendarId);
    const foundEvent = event.find(e => e.id === id);

    return {
      success: true,
      event: foundEvent
    };
  }

  @Put(':id')
  async update(
    @Param('calendarId') calendarId: string,
    @Param('id') id: string,
    @Body() updateEventDto: Partial<CreateEventDto>
  ) {
    const result = await this.calendarEventService.updateEvent(calendarId, id, updateEventDto);
    return result;
  }

  @Delete(':id')
  async remove(
    @Param('calendarId') calendarId: string,
    @Param('id') id: string
  ) {
    const result = await this.calendarEventService.deleteEvent(calendarId, id);
    return result;
  }

  @Get(':calendarId/by-date/:date')
  async findEventsByDate(
    @Param('calendarId') calendarId: string,
    @Param('date') date: string,
    @Query('includeDetails') includeDetails?: boolean,
    @Query('searchTerm') searchTerm?: string
  ) {
    // Validar formato de fecha
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new BadRequestException('El formato de fecha debe ser YYYY-MM-DD');
    }

    return this.calendarEventService.findEventsByDate(calendarId, date, {
      includeDetails,
      searchTerm
    });
  }
}