import { IsString, IsOptional, IsDateString, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetAvailabilityDto {
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
    description: 'Fecha de inicio (YYYY-MM-DD)',
    example: '2025-10-20',
  })
  @IsDateString()
  fromDate: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin (YYYY-MM-DD)',
    example: '2025-10-27',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({
    description: 'Duración deseada de la cita en minutos',
    default: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(15)
  duration?: number;

  @ApiPropertyOptional({
    description: 'ID del sillón/box específico',
  })
  @IsOptional()
  @IsString()
  chairId?: string;
}

export class AvailabilitySlot {
  @ApiProperty()
  date: string;

  @ApiProperty()
  time: string;

  @ApiProperty()
  duration: number;

  @ApiProperty()
  professionalId: string;

  @ApiProperty()
  professionalName: string;

  @ApiProperty()
  branchId: string;

  @ApiProperty()
  branchName: string;

  @ApiProperty()
  chairId: string;

  @ApiProperty()
  chairName: string;

  @ApiProperty()
  isVideoconsulta?: boolean;
}

export class AvailabilityResponseDto {
  @ApiProperty({
    type: [AvailabilitySlot],
  })
  slots: AvailabilitySlot[];

  @ApiProperty()
  hasMore: boolean;

  @ApiProperty()
  nextCursor?: string;
}
