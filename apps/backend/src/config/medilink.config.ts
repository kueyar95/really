import { registerAs } from '@nestjs/config';

export default registerAs('medilink', () => ({
  defaultBaseUrl: process.env.MEDILINK_DEFAULT_BASE_URL || 'https://api.medilink.healthatom.com/api/v1',
  encryptionKeyB64: process.env.MEDILINK_ENCRYPTION_KEY_B64,
  rateLimitPerMin: parseInt(process.env.MEDILINK_RATE_LIMIT_RPM || '20', 10),
  syncEnabled: process.env.MEDILINK_SYNC_ENABLED === 'true',
  
  // URLs de las diferentes versiones de Medilink
  urls: {
    v1: 'https://api.medilink.healthatom.com/api/v1',
    v5: 'https://api.medilink2.healthatom.com/api/v5',
    v6: 'https://api.medilink2.healthatom.com/api/v6',
  },

  // Estados de cita por defecto (pueden variar por instalación)
  appointmentStates: {
    noConfirmado: 7,
    confirmado: 1,
    anulado: 3,
    cambioDeFecha: 8,
    noAsistio: 4,
    atendido: 2,
  },

  // Configuración de WhatsApp para plantillas
  whatsapp: {
    graphVersion: process.env.WA_GRAPH_VERSION || '20.0',
    phoneNumberId: process.env.WA_PHONE_NUMBER_ID,
    accessToken: process.env.WA_ACCESS_TOKEN,
    langCode: process.env.WA_LANG_CODE || 'es_ES',
    templates: {
      citaCreada: process.env.WA_TEMPLATE_CITA_CREADA || 'cita_creada',
      citaReagendada: process.env.WA_TEMPLATE_CITA_REAGENDADA || 'cita_reagendada',
      citaAnulada: process.env.WA_TEMPLATE_CITA_ANULADA || 'cita_anulada',
    },
  },

  // Configuración de reintentos y timeouts
  retry: {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
  },

  // Configuración de sesiones de reserva
  booking: {
    sessionExpirationMinutes: 30,
    maxSlotsToShow: 10,
    defaultAppointmentDuration: 30,
  },
}));
