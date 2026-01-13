import { ChannelConfig } from '../../../core/types/channel.types';

/* ============================
 *  Configuración de canal
 * ============================ */

// Configuración almacenada en channel.connectionConfig
export interface WhapiCloudConfig extends ChannelConfig {
  /** ID del canal devuelto por la API Partner (Manager) */
  whapiChannelId?: string;
  /** Token del canal devuelto por la API Partner (NO confundir con Partner token) */
  whapiChannelToken?: string;
}

/* ============================
 *  Health / Gateway
 * ============================ */

export interface WhapiHealthResponse {
  /** Estado textual del gateway: 'CONNECTED', 'DISCONNECTED', etc. */
  state?: string;
  /** Número de teléfono asociado cuando está conectado */
  phone?: string;
  user?: {
    /** Nombre del usuario de WhatsApp */
    name?: string;
    /** Nombre visible (push name) */
    pushname?: string;
    /** ID estilo phone@s.whatsapp.net */
    id?: string;
  };
  /** Plataforma/cliente desde donde se conectó */
  platform?: string;
  /** Bandera de conexión */
  connected?: boolean;
}

/* ============================
 *  QR
 * ============================ */

export interface WhapiQrCodeResponse {
  /** 'OK', 'TIMEOUT', 'WAITING', 'ERROR' */
  status: string;
  /** Imagen QR en base64 */
  base64?: string;
  /** Raw data para regenerar QR */
  rowdata?: string;
  /** Segundos hasta expiración del QR */
  expire?: number;
}

export interface WhapiQrCodeParams {
  /** Despierta el canal antes de obtener QR (default: true) */
  wakeup?: boolean;
  /** Tamaño del QR */
  size?: number;
  /** Ancho de imagen generada */
  width?: number;
  /** Alto de imagen generada */
  height?: number;
  /** Color de fondo del QR */
  color_light?: string;
  /** Color del código del QR */
  color_dark?: string;
}

/* ============================
 *  Envío de mensajes
 * ============================ */

export interface WhapiSendMessageResponse {
  id: string;
  /** 'sent', 'delivered', 'read', etc. */
  status: string;
  message: string;
}

export interface WhapiSendTextParams {
  /** Número o chat id destino */
  to: string;
  /** Texto del mensaje */
  body: string;
  /** ID del mensaje a citar */
  quoted?: string;
  /** TTL de mensajes efímeros (1-604800 s) */
  ephemeral?: number;
  /** ID del mensaje a editar */
  edit?: string;
  /** Simulación de escritura (segundos 0-60) */
  typing_time?: number;
  /** Deshabilita preview de enlaces */
  no_link_preview?: boolean;
  /** Preview ancho de enlaces */
  wide_link_preview?: boolean;
  /** Usuarios mencionados (números) */
  mentions?: string[];
  /** Mensaje de una sola visualización */
  view_once?: boolean;
}

export interface WhapiSendMediaParams {
  to: string;
  /** Texto opcional */
  caption?: string;
  /** URL o base64 del media */
  media: string;
  /** Nombre de archivo (para documentos) */
  filename?: string;
  /** MIME type (alias admitidos por API) */
  mimetype?: string;
  /** ID a citar */
  quoted?: string;
  /** TTL efímero */
  ephemeral?: number;
  /** Simulación de escritura */
  typing_time?: number;
  /** Ver una sola vez */
  view_once?: boolean;
  /** Menciones */
  mentions?: string[];
}

/* ============================
 *  Partner / Manager API
 * ============================ */

/** Modo administrativo del canal (Manager) */
export type WhapiMode = 'trial' | 'live' | 'sandbox' | 'unknown';

export interface CreatePartnerChannelParams {
  /** ID del proyecto (Manager) */
  projectId: string;
  /** Nombre para el canal */
  name: string;
}

export interface CreatePartnerChannelResponse {
  /** ID del canal creado (ej. 'MANTIS-7XF4Z') */
  id: string;
  /** Token de autenticación del canal (NO es el Partner token) */
  token: string;
  /** Fecha de expiración (ISO) */
  active_till: string;
  /** Modo inicial del canal */
  mode: Extract<WhapiMode, 'trial' | 'live'>;
}

export interface ExtendPartnerChannelParams {
  /** Días a extender */
  days: number;
}

export interface ExtendPartnerChannelResponse {
  /** Nueva fecha de expiración (ISO) */
  active_till: string;
}

export interface SetPartnerChannelModeParams {
  /** Nuevo modo del canal (Manager) */
  mode: Extract<WhapiMode, 'trial' | 'live'>;
}

/**
 * Objeto resumido de canal devuelto por Manager API.
 * Se usa en heartbeat para sincronizar metadatos administrativos:
 *  - mode (trial/live/sandbox)
 *  - active_till (ISO | null)
 */
export interface WhapiAdminChannel {
  /** Ej. 'MANTIS-7XF4Z' */
  id: string;
  /** 'trial' | 'live' | 'sandbox' | 'unknown' */
  mode?: WhapiMode;
  /** ISO o null si no aplica */
  active_till?: string | null;
  // ... agrega aquí lo que necesites (name, number, etc.)
}

/** Respuesta de listado de canales (Manager) */
export interface WhapiAdminListResponse {
  channels: WhapiAdminChannel[];
}

/* ============================
 *  Webhooks (gateway/manager)
 * ============================ */

// Webhook de estado de instancia (simplificado)
export interface WhapiInstanceStatusWebhook {
  event: 'status';
  instanceId?: string;
  status: 'connected' | 'disconnected' | 'authenticating' | 'error';
  data?: {
    number?: string;
    // otros detalles
  };
}

// Webhook simplificado de mensaje entrante
export interface WhapiMessageWebhook {
  event: 'message';
  instanceId?: string;
  message: {
    id: string;
    from: string;
    timestamp: number;
    type:
      | 'text'
      | 'image'
      | 'audio'
      | 'video'
      | 'document'
      | 'location'
      | 'contact'
      | 'sticker';
    body?: string;
    caption?: string;
    media?: {
      url: string;
      mimetype: string;
      filename?: string;
      size?: number;
    };
  };
  contact?: {
    name?: string;
  };
}

// Webhook de colección de mensajes
export interface WhapiMessagesWebhook {
  messages: Array<{
    id: string;
    from_me: boolean;
    type: string;
    chat_id: string;
    timestamp: number;
    source: string;
    text?: { body: string };
    document?: {
      id: string;
      mime_type: string;
      file_size: number;
      file_name: string;
      link?: string;
      caption?: string;
      sha256?: string;
      preview?: string;
    };
    voice?: {
      id: string;
      mime_type: string;
      file_size: number;
      link?: string;
      seconds: number;
      sha256?: string;
    };
    link_preview?: {
      body: string;
      url: string;
      title?: string;
      id?: string;
      description?: string;
      preview?: string;
    };
    from: string;
    from_name?: string;
  }>;
  event: {
    type: 'messages';
    event: 'post' | 'put';
  };
  channel_id: string;
}

// Webhook de estados de mensaje
export interface WhapiStatusesWebhook {
  statuses: Array<{
    id: string;
    code: number;
    status: string;
    recipient_id: string;
    timestamp: string;
  }>;
  event: {
    type: 'statuses';
    event: 'post';
  };
  channel_id: string;
}

// Webhook de canales (alta/cambios básicos)
export interface WhapiChannelWebhook {
  event: {
    type: 'channel';
    event: 'post';
  };
  channel_id: string;
  data: {
    id: string;
    name: string;
    status: string;
  };
}

export interface WhapiUserStatusWebhook {
  event: {
    type: 'users';
    event: 'post';
  };
  user: {
    id: string;
    name: string;
  };
  channel_id: string;
}

export interface WhapiHealthParams {
  /** Si debe iniciar el canal antes de chequear (default: true) */
  wakeup?: boolean;
  /** Info del cliente: 'Safari,Windows,10.0.19044' (u otro formato que uses) */
  platform?: string;
  /** Tipo de canal/gateway (ej. 'web') */
  channel_type?: string;
}
