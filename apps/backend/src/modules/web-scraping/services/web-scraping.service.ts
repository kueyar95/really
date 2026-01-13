import { Injectable, BadRequestException } from '@nestjs/common';
import { OpenAIService } from '../../ai/services/openai.service';
import { getAllRoutes, scrapeUrl } from '../utils/scraper';
import { 
  webxFilter, 
  webxSynthesis, 
  webxMainSynthesis, 
  webxFillStage 
} from '../utils/openai-prompts';
import { TEMPLATES, TemplateId, Template } from '../utils/templates';

@Injectable()
export class WebScrapingService {
  private readonly processingJobs = new Map<string, {
    status: 'processing' | 'completed' | 'error';
    result?: any;
    error?: string;
    startTime: number;
  }>();

  constructor(
    private readonly openAIService: OpenAIService,
  ) {}

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getJobStatus(jobId: string) {
    const job = this.processingJobs.get(jobId);
    if (!job) {
      throw new BadRequestException(`Job ID '${jobId}' no encontrado`);
    }

    // Limpiar trabajos antiguos (más de 5 minutos)
    const now = Date.now();
    for (const [id, jobInfo] of this.processingJobs.entries()) {
      if (now - jobInfo.startTime > 5 * 60 * 1000) {
        this.processingJobs.delete(id);
      }
    }

    return {
      jobId,
      status: job.status,
      result: job.result,
      error: job.error
    };
  }

  async startAnalysis(urlString: string, templateId: TemplateId) {
    const jobId = this.generateJobId();
    
    // Registrar el trabajo
    this.processingJobs.set(jobId, {
      status: 'processing',
      startTime: Date.now()
    });

    // Iniciar el procesamiento en segundo plano
    this.analyzeWebsite(urlString, templateId, jobId)
      .catch(error => {
        this.processingJobs.set(jobId, {
          status: 'error',
          error: error.message,
          startTime: Date.now()
        });
      });

    // Retornar inmediatamente el ID del trabajo
    return { jobId };
  }

  private cleanJsonResponse(response: string): string {
    let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    return cleaned.trim();
  }

  private formatTime(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
  }

  private async callOpenAI(messages: { role: string; content: string }[]): Promise<string> {
    return this.openAIService.webScrapingCompletion(messages);
  }

  private async processStageInParallel(stage: any, contentForTemplate: string): Promise<any> {
    try {
      const filledStage = await this.callOpenAI(
        webxFillStage(stage, contentForTemplate)
      );
      const cleanedStage = this.cleanJsonResponse(filledStage);
      return JSON.parse(cleanedStage);
    } catch (error) {
      return stage; // Retornar stage original si hay error
    }
  }

  private async analyzeWebsite(urlString: string, templateId: TemplateId, jobId: string) {
    const startTime = Date.now();
    const timers: Record<string, number> = {};
    let filledTemplate: string = '';

    try {
      // Obtener la plantilla
      const template = TEMPLATES[templateId];
      if (!template) {
        throw new BadRequestException(`Plantilla con ID '${templateId}' no encontrada`);
      }

      // Validar URL
      const url = new URL(urlString);
      const baseUrl = url.origin.toString();
      const domain = url.hostname;

      // Obtener todas las rutas
      timers.routes = Date.now();
      const routes = await getAllRoutes(baseUrl);
      timers.routes = Date.now() - timers.routes;

      // Determinar si necesitamos filtrar
      let selectedRoutes: string[];
      if (routes.length <= 6) {
        selectedRoutes = routes;
      } else {
        timers.filter = Date.now();
        const filteredRoutes = await this.callOpenAI(webxFilter(routes));
        const cleanedResponse = this.cleanJsonResponse(filteredRoutes);
        selectedRoutes = JSON.parse(cleanedResponse);
        timers.filter = Date.now() - timers.filter;
      }

      // Scrapear contenido de cada ruta
      const contents = [];
      timers.scraping = Date.now();
      for (let i = 0; i < selectedRoutes.length; i++) {
        const route = selectedRoutes[i];
        const content = await scrapeUrl(route);
        if (content) contents.push(content);
      }
      timers.scraping = Date.now() - timers.scraping;

      // Sintetizar cada contenido
      const synthesizedContents = [];
      timers.synthesis = Date.now();
      
      // Procesar síntesis en paralelo
      const synthesisTasks = contents.map(content => 
        this.callOpenAI(webxSynthesis(JSON.stringify(content)))
          .then(synthesis => synthesis)
          .catch(error => null)
      );

      const results = await Promise.all(synthesisTasks);
      synthesizedContents.push(...results.filter(Boolean));
      
      timers.synthesis = Date.now() - timers.synthesis;

      // Determinar si necesitamos consolidar las síntesis
      let contentForTemplate;
      if (synthesizedContents.length > 1) {
        timers.consolidation = Date.now();
        contentForTemplate = await this.callOpenAI(
          webxMainSynthesis(synthesizedContents.join('\n\n---\n\n'))
        );
        timers.consolidation = Date.now() - timers.consolidation;
      } else {
        contentForTemplate = synthesizedContents[0];
      }

      // Rellenar la plantilla con el contenido
      timers.template = Date.now();

      // Procesar stages en paralelo
      const processedStages = await Promise.all(
        template.stages.map(stage => this.processStageInParallel(stage, contentForTemplate))
      );

      // Construir la plantilla final
      const filledTemplateObj = {
        ...template,
        stages: processedStages
      };

      filledTemplate = JSON.stringify(filledTemplateObj);
      timers.template = Date.now() - timers.template;

      // Calcular tiempo total
      const totalTime = Date.now() - startTime;

      const result = {
        success: true,
        data: {
          templateId,
          filledTemplate: filledTemplateObj,
          timings: {
            total: this.formatTime(totalTime),
          }
        },
      };

      // Actualizar el estado del trabajo
      this.processingJobs.set(jobId, {
        status: 'completed',
        result,
        startTime: Date.now()
      });

      return result;
    } catch (error) {
      const totalTime = Date.now() - startTime;

      const errorResult = {
        success: false,
        error: error.message,
        timings: {
          total: this.formatTime(totalTime),
        },
      };

      // Actualizar el estado del trabajo con el error
      this.processingJobs.set(jobId, {
        status: 'error',
        error: error.message,
        startTime: Date.now()
      });

      return errorResult;
    }
  }
} 