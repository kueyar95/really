import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  Min,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RescheduleAppointmentDto {
  @ApiProperty({
    description: 'ID de la cita a reagendar',
  })
  @IsString()
  appointmentId: string;

  @ApiProperty({
    description: 'Nueva fecha (YYYY-MM-DD)',
    example: '2025-10-22',
  })
  @IsDateString()
  newDateYmd: string;

  @ApiProperty({
    description: 'Nueva hora (HH:MM)',
    example: '14:30',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'La hora debe estar en formato HH:MM',
  })
  newTime: string;

  @ApiPropertyOptional({
    description: 'Nueva sucursal (si cambia)',
  })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({
    description: 'Nuevo profesional (si cambia)',
  })
  @IsOptional()
  @IsString()
  professionalId?: string;

  @ApiPropertyOptional({
    description: 'Nuevo sillón (si cambia)',
  })
  @IsOptional()
  @IsString()
  chairId?: string;

  @ApiPropertyOptional({
    description: 'Nueva duración en minutos',
  })
  @IsOptional()
  @IsNumber()
  @Min(15)
  durationMin?: number;

  @ApiPropertyOptional({
    description: 'Comentario sobre el cambio',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class RescheduleResponseDto {
  @ApiProperty()
  oldAppointmentId: string;

  @ApiProperty()
  newAppointmentId: string;

  @ApiProperty()
  oldDate: string;

  @ApiProperty()
  oldTime: string;

  @ApiProperty()
  newDate: string;

  @ApiProperty()
  newTime: string;

  @ApiProperty()
  professionalName: string;

  @ApiProperty()
  branchName: string;

  @ApiProperty()
  whatsappMessageSent: boolean;

  @ApiProperty()
  message: string;
}
