import { Injectable, Logger } from '@nestjs/common';
import { HealthcareMedilinkStage, HealthcareMedilinkContext } from './definition';
import { MedilinkService } from '../../../integrations/medilink/medilink.service';
import { E164Service } from '../../../integrations/medilink/utils/e164.service';
import { TimeService } from '../../../integrations/medilink/utils/time.service';

@Injectable()
export class HealthcareMedilinkRunners {
  private readonly logger = new Logger('HealthcareMedilinkRunners');

  constructor(
    private readonly medilinkService: MedilinkService,
    private readonly e164Service: E164Service,
    private readonly timeService: TimeService,
  ) {}

  /**
   * Ejecuta la lógica de side-effects para una etapa específica del funnel
   */
  async executeStage(
    stage: HealthcareMedilinkStage,
    context: HealthcareMedilinkContext,
  ): Promise<{ success: boolean; message?: string; data?: any; error?: string }> {
    //this.logger.log(`Ejecutando etapa: ${stage} para cliente ${context.clientId}`);

    try {
      switch (stage) {
        case HealthcareMedilinkStage.INTAKE:
          return await this.executeIntake(context);
        
        case HealthcareMedilinkStage.NEEDS:
          return await this.executeNeeds(context);
        
        case HealthcareMedilinkStage.SELECT_PROFESSIONAL:
          return await this.executeSelectProfessional(context);
        
        case HealthcareMedilinkStage.SELECT_SLOT:
          return await this.executeSelectSlot(context);
        
        case HealthcareMedilinkStage.ATTENTION_RESOLVE:
          return await this.executeAttentionResolve(context);
        
        case HealthcareMedilinkStage.CONFIRM:
          return await this.executeConfirm(context);
        
        case HealthcareMedilinkStage.DONE:
          return await this.executeDone(context);
        
        default:
          return {
            success: false,
            error: `Etapa no reconocida: ${stage}`,
          };
      }
    } catch (error) {
      this.logger.error(`Error en etapa ${stage}:`, error);
      return {
        success: false,
        error: error.message || 'Error interno del servidor',
      };
    }
  }

  /**
   * INTAKE: Identificación y registro del paciente
   */
  private async executeIntake(context: HealthcareMedilinkContext) {
    const { patientData } = context;

    if (!patientData?.phoneE164) {
      return {
        success: false,
        error: 'Número de teléfono requerido para continuar',
      };
    }

    try {
      // Validar formato E.164 del teléfono
      const isValidPhone = this.e164Service.isValid(patientData.phoneE164);
      if (!isValidPhone) {
        return {
          success: false,
          error: 'Formato de teléfono inválido. Debe incluir código de país (+56 para Chile)',
        };
      }

      // Buscar paciente existente en Medilink
      const existingPatient = await this.medilinkService.searchPatient(
        context.companyId,
        patientData.phoneE164,
      );

      if (existingPatient.length > 0) {
        // Paciente encontrado, actualizar contexto
        const patient = existingPatient[0];
        context.patientData = {
          ...patientData,
          medilinkPatientId: patient.id.toString(),
          name: patient.nombres,
          lastName: patient.apellidos,
          rut: patient.rut,
          email: patient.email,
          birthDate: patient.fecha_nacimiento,
        };

        return {
          success: true,
          message: 'Paciente encontrado en el sistema',
          data: {
            patientId: patient.id,
            name: patient.nombres,
            lastName: patient.apellidos,
          },
        };
      } else {
        // Paciente no encontrado, se creará después de la cita
        return {
          success: true,
          message: 'Paciente no encontrado, se registrará al confirmar la cita',
          data: {
            needsRegistration: true,
          },
        };
      }
    } catch (error) {
      this.logger.error('Error en INTAKE:', error);
      return {
        success: false,
        error: 'Error al verificar información del paciente',
      };
    }
  }

  /**
   * NEEDS: Obtener sucursales disponibles y preferencias
   */
  private async executeNeeds(context: HealthcareMedilinkContext) {
    try {
      // Obtener sucursales disponibles
      const branches = await this.medilinkService.listBranches(context.companyId);
      
      if (!branches || branches.length === 0) {
        return {
          success: false,
          error: 'No hay sucursales disponibles en este momento',
        };
      }

      // Obtener estados de cita disponibles
      const appointmentStates = await this.medilinkService.listAppointmentStates(context.companyId);

      return {
        success: true,
        message: 'Sucursales y servicios disponibles',
        data: {
          branches: branches.map(branch => ({
            id: branch.id,
            name: (branch as any).name ?? (branch as any).nombre,
            address: (branch as any).address ?? (branch as any).direccion,
            phone: (branch as any).phone,
            isActive: (branch as any).isActive,
          })),
          appointmentStates: appointmentStates.map(state => ({
            id: (state as any).id,
            name: (state as any).name ?? (state as any).nombre,
            description: (state as any).description,
            isActive: (state as any).isActive,
          })),
        },
      };
    } catch (error) {
      this.logger.error('Error en NEEDS:', error);
      return {
        success: false,
        error: 'Error al obtener sucursales disponibles',
      };
    }
  }

  /**
   * SELECT_PROFESSIONAL: Obtener profesionales de la sucursal seleccionada
   */
  private async executeSelectProfessional(context: HealthcareMedilinkContext) {
    const { preferences, selections } = context;
    const branchId = preferences?.branchId || selections?.branchId;

    if (!branchId) {
      return {
        success: false,
        error: 'Debe seleccionar una sucursal primero',
      };
    }

    try {
      // Obtener profesionales de la sucursal
      const professionals = await this.medilinkService.listProfessionals(
        context.companyId,
        branchId,
      );

      if (!professionals || professionals.length === 0) {
        return {
          success: false,
          error: 'No hay profesionales disponibles en esta sucursal',
        };
      }

      // Obtener sillones de la sucursal
      const chairs = await this.medilinkService.getChairs(context.companyId, branchId);

      return {
        success: true,
        message: 'Profesionales disponibles en la sucursal',
        data: {
          professionals: professionals.map(prof => ({
            id: prof.id,
            name: (prof as any).name ?? (prof as any).nombre,
            lastName: (prof as any).lastName ?? (prof as any).apellidos,
            specialty: (prof as any).specialty ?? (prof as any).especialidad,
            isActive: (prof as any).isActive,
          })),
          chairs: chairs.map(chair => ({
            id: chair.id,
            name: (chair as any).name ?? (chair as any).nombre,
            isActive: (chair as any).isActive,
          })),
        },
      };
    } catch (error) {
      this.logger.error('Error en SELECT_PROFESSIONAL:', error);
      return {
        success: false,
        error: 'Error al obtener profesionales disponibles',
      };
    }
  }

  /**
   * SELECT_SLOT: Obtener horarios disponibles para el profesional seleccionado
   */
  private async executeSelectSlot(context: HealthcareMedilinkContext) {
    const { selections } = context;
    const { professionalId, branchId } = selections || {};

    if (!professionalId || !branchId) {
      return {
        success: false,
        error: 'Debe seleccionar un profesional primero',
      };
    }

    try {
      // Obtener horarios disponibles para los próximos 30 días
      const startDate = this.timeService.toDateString(new Date());
      const endDate = this.timeService.addDays(startDate, 30);

      const availableSlots = await this.medilinkService.getAvailability(
        context.companyId,
        {
          professionalId,
          branchId,
          fromDate: startDate,
          toDate: endDate,
        },
      );

      if (!availableSlots || availableSlots.length === 0) {
        return {
          success: false,
          error: 'No hay horarios disponibles para este profesional',
        };
      }

      // Formatear slots para el usuario
      const formattedSlots = availableSlots.map(slot => ({
        id: `${slot.date}_${slot.time}_${slot.chairId}`,
        date: slot.date,
        time: slot.time,
        professionalId: slot.professionalId,
        professionalName: slot.professionalName,
        branchId: slot.branchId,
        branchName: slot.branchName,
        chairId: slot.chairId,
        duration: slot.duration,
      }));

      context.availableSlots = formattedSlots;

      return {
        success: true,
        message: 'Horarios disponibles',
        data: {
          slots: formattedSlots,
        },
      };
    } catch (error) {
      this.logger.error('Error en SELECT_SLOT:', error);
      return {
        success: false,
        error: 'Error al obtener horarios disponibles',
      };
    }
  }

  /**
   * ATTENTION_RESOLVE: Resolver información de la atención médica
   */
  private async executeAttentionResolve(context: HealthcareMedilinkContext) {
    const { selections, patientData } = context;

    if (!selections?.professionalId || !selections?.dateYmd || !selections?.timeHhmm) {
      return {
        success: false,
        error: 'Información de la cita incompleta',
      };
    }

    try {
      // Verificar que el slot sigue disponible
      const slotStillAvailable = await this.medilinkService.getAvailability(
        context.companyId,
        {
          professionalId: selections.professionalId,
          branchId: selections.branchId || '',
          fromDate: selections.dateYmd,
          toDate: selections.dateYmd,
        },
      );
      const stillAvailable = Array.isArray(slotStillAvailable) && slotStillAvailable.some(s => s.time === selections.timeHhmm);

      if (!stillAvailable) {
        return {
          success: false,
          error: 'El horario seleccionado ya no está disponible',
        };
      }

      // Crear ID de atención temporal
      const attentionId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      context.selections.attentionId = attentionId;

      return {
        success: true,
        message: 'Información de atención resuelta',
        data: {
          attentionId,
          slotConfirmed: true,
        },
      };
    } catch (error) {
      this.logger.error('Error en ATTENTION_RESOLVE:', error);
      return {
        success: false,
        error: 'Error al verificar disponibilidad del horario',
      };
    }
  }

  /**
   * CONFIRM: Crear la cita en Medilink
   */
  private async executeConfirm(context: HealthcareMedilinkContext) {
    const { selections, patientData } = context;

    if (!selections?.professionalId || !selections?.dateYmd || !selections?.timeHhmm) {
      return {
        success: false,
        error: 'Información de la cita incompleta',
      };
    }

    try {
      // Preparar datos para crear la cita
      const appointmentData = {
        patientId: patientData?.medilinkPatientId,
        professionalId: selections.professionalId,
        branchId: selections.branchId,
        chairId: selections.chairId,
        dateYmd: selections.dateYmd,
        timeHhmm: selections.timeHhmm,
        duration: selections.duration || 30,
        patientData: patientData ? {
          name: patientData.name,
          lastName: patientData.lastName,
          phone: patientData.phoneE164,
          email: patientData.email,
          rut: patientData.rut,
          birthDate: patientData.birthDate,
        } : undefined,
      };

      // Crear la cita en Medilink
      const appointment = await this.medilinkService.createAppointment(
        context.companyId,
        appointmentData as any,
      );

      if (!appointment) {
        return {
          success: false,
          error: 'No se pudo crear la cita',
        };
      }

      // Actualizar contexto con la cita creada
      context.appointment = {
        id: appointment.appointmentId,
        confirmationCode: appointment.confirmationCode,
        status: appointment.state,
        createdAt: new Date(),
      };

      return {
        success: true,
        message: 'Cita creada exitosamente',
        data: {
          appointmentId: appointment.appointmentId,
          confirmationCode: appointment.confirmationCode,
          status: appointment.state,
        },
      };
    } catch (error) {
      this.logger.error('Error en CONFIRM:', error);
      return {
        success: false,
        error: 'Error al crear la cita. Intenta nuevamente o contacta soporte.',
      };
    }
  }

  /**
   * DONE: Finalizar el proceso y enviar confirmación
   */
  private async executeDone(context: HealthcareMedilinkContext) {
    const { appointment } = context;

    if (!appointment) {
      return {
        success: false,
        error: 'No hay cita para confirmar',
      };
    }

    try {
      // Aquí se podrían enviar notificaciones adicionales
      // como WhatsApp, email, etc.

      return {
        success: true,
        message: 'Proceso completado exitosamente',
        data: {
          appointmentId: appointment.id,
          confirmationCode: appointment.confirmationCode,
          status: appointment.status,
        },
      };
    } catch (error) {
      this.logger.error('Error en DONE:', error);
      return {
        success: false,
        error: 'Error al finalizar el proceso',
      };
    }
  }

  // === HERRAMIENTAS MEDILINK ===

  /**
   * Maneja la ejecución de herramientas de Medilink
   */
  async handleMedilinkTool(
    toolName: string,
    args: any,
    context: HealthcareMedilinkContext,
    medilinkTools: any,
  ): Promise<any> {
    const companyId = context.companyId || 'test-company-id';
    
    // Log para debugging
    //this.logger.log(`🔧 Ejecutando herramienta Medilink: ${toolName}`);
    this.logger.debug(`📊 Argumentos:`, args);
    this.logger.debug(`🏢 Company ID: ${companyId}`);
    
    try {
      const result = await medilinkTools.executeTool(toolName, args, companyId);
      
      //this.logger.log(`✅ Resultado de ${toolName}:`, result);
      
      // Persistir información importante en el contexto
      if (result.success) {
        // Si encontramos un paciente, guardar en contexto
        if (toolName === 'find_patient_by_contact' && result.data?.patient) {
          const patient = result.data.patient;
          context.patientData = {
            ...context.patientData,
            medilinkPatientId: patient.id,
            name: patient.nombres || context.patientData?.name,
            lastName: patient.apellidos || context.patientData?.lastName,
            rut: patient.rut || context.patientData?.rut,
            email: patient.email || context.patientData?.email,
            birthDate: patient.fechaNacimiento || context.patientData?.birthDate,
            phoneE164: context.patientData?.phoneE164 || patient.telefono || '', // Mantener el teléfono original si existe
          };
        }
        
        // Si obtenemos profesionales, guardar en contexto
        if (toolName === 'list_professionals' && result.data?.professionals) {
          (context as any).availableProfessionals = result.data.professionals;
        }
        
        // Si obtenemos slots, guardar en contexto
        if (toolName === 'get_available_slots' && result.data?.slots) {
          context.availableSlots = result.data.slots;
        }
        
        // Si creamos una cita, guardar confirmación
        if ((toolName === 'schedule_appointment' || toolName === 'create_appointment') && result.data?.appointmentId) {
          if (context.appointment) {
            context.appointment.id = result.data.appointmentId;
            context.appointment.confirmationCode = result.data.confirmationCode;
          } else {
            context.appointment = {
              id: result.data.appointmentId,
              confirmationCode: result.data.confirmationCode,
              status: result.data.status || 'scheduled',
              createdAt: new Date(),
            };
          }
        }
      }
      
      return result;
    } catch (error) {
      this.logger.error(`❌ Error en herramienta ${toolName}:`, error);
      return {
        success: false,
        error: error.message || 'Error desconocido',
      };
    }
  }

  /**
   * Formatea respuestas de herramientas Medilink para presentación al usuario
   */
  formatMedilinkResponse(toolName: string, result: any): string {
    if (!result.success) {
      return `Error: ${result.error}`;
    }
    
    switch (toolName) {
      case 'list_professionals':
        if (result.data?.professionals?.length > 0) {
          return `Profesionales disponibles:\n${result.data.professionals
            .map((p: any, i: number) => `${i + 1}. ${p.fullName} - ${p.specialty} (ID: ${p.id})`)
            .join('\n')}`;
        }
        return 'No se encontraron profesionales.';
        
      case 'get_available_slots':
        if (result.data?.slots?.length > 0) {
          return result.data.message || 'Horarios disponibles encontrados.';
        }
        return 'No hay horarios disponibles.';
        
      case 'schedule_appointment':
      case 'create_appointment':
        return result.data?.message || 'Cita creada exitosamente.';
        
      default:
        return result.data?.message || JSON.stringify(result.data);
    }
  }

  /**
   * Valida si se requiere intervención humana
   */
  shouldRequireHumanIntervention(context: HealthcareMedilinkContext): boolean {
    return !!(
      context.needsHumanIntervention ||
      context.retryCount > 3 ||
      (context.currentStage === HealthcareMedilinkStage.ATTENTION_RESOLVE && 
       !context.selections?.attentionId)
    );
  }

  /**
   * Obtiene el mensaje apropiado para una etapa
   */
  getStageMessage(
    stage: HealthcareMedilinkStage,
    messageType: string,
    context: HealthcareMedilinkContext,
  ): string {
    const { stageMessages } = require('./definition');
    const messages = stageMessages[stage];
    
    if (!messages || !messages[messageType]) {
      return `Mensaje no encontrado para ${stage}.${messageType}`;
    }

    let message = messages[messageType];

    // Reemplazar variables en el mensaje
    if (context.selections) {
      message = message.replace('{branch}', context.selections.branchId || '');
      message = message.replace('{professional}', context.selections.professionalId || '');
      message = message.replace('{date}', context.selections.dateYmd || '');
      message = message.replace('{time}', context.selections.timeHhmm || '');
      message = message.replace('{duration}', context.selections.duration?.toString() || '30');
    }

    if (context.appointment) {
      message = message.replace('{confirmationCode}', context.appointment.confirmationCode || '');
    }

    return message;
  }
}
