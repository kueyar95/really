import { IsString, IsOptional, IsUrl, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConnectMedilinkDto {
  @ApiProperty({
    description: 'Token de acceso generado en el panel de Medilink',
    example: 'a1b2c3d4e5f6...',
  })
  @IsString()
  accessToken: string;

  @ApiPropertyOptional({
    description: 'URL base de la API de Medilink (v1 o v5)',
    example: 'https://api.medilink.healthatom.com/api/v1',
  })
  @IsOptional()
  @IsUrl()
  baseUrl?: string;

  @ApiPropertyOptional({
    description: 'Límite de requests por minuto',
    minimum: 1,
    maximum: 60,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  rateLimitPerMin?: number;
}

export class ValidateMedilinkDto {
  @ApiPropertyOptional({
    description: 'Forzar revalidación aunque la conexión parezca estar activa',
  })
  @IsOptional()
  force?: boolean;
}

export class DisconnectMedilinkDto {
  @ApiPropertyOptional({
    description: 'Razón de la desconexión',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
