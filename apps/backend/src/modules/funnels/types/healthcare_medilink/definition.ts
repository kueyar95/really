import { Injectable, Logger } from '@nestjs/common';

export enum HealthcareMedilinkStage {
  // Etapas del funnel de agendamiento médico
  INTAKE = 'INTAKE',                       // Identificación del paciente
  NEEDS = 'NEEDS',                         // Preferencias de sucursal/especialidad
  SELECT_PROFESSIONAL = 'SELECT_PROFESSIONAL', // Selección de profesional
  SELECT_SLOT = 'SELECT_SLOT',             // Selección de horario
  ATTENTION_RESOLVE = 'ATTENTION_RESOLVE',  // Resolver/confirmar atención
  CONFIRM = 'CONFIRM',                     // Confirmación de cita
  DONE = 'DONE',                           // Proceso completado
}

export interface HealthcareMedilinkContext {
  // Datos del paciente
  patientData?: {
    phoneE164: string;
    name?: string;
    lastName?: string;
    rut?: string;
    email?: string;
    birthDate?: string;
    medilinkPatientId?: string;
  };

  // Preferencias de agenda
  preferences?: {
    branchId?: string;
    branchName?: string;
    professionalId?: string;
    professionalName?: string;
    specialty?: string;
    preferredDates?: string[];
    preferredTimes?: string[];
  };

  // Selecciones actuales
  selections?: {
    branchId?: string;
    professionalId?: string;
    chairId?: string;
    dateYmd?: string;
    timeHhmm?: string;
    duration?: number;
    attentionId?: string;
  };

  // Slots disponibles
  availableSlots?: Array<{
    id: string;
    date: string;
    time: string;
    professionalId: string;
    professionalName: string;
    branchId: string;
    branchName: string;
    chairId: string;
    duration: number;
  }>;

  // Resultado de la cita
  appointment?: {
    id: string;
    confirmationCode?: string;
    status: string;
    createdAt: Date;
  };

  // Estado del funnel
  currentStage: HealthcareMedilinkStage;
  sessionId?: string;
  companyId: string;
  channelId: string;
  clientId: string;
  
  // Flags de control
  needsHumanIntervention?: boolean;
  humanInterventionReason?: string;
  retryCount?: number;
  lastError?: string;
}

export interface StageTransition {
  from: HealthcareMedilinkStage;
  to: HealthcareMedilinkStage;
  condition?: (context: HealthcareMedilinkContext) => boolean;
  action?: (context: HealthcareMedilinkContext) => Promise<void>;
}

@Injectable()
export class HealthcareMedilinkDefinition {
  private readonly logger = new Logger('HealthcareMedilinkFunnel');

  readonly name = 'healthcare_medilink';
  readonly description = 'Funnel de agendamiento de citas médicas con integración Medilink';

  readonly stages = Object.values(HealthcareMedilinkStage);
  readonly initialStage = HealthcareMedilinkStage.INTAKE;

  // Definición de transiciones válidas entre etapas
  readonly transitions: StageTransition[] = [
    // INTAKE -> NEEDS (cuando se ha identificado al paciente)
    {
      from: HealthcareMedilinkStage.INTAKE,
      to: HealthcareMedilinkStage.NEEDS,
      condition: (ctx) => !!(ctx.patientData?.name && ctx.patientData?.lastName),
    },

    // NEEDS -> SELECT_PROFESSIONAL (cuando se ha seleccionado sucursal)
    {
      from: HealthcareMedilinkStage.NEEDS,
      to: HealthcareMedilinkStage.SELECT_PROFESSIONAL,
      condition: (ctx) => !!ctx.preferences?.branchId,
    },

    // SELECT_PROFESSIONAL -> SELECT_SLOT (cuando se ha seleccionado profesional)
    {
      from: HealthcareMedilinkStage.SELECT_PROFESSIONAL,
      to: HealthcareMedilinkStage.SELECT_SLOT,
      condition: (ctx) => !!ctx.selections?.professionalId,
    },

    // SELECT_SLOT -> ATTENTION_RESOLVE (cuando se ha seleccionado horario)
    {
      from: HealthcareMedilinkStage.SELECT_SLOT,
      to: HealthcareMedilinkStage.ATTENTION_RESOLVE,
      condition: (ctx) => !!(ctx.selections?.dateYmd && ctx.selections?.timeHhmm),
    },

    // ATTENTION_RESOLVE -> CONFIRM (cuando se ha resuelto la atención)
    {
      from: HealthcareMedilinkStage.ATTENTION_RESOLVE,
      to: HealthcareMedilinkStage.CONFIRM,
      condition: (ctx) => !!ctx.selections?.attentionId || !!ctx.needsHumanIntervention,
    },

    // CONFIRM -> DONE (cuando se ha confirmado la cita)
    {
      from: HealthcareMedilinkStage.CONFIRM,
      to: HealthcareMedilinkStage.DONE,
      condition: (ctx) => !!ctx.appointment?.id,
    },

    // Permitir volver atrás en ciertas etapas
    {
      from: HealthcareMedilinkStage.SELECT_PROFESSIONAL,
      to: HealthcareMedilinkStage.NEEDS,
    },
    {
      from: HealthcareMedilinkStage.SELECT_SLOT,
      to: HealthcareMedilinkStage.SELECT_PROFESSIONAL,
    },
    {
      from: HealthcareMedilinkStage.ATTENTION_RESOLVE,
      to: HealthcareMedilinkStage.SELECT_SLOT,
    },
  ];

  // Mensajes predefinidos para cada etapa
  readonly stageMessages = {
    [HealthcareMedilinkStage.INTAKE]: {
      welcome: '¡Hola! 👋 Soy tu asistente para agendar citas médicas.',
      requestName: 'Para comenzar, ¿podrías indicarme tu nombre completo?',
      requestRut: 'Por favor, indícame tu RUT para verificar tu información.',
      patientFound: 'Perfecto, he encontrado tu información. Continuemos con el agendamiento.',
      patientCreated: 'He registrado tu información. Ahora podemos proceder con el agendamiento.',
    },
    [HealthcareMedilinkStage.NEEDS]: {
      selectBranch: '¿En qué sucursal te gustaría agendar tu cita?\n\nSucursales disponibles:',
      selectSpecialty: '¿Qué tipo de atención necesitas?',
      confirmSelection: 'Has seleccionado: {branch}. ¿Es correcto?',
    },
    [HealthcareMedilinkStage.SELECT_PROFESSIONAL]: {
      listProfessionals: 'Estos son los profesionales disponibles en {branch}:',
      selectProfessional: 'Por favor, selecciona el número del profesional con quien deseas agendar:',
      noProfessionals: 'Lo siento, no hay profesionales disponibles en este momento. ¿Deseas probar con otra sucursal?',
    },
    [HealthcareMedilinkStage.SELECT_SLOT]: {
      listSlots: 'Estos son los horarios disponibles para {professional}:',
      selectSlot: 'Por favor, selecciona el número del horario que prefieres:',
      noSlots: 'Lo siento, no hay horarios disponibles. ¿Deseas ver otro profesional?',
    },
    [HealthcareMedilinkStage.ATTENTION_RESOLVE]: {
      resolvingAttention: 'Verificando información de tu atención médica...',
      attentionResolved: 'Información de atención verificada correctamente.',
      needsHumanHelp: 'Necesito la ayuda de un operador para completar tu reserva. Te contactaremos pronto.',
    },
    [HealthcareMedilinkStage.CONFIRM]: {
      confirmDetails: `📅 *Confirma tu cita:*
      
🏥 Sucursal: {branch}
👨‍⚕️ Profesional: {professional}
📅 Fecha: {date}
🕐 Hora: {time}
⏱️ Duración: {duration} minutos

¿Confirmas esta cita? (Responde SI o NO)`,
      appointmentCreated: `✅ *¡Cita agendada exitosamente!*
      
Tu código de confirmación es: {confirmationCode}

Te enviaremos un recordatorio 24 horas antes de tu cita.`,
      appointmentCancelled: 'La cita ha sido cancelada. ¿Deseas agendar otra cita?',
    },
    [HealthcareMedilinkStage.DONE]: {
      thankYou: '¡Gracias por usar nuestro servicio de agendamiento! Si necesitas reagendar o cancelar, no dudes en contactarnos.',
      reminder: 'Recuerda llegar 15 minutos antes de tu cita.',
    },
  };

  // Validaciones para cada etapa
  readonly stageValidations = {
    [HealthcareMedilinkStage.INTAKE]: {
      validateName: (name: string) => {
        return name && name.length >= 2;
      },
      validateRut: (rut: string) => {
        // Validación básica de RUT chileno
        const cleanRut = rut.replace(/[.-]/g, '');
        return /^\d{7,8}[0-9Kk]$/.test(cleanRut);
      },
      validateEmail: (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
    },
    [HealthcareMedilinkStage.NEEDS]: {
      validateBranch: (branchId: string, availableBranches: string[]) => {
        return availableBranches.includes(branchId);
      },
    },
    [HealthcareMedilinkStage.SELECT_PROFESSIONAL]: {
      validateProfessional: (professionalId: string, availableProfessionals: string[]) => {
        return availableProfessionals.includes(professionalId);
      },
    },
    [HealthcareMedilinkStage.SELECT_SLOT]: {
      validateSlot: (slotId: string, availableSlots: any[]) => {
        return availableSlots.some(slot => slot.id === slotId);
      },
    },
  };

  // Timeouts para cada etapa (en minutos)
  readonly stageTimeouts = {
    [HealthcareMedilinkStage.INTAKE]: 10,
    [HealthcareMedilinkStage.NEEDS]: 5,
    [HealthcareMedilinkStage.SELECT_PROFESSIONAL]: 5,
    [HealthcareMedilinkStage.SELECT_SLOT]: 5,
    [HealthcareMedilinkStage.ATTENTION_RESOLVE]: 2,
    [HealthcareMedilinkStage.CONFIRM]: 3,
    [HealthcareMedilinkStage.DONE]: 1,
  };

  // Métricas a trackear
  readonly metrics = {
    startTime: 'funnel_start_time',
    completionTime: 'funnel_completion_time',
    abandonmentStage: 'funnel_abandonment_stage',
    retryCount: 'funnel_retry_count',
    humanInterventionRequired: 'funnel_human_intervention',
    appointmentCreated: 'appointment_created',
    appointmentCancelled: 'appointment_cancelled',
  };

  canTransition(
    from: HealthcareMedilinkStage,
    to: HealthcareMedilinkStage,
    context: HealthcareMedilinkContext,
  ): boolean {
    const transition = this.transitions.find(t => t.from === from && t.to === to);
    
    if (!transition) {
      return false;
    }

    if (transition.condition) {
      return transition.condition(context);
    }

    return true;
  }

  getNextStage(
    currentStage: HealthcareMedilinkStage,
    context: HealthcareMedilinkContext,
  ): HealthcareMedilinkStage | null {
    // Encontrar todas las transiciones posibles desde la etapa actual
    const possibleTransitions = this.transitions.filter(t => t.from === currentStage);

    // Evaluar condiciones y retornar la primera transición válida
    for (const transition of possibleTransitions) {
      if (!transition.condition || transition.condition(context)) {
        return transition.to;
      }
    }

    return null;
  }

  isTerminalStage(stage: HealthcareMedilinkStage): boolean {
    return stage === HealthcareMedilinkStage.DONE;
  }

  requiresHumanIntervention(context: HealthcareMedilinkContext): boolean {
    return !!(
      context.needsHumanIntervention ||
      context.retryCount > 3 ||
      (context.currentStage === HealthcareMedilinkStage.ATTENTION_RESOLVE && 
       !context.selections?.attentionId)
    );
  }
}
