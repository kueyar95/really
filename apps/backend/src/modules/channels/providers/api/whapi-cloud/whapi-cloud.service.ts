import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, catchError, map, of } from 'rxjs';
import { AxiosRequestConfig, AxiosError } from 'axios';
import {
  WhapiQrCodeResponse,
  WhapiSendMessageResponse,
  WhapiHealthResponse,
  WhapiQrCodeParams,
  WhapiHealthParams,
  WhapiSendTextParams,
  WhapiSendMediaParams,
  CreatePartnerChannelParams,
  CreatePartnerChannelResponse,
  SetPartnerChannelModeParams,
  WhapiAdminChannel
} from './whapi-cloud.types';

@Injectable()
export class WhapiCloudService {
  private readonly logger = new Logger('WhapiCloudService');
  private readonly gateBaseUrl: string;
  private readonly managerBaseUrl: string;
  private readonly partnerToken: string;
  private readonly defaultProjectId: string;
  private readonly webhookUrl: string;
  private normalizeHealth(raw: any): WhapiHealthResponse {
    const state: string | undefined =
      raw?.state ?? raw?.data?.state ?? raw?.result?.state;

    // distintas variantes que puede devolver Whapi
    const phone =
      raw?.phone?.number ??
      raw?.phone ??
      raw?.user?.phone ??
      raw?.user?.id ??
      null;

    const connected =
      typeof raw?.connected === 'boolean'
        ? raw.connected
        : ['authorized', 'connected', 'ready', 'online', 'authenticated']
          .includes((state ?? '').toLowerCase()) ||
        !!phone;

    return {
      state,
      phone,
      user: raw?.user,
      connected,
    };
  }
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.gateBaseUrl = 'https://gate.whapi.cloud';
    this.managerBaseUrl = 'https://manager.whapi.cloud';
    this.partnerToken = process.env.WHAPI_PARTNER_TOKEN || '';
    this.defaultProjectId = process.env.WHAPI_DEFAULT_PROJECT_ID || 'default';
    this.webhookUrl = process.env.WHAPI_WEBHOOK_URL || '';

    //this.logger.log(`Inicializando servicio con URL base gate: ${this.gateBaseUrl}`);
    //this.logger.log(`Inicializando servicio con URL base manager: ${this.managerBaseUrl}`);

    if (!this.partnerToken) {
      this.logger.warn('WHAPI_PARTNER_TOKEN no está configurado. Las funciones de Partner API no funcionarán correctamente.');
    }

    if (this.defaultProjectId === 'default') {
      this.logger.warn('WHAPI_DEFAULT_PROJECT_ID no está configurado. Se utilizará "default" como valor predeterminado.');
    }

    if (!this.webhookUrl) {
      this.logger.warn('WHAPI_WEBHOOK_URL no está configurado. Los webhooks no se configurarán automáticamente.');
    }

  }

  /** Headers para Manager/Partner API */
  private buildManagerHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.partnerToken}`,
    };
  }

  /** Determina si el error es transitorio (Cloudflare/origen) */
  private isTransient(err: any) {
    const status = err?.response?.status;
    return !!status && [520, 522, 524, 502, 503, 504].includes(status);
  }

  /** Retry liviano con backoff exponencial + jitter */
  private async withRetry<T>(fn: () => Promise<T>, tries = 3) {
    let delay = 400;
    for (let i = 0; i < tries; i++) {
      try {
        return await fn();
      } catch (e: any) {
        const transient = this.isTransient(e) || e?.code === 'ETIMEDOUT';
        if (!transient || i === tries - 1) throw e;
        await new Promise(r => setTimeout(r, delay + Math.floor(Math.random() * 200)));
        delay *= 2;
      }
    }
    // unreachable
    throw new Error('withRetry exhausted');
  }

  /** Normaliza respuesta administrativa de Manager a tu tipo interno */
  private normalizeAdminChannel(raw: any, fallbackId?: string): WhapiAdminChannel {
    return {
      id: raw?.id ?? fallbackId ?? '',
      mode: (raw?.mode ?? 'unknown') as any,
      active_till: raw?.active_till ?? null,
    };
  }

  /**
   * Obtiene un canal (administrativo) por ID desde Manager.
   * Requiere WHAPI_PARTNER_TOKEN configurado.
   */
  async getAdminChannelById(channelId: string): Promise<WhapiAdminChannel | null> {
    if (!this.partnerToken) {
      this.logger.warn('Partner token no configurado; getAdminChannelById retornará null.');
      return null;
    }

    const url = `${this.managerBaseUrl}/channels/${encodeURIComponent(channelId)}`;

    const data = await this.withRetry(async () => {
      const res = await this.httpService.axiosRef.get(url, {
        headers: this.buildManagerHeaders(),
        timeout: 10_000,
      });
      return res.data;
    });

    return this.normalizeAdminChannel(data, channelId);
  }

  /**
   * Fallback si tu plan no permite GET por id: lista y filtra.
   */
  async findAdminChannelInList(channelId: string): Promise<WhapiAdminChannel | null> {
    if (!this.partnerToken) {
      this.logger.warn('Partner token no configurado; findAdminChannelInList retornará null.');
      return null;
    }

    const url = `${this.managerBaseUrl}/channels/list`;

    const data = await this.withRetry(async () => {
      const res = await this.httpService.axiosRef.get(url, {
        headers: this.buildManagerHeaders(),
        timeout: 10_000,
      });
      return res.data;
    });

    const arr: any[] = Array.isArray(data?.channels) ? data.channels : Array.isArray(data) ? data : [];
    const found = arr.find(c => c?.id === channelId);
    return found ? this.normalizeAdminChannel(found, channelId) : null;
  }

  // (Opcional) si quieres exponer también un método para health del gate con tu normalizador existente:
  async getGateHealth(channelToken: string, params?: WhapiHealthParams): Promise<WhapiHealthResponse> {
    const url = `${this.gateBaseUrl}/status`; // o el endpoint real que uses para health
    const res = await this.withRetry(async () => {
      const r = await this.httpService.axiosRef.get(url, {
        headers: { Authorization: `Bearer ${channelToken}` },
        params,
        timeout: 10_000,
      });
      return r.data;
    });
    return this.normalizeHealth(res);
  }



  /**
   * Crea un nuevo canal de WhatsApp a través de la API de Partner
   * @param projectId ID del proyecto al que pertenecerá el canal
   * @returns Información del canal creado incluyendo ID, token y fecha de expiración
   */
  async createWhapiPartnerChannel(projectId: string = this.defaultProjectId): Promise < {
  channelId: string;
  token: string;
  activeTill: Date;
  mode: 'trial' | 'live';
} > {
  //this.logger.log(`Creando canal para proyecto ${projectId} usando API Partner`);

  try {
    if(!this.partnerToken) {
  throw new Error('WHAPI_PARTNER_TOKEN no está configurado');
}

const config: AxiosRequestConfig = {
  headers: {
    'Authorization': `Bearer ${this.partnerToken}`,
    'Content-Type': 'application/json'
  }
};

const params: CreatePartnerChannelParams = {
  projectId: projectId,
  name: `WhatsApp Whapi ${new Date().toISOString().substring(0, 19).replace('T', ' ')}`,
};

const response = await firstValueFrom(
  this.httpService.put<CreatePartnerChannelResponse>(
    `${this.managerBaseUrl}/channels`,
    params,
    config
  ).pipe(
    catchError((error: AxiosError) => {
      this.handleApiError('Error creando canal con API Partner', error);
      throw error;
    })
  )
);

await new Promise(resolve => setTimeout(resolve, 5000));

//this.logger.log(`Canal creado con éxito: id=${response.data.id}, modo=${response.data.mode}`);

const partnerChannel = {
  channelId: response.data.id,
  token: response.data.token,
  activeTill: new Date(response.data.active_till),
  mode: response.data.mode
};

return partnerChannel;
    } catch (error) {
  this.logger.error(`Error creando canal: ${error.message}`);
  throw new HttpException(
    `Error al crear canal: ${error.message}`,
    HttpStatus.INTERNAL_SERVER_ERROR
  );
}
  }

  /**
   * Verifica si un canal está realmente activo en Whapi
   * @param whapiChannelId ID del canal a verificar
   * @returns true si el canal está activo y tiene días válidos
   */
  async checkChannelIsValid(whapiChannelId: string): Promise < boolean > {
  try {
    if(!this.partnerToken) {
  this.logger.warn('WHAPI_PARTNER_TOKEN no está configurado, asumiendo canal inválido');
  return false;
}

const config: AxiosRequestConfig = {
  headers: {
    'Authorization': `Bearer ${this.partnerToken}`,
    'Content-Type': 'application/json',
  }
};

const response = await firstValueFrom(
  this.httpService.get(
    `${this.managerBaseUrl}/channels/${whapiChannelId}`,
    config
  ).pipe(
    catchError((error: AxiosError) => {
      if (error.response?.status === 404) {
        //this.logger.log(`Canal ${whapiChannelId} no existe en Whapi`);
        return of({ data: null });
      }
      this.handleApiError(`Error verificando canal ${whapiChannelId}`, error);
      throw error;
    })
  )
);

if (!response.data) {
  return false;
}

const channelData = response.data;
const isActive = channelData.status === 'active';
const hasValidDays = new Date(channelData.activeTill) > new Date();

//this.logger.log(`🔍 Canal ${whapiChannelId} - Status: ${channelData.status}, Activo hasta: ${channelData.activeTill}, Válido: ${isActive && hasValidDays}`);

return isActive && hasValidDays;
    } catch (error) {
  this.logger.error(`Error verificando canal ${whapiChannelId}:`, error.message);
  return false; // Si hay error, asumir que no es válido
}
  }

  /**
   * Verifica si un canal está activo Y autenticado en Whapi
   * @param whapiChannelId ID del canal a verificar
   * @param channelToken Token del canal para verificar autenticación
   * @returns true si el canal está activo, válido y autenticado
   */
  async checkChannelIsValidAndAuthenticated(whapiChannelId: string, channelToken: string): Promise < boolean > {
  try {
    // Primero verificar si el canal está activo
    const isChannelValid = await this.checkChannelIsValid(whapiChannelId);

    if(!isChannelValid) {
      //this.logger.log(`🔍 Canal ${whapiChannelId} no está activo o válido`);
      return false;
    }

      // Luego verificar si está autenticado
      const instanceStatus = await this.getInstanceStatus(channelToken);
    const isAuthenticated = instanceStatus.connected === true;

    //this.logger.log(`🔍 Canal ${whapiChannelId} - Autenticado: ${isAuthenticated}, Teléfono: ${instanceStatus.phone || 'no disponible'}`);

    return isAuthenticated;
  } catch(error) {
    this.logger.error(`Error verificando autenticación del canal ${whapiChannelId}:`, error.message);
    return false; // Si hay error, asumir que no está autenticado
  }
}

  /**
   * Elimina un canal de WhatsApp a través de la API de Partner
   * @param whapiChannelId ID del canal a eliminar
   */
  async deleteWhapiPartnerChannel(whapiChannelId: string): Promise < void> {
  //this.logger.log(`Eliminando canal ${whapiChannelId} usando API Partner`);

  try {
    if(!this.partnerToken) {
  throw new Error('WHAPI_PARTNER_TOKEN no está configurado');
}

const config: AxiosRequestConfig = {
  headers: {
    'Authorization': `Bearer ${this.partnerToken}`
  }
};

await firstValueFrom(
  this.httpService.delete(
    `${this.managerBaseUrl}/channels/${whapiChannelId}`,
    config
  ).pipe(
    catchError((error: AxiosError) => {
      // Si el canal ya no existe (404), no es un error crítico
      if (error.response?.status === 404) {
        //this.logger.log(`Canal ${whapiChannelId} ya no existe en Whapi - probablemente ya fue eliminado`);
        return of({ data: null }); // Retornar éxito silencioso
      }
      this.handleApiError('Error eliminando canal con API Partner', error);
      throw error;
    })
  )
);

//this.logger.log(`Canal ${whapiChannelId} eliminado con éxito`);
    } catch (error) {
  this.logger.error(`Error eliminando canal ${whapiChannelId}: ${error.message}`);
  throw new HttpException(
    `Error al eliminar canal: ${error.message}`,
    HttpStatus.INTERNAL_SERVER_ERROR
  );
}
  }

  /**
   * Extiende la duración de un canal Whapi.Cloud por un número de días
   * @param channelId ID del canal en Whapi.Cloud
   * @param days Número de días a extender
   * @returns Fecha de expiración actualizada
   */
  async extendWhapiChannel(channelId: string, days: number): Promise < { activeTill: string } > {
  try {
    //this.logger.log(`Extendiendo canal ${channelId} por ${days} días`);

    // Si no hay token de partner, usar el token proporcionado por el usuario
    if(!this.partnerToken) {
  throw new Error('No se puede extender el canal sin token de partner');
}

// Crear el endpoint
const endpoint = `https://api.whapi.cloud/partner/extend-channel`;

// Configurar los headers
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${this.partnerToken}`
};

// Configurar el cuerpo de la solicitud
const body = {
  project_id: this.defaultProjectId,
  channel_id: channelId,
  days
};

// Realizar la solicitud POST
const response = await firstValueFrom(
  this.httpService.post(endpoint, body, { headers }).pipe(
    map(res => res.data),
    catchError(error => {
      this.logger.error(`Error extendiendo canal ${channelId}: ${JSON.stringify(error.response?.data || error.message)}`);
      throw new Error(`Error extendiendo canal: ${error.response?.data?.message || error.message}`);
    })
  )
);

//this.logger.log(`Canal ${channelId} extendido exitosamente hasta ${response.active_till}`);

return {
  activeTill: response.active_till
};
    } catch (error) {
  this.logger.error(`Error extendiendo canal ${channelId}: ${error.message}`);
  throw error;
}
  }

  /**
   * Establece el modo de un canal de WhatsApp a través de la API de Partner
   * @param whapiChannelId ID del canal a modificar
   * @param mode Nuevo modo ('trial' o 'live')
   */
  async setWhapiChannelMode(whapiChannelId: string, mode: 'trial' | 'live'): Promise < void> {
  //this.logger.log(`Estableciendo modo ${mode} para canal ${whapiChannelId} usando API Partner`);

  try {
    if(!this.partnerToken) {
  throw new Error('WHAPI_PARTNER_TOKEN no está configurado');
}

const config: AxiosRequestConfig = {
  headers: {
    'Authorization': `Bearer ${this.partnerToken}`,
    'Content-Type': 'application/json'
  }
};

const params: SetPartnerChannelModeParams = {
  mode
};

await firstValueFrom(
  this.httpService.patch(
    `${this.managerBaseUrl}/channels/${whapiChannelId}/mode`,
    params,
    config
  ).pipe(
    catchError((error: AxiosError) => {
      this.handleApiError('Error estableciendo modo de canal con API Partner', error);
      throw error;
    })
  )
);

//this.logger.log(`Modo de canal ${whapiChannelId} establecido a ${mode} con éxito`);
    } catch (error) {
  this.logger.error(`Error estableciendo modo de canal ${whapiChannelId}: ${error.message}`);
  throw new HttpException(
    `Error al establecer modo de canal: ${error.message}`,
    HttpStatus.INTERNAL_SERVER_ERROR
  );
}
  }

  /**
   * Obtiene un código QR para iniciar sesión en WhatsApp
   * @param channelToken Token de autenticación del canal de Whapi.Cloud
   * @param params Parámetros opcionales para personalizar el QR
   * @returns Respuesta con el código QR en base64
   */
  async getQrCode(channelToken: string, params: WhapiQrCodeParams = {}): Promise < WhapiQrCodeResponse > {
  //this.logger.log(`Solicitando QR con token: ${this.maskToken(channelToken)}`);
  const maxRetries = 6;
  const retryDelay = 2500; // ms

  let lastError: Error | null = null;

  for(let attempt = 1; attempt <= maxRetries; attempt++) {
  try {
    const config: AxiosRequestConfig = {
      headers: {
        'Authorization': `Bearer ${channelToken}`,
        'Accept': 'application/json'
      },
      params: {
        wakeup: params.wakeup !== undefined ? params.wakeup : true,
        ...(params.size && { size: params.size }),
        ...(params.width && { width: params.width }),
        ...(params.height && { height: params.height }),
        ...(params.color_light && { color_light: params.color_light }),
        ...(params.color_dark && { color_dark: params.color_dark })
      }
    };
    // console.log('config', config); // Mantener o quitar según preferencia

    const response = await firstValueFrom(
      this.httpService.get<WhapiQrCodeResponse>(`${this.gateBaseUrl}/users/login`, config)
        .pipe(
          catchError((error: AxiosError) => {
            this.handleApiError(`Error API obteniendo código QR (intento ${attempt}/${maxRetries})`, error);
            // Lanzamos para que lo capture el catch de este bloque try
            throw error;
          })
        )
    );

    if (response.data?.status === 'OK') {
      //this.logger.log(`QR obtenido con éxito en intento ${attempt}: data=${JSON.stringify(response.data)}`);
      await this.setChannelWebhook(channelToken);
      return response.data; // Éxito, retornar
    } else {
      // Respuesta recibida, pero el QR no está listo
      lastError = new Error(`QR status no es 'ok' en la respuesta (intento ${attempt})`);
      this.logger.warn(`${lastError.message}. Respuesta: ${JSON.stringify(response.data)}`);
      if (attempt < maxRetries) {
        //this.logger.log(`Esperando ${retryDelay}ms antes del siguiente intento...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

  } catch (error) {
    // Captura errores de Axios (lanzados desde catchError) u otros errores inesperados
    this.logger.error(`Error durante el intento ${attempt} de obtener código QR: ${error.message}`);
    lastError = error; // Guardar el último error encontrado

    if (attempt < maxRetries) {
      // Opcional: esperar también en caso de error antes de reintentar
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      // Por ahora, solo esperamos si la respuesta fue 200 pero status no es ok.
      // Si fue un error de red/API, reintentamos inmediatamente (según el bucle for).
      //this.logger.log(`Intentando de nuevo...`);
    }
  }
}

// Si el bucle termina sin retornar, significa que todos los intentos fallaron
this.logger.error(`No se pudo obtener el QR después de ${maxRetries} intentos.`);
throw new HttpException(
  `Error al obtener código QR después de ${maxRetries} intentos. Último error: ${lastError?.message || 'Desconocido'}`,
  HttpStatus.INTERNAL_SERVER_ERROR
);
  }

  /**
   * Verifica el estado del canal de WhatsApp
   * @param channelToken Token de autenticación del canal de Whapi.Cloud
   * @param params Parámetros opcionales para el health check
   * @returns Estado actual del canal
   */
  // 👇 Reemplaza tu método por este
async getInstanceStatus(
  channelToken: string,
  params: WhapiHealthParams = {}
): Promise < WhapiHealthResponse > {
  //this.logger.log(`Verificando estado del canal con token: ${this.maskToken(channelToken)}`);

  try {
    const config: AxiosRequestConfig = {
      headers: { Authorization: `Bearer ${channelToken}` },
      params: {
        wakeup: params.wakeup !== undefined ? params.wakeup : true,
        ...(params.platform && { platform: params.platform }),
        channel_type: params.channel_type || 'web',
      },
    };

    const response = await firstValueFrom(
      this.httpService
        .get<any>(`${this.gateBaseUrl}/health`, config)
        .pipe(
          catchError((error: AxiosError) => {
            this.handleApiError('Error verificando estado del canal', error);
            throw error;
          })
        )
    );

    // 🔎 Normalizamos la forma cambiante del /health
    const { connected, phone, state } = this.normalizeHealth(response.data);

    //this.logger.log(
      //`Estado del canal obtenido: state=${state ?? 'n/a'}, conectado=${String(
        //connected
      //)}, teléfono=${phone ?? 'no disponible'}`
    //);

    // Devolvemos en el shape esperado por el resto del código
    return { connected, phone } as WhapiHealthResponse;
  } catch(error: any) {
    this.logger.error(`Error verificando estado del canal: ${error.message}`);
    throw new HttpException(
      `Error al verificar estado del canal: ${error.message}`,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}


  /**
   * Envía un mensaje de texto a través de WhatsApp
   * @param channelToken Token de autenticación del canal de Whapi.Cloud
   * @param params Parámetros del mensaje a enviar
   * @returns Respuesta con el ID del mensaje enviado
   */
  async sendMessage(channelToken: string, params: WhapiSendTextParams): Promise < WhapiSendMessageResponse > {
  //this.logger.log(`Enviando mensaje a ${params.to} con token: ${this.maskToken(channelToken)}`);

  try {
    const config: AxiosRequestConfig = {
      headers: {
        'Authorization': `Bearer ${channelToken}`,
        'Content-Type': 'application/json'
      }
    };

    const response = await firstValueFrom(
      this.httpService.post<WhapiSendMessageResponse>(
        `${this.gateBaseUrl}/messages/text`,
        params,
        config
      ).pipe(
        catchError((error: AxiosError) => {
          this.handleApiError('Error enviando mensaje', error);
          throw error;
        })
      )
    );

    //this.logger.log(`Mensaje enviado con éxito: id=${response.data.id}`);
    return response.data;
  } catch(error) {
    this.logger.error(`Error enviando mensaje: ${error.message}`);
    throw new HttpException(
      `Error al enviar mensaje: ${error.message}`,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

  /**
   * Envía un mensaje multimedia a través de WhatsApp
   * @param channelToken Token de autenticación del canal de Whapi.Cloud
   * @param params Parámetros del mensaje multimedia a enviar
   * @returns Respuesta con el ID del mensaje enviado
   */
  async sendMediaMessage(channelToken: string, params: WhapiSendMediaParams): Promise < WhapiSendMessageResponse > {
  //this.logger.log(`Enviando mensaje multimedia a ${params.to} con token: ${this.maskToken(channelToken)}`);

  try {
    const config: AxiosRequestConfig = {
      headers: {
        'Authorization': `Bearer ${channelToken}`,
        'Content-Type': 'application/json'
      }
    };

    // Determinar el endpoint según el mimetype
    let endpoint = '/messages/media';
    if(params.mimetype) {
  if (params.mimetype.startsWith('image/')) {
    endpoint = '/messages/image';
  } else if (params.mimetype.startsWith('video/')) {
    endpoint = '/messages/video';
  } else if (params.mimetype.startsWith('audio/')) {
    endpoint = '/messages/audio';
  } else if (params.mimetype.includes('pdf') || params.mimetype.includes('document')) {
    endpoint = '/messages/document';
  }
}

const response = await firstValueFrom(
  this.httpService.post<WhapiSendMessageResponse>(
    `${this.gateBaseUrl}${endpoint}`,
    params,
    config
  ).pipe(
    catchError((error: AxiosError) => {
      this.handleApiError('Error enviando mensaje multimedia', error);
      throw error;
    })
  )
);

//this.logger.log(`Mensaje multimedia enviado con éxito: id=${response.data.id}`);
return response.data;
    } catch (error) {
  this.logger.error(`Error enviando mensaje multimedia: ${error.message}`);
  throw new HttpException(
    `Error al enviar mensaje multimedia: ${error.message}`,
    HttpStatus.INTERNAL_SERVER_ERROR
  );
}
  }

  /**
   * Desconecta un canal de WhatsApp
   * @param channelToken Token de autenticación del canal de Whapi.Cloud
   * @returns Resultado de la desconexión
   */
  async logout(channelToken: string): Promise < any > {
  //this.logger.log(`Desconectando canal con token: ${this.maskToken(channelToken)}`);

  try {
    const config: AxiosRequestConfig = {
      headers: {
        'Authorization': `Bearer ${channelToken}`
      }
    };

    const response = await firstValueFrom(
      this.httpService.post<any>(`${this.gateBaseUrl}/users/logout`, {}, config)
        .pipe(
          catchError((error: AxiosError) => {
            // Si el canal ya no existe (404), considerarlo como desconectado exitosamente
            if (error.response?.status === 404) {
              //this.logger.log(`Canal ya no existe en Whapi - considerando como desconectado exitosamente`);
              return of({ data: { status: 'disconnected', message: 'Channel not found, assuming disconnected' } });
            }
            this.handleApiError('Error desconectando canal', error);
            throw error;
          })
        )
    );

    //this.logger.log('Canal desconectado con éxito');
    return response.data;
  } catch(error) {
    this.logger.error(`Error desconectando canal: ${error.message}`);
    throw new HttpException(
      `Error al desconectar canal: ${error.message}`,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

  /**
   * Maneja errores de la API de forma estandarizada
   */
  private handleApiError(context: string, error: AxiosError): void {
  const status = error.response?.status;
  const data = error.response?.data;

  this.logger.error(`${context}: ${error.message}`);

  if(status) {
    this.logger.error(`Estado HTTP: ${status}, Datos: ${JSON.stringify(data)}`);

    if (status === 401) {
      this.logger.error('Error de autenticación. Verifique el token.');
    } else if (status === 402) {
      this.logger.error('Límite excedido en versión de prueba.');
    } else if (status === 403) {
      this.logger.error('Acceso prohibido al destinatario.');
    } else if (status === 429) {
      this.logger.error('Demasiadas solicitudes. Limite la frecuencia.');
    }
  }
}

/**
 * Obtiene el ID del proyecto por defecto configurado
 * @returns ID del proyecto por defecto
 */
getDefaultProjectId(): string {
  return this.defaultProjectId;
}

  /**
   * Enmascara un token para logging seguro
   */
  private maskToken(token: string): string {
  if (!token || token.length < 8) return '******';
  return token.substring(0, 4) + '...' + token.substring(token.length - 4);
}

  /**
   * Configura el webhook para un canal específico.
   * @param channelToken Token del canal a configurar.
   */
  private async setChannelWebhook(channelToken: string): Promise < void> {
  if(!this.webhookUrl) {
  this.logger.warn(`Intento de configurar webhook sin WHAPI_WEBHOOK_URL definida.`);
  return;
}

const maskedToken = this.maskToken(channelToken);
//this.logger.log(`Seteando webhook en ${this.webhookUrl} para token ${maskedToken}`);

const config: AxiosRequestConfig = {
  headers: {
    'Authorization': `Bearer ${channelToken}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
};

const body = {
  offline_mode: false,
  full_history: false,
  webhooks: [
    {
      url: this.webhookUrl,
      mode: "body",
      events: [
        { type: "users", method: "post" },
        { type: "users", method: "delete" },
        { type: "channel", method: "post" }, // 🔥 HABILITADO PARA DETECTAR INACTIVE
        { type: "messages", method: "post" },
      ]
    }
  ],
  media: {
    auto_download: [
      "image",
      "audio",
      "video",
      "document",
      "voice"
    ],
    init_avatars: true
  },
  callback_persist: true
};

try {
  const response = await firstValueFrom(
    this.httpService.patch(`${this.gateBaseUrl}/settings`, body, config)
      .pipe(
        catchError((error: AxiosError) => {
          this.handleApiError(`Error configurando webhook para token ${maskedToken}`, error);
          throw new Error(`API error al configurar webhook: ${error.response?.status} ${JSON.stringify(error.response?.data)}`);
        })
      )
  );

  //this.logger.log(`Respuesta de configuración de webhook: ${JSON.stringify(response.data)}`);
} catch (error) {
  throw error;
}
  }

  
} 