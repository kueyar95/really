import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  MedilinkIntegration,
  MedilinkIntegrationStatus
} from './entities/medilink-integration.entity';
import {
  MedilinkMapping,
  MedilinkMappingKind
} from './entities/medilink-mapping.entity';
import { PatientLink } from './entities/patient-link.entity';
import { CryptoService } from './utils/crypto.service';
import { MedilinkClient, MedilinkClientConfig } from './medilink.client';
import { ConnectMedilinkDto, ValidateMedilinkDto } from './dto/connect-medilink.dto';
import { GetAvailabilityDto, AvailabilitySlot } from './dto/availability.dto';
import { ScheduleAppointmentDto, AppointmentCreatedDto } from './dto/schedule.dto';
import { RescheduleAppointmentDto, RescheduleResponseDto } from './dto/reschedule.dto';
import { CancelAppointmentDto, CancelResponseDto } from './dto/cancel.dto';
import { WhatsAppTemplatesService } from './services/whatsapp-templates.service';
import { E164Service } from './utils/e164.service';

// Interfaces para tipos de Medilink
export interface MedilinkBranch {
  id: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  comuna?: string;
  ciudad?: string;
}

export interface MedilinkProfessional {
  id: string;
  nombre: string;
  apellidos: string;
  especialidad?: string;
  email?: string;
  telefono?: string;
  agenda_online?: boolean;
  intervalo?: number;
  habilitado?: boolean | number;
}

export interface MedilinkChair {
  id: string;
  nombre: string;
  id_sucursal: string;
  activo: boolean;
}

export interface MedilinkAppointmentState {
  id: string;
  nombre: string;
  color?: string;
  orden?: number;
}

export interface MedilinkPatient {
  id: string;
  nombres: string;
  apellidos: string;
  rut?: string;
  email?: string;
  telefono?: string;
  celular?: string;
  fecha_nacimiento?: string;
  direccion?: string;
  comuna?: string;
  ciudad?: string;
}

export interface MedilinkAttention {
  id: string;
  id_paciente: string;
  id_profesional: string;
  fecha: string;
  estado?: string;
  diagnostico?: string;
  observaciones?: string;
}

export interface MedilinkAppointment {
  id: string;
  id_paciente: string;
  id_profesional: string;
  id_sucursal: string;
  id_sillon: string;
  id_atencion?: string;
  id_estado: number;
  fecha: string;
  hora_inicio: string;
  hora_termino?: string;
  duracion: number;
  comentario?: string;
}

export interface MedilinkAgenda {
  fecha: string;
  horarios?: Array<{
    hora: string;
    disponible: boolean;
    id_sillon?: number;
    id_profesional?: number;
  }>;
  bloques?: Array<{
    hora_inicio: string;
    hora_termino: string;
    disponible: boolean;
    id_sillon?: number;
  }>;
}

// Formato real de respuesta de la API Medilink para agendas
export interface MedilinkAgendasResponse {
  fechas: {
    [fecha: string]: {
      horas?: {
        [hora: string]: {
          sillones: {
            [silloId: string]: boolean;
          };
        };
      };
    } | [];
  };
}

@Injectable()
export class MedilinkService {
  private readonly logger = new Logger('MedilinkService');

  constructor(
    @InjectRepository(MedilinkIntegration)
    private readonly integrationRepo: Repository<MedilinkIntegration>,
    @InjectRepository(MedilinkMapping)
    private readonly mappingRepo: Repository<MedilinkMapping>,
    @InjectRepository(PatientLink)
    private readonly patientLinkRepo: Repository<PatientLink>,
    private readonly configService: ConfigService,
    private readonly cryptoService: CryptoService,
    private readonly medilinkClient: MedilinkClient,
    private readonly whatsappTemplates: WhatsAppTemplatesService,
    private readonly e164Service: E164Service,
  ) { }

  // === MÉTODOS DE CONEXIÓN ===

  async connect(companyId: string, dto: ConnectMedilinkDto): Promise<any> {
    const { accessToken, baseUrl, rateLimitPerMin } = dto;

    const finalBaseUrl = baseUrl || this.configService.get('medilink.defaultBaseUrl');
    const finalRateLimit = rateLimitPerMin || this.configService.get('medilink.rateLimitPerMin');

    const tokenCiphertext = await this.cryptoService.encrypt(accessToken);

    // Validar token con smoke test
    const config: MedilinkClientConfig = {
      baseUrl: finalBaseUrl,
      accessToken,
      rateLimitPerMin: finalRateLimit,
    };

    try {
      const [branches, states] = await Promise.all([
        this.medilinkClient.get(companyId, config, '/sucursales'),
        this.medilinkClient.get(companyId, config, '/citas/estados'),
      ]);

      // Guardar o actualizar integración
      const existingIntegration = await this.integrationRepo.findOne({
        where: { companyId },
      });

      const metadata = {
        branchesCount: Array.isArray(branches.data) ? branches.data.length : 0,
        appointmentStatesCount: Array.isArray(states.data) ? states.data.length : 0,
        lastValidated: new Date(),
      };

      if (existingIntegration) {
        await this.integrationRepo.update(existingIntegration.id, {
          baseUrl: finalBaseUrl,
          tokenCiphertext,
          status: MedilinkIntegrationStatus.CONNECTED,
          rateLimitPerMin: finalRateLimit,
          lastSuccessAt: new Date(),
          lastError: null,
          metadata: metadata as any,
        });
      } else {
        await this.integrationRepo.save({
          companyId,
          baseUrl: finalBaseUrl,
          tokenCiphertext,
          status: MedilinkIntegrationStatus.CONNECTED,
          rateLimitPerMin: finalRateLimit,
          lastSuccessAt: new Date(),
          metadata: metadata as any,
        });
      }

      //this.logger.log(`Integración Medilink conectada para empresa ${companyId}`);

      return {
        success: true,
        message: 'Integración conectada exitosamente',
        metadata,
      };
    } catch (error) {
      this.logger.error(`Error conectando Medilink: ${error.message}`);

      if (error.response?.status === 401) {
        await this.markAsInvalidToken(companyId);
        throw new BadRequestException('Token de acceso inválido');
      }

      throw error;
    }
  }

  async validate(companyId: string): Promise<any> {
    const config = await this.getConfig(companyId);

    try {
      const response = await this.medilinkClient.get(companyId, config, '/sucursales');

      await this.integrationRepo.update(
        { companyId },
        {
          status: MedilinkIntegrationStatus.CONNECTED,
          lastSuccessAt: new Date(),
          lastError: null,
        }
      );

      return {
        valid: true,
        message: 'Conexión válida',
      };
    } catch (error) {
      if (error.response?.status === 401) {
        await this.markAsInvalidToken(companyId);
        throw new BadRequestException('Token inválido');
      }

      throw error;
    }
  }

  async disconnect(companyId: string): Promise<void> {
    const integration = await this.integrationRepo.findOne({
      where: { companyId },
    });

    if (!integration) {
      throw new NotFoundException('No hay integración configurada');
    }

    await this.integrationRepo.update(integration.id, {
      status: MedilinkIntegrationStatus.REVOKED,
      syncEnabled: false,
    });

    //this.logger.log(`Integración Medilink desconectada para empresa ${companyId}`);
  }

  async getIntegrationMetadata(companyId: string): Promise<any> {
    const integration = await this.integrationRepo.findOne({
      where: { companyId },
    });

    if (!integration) {
      throw new NotFoundException('No hay integración configurada');
    }

    return {
      status: integration.status,
      baseUrl: integration.baseUrl,
      rateLimitPerMin: integration.rateLimitPerMin,
      lastSuccessAt: integration.lastSuccessAt,
      lastErrorAt: integration.lastErrorAt,
      lastError: integration.lastError,
      metadata: integration.metadata,
    };
  }

  // === MÉTODOS DE DATOS ===

  async listBranches(companyId: string): Promise<MedilinkBranch[]> {
    const config = await this.getConfig(companyId);

    const response = await this.medilinkClient.get<MedilinkBranch[]>(
      companyId,
      config,
      '/sucursales'
    );

    return response.data || [];
  }

  async listProfessionals(companyId: string, branchId?: string): Promise<MedilinkProfessional[]> {
    const config = await this.getConfig(companyId);

    // Medilink NO soporta el endpoint /sucursales/{id}/profesionales
    // Siempre usar /profesionales y filtrar manualmente si es necesario
    const endpoint = '/profesionales';

    const response = await this.medilinkClient.get<MedilinkProfessional[]>(
      companyId,
      config,
      endpoint
    );

    const professionals = response.data || [];

    // Filtrar profesionales deshabilitados
    const activeProfessionals = professionals.filter(prof => {
      const isDisabled = prof.habilitado === false ||
        prof.habilitado === 0 ||
        (prof as any).estado === 'Deshabilitado' ||
        (prof as any).estado === 'Inactivo';
      return !isDisabled;
    });

    // Si se especificó branchId, filtrar profesionales por sucursal
    if (branchId) {
      return activeProfessionals.filter(prof => {
        const profBranchId = (prof as any)?.id_sucursal || (prof as any)?.sucursal_id;
        // Si el profesional no tiene sucursal asignada, incluirlo de todas formas
        return !profBranchId || profBranchId?.toString() === branchId.toString();
      });
    }

    return activeProfessionals;
  }

  async getChairs(companyId: string, branchId: string): Promise<MedilinkChair[]> {
    const config = await this.getConfig(companyId);

    const response = await this.medilinkClient.get<MedilinkChair[]>(
      companyId,
      config,
      `/sucursales/${branchId}/sillones`
    );

    return response.data || [];
  }

  async listAppointmentStates(companyId: string): Promise<MedilinkAppointmentState[]> {
    const config = await this.getConfig(companyId);

    const response = await this.medilinkClient.get<MedilinkAppointmentState[]>(
      companyId,
      config,
      '/citas/estados'
    );

    return response.data || [];
  }

  async listServices(companyId: string): Promise<{ id: string; name: string }[]> {
    const config = await this.getConfig(companyId);

    const response = await this.medilinkClient.get<any[]>(
      companyId,
      config,
      '/prestaciones'
    );

    const services = response.data || [];

    return services.map(service => ({
      id: service.id.toString(),
      name: service.nombre,
    }));
  }

  // === MÉTODO CRUCIAL: OBTENER DISPONIBILIDAD (AGENDA) ===

  async getAvailability(companyId: string, dto: GetAvailabilityDto): Promise<AvailabilitySlot[]> {
    const config = await this.getConfig(companyId);
    const { branchId, professionalId, fromDate, toDate, duration = 30 } = dto;

    // Construir endpoint correcto para obtener agenda
    const endpoint = `/sucursales/${branchId}/profesionales/${professionalId}/agendas`;

    // Determinar rango válido (hoy hasta 14 días hacia adelante)
    const normalizeDate = (date: Date) => {
      const normalized = new Date(date);
      normalized.setHours(0, 0, 0, 0);
      return normalized;
    };

    const today = normalizeDate(new Date());

    // IMPORTANTE: Para evitar problemas de zona horaria, agregar T12:00:00 para que se interprete como local
    const requestedStart = normalizeDate(new Date(fromDate + 'T12:00:00'));
    const requestedEnd = toDate ? normalizeDate(new Date(toDate + 'T12:00:00')) : requestedStart;

    this.logger.log(`📆 Fechas recibidas: fromDate=${fromDate}, toDate=${toDate || 'mismo día'}`);
    this.logger.log(`📆 Fechas parseadas: requestedStart=${requestedStart.toISOString()}, requestedEnd=${requestedEnd.toISOString()}`);

    const maxAllowed = normalizeDate(new Date(today));
    maxAllowed.setDate(today.getDate() + 13);

    const effectiveStart = requestedStart < today ? today : requestedStart;
    let effectiveEnd = requestedEnd > maxAllowed ? maxAllowed : requestedEnd;
    if (effectiveEnd < effectiveStart) {
      effectiveEnd = effectiveStart;
    }

    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = `${date.getMonth() + 1}`.padStart(2, '0');
      const day = `${date.getDate()}`.padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const finalFrom = formatDate(effectiveStart);
    const finalTo = formatDate(effectiveEnd);

    this.logger.log(`📆 Fechas finales para API:`);
    this.logger.log(`   effectiveStart: ${effectiveStart.toISOString()} → finalFrom: ${finalFrom}`);
    this.logger.log(`   effectiveEnd: ${effectiveEnd.toISOString()} → finalTo: ${finalTo}`);

    // Parámetros q esperados por Medilink
    const queryFilters: any = {
      fecha_inicio: { eq: finalFrom },
      fecha_fin: { eq: finalTo },
      mostrar_detalles: { eq: 0 },
    };

    if (dto.chairId) {
      queryFilters.id_sillon = { eq: dto.chairId };
    }

    if (duration) {
      queryFilters.duracion = { eq: duration };
    }

    const params = {
      q: JSON.stringify(queryFilters),
    };

    this.logger.log(`📡 === LLAMADA API MEDILINK ===`);
    this.logger.log(`➡️ GET ${endpoint}`);
    this.logger.log(`📋 Params: ${JSON.stringify(params, null, 2)}`);

    try {
      const response = await this.medilinkClient.get<MedilinkAgendasResponse>(
        companyId,
        config,
        endpoint,
        params
      );

      this.logger.log(`📥 Respuesta recibida de Medilink API: ${JSON.stringify(response.data, null, 2)}`);

      const slots: AvailabilitySlot[] = [];

      // Obtener información adicional
      const [branches, professionals] = await Promise.all([
        this.listBranches(companyId),
        this.listProfessionals(companyId, branchId),
      ]);

      const branch = branches.find(b => b.id === branchId);
      const professional = professionals.find(p => p.id === professionalId);

      this.logger.log(`🔍 Profesional: ${professional ? `${professional.nombre} ${professional.apellidos}` : 'NO ENCONTRADO'}`);
      this.logger.log(`🔍 Sucursal: ${branch ? branch.nombre : 'NO ENCONTRADA'}`);

      // La respuesta de Medilink ya viene envuelta por el cliente HTTP en response.data
      // Formato: response.data = { fechas: { "2025-11-03": { horas: { "08:30": { sillones: { "1": true } } } } } }
      const fechas = response.data?.fechas;

      if (!fechas) {
        this.logger.warn('⚠️ Respuesta de API no contiene fechas');
        this.logger.debug(`response.data completo: ${JSON.stringify(response.data, null, 2)}`);
        return [];
      }

      this.logger.log(`📅 Fechas en respuesta de API: ${Object.keys(fechas).length}`);
      this.logger.log(`📅 Fechas: ${Object.keys(fechas).join(', ')}`);

      // Iterar sobre cada fecha
      for (const [fecha, agendaDelDia] of Object.entries(fechas)) {
        // Si la agenda del día es un array vacío, skip
        if (Array.isArray(agendaDelDia) && agendaDelDia.length === 0) {
          this.logger.log(`⏭️ Fecha ${fecha}: sin horarios (array vacío)`);
          continue;
        }

        // Si la agenda tiene horas
        if (agendaDelDia && typeof agendaDelDia === 'object' && 'horas' in agendaDelDia && agendaDelDia.horas) {
          const horas = agendaDelDia.horas;
          const horasDisponibles = [];

          // Iterar sobre cada hora
          for (const [hora, horarioInfo] of Object.entries(horas)) {
            if (!horarioInfo || !horarioInfo.sillones) {
              continue;
            }

            // Iterar sobre cada sillón disponible
            for (const [sillonId, disponible] of Object.entries(horarioInfo.sillones)) {
              if (disponible === true && sillonId !== 'Sobrecupo') {
                // Validar que la hora no haya pasado si es el día actual
                const now = new Date();
                const currentHour = now.getHours();
                const currentMinute = now.getMinutes();

                // Parsear hora del slot (HH:MM)
                const [slotHour, slotMinute] = hora.split(':').map(Number);

                // Si es hoy, verificar que la hora sea futura
                const isToday = fecha === now.toISOString().split('T')[0];
                if (isToday) {
                  if (slotHour < currentHour || (slotHour === currentHour && slotMinute <= currentMinute)) {
                    // Hora pasada, saltar
                    continue;
                  }
                }

                horasDisponibles.push(`${hora}(sillón ${sillonId})`);
                slots.push({
                  date: fecha,
                  time: hora,
                  duration: duration,
                  professionalId: professionalId,
                  professionalName: professional ? `${professional.nombre} ${professional.apellidos}` : '',
                  branchId: branchId,
                  branchName: branch?.nombre || '',
                  chairId: sillonId,
                  chairName: `Sillón ${sillonId}`,
                  isVideoconsulta: false,
                });
              }
            }
          }

          if (horasDisponibles.length > 0) {
            this.logger.log(`📅 ${fecha}: ${horasDisponibles.length} slots disponibles: ${horasDisponibles.slice(0, 5).join(', ')}${horasDisponibles.length > 5 ? '...' : ''}`);
          } else {
            this.logger.log(`⏭️ ${fecha}: 0 slots disponibles (todos ocupados o solo sobrecupo)`);
          }
        }
      }

      this.logger.log(`✅ TOTAL slots disponibles encontrados: ${slots.length}`);
      if (slots.length > 0) {
        this.logger.log(`📋 Primeros 10 slots:`);
        slots.slice(0, 10).forEach((slot, idx) => {
          this.logger.log(`   ${idx + 1}. ${slot.date} ${slot.time} (sillón ${slot.chairId})`);
        });
      }

      return slots;
    } catch (error) {
      const status = error?.response?.status;
      const errorData = error?.response?.data;
      const errorDetails = errorData ? JSON.stringify(errorData) : undefined;

      this.logger.error(`Error obteniendo disponibilidad: ${error.message}${errorDetails ? ` - Detalles: ${errorDetails}` : ''}`);

      // Si es 404, y YA validamos que el profesional existe (en el Tool),
      // entonces el 404 confirma que NO hay relación Sucursal-Profesional activa para agendas.
      if (status === 404) {
        this.logger.warn(
          `Medilink 404 en Agendas: El endpoint no existe. Probablemente el profesional ${professionalId} no atiende en la sucursal ${branchId}.`
        );
        // Lanzamos el error para que el Tool lo maneje con un mensaje más específico
        // El Tool ya validó que el profesional existe, así que este 404 es específico de la relación sucursal-profesional
        throw error;
      }

      // Si es 400, puede ser parámetros inválidos (fechas al revés, etc)
      if (status === 400) {
        this.logger.error(`Medilink 400 Bad Request: ${errorDetails || 'Parámetros inválidos'}`);
        // Retornamos array vacío para 400 (parámetros inválidos) ya que es un error de configuración
        return [];
      }

      throw error;
    }
  }

  // === MÉTODOS DE CITAS ===

  async createAppointment(companyId: string, dto: ScheduleAppointmentDto): Promise<AppointmentCreatedDto> {
    this.logger.log('📅 === INICIO CREACIÓN DE CITA ===');
    this.logger.log(`📋 DTO recibido: ${JSON.stringify(dto, null, 2)}`);

    const config = await this.getConfig(companyId);
    const normalizedPhone = this.e164Service.normalize(dto.phoneE164);

    this.logger.log(`📞 Teléfono normalizado: ${normalizedPhone}`);

    // Buscar o crear paciente
    let patientId: string;
    let patientLink = await this.patientLinkRepo.findOne({
      where: { companyId, phoneE164: normalizedPhone },
    });

    if (!patientLink) {
      this.logger.log('👤 Paciente no existe, creando nuevo...');

      // Convertir fecha de nacimiento de DD/MM/YYYY a YYYY-MM-DD si es necesario
      let birthDateFormatted = dto.patient.birthDate;
      if (dto.patient.birthDate && dto.patient.birthDate.includes('/')) {
        const [day, month, year] = dto.patient.birthDate.split('/');
        birthDateFormatted = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        this.logger.log(`📅 Fecha de nacimiento convertida: ${dto.patient.birthDate} → ${birthDateFormatted}`);
      }

      // Crear paciente en Medilink
      const patientData = {
        nombre: dto.patient.name,
        apellidos: dto.patient.lastName,
        email: dto.patient.email,
        telefono: normalizedPhone.replace('+56', ''),
        rut: dto.patient.rut,
        fecha_nacimiento: birthDateFormatted,
      };

      this.logger.log(`📤 POST /pacientes con datos: ${JSON.stringify(patientData, null, 2)}`);

      try {
        const response = await this.medilinkClient.post(
          companyId,
          config,
          '/pacientes',
          patientData
        );

        this.logger.log(`✅ Respuesta de creación de paciente: ${JSON.stringify(response.data, null, 2)}`);

        patientId = response.data.id.toString();
        this.logger.log(`✅ Paciente creado con ID: ${patientId}`);
      } catch (error) {
        this.logger.error(`❌ Error creando paciente en Medilink:`);
        this.logger.error(`   Status: ${error?.response?.status}`);
        this.logger.error(`   Mensaje: ${error.message}`);
        this.logger.error(`   Detalles API: ${JSON.stringify(error?.response?.data, null, 2)}`);
        throw new BadRequestException(`Error creando paciente: ${error?.response?.data?.message || error.message}`);
      }

      // Guardar link
      patientLink = await this.patientLinkRepo.save({
        companyId,
        phoneE164: normalizedPhone,
        medilinkPatientId: patientId,
        patientData,
        optInWhatsapp: true,
        optInDate: new Date(),
      });
    } else {
      patientId = patientLink.medilinkPatientId;
      this.logger.log(`👤 Paciente existente con ID: ${patientId}`);
    }

    // Obtener o resolver atención
    let attentionId = dto.attentionId;

    if (!attentionId) {
      this.logger.log('🔍 Buscando atención abierta del paciente...');
      // Buscar atención abierta del paciente
      const attentions = await this.medilinkClient.get(
        companyId,
        config,
        `/pacientes/${patientId}/atenciones`
      );

      this.logger.log(`📋 Atenciones encontradas: ${attentions.data?.length || 0}`);

      const openAttention = attentions.data?.find((att: any) =>
        att.estado === 'abierto' && att.tipo !== 'Licencia' && att.tipo !== 'Interconsulta'
      );

      if (!openAttention) {
        this.logger.log('📝 No hay atención abierta, creando nueva...');
        // Crear nueva atención
        const attentionData = {
          id_paciente: patientId,
          id_profesional: dto.professionalId,
          fecha: dto.dateYmd,
          observaciones: 'Atención creada automáticamente para agendamiento',
        };

        this.logger.log(`📤 POST /atenciones con datos: ${JSON.stringify(attentionData, null, 2)}`);

        try {
          const newAttention = await this.medilinkClient.post(
            companyId,
            config,
            '/atenciones',
            attentionData
          );

          attentionId = newAttention.data.id.toString();
          this.logger.log(`✅ Atención creada con ID: ${attentionId}`);
        } catch (error) {
          const status = error?.response?.status;

          if (status === 405 || status === 404) {
            this.logger.warn(`⚠️ El endpoint /atenciones no está soportado (${status}). Creando cita sin id_atencion...`);
            attentionId = null;
          } else {
            this.logger.error(`❌ Error creando atención:`);
            this.logger.error(`   Status: ${status}`);
            this.logger.error(`   Detalles: ${JSON.stringify(error?.response?.data, null, 2)}`);
            throw error;
          }
        }
      } else {
        attentionId = openAttention.id.toString();
        this.logger.log(`✅ Atención abierta encontrada con ID: ${attentionId}`);
      }
    } else {
      this.logger.log(`📋 Usando attentionId proporcionado: ${attentionId}`);
    }

    // Obtener información del profesional para usar su intervalo correcto
    this.logger.log('🔍 Obteniendo información del profesional para validar duración...');
    const professionalsForDuration = await this.listProfessionals(companyId);

    // Comparar tanto como string como número porque la API puede devolver cualquiera de los dos
    const professionalForDuration = professionalsForDuration.find(p =>
      p.id === dto.professionalId || p.id.toString() === dto.professionalId.toString()
    );

    this.logger.log(`🔍 Profesional encontrado: ${professionalForDuration ? 'SÍ' : 'NO'}`);
    this.logger.log(`   Total profesionales: ${professionalsForDuration.length}`);
    this.logger.log(`   DTO professionalId: ${dto.professionalId} (tipo: ${typeof dto.professionalId})`);

    if (professionalsForDuration.length > 0) {
      this.logger.log(`   Ejemplo ID del primer profesional: ${professionalsForDuration[0].id} (tipo: ${typeof professionalsForDuration[0].id})`);
    }

    if (professionalForDuration) {
      this.logger.log(`   ID: ${professionalForDuration.id}`);
      this.logger.log(`   Nombre: ${professionalForDuration.nombre} ${professionalForDuration.apellidos}`);
      this.logger.log(`   Intervalo: ${professionalForDuration.intervalo || 'NO DEFINIDO'}`);
    }
    this.logger.log(`   DTO durationMin: ${dto.durationMin}`);

    // Usar el intervalo del profesional si existe, sino usar el duration del DTO
    const correctDuration = professionalForDuration?.intervalo || dto.durationMin || 30;

    this.logger.log(`⏱️ Duración calculada: ${correctDuration} min`);

    if (professionalForDuration?.intervalo && professionalForDuration.intervalo !== dto.durationMin) {
      this.logger.log(`⏱️ Ajustando duración: ${dto.durationMin || 30} min → ${correctDuration} min (intervalo del profesional)`);
    }

    // Crear cita
    const appointmentData: any = {
      id_paciente: parseInt(patientId),
      id_profesional: parseInt(dto.professionalId),
      id_sucursal: parseInt(dto.branchId),
      id_sillon: parseInt(dto.chairId),
      id_estado: dto.appointmentStateId || 7, // 7 = No confirmado
      fecha: dto.dateYmd,
      hora_inicio: dto.time,
      duracion: correctDuration,
      comentario: dto.comment || 'Cita agendada vía WhatsApp',
      videoconsulta: dto.videoconsulta || false,
    };

    // Solo incluir id_atencion si existe
    if (attentionId) {
      appointmentData.id_atencion = parseInt(attentionId);
      this.logger.log(`📋 Incluyendo id_atencion: ${attentionId}`);
    } else {
      this.logger.log(`⚠️ Creando cita SIN id_atencion (no disponible)`);
    }

    const endpoint = '/citas';
    const fullUrl = `${config.baseUrl}${endpoint}`;

    this.logger.log(`📤 POST ${fullUrl}`);
    this.logger.log(`📤 Body: ${JSON.stringify(appointmentData, null, 2)}`);

    let appointmentResponse;
    try {
      appointmentResponse = await this.medilinkClient.post<MedilinkAppointment>(
        companyId,
        config,
        endpoint,
        appointmentData
      );

      this.logger.log(`✅ Respuesta de creación de cita (Status: OK)`);
      this.logger.log(`✅ Data: ${JSON.stringify(appointmentResponse.data, null, 2)}`);
    } catch (error) {
      this.logger.error(`❌ Error creando cita en Medilink:`);
      this.logger.error(`   Status: ${error?.response?.status}`);
      this.logger.error(`   Mensaje: ${error.message}`);
      this.logger.error(`   Detalles API: ${JSON.stringify(error?.response?.data, null, 2)}`);
      throw new BadRequestException(`Error creando cita: ${error?.response?.data?.error?.message || error?.response?.data?.message || error.message}`);
    }

    const appointment = appointmentResponse.data;

    // Obtener información adicional
    const [branches, professionals, states] = await Promise.all([
      this.listBranches(companyId),
      this.listProfessionals(companyId),
      this.listAppointmentStates(companyId),
    ]);

    const branch = branches.find(b => b.id === dto.branchId);
    const professional = professionals.find(p => p.id === dto.professionalId);
    const state = states.find(s => s.id === appointment.id_estado.toString());

    // Enviar notificación WhatsApp
    let whatsappSent = false;
    try {
      this.logger.log('📱 Enviando notificación WhatsApp...');
      await this.whatsappTemplates.sendTemplateAppointmentCreated(companyId, {
        toE164: normalizedPhone,
        patientName: `${dto.patient.name} ${dto.patient.lastName}`,
        professionalName: professional ? `${professional.nombre} ${professional.apellidos}` : 'Profesional',
        branchName: branch?.nombre || 'Sucursal',
        date: dto.dateYmd,
        time: dto.time,
        confirmationCode: appointment.id,
      });
      whatsappSent = true;
      this.logger.log('✅ Notificación WhatsApp enviada');
    } catch (error) {
      this.logger.error(`❌ Error enviando WhatsApp: ${error.message}`);
    }

    const result = {
      appointmentId: appointment.id,
      patientId: patientId,
      professionalName: professional ? `${professional.nombre} ${professional.apellidos}` : '',
      branchName: branch?.nombre || '',
      date: dto.dateYmd,
      time: dto.time,
      duration: dto.durationMin || 30,
      state: state?.nombre || 'No confirmado',
      confirmationCode: appointment.id,
      whatsappMessageSent: whatsappSent,
    };

    this.logger.log('📅 === FIN CREACIÓN DE CITA ===');
    this.logger.log(`✅ Resultado: ${JSON.stringify(result, null, 2)}`);

    return result;
  }

  async rescheduleAppointment(companyId: string, dto: RescheduleAppointmentDto): Promise<RescheduleResponseDto> {
    this.logger.log('🔄 === INICIO REAGENDACIÓN DE CITA ===');
    this.logger.log(`📋 Cita a reagendar: ${dto.appointmentId}`);
    this.logger.log(`📅 Nueva fecha: ${dto.newDateYmd} ${dto.newTime}`);

    const config = await this.getConfig(companyId);

    // 1. Obtener cita actual
    this.logger.log('🔍 Obteniendo información de la cita actual...');
    const currentAppointment = await this.medilinkClient.get<MedilinkAppointment>(
      companyId,
      config,
      `/citas/${dto.appointmentId}`
    );

    if (!currentAppointment.data) {
      this.logger.error('❌ Cita no encontrada');
      throw new NotFoundException('Cita no encontrada');
    }

    const oldAppointment = currentAppointment.data;
    this.logger.log(`✅ Cita actual: ${oldAppointment.fecha} ${oldAppointment.hora_inicio} (Paciente: ${oldAppointment.id_paciente})`);

    // 2. Obtener información del profesional para usar su intervalo correcto
    const professionalId = dto.professionalId || oldAppointment.id_profesional.toString();
    const branchId = dto.branchId || oldAppointment.id_sucursal.toString();

    this.logger.log('🔍 Obteniendo información del profesional...');
    const professionals = await this.listProfessionals(companyId);
    const professional = professionals.find(p =>
      p.id === professionalId || p.id.toString() === professionalId.toString()
    );

    const correctDuration = professional?.intervalo || dto.durationMin || oldAppointment.duracion || 30;
    this.logger.log(`⏱️ Duración a usar: ${correctDuration} min (intervalo del profesional)`);

    // 2.5 Verificar disponibilidad del horario antes de crear la cita
    this.logger.log(`🔍 Verificando disponibilidad del horario ${dto.newDateYmd} ${dto.newTime}...`);
    try {
      const availability = await this.getAvailability(companyId, {
        professionalId: professionalId,
        branchId: branchId,
        fromDate: dto.newDateYmd,
        toDate: dto.newDateYmd,
        duration: correctDuration,
      });

      const slotAvailable = availability.find(slot =>
        slot.date === dto.newDateYmd &&
        slot.time === dto.newTime
      );

      if (!slotAvailable) {
        this.logger.error(`❌ Horario ${dto.newDateYmd} ${dto.newTime} NO está disponible`);
        this.logger.log(`📋 Slots disponibles en esa fecha: ${availability.filter(s => s.date === dto.newDateYmd).map(s => s.time).join(', ') || 'ninguno'}`);
        throw new BadRequestException(`El horario ${dto.newDateYmd} ${dto.newTime} no está disponible para este profesional`);
      }

      this.logger.log(`✅ Horario verificado: ${slotAvailable.date} ${slotAvailable.time} (sillón ${slotAvailable.chairId})`);

      // Usar el chairId del slot disponible si no se especificó uno
      if (!dto.chairId && slotAvailable.chairId) {
        this.logger.log(`💺 Usando chairId del slot disponible: ${slotAvailable.chairId}`);
        dto.chairId = slotAvailable.chairId;
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.warn(`⚠️ No se pudo verificar disponibilidad: ${error.message}. Continuando con la creación...`);
    }

    // 3. Crear nueva cita
    this.logger.log('📝 Creando nueva cita...');
    const newAppointmentData: any = {
      id_paciente: oldAppointment.id_paciente,
      id_profesional: parseInt(professionalId),
      id_sucursal: parseInt(branchId),
      id_sillon: parseInt(dto.chairId || oldAppointment.id_sillon.toString()),
      fecha: dto.newDateYmd,
      hora_inicio: dto.newTime,
      duracion: correctDuration,
      comentario: dto.comment || 'Reagendada vía WhatsApp Bot',
      id_estado: 7, // No confirmado
      videoconsulta: false,
    };

    // IMPORTANTE: NO incluir id_atencion en la nueva cita porque:
    // - La atención ya está asociada a la cita antigua
    // - Medilink no permite dos citas activas con la misma atención
    // - Después de anular la cita antigua, la nueva cita funcionará sin id_atencion
    this.logger.log(`ℹ️ No incluyendo id_atencion en nueva cita (la atención ${oldAppointment.id_atencion} está asociada a la cita antigua)`);

    this.logger.log(`📤 POST /citas (nueva cita)`);
    this.logger.log(`📤 Body: ${JSON.stringify(newAppointmentData, null, 2)}`);

    let newAppointmentResponse;
    try {
      newAppointmentResponse = await this.medilinkClient.post<MedilinkAppointment>(
        companyId,
        config,
        '/citas',
        newAppointmentData
      );

      const newAppointment = newAppointmentResponse.data;
      this.logger.log(`✅ Nueva cita creada con ID: ${newAppointment.id}`);
    } catch (error) {
      const status = error?.response?.status;
      const errorData = error?.response?.data;
      const errorMessage = errorData?.error?.message || errorData?.message || error.message;

      this.logger.error(`❌ Error creando nueva cita para reagendamiento:`);
      this.logger.error(`   Status: ${status}`);
      this.logger.error(`   Mensaje: ${errorMessage}`);
      this.logger.error(`   Detalles API: ${JSON.stringify(errorData, null, 2)}`);
      this.logger.error(`   Datos enviados: ${JSON.stringify(newAppointmentData, null, 2)}`);

      throw new BadRequestException(`Error creando nueva cita: ${errorMessage || error.message}`);
    }

    const newAppointment = newAppointmentResponse.data;

    // 4. Anular la cita antigua
    this.logger.log('🚫 Anulando cita antigua...');
    const cancelData = {
      id_estado: 1, // Anulado
      comentario: 'Anulada por reagendamiento',
      citas_relacionadas: 0,
    };

    this.logger.log(`📤 PUT /citas/${dto.appointmentId} (anular antigua)`);
    this.logger.log(`📤 Body: ${JSON.stringify(cancelData, null, 2)}`);

    try {
      await this.medilinkClient.put(
        companyId,
        config,
        `/citas/${dto.appointmentId}`,
        cancelData
      );
      this.logger.log('✅ Cita antigua anulada exitosamente');
    } catch (error) {
      this.logger.error(`⚠️ Error anulando cita antigua: ${error.message}`);
      // No fallar si la anulación falla, la nueva cita ya está creada
    }

    // 5. Obtener información adicional para respuesta
    const [branches] = await Promise.all([
      this.listBranches(companyId),
    ]);

    const branch = branches.find(b =>
      b.id === branchId || b.id.toString() === branchId.toString()
    );

    // Enviar notificación WhatsApp
    let whatsappSent = false;
    const patientLink = await this.patientLinkRepo.findOne({
      where: { companyId, medilinkPatientId: oldAppointment.id_paciente.toString() },
    });

    if (patientLink) {
      try {
        this.logger.log('📱 Enviando notificación WhatsApp...');
        await this.whatsappTemplates.sendTemplateAppointmentRescheduled(companyId, {
          toE164: patientLink.phoneE164,
          patientName: patientLink.patientData?.nombre || 'Paciente',
          professionalName: professional ? `${professional.nombre} ${professional.apellidos}` : 'Profesional',
          branchName: branch?.nombre || 'Sucursal',
          date: dto.newDateYmd,
          time: dto.newTime,
          oldDate: oldAppointment.fecha,
          oldTime: oldAppointment.hora_inicio,
        });
        whatsappSent = true;
        this.logger.log('✅ Notificación WhatsApp enviada');
      } catch (error) {
        this.logger.error(`❌ Error enviando WhatsApp: ${error.message}`);
      }
    }

    const result = {
      oldAppointmentId: dto.appointmentId,
      newAppointmentId: newAppointment.id,
      oldDate: oldAppointment.fecha,
      oldTime: oldAppointment.hora_inicio,
      newDate: dto.newDateYmd,
      newTime: dto.newTime,
      professionalName: professional ? `${professional.nombre} ${professional.apellidos}` : '',
      branchName: branch?.nombre || '',
      whatsappMessageSent: whatsappSent,
      message: 'Cita reagendada exitosamente',
    };

    this.logger.log('🔄 === FIN REAGENDACIÓN DE CITA ===');
    this.logger.log(`✅ Resultado: ${JSON.stringify(result, null, 2)}`);

    return result;
  }

  async cancelAppointment(companyId: string, dto: CancelAppointmentDto): Promise<CancelResponseDto> {
    this.logger.log('🚫 === INICIO CANCELACIÓN DE CITA ===');
    this.logger.log(`📋 appointmentId: ${dto.appointmentId}`);
    this.logger.log(`📋 Razón: ${dto.reason || 'No especificada'}`);

    const config = await this.getConfig(companyId);

    // Obtener cita actual
    this.logger.log(`🔍 Obteniendo información de la cita ${dto.appointmentId}...`);
    const currentAppointment = await this.medilinkClient.get<MedilinkAppointment>(
      companyId,
      config,
      `/citas/${dto.appointmentId}`
    );

    if (!currentAppointment.data) {
      this.logger.error('❌ Cita no encontrada en Medilink');
      throw new NotFoundException('Cita no encontrada');
    }

    const appointment = currentAppointment.data;
    this.logger.log(`✅ Cita encontrada: ${appointment.fecha} ${appointment.hora_inicio}`);

    // Usar ID de estado 1 para anulación (estándar de Medilink)
    const cancelStateId = '1';
    this.logger.log(`🔍 Estado de cancelación: Anulado (ID: ${cancelStateId})`);

    // Cancelar cita (cambiar estado a cancelado)
    const cancelData = {
      id_estado: parseInt(cancelStateId),
      comentario: dto.reason || 'Cita cancelada por paciente',
      citas_relacionadas: 0,
    };

    const endpoint = `/citas/${dto.appointmentId}`;
    const fullUrl = `${config.baseUrl}${endpoint}`;

    this.logger.log(`📤 PUT ${fullUrl}`);
    this.logger.log(`📤 Body: ${JSON.stringify(cancelData, null, 2)}`);

    try {
      await this.medilinkClient.put(
        companyId,
        config,
        endpoint,
        cancelData
      );

      this.logger.log('✅ Cita cancelada exitosamente en Medilink');
    } catch (error) {
      this.logger.error(`❌ Error cancelando cita en Medilink:`);
      this.logger.error(`   Status: ${error?.response?.status}`);
      this.logger.error(`   Mensaje: ${error.message}`);
      this.logger.error(`   Detalles API: ${JSON.stringify(error?.response?.data, null, 2)}`);
      throw new BadRequestException(`Error cancelando cita: ${error?.response?.data?.error?.message || error?.response?.data?.message || error.message}`);
    }

    // Obtener información adicional
    const [branches, professionals] = await Promise.all([
      this.listBranches(companyId),
      this.listProfessionals(companyId),
    ]);

    const professional = professionals.find(p => p.id === appointment.id_profesional.toString());
    const branch = branches.find(b => b.id === appointment.id_sucursal.toString());

    // Enviar notificación WhatsApp
    let whatsappSent = false;
    const patientLink = await this.patientLinkRepo.findOne({
      where: { companyId, medilinkPatientId: appointment.id_paciente.toString() },
    });

    if (patientLink) {
      try {
        await this.whatsappTemplates.sendTemplateAppointmentCancelled(companyId, {
          toE164: patientLink.phoneE164,
          patientName: patientLink.patientData?.nombre || 'Paciente',
          professionalName: professional ? `${professional.nombre} ${professional.apellidos}` : 'Profesional',
          branchName: branch?.nombre || 'Sucursal',
          date: appointment.fecha,
          time: appointment.hora_inicio,
        });
        whatsappSent = true;
      } catch (error) {
        this.logger.error(`Error enviando WhatsApp: ${error.message}`);
      }
    }

    const result = {
      appointmentId: dto.appointmentId,
      date: appointment.fecha,
      time: appointment.hora_inicio,
      professionalName: professional ? `${professional.nombre} ${professional.apellidos}` : '',
      branchName: branch?.nombre || '',
      cancellationReason: dto.reason || 'Cancelado por paciente',
      cancelledAt: new Date(),
      whatsappMessageSent: whatsappSent,
      message: 'Cita cancelada exitosamente',
    };

    this.logger.log('🚫 === FIN CANCELACIÓN DE CITA ===');
    this.logger.log(`✅ Resultado: ${JSON.stringify(result, null, 2)}`);

    return result;
  }

  // === MÉTODOS DE PACIENTES ===

  async searchPatient(companyId: string, query: string): Promise<MedilinkPatient[]> {
    const config = await this.getConfig(companyId);

    const response = await this.medilinkClient.get<MedilinkPatient[]>(
      companyId,
      config,
      '/pacientes',
      { q: query }
    );

    return response.data || [];
  }

  /**
   * Busca un paciente por RUT, email o teléfono
   */
  async findPatientByContact(
    companyId: string,
    filters: {
      rut?: string;
      email?: string;
      telefono?: string;
    }
  ): Promise<MedilinkPatient[]> {
    const config = await this.getConfig(companyId);

    // Construir el query JSON según el formato de Medilink
    const queryFilters: any = {};

    if (filters.rut) {
      queryFilters.rut = { eq: filters.rut };
    }

    if (filters.email) {
      queryFilters.email = { eq: filters.email };
    }

    if (filters.telefono) {
      queryFilters.telefono = { eq: filters.telefono };
    }

    // Si no hay filtros, retornar array vacío
    if (Object.keys(queryFilters).length === 0) {
      return [];
    }

    // Convertir a JSON string para el parámetro q
    const queryString = JSON.stringify(queryFilters);

    this.logger.log(`🔍 Buscando paciente con filtros: ${queryString}`);

    const response = await this.medilinkClient.get<MedilinkPatient[]>(
      companyId,
      config,
      '/pacientes',
      { q: queryString }
    );

    return response.data || [];
  }

  async listPatientAttentions(companyId: string, patientId: string): Promise<MedilinkAttention[]> {
    const config = await this.getConfig(companyId);

    const response = await this.medilinkClient.get<MedilinkAttention[]>(
      companyId,
      config,
      `/pacientes/${patientId}/atenciones`
    );

    return response.data || [];
  }

  async getPatientAppointmentsByPhone(companyId: string, phoneE164: string): Promise<MedilinkAppointment[]> {
    this.logger.log('📅 === BUSCANDO CITAS DEL PACIENTE ===');
    this.logger.log(`📞 Teléfono: ${phoneE164}`);

    const config = await this.getConfig(companyId);
    const normalizedPhone = this.e164Service.normalize(phoneE164);

    // Buscar el link del paciente
    const patientLink = await this.patientLinkRepo.findOne({
      where: { companyId, phoneE164: normalizedPhone },
    });

    if (!patientLink) {
      this.logger.log('⚠️ Paciente no encontrado en el sistema local');
      return [];
    }

    const patientId = patientLink.medilinkPatientId;
    this.logger.log(`👤 Paciente ID: ${patientId}`);

    // Obtener las citas del paciente
    try {
      const response = await this.medilinkClient.get<MedilinkAppointment[]>(
        companyId,
        config,
        `/pacientes/${patientId}/citas`
      );

      const appointments = response.data || [];
      this.logger.log(`✅ Citas encontradas: ${appointments.length}`);

      return appointments;
    } catch (error) {
      this.logger.error(`❌ Error obteniendo citas del paciente: ${error.message}`);
      return [];
    }
  }

  // === MÉTODOS AUXILIARES ===

  private async getConfig(companyId: string): Promise<MedilinkClientConfig> {
    const integration = await this.integrationRepo.findOne({
      where: { companyId },
    });

    if (!integration) {
      throw new NotFoundException('No hay integración Medilink configurada');
    }

    if (integration.status === MedilinkIntegrationStatus.INVALID_TOKEN) {
      throw new BadRequestException('Token de Medilink inválido');
    }

    if (integration.status === MedilinkIntegrationStatus.REVOKED) {
      throw new BadRequestException('Integración Medilink revocada');
    }

    const accessToken = await this.cryptoService.decrypt(integration.tokenCiphertext);

    return {
      baseUrl: integration.baseUrl,
      accessToken,
      rateLimitPerMin: integration.rateLimitPerMin,
    };
  }

  private async markAsInvalidToken(companyId: string): Promise<void> {
    await this.integrationRepo.update(
      { companyId },
      {
        status: MedilinkIntegrationStatus.INVALID_TOKEN,
        lastErrorAt: new Date(),
        lastError: 'Token inválido (401)',
      }
    );
  }
}