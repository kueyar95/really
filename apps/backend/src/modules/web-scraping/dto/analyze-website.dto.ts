import { IsUrl, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TemplateId } from '../utils/templates';

export class AnalyzeWebsiteDto {
  @ApiProperty({
    description: 'URL del sitio web a analizar',
    example: 'https://www.example.com',
  })
  @IsUrl({}, { message: 'La URL proporcionada no es válida' })
  url: string;

  @ApiProperty({
    description: 'ID de la plantilla a utilizar',
    enum: ['barberia', 'ecommerce', 'basic'],
    example: 'barberia',
  })
  @IsEnum(['barberia', 'ecommerce', 'basic'] as const, {
    message: 'El ID de plantilla proporcionado no es válido',
  })
  templateId: TemplateId;
} 