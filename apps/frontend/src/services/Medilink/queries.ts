import api from '../api';

export interface MedilinkConnectionDto {
  accessToken: string;
  baseUrl?: string;
  rateLimitPerMin?: number;
}

export interface MedilinkMetadata {
  status: 'connected' | 'invalid_token' | 'revoked';
  baseUrl: string;
  rateLimitPerMin: number;
  lastSuccessAt: string;
  lastErrorAt?: string;
  lastError?: string;
  metadata?: {
    branches?: any[];
    appointmentStates?: any[];
  };
}

export interface MedilinkBranch {
  id: number;
  nombre: string;
  direccion?: string;
}

export interface MedilinkProfessional {
  id: number;
  nombre: string;
  apellidos: string;
  especialidad?: string;
}

export interface MedilinkChair {
  id: number;
  nombre: string;
  id_sucursal: number;
}

export interface MedilinkAppointmentState {
  id: number;
  nombre: string;
}

export const MedilinkService = {
  /**
   * Conectar integración con Medilink
   */
  async connect(data: MedilinkConnectionDto) {
    const response = await api.post('/integrations/medilink/connect', data);
    return response.data;
  },

  /**
   * Validar conexión existente
   */
  async validate() {
    const response = await api.post('/integrations/medilink/validate');
    return response.data;
  },

  /**
   * Desconectar integración
   */
  async disconnect(reason?: string) {
    const response = await api.post('/integrations/medilink/disconnect', { reason });
    return response.data;
  },

  /**
   * Obtener metadata de la integración
   */
  async getMetadata(): Promise<MedilinkMetadata> {
    const response = await api.get('/integrations/medilink/metadata');
    return response.data;
  },

  /**
   * Listar sucursales disponibles
   */
  async listBranches(): Promise<MedilinkBranch[]> {
    const response = await api.get('/integrations/medilink/branches');
    return response.data;
  },

  /**
   * Listar profesionales disponibles
   */
  async listProfessionals(branchId?: string): Promise<MedilinkProfessional[]> {
    const params = branchId ? { branchId } : {};
    const response = await api.get('/integrations/medilink/professionals', { params });
    return response.data;
  },

  /**
   * Obtener sillones de una sucursal
   */
  async getChairs(branchId: string): Promise<MedilinkChair[]> {
    const response = await api.get(`/integrations/medilink/branches/${branchId}/chairs`);
    return response.data;
  },

  /**
   * Listar estados de cita
   */
  async listAppointmentStates(): Promise<MedilinkAppointmentState[]> {
    const response = await api.get('/integrations/medilink/appointment-states');
    return response.data;
  },

  /**
   * Buscar pacientes
   */
  async searchPatients(query: string) {
    const response = await api.get('/integrations/medilink/patients/search', {
      params: { q: query },
    });
    return response.data;
  },

  /**
   * Obtener disponibilidad
   */
  async getAvailability(data: {
    branchId: string;
    professionalId: string;
    fromDate: string;
    toDate?: string;
  }) {
    const response = await api.post('/integrations/medilink/availability', data);
    return response.data;
  },

  /**
   * Agendar cita
   */
  async scheduleAppointment(data: {
    phoneE164: string;
    patient: {
      name: string;
      lastName: string;
      rut?: string;
      email?: string;
    };
    branchId: string;
    professionalId: string;
    chairId: string;
    dateYmd: string;
    time: string;
    durationMin?: number;
    comment?: string;
  }) {
    const response = await api.post('/integrations/medilink/schedule', data);
    return response.data;
  },

  /**
   * Reagendar cita
   */
  async rescheduleAppointment(data: {
    appointmentId: string;
    newDateYmd: string;
    newTime: string;
    branchId?: string;
    professionalId?: string;
    chairId?: string;
    comment?: string;
  }) {
    const response = await api.put('/integrations/medilink/reschedule', data);
    return response.data;
  },

  /**
   * Cancelar cita
   */
  async cancelAppointment(data: {
    appointmentId: string;
    reason?: string;
  }) {
    const response = await api.post('/integrations/medilink/cancel', data);
    return response.data;
  },
};

