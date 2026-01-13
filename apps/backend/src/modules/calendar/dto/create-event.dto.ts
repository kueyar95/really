import { IsString, IsUUID, IsEnum, IsNumber, IsOptional, IsDate, Matches, Min, Max, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { EventType } from '../entities/event.entity';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  startTime: string;

  @IsNumber()
  @IsNotEmpty()
  duration: number;

  @IsString()
  @IsOptional()
  clientId?: string;

  @IsString()
  @IsNotEmpty()
  targetCalendarId: string;

  @IsEnum(EventType)
  @IsNotEmpty()
  eventType: EventType;

  @IsOptional()
  attendees?: Array<{
    email: string;
    name?: string;
  }>;

  @IsOptional()
  createMeet?: boolean;
}

