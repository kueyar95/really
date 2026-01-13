import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CancelAppointmentDto {
  @ApiProperty({
    description: 'ID de la cita a cancelar',
  })
  @IsString()
  appointmentId: string;

  @ApiPropertyOptional({
    description: 'Razón de la cancelación',
    example: 'Paciente no puede asistir',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Enviar notificación por WhatsApp',
    default: true,
  })
  @IsOptional()
  sendWhatsapp?: boolean;
}

export class CancelResponseDto {
  @ApiProperty()
  appointmentId: string;

  @ApiProperty()
  date: string;

  @ApiProperty()
  time: string;

  @ApiProperty()
  professionalName: string;

  @ApiProperty()
  branchName: string;

  @ApiProperty()
  cancellationReason?: string;

  @ApiProperty()
  cancelledAt: Date;

  @ApiProperty()
  whatsappMessageSent: boolean;

  @ApiProperty()
  message: string;
}
