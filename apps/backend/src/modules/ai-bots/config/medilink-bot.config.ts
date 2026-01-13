// Nota: AiBotConfig no existe en la entidad. Usamos un tipo local mínimo.
type AiBotConfig = {
  name: string;
  description?: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  functionsEnabled?: boolean;
  contextWindow?: number;
  includeSystemMessage?: boolean;
  responseFormat?: string;
  includeMetadata?: boolean;
  retryAttempts?: number;
  timeoutMs?: number;
  customSettings?: Record<string, any>;
};

/**
 * Configuración del bot para el funnel de Medilink
 */
export const medilinkBotConfig: Partial<AiBotConfig> = {
  name: 'Asistente Médico Medilink',
  description: 'Bot especializado en agendamiento de citas médicas con integración Medilink',
  
  // Prompt del sistema optimizado para agendamiento médico
  systemPrompt: `Eres un asistente especializado en agendamiento de citas médicas. Tu función es ayudar a los pacientes a:

1. **Identificarse y registrarse** en el sistema médico
2. **Seleccionar sucursal** donde desean atenderse
3. **Elegir profesional** según su especialidad
4. **Reservar horario** disponible
5. **Confirmar cita** con todos los detalles

## Comportamiento:
- Sé empático y profesional
- Explica claramente cada paso del proceso
- Valida información importante (teléfono, RUT, etc.)
- Ofrece alternativas cuando no hay disponibilidad
- Confirma todos los detalles antes de crear la cita

## Formato de respuestas:
- Usa emojis médicos apropiados (🏥👨‍⚕️📅🕐)
- Estructura la información de forma clara
- Incluye códigos de confirmación cuando sea relevante
- Mantén un tono amigable pero profesional

## Validaciones importantes:
- Teléfono debe incluir código de país (+56 para Chile)
- RUT debe tener formato válido
- Fechas en formato YYYY-MM-DD
- Horas en formato HH:MM

## Herramientas disponibles:
- search_patient: Buscar paciente existente
- list_branches: Mostrar sucursales
- list_services: Mostrar servicios o especialidades disponibles
- list_professionals: Mostrar profesionales por sucursal
- get_available_slots: Obtener horarios disponibles
- schedule_appointment: Crear nueva cita
- reschedule_appointment: Reagendar cita
- cancel_appointment: Cancelar cita

Usa estas herramientas según sea necesario para completar el agendamiento.`,

  // Configuración del modelo
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 2000,
  
  // Configuración de funciones
  functionsEnabled: true,
  
  // Configuración de contexto
  contextWindow: 10, // Número de mensajes anteriores a considerar
  includeSystemMessage: true,
  
  // Configuración de respuestas
  responseFormat: 'text',
  includeMetadata: true,
  
  // Configuración de errores
  retryAttempts: 3,
  timeoutMs: 30000,
  
  // Configuración específica para Medilink
  customSettings: {
    // Validaciones específicas
    validatePhoneFormat: true,
    validateRutFormat: true,
    requireConfirmation: true,
    
    // Límites de tiempo
    maxBookingDays: 30,
    minAdvanceHours: 2,
    
    // Configuración de notificaciones
    sendWhatsAppConfirmation: true,
    sendEmailConfirmation: false,
    
    // Configuración de reintentos
    maxRetries: 3,
    retryDelayMs: 1000,
    
    // Configuración de horarios
    businessHours: {
      start: '08:00',
      end: '20:00',
      timezone: 'America/Santiago',
    },
    
    // Días de la semana laborales
    workingDays: [1, 2, 3, 4, 5], // Lunes a Viernes
    
    // Configuración de duración por defecto
    defaultAppointmentDuration: 30, // minutos
    
    // Mensajes personalizados
    messages: {
      welcome: '¡Hola! 👋 Soy tu asistente para agendar citas médicas. ¿En qué puedo ayudarte?',
      goodbye: '¡Gracias por usar nuestro servicio! Si necesitas reagendar o cancelar, no dudes en contactarnos.',
      error: 'Lo siento, ha ocurrido un error. Por favor, intenta nuevamente o contacta soporte.',
      noSlots: 'No hay horarios disponibles en este momento. ¿Te gustaría probar con otro profesional?',
      appointmentCreated: '¡Excelente! Tu cita ha sido agendada exitosamente. Te enviaremos un recordatorio.',
    },
  },
};

/**
 * Configuración de funciones específicas para Medilink
 */
export const medilinkBotFunctions = [
  {
    name: 'search_patient',
    description: 'Buscar paciente en el sistema',
    parameters: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: 'Teléfono en formato E.164' },
        rut: { type: 'string', description: 'RUT del paciente' },
      },
      required: ['phone'],
    },
  },
  {
    name: 'list_branches',
    description: 'Obtener sucursales disponibles',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_services',
    description: 'Obtener servicios o especialidades médicas disponibles',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_professionals',
    description: 'Obtener profesionales por sucursal',
    parameters: {
      type: 'object',
      properties: {
        branchId: { type: 'string', description: 'ID de la sucursal' },
      },
      required: ['branchId'],
    },
  },
  {
    name: 'get_available_slots',
    description: 'Obtener horarios disponibles',
    parameters: {
      type: 'object',
      properties: {
        professionalId: { type: 'string', description: 'ID del profesional' },
        branchId: { type: 'string', description: 'ID de la sucursal' },
        startDate: { type: 'string', description: 'Fecha inicio YYYY-MM-DD' },
        endDate: { type: 'string', description: 'Fecha fin YYYY-MM-DD' },
      },
      required: ['professionalId', 'branchId'],
    },
  },
  {
    name: 'schedule_appointment',
    description: 'Crear nueva cita médica',
    parameters: {
      type: 'object',
      properties: {
        patientId: { type: 'string', description: 'ID del paciente' },
        professionalId: { type: 'string', description: 'ID del profesional' },
        branchId: { type: 'string', description: 'ID de la sucursal' },
        dateYmd: { type: 'string', description: 'Fecha YYYY-MM-DD' },
        timeHhmm: { type: 'string', description: 'Hora HH:MM' },
        duration: { type: 'number', description: 'Duración en minutos' },
        patientData: {
          type: 'object',
          description: 'Datos del paciente si no existe',
          properties: {
            name: { type: 'string' },
            lastName: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string' },
            rut: { type: 'string' },
            birthDate: { type: 'string' },
          },
        },
      },
      required: ['professionalId', 'branchId', 'dateYmd', 'timeHhmm'],
    },
  },
  {
    name: 'reschedule_appointment',
    description: 'Reagendar cita existente',
    parameters: {
      type: 'object',
      properties: {
        appointmentId: { type: 'string', description: 'ID de la cita' },
        newDateYmd: { type: 'string', description: 'Nueva fecha YYYY-MM-DD' },
        newTimeHhmm: { type: 'string', description: 'Nueva hora HH:MM' },
      },
      required: ['appointmentId', 'newDateYmd', 'newTimeHhmm'],
    },
  },
  {
    name: 'cancel_appointment',
    description: 'Cancelar cita existente',
    parameters: {
      type: 'object',
      properties: {
        appointmentId: { type: 'string', description: 'ID de la cita' },
        reason: { type: 'string', description: 'Motivo de cancelación' },
      },
      required: ['appointmentId'],
    },
  },
  {
    name: 'get_patient_appointments',
    description: 'Obtener citas de un paciente',
    parameters: {
      type: 'object',
      properties: {
        patientId: { type: 'string', description: 'ID del paciente' },
        status: { type: 'string', description: 'Filtrar por estado' },
      },
      required: ['patientId'],
    },
  },
];

/**
 * Configuración de validaciones específicas para Medilink
 */
export const medilinkValidations = {
  phone: {
    pattern: /^\+56\d{8,9}$/,
    message: 'El teléfono debe incluir código de país (+56) seguido de 8-9 dígitos',
  },
  rut: {
    pattern: /^\d{7,8}[0-9Kk]$/,
    message: 'El RUT debe tener formato válido (ej: 12345678-9)',
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'El email debe tener formato válido',
  },
  date: {
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    message: 'La fecha debe estar en formato YYYY-MM-DD',
  },
  time: {
    pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
    message: 'La hora debe estar en formato HH:MM (24 horas)',
  },
};

/**
 * Mensajes predefinidos para diferentes situaciones
 */
export const medilinkMessages = {
  errors: {
    patientNotFound: 'No se encontró el paciente en el sistema. Se creará un nuevo registro.',
    noBranches: 'No hay sucursales disponibles en este momento.',
    noProfessionals: 'No hay profesionales disponibles en esta sucursal.',
    noSlots: 'No hay horarios disponibles para este profesional.',
    slotNotAvailable: 'El horario seleccionado ya no está disponible.',
    appointmentFailed: 'No se pudo crear la cita. Intenta nuevamente.',
    invalidData: 'Los datos proporcionados no son válidos.',
    systemError: 'Error del sistema. Contacta soporte técnico.',
  },
  
  confirmations: {
    patientFound: 'Paciente encontrado en el sistema.',
    patientCreated: 'Nuevo paciente registrado exitosamente.',
    branchesListed: 'Sucursales disponibles:',
    professionalsListed: 'Profesionales disponibles:',
    slotsListed: 'Horarios disponibles:',
    appointmentCreated: 'Cita agendada exitosamente.',
    appointmentRescheduled: 'Cita reagendada exitosamente.',
    appointmentCancelled: 'Cita cancelada exitosamente.',
  },
  
  questions: {
    askPhone: 'Por favor, proporciona tu número de teléfono con código de país (+56):',
    askRut: 'Por favor, proporciona tu RUT:',
    askName: 'Por favor, proporciona tu nombre completo:',
    askEmail: 'Por favor, proporciona tu email:',
    selectBranch: '¿En qué sucursal te gustaría agendar?',
    selectProfessional: '¿Con qué profesional te gustaría agendar?',
    selectSlot: '¿Qué horario prefieres?',
    confirmAppointment: '¿Confirmas esta cita?',
  },
};
