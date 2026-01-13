import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import Bottleneck from 'bottleneck';
import { CryptoService } from './utils/crypto.service';

export interface MedilinkClientConfig {
  baseUrl: string;
  accessToken: string;
  rateLimitPerMin?: number;
}

export interface MedilinkApiResponse<T = any> {
  data: T;
  links?: {
    next?: string;
    prev?: string;
    first?: string;
    last?: string;
  };
  meta?: {
    total?: number;
    perPage?: number;
    currentPage?: number;
  };
}

@Injectable()
export class MedilinkClient {
  private readonly logger = new Logger('MedilinkClient');
  private readonly bottlenecks = new Map<string, Bottleneck>();
  private readonly defaultTimeout = 15000;
  private readonly maxRetries = 3;
  private readonly retryDelayMs = 1000;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly cryptoService: CryptoService,
  ) {}

  private getBottleneck(companyId: string, rateLimitPerMin: number): Bottleneck {
    const key = `${companyId}_${rateLimitPerMin}`;
    
    if (!this.bottlenecks.has(key)) {
      const minTime = Math.ceil(60000 / rateLimitPerMin);
      const bottleneck = new Bottleneck({
        minTime,
        maxConcurrent: 1,
        reservoir: rateLimitPerMin,
        reservoirRefreshAmount: rateLimitPerMin,
        reservoirRefreshInterval: 60000,
      });

      this.bottlenecks.set(key, bottleneck);
    }

    return this.bottlenecks.get(key);
  }

  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    retries = this.maxRetries,
    delay = this.retryDelayMs,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries === 0) {
        throw error;
      }

      const statusCode = error.response?.status;
      
      // No reintentamos en caso de 401 (token inválido)
      if (statusCode === 401) {
        throw error;
      }

      // Reintentamos en caso de 429 (rate limit) o errores 5xx
      if (statusCode === 429 || (statusCode >= 500 && statusCode < 600)) {
        const nextDelay = statusCode === 429 ? delay * 2 : delay;
        
        this.logger.warn(
          `Error ${statusCode}, reintentando en ${nextDelay}ms... (${retries} reintentos restantes)`,
        );
        
        await new Promise(resolve => setTimeout(resolve, nextDelay));
        return this.executeWithRetry(fn, retries - 1, nextDelay);
      }

      throw error;
    }
  }

  async request<T = any>(
    companyId: string,
    config: MedilinkClientConfig,
    options: AxiosRequestConfig,
  ): Promise<MedilinkApiResponse<T>> {
    const bottleneck = this.getBottleneck(companyId, config.rateLimitPerMin || 20);

    return bottleneck.schedule(async () => {
      return this.executeWithRetry(async () => {
        const requestConfig: AxiosRequestConfig = {
          ...options,
          baseURL: config.baseUrl.replace('http://', 'https://'), // Forzar HTTPS
          timeout: this.defaultTimeout,
          headers: {
            ...options.headers,
            'Authorization': `Token ${config.accessToken}`,
            'Content-Type': 'application/json',
          },
        };

        const normalizedBaseUrl = requestConfig.baseURL?.replace(/\/$/, '') || '';
        const normalizedEndpoint = requestConfig.url?.startsWith('/')
          ? requestConfig.url
          : `/${requestConfig.url || ''}`;
        const fullUrl = `${normalizedBaseUrl}${normalizedEndpoint}`;

        //this.logger.debug(`Medilink API Request: ${options.method} ${fullUrl}`);
        if (options.data) {
          //this.logger.debug(`Medilink API Request Body: ${JSON.stringify(options.data, null, 2)}`);
        }

        const response = await firstValueFrom(
          this.httpService.request<MedilinkApiResponse<T>>(requestConfig),
        );

        //this.logger.debug(`Medilink API Response Status: ${response.status}`);
        
        // No imprimir el detalle de la respuesta para listado de profesionales (muy verboso)
        // Solo silenciar si es GET a /profesionales o /sucursales/{id}/profesionales
        const url = requestConfig.url || '';
        const isListProfessionalsEndpoint = 
          options.method === 'GET' && (
            url.match(/^\/profesionales(\?|$)/) || // /profesionales o /profesionales?...
            url.match(/\/sucursales\/\d+\/profesionales(\?|$)/) // /sucursales/{id}/profesionales
          );
        
        //if (!isListProfessionalsEndpoint) {
        //  this.logger.debug(`Medilink API Response Data: ${JSON.stringify(response.data, null, 2)}`);
        //} else {
        //  this.logger.debug(`Medilink API Response Data Type: ${Array.isArray(response.data?.data) ? 'array' : typeof response.data?.data}`);
        //}
        
        return response.data;
      });
    });
  }

  // Métodos auxiliares para consultas con filtros
  buildQueryParams(filters: Record<string, any>): string {
    if (!filters || Object.keys(filters).length === 0) {
      return '';
    }

    const q = encodeURIComponent(JSON.stringify(filters));
    return `?q=${q}`;
  }

  async get<T = any>(
    companyId: string,
    config: MedilinkClientConfig,
    endpoint: string,
    params?: Record<string, any>,
  ): Promise<MedilinkApiResponse<T>> {
    return this.request<T>(companyId, config, {
      method: 'GET',
      url: endpoint,
      params,
    });
  }

  async post<T = any>(
    companyId: string,
    config: MedilinkClientConfig,
    endpoint: string,
    data?: any,
  ): Promise<MedilinkApiResponse<T>> {
    return this.request<T>(companyId, config, {
      method: 'POST',
      url: endpoint,
      data,
    });
  }

  async put<T = any>(
    companyId: string,
    config: MedilinkClientConfig,
    endpoint: string,
    data?: any,
  ): Promise<MedilinkApiResponse<T>> {
    return this.request<T>(companyId, config, {
      method: 'PUT',
      url: endpoint,
      data,
    });
  }

  async delete<T = any>(
    companyId: string,
    config: MedilinkClientConfig,
    endpoint: string,
  ): Promise<MedilinkApiResponse<T>> {
    return this.request<T>(companyId, config, {
      method: 'DELETE',
      url: endpoint,
    });
  }

  // Método para paginar resultados
  async *paginate<T = any>(
    companyId: string,
    config: MedilinkClientConfig,
    initialEndpoint: string,
    params?: Record<string, any>,
  ): AsyncGenerator<T[], void, unknown> {
    let nextUrl = initialEndpoint;
    let currentParams = params;

    while (nextUrl) {
      const response = await this.get<T[]>(
        companyId,
        config,
        nextUrl,
        currentParams,
      );

      yield response.data;

      // Si hay link.next, lo usamos para la siguiente página
      if (response.links?.next) {
        // Extraer la URL relativa del link next
        const url = new URL(response.links.next);
        nextUrl = url.pathname;
        currentParams = Object.fromEntries(url.searchParams);
      } else {
        nextUrl = null;
      }
    }
  }
}
