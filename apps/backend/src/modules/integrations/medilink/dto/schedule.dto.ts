import {
  IsString,
  IsOptional,
  IsEmail,
  IsDateString,
  IsNumber,
  Min,
  IsBoolean,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PatientDataDto {
  @ApiProperty({
    description: 'Nombre del paciente',
    example: 'Juan',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Apellidos del paciente',
    example: 'Pérez González',
  })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({
    description: 'RUT del paciente',
    example: '12345678-9',
  })
  @IsOptional()
  @IsString()
  rut?: string;

  @ApiPropertyOptional({
    description: 'Email del paciente',
    example: 'juan@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Fecha de nacimiento (YYYY-MM-DD)',
    example: '1990-01-15',
  })
  @IsOptional()
  @IsDateString()
  birthDate?: string;
}

export class ScheduleAppointmentDto {
  @ApiProperty({
    description: 'Número de teléfono del paciente en formato E.164',
    example: '+56912345678',
  })
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'El teléfono debe estar en formato E.164',
  })
  phoneE164: string;

  @ApiProperty({
    description: 'Datos del paciente',
    type: PatientDataDto,
  })
  @ValidateNested()
  @Type(() => PatientDataDto)
  patient: PatientDataDto;

  @ApiProperty({
    description: 'ID de la sucursal',
  })
  @IsString()
  branchId: string;

  @ApiProperty({
    description: 'ID del profesional',
  })
  @IsString()
  professionalId: string;

  @ApiProperty({
    description: 'ID del sillón/box',
  })
  @IsString()
  chairId: string;

  @ApiPropertyOptional({
    description: 'ID de la atención (se resuelve automáticamente si no se proporciona)',
  })
  @IsOptional()
  @IsString()
  attentionId?: string;

  @ApiProperty({
    description: 'Fecha de la cita (YYYY-MM-DD)',
    example: '2025-10-21',
  })
  @IsDateString()
  dateYmd: string;

  @ApiProperty({
    description: 'Hora de inicio (HH:MM)',
    example: '10:00',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'La hora debe estar en formato HH:MM',
  })
  time: string;

  @ApiPropertyOptional({
    description: 'Duración en minutos',
    default: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(15)
  durationMin?: number;

  @ApiPropertyOptional({
    description: 'Comentario adicional',
  })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({
    description: 'Indica si es videoconsulta',
  })
  @IsOptional()
  @IsBoolean()
  videoconsulta?: boolean;

  @ApiPropertyOptional({
    description: 'ID del estado inicial de la cita (por defecto 7 - No confirmado)',
  })
  @IsOptional()
  @IsNumber()
  appointmentStateId?: number;
}

export class AppointmentCreatedDto {
  @ApiProperty()
  appointmentId: string;

  @ApiProperty()
  patientId: string;

  @ApiProperty()
  professionalName: string;

  @ApiProperty()
  branchName: string;

  @ApiProperty()
  date: string;

  @ApiProperty()
  time: string;

  @ApiProperty()
  duration: number;

  @ApiProperty()
  state: string;

  @ApiProperty()
  confirmationCode?: string;

  @ApiProperty()
  whatsappMessageSent: boolean;
}
