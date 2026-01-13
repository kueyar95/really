/**
 * Funnel de Agendamiento Médico (healthcare_medilink)
 * 
 * Este módulo contiene toda la implementación del funnel especializado
 * para agendamiento de citas médicas con integración Medilink.
 */

// Definición del funnel
export * from './definition';

// Runners (lógica de ejecución)
export * from './runners';

// Ejemplos de uso
export * from './example-usage';

// Re-exportar tipos principales para conveniencia
export {
  HealthcareMedilinkStage,
  HealthcareMedilinkContext,
  HealthcareMedilinkDefinition,
  StageTransition,
} from './definition';

export {
  HealthcareMedilinkRunners,
} from './runners';

// Constantes útiles
export const HEALTHCARE_MEDILINK_FUNNEL_NAME = 'healthcare_medilink';
export const HEALTHCARE_MEDILINK_FUNNEL_DESCRIPTION = 'Funnel de agendamiento de citas médicas con integración Medilink';

// Configuración por defecto
export const DEFAULT_HEALTHCARE_MEDILINK_CONFIG = {
  name: HEALTHCARE_MEDILINK_FUNNEL_NAME,
  description: HEALTHCARE_MEDILINK_FUNNEL_DESCRIPTION,
  stages: [
    'INTAKE',
    'NEEDS', 
    'SELECT_PROFESSIONAL',
    'SELECT_SLOT',
    'ATTENTION_RESOLVE',
    'CONFIRM',
    'DONE',
  ],
  initialStage: 'INTAKE',
  terminalStage: 'DONE',
  timeoutMinutes: {
    INTAKE: 10,
    NEEDS: 5,
    SELECT_PROFESSIONAL: 5,
    SELECT_SLOT: 5,
    ATTENTION_RESOLVE: 2,
    CONFIRM: 3,
    DONE: 1,
  },
  requiresMedilinkIntegration: true,
  supportsPatientRegistration: true,
  supportsAppointmentRescheduling: true,
  supportsAppointmentCancellation: true,
  maxRetries: 3,
  humanInterventionThreshold: 3,
};
