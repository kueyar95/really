import { Controller, Post, Body, Get, Param, Logger } from '@nestjs/common';
import { WebScrapingService } from '../services/web-scraping.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AnalyzeWebsiteDto } from '../dto/analyze-website.dto';

@ApiTags('web-scraping')
@Controller('web-scraping')
export class WebScrapingController {
  private readonly logger = new Logger('WebScrapingController');
  
  constructor(private readonly webScrapingService: WebScrapingService) {}

  @Post('analyze-website')
  @ApiOperation({ summary: 'Inicia el análisis de un sitio web' })
  @ApiResponse({ 
    status: 200, 
    description: 'Análisis iniciado exitosamente. Retorna un ID de trabajo para consultar el estado.',
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Datos de entrada inválidos' 
  })
  async startAnalysis(@Body() data) {
    this.logger.log(`Iniciando análisis para URL: ${data.url}`);
    return await this.webScrapingService.startAnalysis(data.url, data.templateId);
  }

  @Get('job-status/:jobId')
  @ApiOperation({ summary: 'Consulta el estado de un análisis en proceso' })
  @ApiResponse({
    status: 200,
    description: 'Estado del trabajo consultado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'ID de trabajo no encontrado'
  })
  async getJobStatus(@Param('jobId') jobId: string) {
    return await this.webScrapingService.getJobStatus(jobId);
  }
}
