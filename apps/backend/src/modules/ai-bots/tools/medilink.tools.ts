import { Injectable, Logger } from '@nestjs/common';
import { MedilinkService } from '../../integrations/medilink/medilink.service';

@Injectable()
export class MedilinkTools {
  private readonly logger = new Logger('MedilinkTools');

  // Configuración hardcodeada de sucursales
  // Sucursal 2: Solo para temas de odontología
  // Sucursal 1: Médicos de las distintas especialidades
  private readonly DENTISTRY_BRANCH_ID = '2';
  private readonly MEDICAL_BRANCH_ID = '1';
  private readonly DENTISTRY_SPECIALTIES = ['odontología', 'odontologia', 'dentista', 'dental', 'ortodoncista', 'ortodoncia', 'endodoncista', 'endodoncia', 'periodoncista', 'periodoncia', 'implantología', 'implantologia'];

  constructor(private readonly medilinkService: MedilinkService) { }

  /**
   * Obtiene las definiciones de herramientas para OpenAI
   */
  getTools() {
    return [
      {
        type: "function" as const,
        function: {
          name: "list_branches",
          description: "Obtiene la lista de sucursales disponibles con sus direcciones y horarios. Usa esta herramienta cuando el paciente pregunte por ubicaciones, sedes o dónde están.",
          parameters: {
            type: "object",
            properties: {},
            required: [],
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "list_services",
          description: "Obtiene la lista de servicios o especialidades médicas disponibles. Usa esta herramienta cuando el paciente pregunte qué servicios ofrecen o qué especialidades tienen.",
          parameters: {
            type: "object",
            properties: {},
            required: [],
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "list_professionals",
          description: "Obtiene la lista de profesionales médicos disponibles con sus IDs numéricos. Usa esta herramienta cuando el paciente pregunte por médicos, doctores, profesionales o especialidades. **FILTRADO POR ESPECIALIDAD:** Si el paciente pregunta por una especialidad específica (ej: 'ginecólogos', 'cardiólogos', 'pediatras', 'dermatología'), DEBES usar el parámetro 'specialty' para filtrar automáticamente. **BÚSQUEDA POR NOMBRE:** Si el paciente menciona un nombre específico (ej: 'Sebastian Ruz'), usa 'searchName'. **IMPORTANTE:** Puedes combinar 'specialty' y 'branchId' para obtener profesionales de una especialidad en una sucursal específica.",
          parameters: {
            type: "object",
            properties: {
              specialty: {
                type: "string",
                description: "Especialidad médica para filtrar profesionales (ej: 'ginecología', 'cardiología', 'pediatría', 'dermatología', 'neurología'). El sistema filtrará automáticamente los profesionales que tengan esta especialidad. Si el usuario pregunta '¿qué ginecólogos tienen?' o 'quiero ver los pediatras', usa este parámetro.",
              },
              searchName: {
                type: "string",
                description: "Nombre o apellido específico del profesional que el usuario está buscando (ej: 'Sebastian', 'Ruz'). Usa esto cuando el paciente mencione un nombre específico, NO para especialidades.",
              },
              branchId: {
                type: "string",
                description: "ID numérico de la sucursal para filtrar profesionales (SOLO si el usuario especificó una sucursal concreta, de lo contrario OMÍTELO). Puede combinarse con 'specialty' para obtener profesionales de una especialidad en una sucursal específica.",
              },
            },
            required: [],
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "get_available_slots",
          description: "Obtiene los horarios disponibles para un profesional específico. REQUIERE IDs numéricos de profesional y sucursal. La duración se obtiene automáticamente del profesional. **CRÍTICO:** Antes de llamar esta función, verifica que el professionalId corresponde exactamente al nombre del médico solicitado usando la herramienta list_professionals. El sistema validará automáticamente que el profesional existe y está habilitado antes de buscar horarios. Si el profesional no existe o no atiende en esa sucursal, recibirás un mensaje de error claro.",
          parameters: {
            type: "object",
            properties: {
              professionalId: {
                type: "string",
                description: "ID numérico del profesional (REQUERIDO). Debe ser un número obtenido de list_professionals, NO un nombre.",
              },
              branchId: {
                type: "string",
                description: "ID numérico de la sucursal (REQUERIDO). Debe ser un número (1, 2, etc.).",
              },
              startDate: {
                type: "string",
                description: "Fecha de inicio en formato YYYY-MM-DD (opcional, por defecto hoy)",
              },
              endDate: {
                type: "string",
                description: "Fecha de fin en formato YYYY-MM-DD (opcional, por defecto 7 días después de startDate)",
              },
            },
            required: ["professionalId", "branchId"],
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "create_appointment",
          description: "Crea una nueva cita médica en el sistema. **OBLIGATORIO:** Debes usar esta herramienta INMEDIATAMENTE cuando el paciente confirme la cita diciendo 'sí', 'confirmo', 'está bien', 'perfecto', 'de acuerdo', etc. NO solo respondas verbalmente, DEBES ejecutar esta herramienta para realmente agendar la cita. Usa los datos del paciente del contexto (nombre, teléfono, etc.) y los IDs de profesional, sucursal, fecha y hora que ya están seleccionados.",
          parameters: {
            type: "object",
            properties: {
              patientData: {
                type: "object",
                description: "Datos del paciente",
                properties: {
                  name: {
                    type: "string",
                    description: "Nombre del paciente",
                  },
                  lastName: {
                    type: "string",
                    description: "Apellido del paciente",
                  },
                  email: {
                    type: "string",
                    description: "Email del paciente",
                  },
                  rut: {
                    type: "string",
                    description: "RUT del paciente (opcional)",
                  },
                  birthDate: {
                    type: "string",
                    description: "Fecha de nacimiento en formato DD/MM/YYYY (opcional)",
                  },
                },
                required: ["name", "lastName", "email"],
              },
              professionalId: {
                type: "string",
                description: "ID numérico del profesional",
              },
              branchId: {
                type: "string",
                description: "ID numérico de la sucursal",
              },
              chairId: {
                type: "string",
                description: "ID del sillón/box (opcional, por defecto 1)",
              },
              dateYmd: {
                type: "string",
                description: "Fecha de la cita en formato YYYY-MM-DD",
              },
              timeHhmm: {
                type: "string",
                description: "Hora de la cita en formato HH:MM (24 horas)",
              },
              duration: {
                type: "number",
                description: "Duración en minutos (opcional, por defecto 30)",
              },
              phoneE164: {
                type: "string",
                description: "Teléfono en formato E.164 (ej: +56912345678)",
              },
            },
            required: ["patientData", "professionalId", "branchId", "dateYmd", "timeHhmm"],
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "schedule_appointment",
          description: "Alias de create_appointment. Crea una nueva cita médica en el sistema. **OBLIGATORIO:** Debes usar esta herramienta INMEDIATAMENTE cuando el paciente confirme la cita diciendo 'sí', 'confirmo', 'está bien', 'perfecto', 'de acuerdo', etc. NO solo respondas verbalmente, DEBES ejecutar esta herramienta para realmente agendar la cita. Usa los datos del paciente del contexto (nombre, teléfono, etc.) y los IDs de profesional, sucursal, fecha y hora que ya están seleccionados.",
          parameters: {
            type: "object",
            properties: {
              patientData: {
                type: "object",
                description: "Datos del paciente",
                properties: {
                  name: { type: "string" },
                  lastName: { type: "string" },
                  email: { type: "string" },
                  rut: { type: "string" },
                  birthDate: { type: "string" },
                },
                required: ["name", "lastName", "email"],
              },
              professionalId: { type: "string" },
              branchId: { type: "string" },
              chairId: { type: "string" },
              dateYmd: { type: "string" },
              timeHhmm: { type: "string" },
              duration: { type: "number" },
              phoneE164: { type: "string" },
            },
            required: ["patientData", "professionalId", "branchId", "dateYmd", "timeHhmm"],
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "reschedule_appointment",
          description: "Reagenda una cita médica existente a una nueva fecha/hora. Usa esta herramienta cuando el paciente solicite cambiar o mover una cita. IMPORTANTE: Necesitas el ID de la cita original. Si no lo tienes, primero usa get_patient_appointments.",
          parameters: {
            type: "object",
            properties: {
              appointmentId: {
                type: "string",
                description: "ID de la cita a reagendar (REQUERIDO)",
              },
              newDateYmd: {
                type: "string",
                description: "Nueva fecha en formato YYYY-MM-DD (REQUERIDO)",
              },
              newTime: {
                type: "string",
                description: "Nueva hora en formato HH:MM (REQUERIDO)",
              },
              professionalId: {
                type: "string",
                description: "ID del profesional (opcional, usa el de la cita original si no se especifica)",
              },
              branchId: {
                type: "string",
                description: "ID de la sucursal (opcional, usa la de la cita original si no se especifica)",
              },
              chairId: {
                type: "string",
                description: "ID del sillón (opcional)",
              },
              comment: {
                type: "string",
                description: "Comentario adicional (opcional)",
              },
            },
            required: ["appointmentId", "newDateYmd", "newTime"],
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "cancel_appointment",
          description: "Cancela una cita médica existente. Usa esta herramienta cuando el paciente solicite cancelar o anular una cita. IMPORTANTE: Necesitas el ID de la cita para cancelarla. Si no lo tienes, primero usa get_patient_appointments para buscar las citas del paciente.",
          parameters: {
            type: "object",
            properties: {
              appointmentId: {
                type: "string",
                description: "ID de la cita a cancelar (REQUERIDO)",
              },
              reason: {
                type: "string",
                description: "Motivo de la cancelación (opcional)",
              },
            },
            required: ["appointmentId"],
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "find_patient_by_contact",
          description: "Busca e identifica un paciente en el sistema usando su RUT, email o teléfono. Usa esta herramienta cuando el paciente se identifique o cuando necesites verificar si un paciente existe en el sistema antes de agendar una cita. El bot puede 'reconocer' al paciente solo con uno de estos datos de contacto.",
          parameters: {
            type: "object",
            properties: {
              rut: {
                type: "string",
                description: "RUT del paciente (ej: '18854290-5')",
              },
              email: {
                type: "string",
                description: "Email del paciente",
              },
              telefono: {
                type: "string",
                description: "Teléfono o celular del paciente",
              },
            },
            required: [],
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "get_patient_appointments",
          description: "Obtiene las citas agendadas de un paciente. Usa esta herramienta para buscar citas existentes del paciente cuando necesites cancelar, reagendar o consultar sus citas.",
          parameters: {
            type: "object",
            properties: {
              patientPhone: {
                type: "string",
                description: "Teléfono del paciente en formato E.164 (ej: +56912345678)",
              },
              status: {
                type: "string",
                description: "Filtrar por estado (opcional): 'upcoming' para próximas, 'past' para pasadas, 'all' para todas",
              },
            },
            required: ["patientPhone"],
          },
        },
      },
    ];
  }

  /**
   * Ejecuta una herramienta de Medilink
   */
  async executeTool(toolName: string, args: any, companyId: string): Promise<any> {
    this.logger.log(`🔧 === EJECUTANDO HERRAMIENTA: ${toolName} ===`);
    this.logger.log(`📋 Args: ${JSON.stringify(args, null, 2)}`);
    this.logger.log(`🏢 CompanyId: ${companyId}`);

    try {
      switch (toolName) {
        case 'list_branches':
          return await this.listBranches(companyId);

        case 'list_services':
          return await this.listServices(companyId);

        case 'list_professionals':
          return await this.listProfessionals(companyId, args);

        case 'get_available_slots':
          return await this.getAvailableSlots(companyId, args);

        case 'schedule_appointment':
        case 'create_appointment':
          return await this.scheduleAppointment(companyId, args);

        case 'reschedule_appointment':
          return await this.rescheduleAppointment(companyId, args);

        case 'cancel_appointment':
          return await this.cancelAppointment(companyId, args);

        case 'search_patient':
          return await this.searchPatient(companyId, args);

        case 'find_patient_by_contact':
          return await this.findPatientByContact(companyId, args);

        case 'get_patient_appointments':
          return await this.getPatientAppointments(companyId, args);

        default:
          return {
            success: false,
            error: `Herramienta desconocida: ${toolName}`,
          };
      }
    } catch (error) {
      this.logger.error(`Error ejecutando herramienta ${toolName}: ${error.message}`);
      return {
        success: false,
        error: error.message || 'Error desconocido',
      };
    }
  }

  /**
   * Lista las sucursales disponibles
   */
  private async listBranches(companyId: string): Promise<any> {
    try {
      //this.logger.log(`📍 Obteniendo sucursales para companyId: ${companyId}`);

      const branches = await this.medilinkService.listBranches(companyId);

      //this.logger.log(`✅ Sucursales obtenidas: ${branches.length}`);

      const branchesFormatted = branches.map(branch => ({
        id: branch.id,
        name: branch.nombre,
        address: branch.direccion || 'Sin dirección',
        displayText: `${branch.nombre} - ${branch.direccion || 'Sin dirección'} (ID: ${branch.id})`,
      }));

      //this.logger.log(`📋 Sucursales para LLM: ${branchesFormatted.map(b => b.name).join(', ')}`);

      return {
        success: true,
        data: {
          branches: branchesFormatted,
          message: `Se encontraron ${branches.length} sucursales. IMPORTANTE: Usa el ID numérico de cada sucursal para consultar horarios disponibles con get_available_slots.`,
        },
      };
    } catch (error) {
      this.logger.error(`Error obteniendo sucursales: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Lista los servicios o especialidades disponibles
   */
  private async listServices(companyId: string): Promise<any> {
    try {
      //this.logger.log(`🏥 Obteniendo servicios para companyId: ${companyId}`);

      const services = await this.medilinkService.listServices(companyId);

      //this.logger.log(`✅ Servicios obtenidos: ${services.length}`);

      return {
        success: true,
        data: {
          services: services,
          message: `Se encontraron ${services.length} servicios disponibles.`,
        },
      };
    } catch (error) {
      this.logger.error(`Error obteniendo servicios: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Lista los profesionales disponibles
   */
  private async listProfessionals(companyId: string, args: any): Promise<any> {
    try {
      const branchId = args.branchId || args.branch_id;
      const searchName = args.searchName || args.search_name || args.name || args.nombre;
      const specialty = args.specialty || args.especialidad || args.speciality;

      this.logger.log(`👨‍⚕️ Obteniendo profesionales (branchId: ${branchId || 'todos'}, specialty: ${specialty || 'todas'}, searchName: ${searchName || 'sin filtro'})`);

      // Obtener profesionales y sucursales en paralelo
      const [allProfessionals, branches] = await Promise.all([
        this.medilinkService.listProfessionals(companyId, branchId),
        this.medilinkService.listBranches(companyId)
      ]);

      // Crear mapa de sucursales para acceso rápido
      const branchMap = new Map(branches.map(b => [b.id.toString(), b.nombre]));

      this.logger.log(`✅ Profesionales obtenidos de API: ${allProfessionals.length}`);

      // Aplicar filtro de sucursal según especialidad (hardcodeado)
      let filteredProfessionals = allProfessionals;
      if (branchId) {
        const branchIdStr = branchId.toString();
        filteredProfessionals = allProfessionals.filter(prof => {
          const profSpecialty = (prof.especialidad || '').toLowerCase().trim();
          const isDentistry = this.isDentistrySpecialty(profSpecialty);

          // Sucursal 2: Solo odontología
          if (branchIdStr === this.DENTISTRY_BRANCH_ID) {
            if (!isDentistry) {
              this.logger.debug(`🔍 Filtrando profesional ${prof.nombre} ${prof.apellidos} - No es odontología, no pertenece a sucursal 2`);
              return false;
            }
          }
          // Sucursal 1: Solo médicos (no odontología)
          else if (branchIdStr === this.MEDICAL_BRANCH_ID) {
            if (isDentistry) {
              this.logger.debug(`🔍 Filtrando profesional ${prof.nombre} ${prof.apellidos} - Es odontología, no pertenece a sucursal 1`);
              return false;
            }
          }
          return true;
        });
        this.logger.log(`🔍 Después de filtrar por tipo de sucursal: ${filteredProfessionals.length} profesionales`);
      }

      // Filtrar por especialidad si se proporciona
      if (specialty) {
        const specialtyLower = specialty.toLowerCase().trim();
        filteredProfessionals = filteredProfessionals.filter(prof => {
          const profSpecialty = (prof.especialidad || '').toLowerCase().trim();
          // Búsqueda flexible: incluye si la especialidad contiene el término o viceversa
          return profSpecialty.includes(specialtyLower) ||
            specialtyLower.includes(profSpecialty) ||
            // También buscar variantes comunes
            this.matchesSpecialty(profSpecialty, specialtyLower);
        });
        this.logger.log(`🔍 Filtrados por especialidad "${specialty}": ${filteredProfessionals.length} profesionales encontrados`);
      }

      // 3. Filtrar por Nombre (Búsqueda Flexible de Palabras Clave)
      if (searchName) {
        const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // Dividir la búsqueda en palabras clave (tokens)
        const searchTokens = normalize(searchName).split(' ').filter(t => t.length > 0);

        filteredProfessionals = filteredProfessionals.filter(prof => {
          const fullName = normalize(`${prof.nombre} ${prof.apellidos}`);

          // Verificar que TODAS las palabras buscadas estén en el nombre completo
          // Esto permite encontrar "Claudio Espejo" dentro de "Claudio Rene Espejo"
          return searchTokens.every(token => fullName.includes(token));
        });
        this.logger.log(`🔍 Filtrados por nombre "${searchName}": ${filteredProfessionals.length} profesionales encontrados`);
      }

      // Crear formato completo con información de sucursal
      const professionalsFormatted = filteredProfessionals.map(prof => {
        const profSpecialty = (prof.especialidad || '').toLowerCase().trim();
        const isDentistry = this.isDentistrySpecialty(profSpecialty);

        // Determinar sucursal según especialidad (médicos en 1, odontología en 2)
        const assignedBranchId = isDentistry ? this.DENTISTRY_BRANCH_ID : this.MEDICAL_BRANCH_ID;
        const branchName = branchMap.get(assignedBranchId) || (isDentistry ? 'Sucursal Odontología' : 'Sucursal Médica');

        return {
          id: prof.id,
          name: prof.nombre,
          lastName: prof.apellidos,
          fullName: `${prof.nombre} ${prof.apellidos}`.trim(),
          specialty: prof.especialidad || 'Sin especialidad',
          interval: prof.intervalo,
          isActive: prof.habilitado !== false,
          // IMPORTANTE: Incluir información de sucursal
          branchId: assignedBranchId,
          branchName: branchName,
          description: `Dr(a). ${prof.nombre} ${prof.apellidos} (${prof.especialidad || 'Medicina General'}). Atiende en: ${branchName} (ID: ${assignedBranchId}).`,
          displayText: `${prof.nombre} ${prof.apellidos} - ${prof.especialidad || 'Sin especialidad'} (ID: ${prof.id}) - ${branchName}`,
        };
      });

      this.logger.log(`📋 Total de profesionales formateados: ${professionalsFormatted.length}`);

      // Log de los primeros 10 profesionales para debugging
      if (professionalsFormatted.length > 0) {
        this.logger.log(`📋 Primeros 10 profesionales:`);
        professionalsFormatted.slice(0, 10).forEach((prof, idx) => {
          this.logger.log(`   ${idx + 1}. "${prof.fullName}" - ${prof.specialty} (ID: ${prof.id})`);
        });
      }

      let message = '';
      let professionalsToReturn: any[];
      let limited = false;

      if (professionalsFormatted.length === 0) {
        // No se encontraron profesionales
        if (specialty) {
          message = `No se encontraron profesionales con la especialidad "${specialty}". Por favor, verifica el nombre de la especialidad o consulta las especialidades disponibles usando list_services.`;
        } else if (searchName) {
          message = `No se encontraron profesionales que coincidan con "${searchName}". Por favor, verifica el nombre o consulta la lista completa de profesionales.`;
        } else {
          message = 'No se encontraron profesionales disponibles.';
        }
        professionalsToReturn = [];
      } else if (specialty) {
        // Filtrar por especialidad - respuesta optimizada
        this.logger.log(`📋 Mostrando profesionales de especialidad "${specialty}"`);

        const professionalsLight = professionalsFormatted.map(prof => ({
          id: prof.id,
          fullName: prof.fullName,
          specialty: prof.specialty,
          branchId: prof.branchId,
          branchName: prof.branchName,
        }));

        const maxResults = 100; // Permitir más resultados cuando se filtra por especialidad
        limited = professionalsLight.length > maxResults;
        professionalsToReturn = limited ? professionalsLight.slice(0, maxResults) : professionalsLight;

        message = `**Profesionales de ${specialty}** (${professionalsFormatted.length}${limited ? `, mostrando primeros ${maxResults}` : ''} encontrados):

${professionalsToReturn.map((p, idx) => `${idx + 1}. ${p.fullName} - ${p.specialty} - ID: ${p.id} - Atiende en: ${p.branchName} (branchId: ${p.branchId})`).join('\n')}

**IMPORTANTE PARA EL AGENTE:** Usa el 'branchId' listado aquí para consultar la disponibilidad con 'get_available_slots'. Cada profesional ya tiene su sucursal asignada.`;
      } else if (searchName) {
        // Búsqueda por nombre - mantener lógica semántica
        this.logger.log(`🔍 Término de búsqueda proporcionado: "${searchName}" - El LLM filtrará semánticamente`);

        const professionalsLight = professionalsFormatted.map(prof => ({
          id: prof.id,
          fullName: prof.fullName,
          specialty: prof.specialty,
          branchId: prof.branchId,
          branchName: prof.branchName,
          description: prof.description,
        }));

        const maxResults = 50;
        limited = professionalsLight.length > maxResults;
        professionalsToReturn = limited ? professionalsLight.slice(0, maxResults) : professionalsLight;

        message = `Búsqueda solicitada: "${searchName}"

Analiza los profesionales listados y determina cuáles son relevantes para "${searchName}". Considera:
- Especialidades semánticamente relacionadas (ej: "ginecólogo" ↔ "ginecología")
- Nombres o apellidos que coincidan
- Términos generales relacionados

Profesionales disponibles (${professionalsFormatted.length}${limited ? `, mostrando primeros 50` : ''}):
${professionalsToReturn.map((p, idx) => `${idx + 1}. ${p.fullName} | ${p.specialty} | ID: ${p.id} | ${p.branchName} (branchId: ${p.branchId})`).join('\n')}

**IMPORTANTE PARA EL AGENTE:** Cada profesional ya incluye su sucursal (branchId). Usa ese branchId directamente con get_available_slots. No necesitas llamar a list_branches.`;
      } else {
        // Sin filtros, mostrar todos
        const maxResults = 50;
        limited = professionalsFormatted.length > maxResults;
        professionalsToReturn = limited ? professionalsFormatted.slice(0, maxResults) : professionalsFormatted;

        const displayCount = Math.min(professionalsToReturn.length, 20);
        message = `Se encontraron ${professionalsFormatted.length} profesionales disponibles${limited ? ` (mostrando los primeros ${maxResults})` : ''}:

${professionalsToReturn.slice(0, displayCount).map(p => `${p.fullName} (${p.specialty}) - ID: ${p.id} - ${p.branchName} (branchId: ${p.branchId})`).join('\n')}
${professionalsToReturn.length > displayCount ? `\n... y ${professionalsToReturn.length - displayCount} profesionales más.` : ''}

**IMPORTANTE PARA EL AGENTE:** Cada profesional ya incluye su sucursal (branchId). Usa ese branchId directamente con get_available_slots. No necesitas llamar a list_branches.`;
      }

      return {
        success: true,
        data: {
          professionals: professionalsToReturn,
          totalFound: professionalsFormatted.length,
          limited: limited,
          specialty: specialty || null,
          message,
        },
      };
    } catch (error) {
      this.logger.error(`Error obteniendo profesionales: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verifica si una especialidad es de odontología
   */
  private isDentistrySpecialty(specialty: string): boolean {
    if (!specialty) return false;
    const specialtyLower = specialty.toLowerCase().trim();
    return this.DENTISTRY_SPECIALTIES.some(dentistryTerm =>
      specialtyLower.includes(dentistryTerm) || dentistryTerm.includes(specialtyLower)
    );
  }

  /**
   * Verifica si una especialidad coincide con un término de búsqueda
   * Maneja variantes comunes de especialidades
   */
  private matchesSpecialty(profSpecialty: string, searchTerm: string): boolean {
    // Mapeo de términos comunes a especialidades
    const specialtyMap: Record<string, string[]> = {
      'ginecolog': ['ginecología', 'ginecologia', 'ginecólogo', 'ginecologo', 'obstetricia'],
      'cardiolog': ['cardiología', 'cardiologia', 'cardiólogo', 'cardiologo'],
      'pediatr': ['pediatría', 'pediatria', 'pediatra'],
      'dermatolog': ['dermatología', 'dermatologia', 'dermatólogo', 'dermatologo'],
      'neurolog': ['neurología', 'neurologia', 'neurólogo', 'neurologo'],
      'traumatolog': ['traumatología', 'traumatologia', 'traumatólogo', 'traumatologo', 'ortopedia'],
      'oftalmolog': ['oftalmología', 'oftalmologia', 'oftalmólogo', 'oftalmologo'],
      'otorrinolaringolog': ['otorrinolaringología', 'otorrinolaringologia', 'otorrinolaringólogo', 'otorrinolaringologo', 'orl'],
      'psiquiatr': ['psiquiatría', 'psiquiatria', 'psiquiatra'],
      'psicolog': ['psicología', 'psicologia', 'psicólogo', 'psicologo'],
      'urolog': ['urología', 'urologia', 'urólogo', 'urologo'],
      'endocrinolog': ['endocrinología', 'endocrinologia', 'endocrinólogo', 'endocrinologo'],
    };

    // Buscar en el mapa
    for (const [key, variants] of Object.entries(specialtyMap)) {
      if (searchTerm.includes(key) || key.includes(searchTerm)) {
        return variants.some(variant =>
          profSpecialty.includes(variant) || variant.includes(profSpecialty)
        );
      }
    }

    return false;
  }

  /**
   * Obtiene los horarios disponibles para un profesional
   */
  private async getAvailableSlots(companyId: string, args: any): Promise<any> {
    this.logger.log('🔍 === INICIO get_available_slots ===');
    this.logger.log(`📋 Args recibidos: ${JSON.stringify(args, null, 2)}`);

    try {
      // 1. Normalización de parámetros
      const professionalId = args.professionalId || args.professional_id || args.id_profesional;
      const branchId = args.branchId || args.branch_id || args.id_sucursal;
      const startDate = args.startDate || args.start_date || args.fromDate || args.from_date || this.getTodayDate();
      const endDate = args.endDate || args.end_date || args.toDate || args.to_date || this.getDatePlusDays(7);
      const chairId = args.chairId || args.chair_id || args.id_sillon;

      this.logger.log(`📊 Parámetros extraídos: professionalId=${professionalId}, branchId=${branchId}, startDate=${startDate}, endDate=${endDate}`);

      if (!professionalId || !branchId) {
        this.logger.error('❌ Faltan parámetros requeridos');
        return {
          success: false,
          error: 'Faltan parámetros: professionalId y branchId son obligatorios.',
        };
      }

      // 2. VALIDACIÓN ESTRICTA: Verificar que el profesional existe y está habilitado
      this.logger.log(`🕵️ Validando profesional ${professionalId} en sucursal ${branchId}...`);

      // Obtenemos TODOS los profesionales (sin filtrar por sucursal para validar existencia global)
      let allProfessionals: any[];
      try {
        allProfessionals = await this.medilinkService.listProfessionals(companyId);
      } catch (error) {
        this.logger.error(`❌ Error obteniendo lista de profesionales: ${error.message}`);
        return {
          success: false,
          error: 'No se pudo validar el profesional. Por favor, intenta nuevamente.',
        };
      }

      // Buscamos el profesional específico
      const professional = allProfessionals.find(p =>
        p.id.toString() === professionalId.toString()
      );

      // 2.1 Validación de Existencia Global
      if (!professional) {
        this.logger.warn(`❌ Profesional ID ${professionalId} no encontrado en la empresa.`);
        return {
          success: true, // Retornamos true para que el bot lea el mensaje
          data: {
            slots: [],
            totalSlots: 0,
            professionalName: '',
            branchName: '',
            message: `Error: El profesional con ID ${professionalId} no existe en el sistema. Por favor, pide al usuario que seleccione un profesional de la lista válida usando la herramienta list_professionals.`
          }
        };
      }

      this.logger.log(`✅ Profesional encontrado: ${professional.nombre} ${professional.apellidos}`);

      // 2.1.5 Validación de Sucursal vs Especialidad (hardcodeado)
      const professionalSpecialty = (professional.especialidad || '').toLowerCase().trim();
      const isDentistry = this.isDentistrySpecialty(professionalSpecialty);
      const branchIdStr = branchId.toString();

      // Validar que odontología solo esté en sucursal 2
      if (isDentistry && branchIdStr !== this.DENTISTRY_BRANCH_ID) {
        this.logger.warn(`❌ Profesional de odontología ${professional.nombre} ${professional.apellidos} no puede atender en sucursal ${branchIdStr}. Solo atiende en sucursal ${this.DENTISTRY_BRANCH_ID}.`);
        return {
          success: true,
          data: {
            slots: [],
            totalSlots: 0,
            professionalName: `${professional.nombre} ${professional.apellidos}`,
            branchName: '',
            message: `ERROR DE SUCURSAL: El profesional ${professional.nombre} ${professional.apellidos} es de odontología y solo atiende en la Sucursal ${this.DENTISTRY_BRANCH_ID}, no en la ${branchIdStr}. Por favor vuelve a intentar llamando a la función get_available_slots con branchId='${this.DENTISTRY_BRANCH_ID}'.`
          }
        };
      }

      // Validar que médicos (no odontología) solo estén en sucursal 1
      if (!isDentistry && branchIdStr === this.DENTISTRY_BRANCH_ID) {
        this.logger.warn(`❌ Profesional médico ${professional.nombre} ${professional.apellidos} no puede atender en sucursal ${branchIdStr}. Solo atiende en sucursal ${this.MEDICAL_BRANCH_ID}.`);
        return {
          success: true,
          data: {
            slots: [],
            totalSlots: 0,
            professionalName: `${professional.nombre} ${professional.apellidos}`,
            branchName: '',
            message: `ERROR DE SUCURSAL: El profesional ${professional.nombre} ${professional.apellidos} es médico y solo atiende en la Sucursal ${this.MEDICAL_BRANCH_ID}, no en la ${branchIdStr}. La sucursal ${this.DENTISTRY_BRANCH_ID} es exclusiva para odontología. Por favor vuelve a intentar llamando a la función get_available_slots con branchId='${this.MEDICAL_BRANCH_ID}'.`
          }
        };
      }

      // 2.2 Validación de Estado (Habilitado)
      // Verifica si existe la propiedad 'habilitado' o 'estado'
      const isDisabled = professional.habilitado === false ||
        professional.habilitado === 0 ||
        professional.estado === 'Deshabilitado' ||
        professional.estado === 'Inactivo';

      if (isDisabled) {
        this.logger.warn(`❌ Profesional ID ${professionalId} está deshabilitado.`);
        return {
          success: true,
          data: {
            slots: [],
            totalSlots: 0,
            professionalName: `${professional.nombre} ${professional.apellidos}`,
            branchName: '',
            message: `El profesional ${professional.nombre} ${professional.apellidos} no está habilitado para agendar citas actualmente. Por favor, selecciona otro profesional.`
          }
        };
      }

      // 3. Obtener duración real del profesional
      const duration = professional.intervalo || 30;
      this.logger.log(`✅ Usando intervalo configurado: ${duration} min`);

      // 4. Ejecutar búsqueda de horarios (Ahora es seguro llamar a la API)
      this.logger.log(`🗓️ Obteniendo disponibilidad:`);
      this.logger.log(`   - Profesional ID: ${professionalId}`);
      this.logger.log(`   - Profesional: ${professional.nombre} ${professional.apellidos}`);
      this.logger.log(`   - Sucursal ID: ${branchId}`);
      this.logger.log(`   - Fecha inicio: ${startDate}`);
      this.logger.log(`   - Fecha fin: ${endDate}`);
      this.logger.log(`   - Duración: ${duration} min`);

      let slots: any[];
      try {
        slots = await this.medilinkService.getAvailability(companyId, {
          professionalId: professionalId.toString(),
          branchId: branchId.toString(),
          fromDate: startDate,
          toDate: endDate,
          duration,
          chairId: chairId?.toString(),
        });
      } catch (error: any) {
        // Si es un 404, significa que el profesional no atiende en esa sucursal
        if (error?.response?.status === 404) {
          this.logger.warn(`❌ 404: Profesional ${professional.nombre} ${professional.apellidos} no atiende en sucursal ${branchId}`);
          return {
            success: true,
            data: {
              slots: [],
              totalSlots: 0,
              professionalName: `${professional.nombre} ${professional.apellidos}`,
              branchName: '',
              message: `El profesional ${professional.nombre} ${professional.apellidos} no atiende en la sucursal ID ${branchId}. Por favor, verifica en qué sucursal atiende este profesional o selecciona otra sucursal.`
            }
          };
        }
        // Re-lanzar otros errores
        throw error;
      }

      this.logger.log(`✅ Slots disponibles encontrados: ${slots.length}`);
      if (slots.length > 0) {
        this.logger.log(`📋 Primeros 5 slots: ${slots.slice(0, 5).map(s => `${s.date} ${s.time}`).join(', ')}`);
      }

      // Obtener información de sucursal para el mensaje
      let branchName = '';
      try {
        const branches = await this.medilinkService.listBranches(companyId);
        const branch = branches.find(b => b.id.toString() === branchId.toString());
        branchName = branch?.nombre || '';
      } catch (error) {
        this.logger.warn(`⚠️ No se pudo obtener nombre de sucursal: ${error.message}`);
      }

      // Agrupar slots por fecha
      const slotsByDate: Record<string, string[]> = {};
      slots.forEach(slot => {
        if (!slotsByDate[slot.date]) {
          slotsByDate[slot.date] = [];
        }
        slotsByDate[slot.date].push(slot.time);
      });

      // Ordenar fechas
      const sortedDates = Object.keys(slotsByDate).sort();

      // Formatear slots agrupados por día
      const slotsGrouped = sortedDates.map(date => {
        const times = slotsByDate[date].sort();
        return {
          date,
          times,
          displayDate: this.formatDateSpanish(date),
        };
      });

      // Formatear slots individuales para compatibilidad (mantener estructura)
      const slotsFormatted = slots.slice(0, 20).map((slot, index) => ({
        index: index + 1,
        date: slot.date,
        time: slot.time,
        displayText: `${this.formatDateSpanish(slot.date)} a las ${slot.time}`,
        professional: slot.professionalName || `${professional.nombre} ${professional.apellidos}`,
        branch: slot.branchName || branchName,
        chairId: slot.chairId,
      }));

      // Crear mensaje compacto agrupado por día
      const slotsByDayText = slotsGrouped.map(day => {
        const timesFormatted = day.times.join(', ');
        return `${day.displayDate}: ${timesFormatted}`;
      }).join('\n');

      // Al construir el mensaje final, sé explícito sobre QUIÉN se buscó
      const professionalFullName = `${professional.nombre} ${professional.apellidos}`;
      const message = slots.length > 0
        ? `**Horarios para ${professionalFullName}${branchName ? ` en ${branchName}` : ''}:**

**INFORMACIÓN PARA AGENDAMIENTO:**
- ProfessionalId: ${professionalId}
- BranchId: ${branchId}
- Profesional: ${professionalFullName}
- Sucursal: ${branchName || `ID ${branchId}`}

**Horarios disponibles (${slots.length} en total):**

${slotsByDayText}

**IMPORTANTE:** Para crear la cita, usa professionalId="${professionalId}" y branchId="${branchId}" con la fecha (YYYY-MM-DD) y hora (HH:MM) que el paciente elija.

**INSTRUCCIÓN:** Muestra estos horarios al usuario. NO vuelvas a llamar a get_available_slots para verificar. Espera a que el usuario elija una hora.`
        : `No se encontraron horarios disponibles para **${professionalFullName}**${branchName ? ` en ${branchName}` : ` en la sucursal ID ${branchId}`} entre ${startDate} y ${endDate}.\n\n` +
        `**IMPORTANTE:** NO busques en otras sucursales o profesionales automáticamente. Pregunta al paciente qué desea hacer:\n` +
        `1. Ver otras fechas más adelante con el mismo profesional\n` +
        `2. Elegir otro profesional\n` +
        `3. Cambiar de sucursal\n\n` +
        `Espera la decisión del paciente antes de hacer nuevas consultas.`;

      const result = {
        success: true,
        data: {
          slots: slotsFormatted,
          totalSlots: slots.length,
          professionalName: professionalFullName, // Nombre REAL de la base de datos
          branchName: branchName,
          message,
        },
      };

      this.logger.log(`📤 Devolviendo resultado con ${slotsFormatted.length} slots formateados`);
      this.logger.log(`📝 Mensaje para LLM: ${message.substring(0, 200)}...`);
      this.logger.log('🔍 === FIN get_available_slots ===');

      return result;
    } catch (error: any) {
      // Manejo de errores mejorado
      this.logger.error(`Error crítico en getAvailableSlots: ${error.message}`);
      this.logger.error(`Stack: ${error.stack}`);

      // Detectar si fue un error de validación que se escapó
      if (error.message?.includes('404') || error?.response?.status === 404) {
        return {
          success: true,
          data: {
            slots: [],
            totalSlots: 0,
            professionalName: '',
            branchName: '',
            message: "La sucursal seleccionada no parece tener asignado a este profesional. Por favor, verifica en qué sucursal atiende este profesional o selecciona otra sucursal."
          }
        };
      }

      return {
        success: false,
        error: error.message || 'Error desconocido al obtener disponibilidad',
      };
    }
  }

  /**
   * Agenda una cita
   */
  private async scheduleAppointment(companyId: string, args: any): Promise<any> {
    // Variable para guardar el resultado de la API en caso de error posterior (fail-safe)
    let appointmentResult = null;
    let dto = null;

    try {
      //this.logger.log(`📅 Creando cita con datos:`, args);

      // Validar datos requeridos del paciente
      const patientData = args.patientData || args.patient_data || args.patient || {};

      if (!patientData.name && !patientData.nombre) {
        return {
          success: false,
          error: 'Datos del paciente requeridos: nombre, apellido, email',
        };
      }

      // Validar datos de la cita
      if (!args.professionalId && !args.professional_id) {
        return {
          success: false,
          error: 'Datos requeridos: profesional, sucursal, fecha y hora',
        };
      }

      const professionalId = (args.professionalId || args.professional_id || args.id_profesional).toString();
      const branchId = (args.branchId || args.branch_id || args.id_sucursal).toString();

      // IMPORTANTE: SIEMPRE obtener el intervalo del profesional de su configuración
      this.logger.log(`⏱️ Obteniendo intervalo del profesional ID ${professionalId} para crear cita...`);
      let duration = 30; // Fallback por defecto
      let professional: any = null;

      try {
        // Obtener todos los profesionales para validar (sin filtrar por sucursal)
        const allProfessionals = await this.medilinkService.listProfessionals(companyId);
        professional = allProfessionals.find(p =>
          p.id === professionalId || p.id.toString() === professionalId.toString()
        );

        if (!professional) {
          return {
            success: false,
            error: `El profesional con ID ${professionalId} no existe en el sistema.`,
          };
        }

        // Validación de Sucursal vs Especialidad (hardcodeado)
        const professionalSpecialty = (professional.especialidad || '').toLowerCase().trim();
        const isDentistry = this.isDentistrySpecialty(professionalSpecialty);
        const branchIdStr = branchId.toString();

        // Validar que odontología solo esté en sucursal 2
        if (isDentistry && branchIdStr !== this.DENTISTRY_BRANCH_ID) {
          this.logger.warn(`❌ No se puede agendar: Profesional de odontología ${professional.nombre} ${professional.apellidos} no puede atender en sucursal ${branchIdStr}. Solo atiende en sucursal ${this.DENTISTRY_BRANCH_ID}.`);
          return {
            success: false,
            error: `ERROR DE SUCURSAL: El profesional ${professional.nombre} ${professional.apellidos} es de odontología y solo atiende en la Sucursal ${this.DENTISTRY_BRANCH_ID}, no en la ${branchIdStr}. Por favor vuelve a intentar llamando a la función create_appointment con branchId='${this.DENTISTRY_BRANCH_ID}'.`
          };
        }

        // Validar que médicos (no odontología) solo estén en sucursal 1
        if (!isDentistry && branchIdStr === this.DENTISTRY_BRANCH_ID) {
          this.logger.warn(`❌ No se puede agendar: Profesional médico ${professional.nombre} ${professional.apellidos} no puede atender en sucursal ${branchIdStr}. Solo atiende en sucursal ${this.MEDICAL_BRANCH_ID}.`);
          return {
            success: false,
            error: `ERROR DE SUCURSAL: El profesional ${professional.nombre} ${professional.apellidos} es médico y solo atiende en la Sucursal ${this.MEDICAL_BRANCH_ID}, no en la ${branchIdStr}. La sucursal ${this.DENTISTRY_BRANCH_ID} es exclusiva para odontología. Por favor vuelve a intentar llamando a la función create_appointment con branchId='${this.MEDICAL_BRANCH_ID}'.`
          };
        }

        if (professional?.intervalo) {
          duration = professional.intervalo;
          this.logger.log(`✅ Usando intervalo del profesional para crear cita: ${duration} minutos`);
        } else {
          this.logger.warn(`⚠️ Profesional ID ${professionalId} no tiene intervalo configurado, usando 30 min por defecto`);
        }
      } catch (error) {
        this.logger.warn(`⚠️ Error obteniendo info del profesional: ${error.message}, usando 30 min por defecto`);
      }

      // Preparar DTO
      dto = {
        phoneE164: args.phoneE164 || args.phone_e164 || '+56912345678', // Default si no viene
        patient: {
          name: patientData.name || patientData.nombre,
          lastName: patientData.lastName || patientData.last_name || patientData.apellidos || patientData.apellido,
          email: patientData.email || patientData.correo,
          rut: patientData.rut,
          birthDate: patientData.birthDate || patientData.birth_date || patientData.fecha_nacimiento,
        },
        branchId,
        professionalId,
        chairId: (args.chairId || args.chair_id || args.id_sillon || '1').toString(),
        dateYmd: args.dateYmd || args.date_ymd || args.date || args.fecha,
        time: args.timeHhmm || args.time_hhmm || args.time || args.hora,
        durationMin: duration,
        comment: args.comment || args.comentario || 'Cita agendada vía WhatsApp Bot',
        videoconsulta: args.videoconsulta || false,
        attentionId: args.attentionId || args.attention_id || args.id_atencion,
      };

      //this.logger.log(`📝 DTO preparado:`, dto);

      // 1. LLAMADA CRÍTICA A LA API DE MEDILINK (El paso más importante)
      // Guardamos el resultado inmediatamente después de la llamada exitosa
      appointmentResult = await this.medilinkService.createAppointment(companyId, dto);

      this.logger.log(`✅ Cita creada en Medilink: ${JSON.stringify(appointmentResult, null, 2)}`);

      // 2. RETORNO EXITOSO NORMAL
      return {
        success: true,
        data: {
          appointmentId: appointmentResult.appointmentId,
          confirmationCode: appointmentResult.confirmationCode,
          message: `¡Cita agendada exitosamente!\n\n` +
            `📋 Código de confirmación: ${appointmentResult.confirmationCode}\n` +
            `👨‍⚕️ Profesional: ${appointmentResult.professionalName}\n` +
            `🏥 Sucursal: ${appointmentResult.branchName}\n` +
            `📅 Fecha: ${this.formatDateSpanish(dto.dateYmd)}\n` +
            `🕐 Hora: ${dto.time}\n` +
            `⏱️ Duración: ${appointmentResult.duration} minutos\n\n` +
            `Te esperamos. ${appointmentResult.whatsappMessageSent ? 'Te hemos enviado un recordatorio por WhatsApp.' : ''}`,
        },
      };
    } catch (error) {
      this.logger.error(`Error creando cita: ${error.message}`);
      this.logger.error(`Stack: ${error.stack}`);

      // 3. LÓGICA FAIL-SAFE (Salvavidas)
      // Si tenemos appointmentResult, significa que la API de Medilink respondió OK antes del crash
      if (appointmentResult) {
        this.logger.warn(`⚠️ [FAIL-SAFE] Recuperando éxito de API Medilink a pesar de error local posterior. Cita ID: ${appointmentResult.appointmentId}`);
        return {
          success: true,
          data: {
            appointmentId: appointmentResult.appointmentId,
            confirmationCode: appointmentResult.confirmationCode || appointmentResult.appointmentId,
            message: `¡Cita confirmada! (ID: ${appointmentResult.appointmentId})\n\n` +
              `👨‍⚕️ Profesional: ${appointmentResult.professionalName || 'Profesional'}\n` +
              `🏥 Sucursal: ${appointmentResult.branchName || 'Sucursal'}\n` +
              `📅 Fecha: ${dto ? this.formatDateSpanish(dto.dateYmd) : 'Fecha confirmada'}\n` +
              `🕐 Hora: ${dto ? dto.time : 'Hora confirmada'}\n\n` +
              `Nota: Hubo una pequeña interrupción interna, pero tu hora con el médico ya está reservada en el sistema.`,
          },
        };
      }

      // Manejar error específico de atención
      if (error.message.includes('atencion') || error.message.includes('attention')) {
        return {
          success: false,
          error: 'No se pudo crear la cita. El paciente necesita una atención médica activa. Por favor, contacta con el centro médico.',
          needsHumanIntervention: true,
        };
      }

      // Si falló antes de la API, es un error real
      return {
        success: false,
        error: error.message || 'No se pudo concretar la reserva. Por favor intenta nuevamente en unos momentos.',
      };
    }
  }

  /**
   * Reagenda una cita existente
   */
  private async rescheduleAppointment(companyId: string, args: any): Promise<any> {
    try {
      const appointmentId = args.appointmentId || args.appointment_id;
      const newDate = args.newDateYmd || args.new_date_ymd || args.newDate;
      const newTime = args.newTime || args.newTimeHhmm || args.new_time_hhmm || args.time;

      this.logger.log(`🔄 Reagendando cita ${appointmentId} a ${newDate} ${newTime}`);

      if (!appointmentId || !newDate || !newTime) {
        return {
          success: false,
          error: 'Se requiere: appointmentId, nueva fecha (newDateYmd) y nueva hora (newTime)',
        };
      }

      const professionalId = args.professionalId?.toString();
      const branchId = args.branchId?.toString();

      // IMPORTANTE: SIEMPRE obtener el intervalo del profesional si tenemos el ID
      let duration: number | undefined;

      if (professionalId && branchId) {
        this.logger.log(`⏱️ Obteniendo intervalo del profesional ID ${professionalId} para reagendar...`);
        try {
          // Obtener todos los profesionales para validar (sin filtrar por sucursal)
          const allProfessionals = await this.medilinkService.listProfessionals(companyId);
          const professional = allProfessionals.find(p =>
            p.id === professionalId || p.id.toString() === professionalId.toString()
          );

          if (professional) {
            // Validación de Sucursal vs Especialidad (hardcodeado)
            const professionalSpecialty = (professional.especialidad || '').toLowerCase().trim();
            const isDentistry = this.isDentistrySpecialty(professionalSpecialty);
            const branchIdStr = branchId.toString();

            // Validar que odontología solo esté en sucursal 2
            if (isDentistry && branchIdStr !== this.DENTISTRY_BRANCH_ID) {
              this.logger.warn(`❌ No se puede reagendar: Profesional de odontología ${professional.nombre} ${professional.apellidos} no puede atender en sucursal ${branchIdStr}. Solo atiende en sucursal ${this.DENTISTRY_BRANCH_ID}.`);
              return {
                success: false,
                error: `El profesional ${professional.nombre} ${professional.apellidos} es de odontología y solo atiende en la sucursal ${this.DENTISTRY_BRANCH_ID}. Por favor, reagende en la sucursal correcta.`
              };
            }

            // Validar que médicos (no odontología) solo estén en sucursal 1
            if (!isDentistry && branchIdStr === this.DENTISTRY_BRANCH_ID) {
              this.logger.warn(`❌ No se puede reagendar: Profesional médico ${professional.nombre} ${professional.apellidos} no puede atender en sucursal ${branchIdStr}. Solo atiende en sucursal ${this.MEDICAL_BRANCH_ID}.`);
              return {
                success: false,
                error: `El profesional ${professional.nombre} ${professional.apellidos} es médico y solo atiende en la sucursal ${this.MEDICAL_BRANCH_ID}. La sucursal ${this.DENTISTRY_BRANCH_ID} es exclusiva para odontología. Por favor, reagende en la sucursal correcta.`
              };
            }

            if (professional?.intervalo) {
              duration = professional.intervalo;
              this.logger.log(`✅ Usando intervalo del profesional para reagendar: ${duration} minutos`);
            } else {
              this.logger.warn(`⚠️ Profesional ID ${professionalId} no tiene intervalo configurado`);
            }
          }
        } catch (error) {
          this.logger.warn(`⚠️ Error obteniendo info del profesional: ${error.message}`);
        }
      }

      const result = await this.medilinkService.rescheduleAppointment(companyId, {
        appointmentId: appointmentId.toString(),
        newDateYmd: newDate,
        newTime: newTime,
        branchId,
        professionalId,
        chairId: args.chairId?.toString(),
        durationMin: duration,
        comment: args.comment || 'Reagendada vía WhatsApp Bot',
      });

      return {
        success: true,
        data: {
          ...result,
          message: `✅ Cita reagendada exitosamente.\n\n` +
            `📋 ID nueva cita: ${result.newAppointmentId}\n` +
            `👨‍⚕️ Profesional: ${result.professionalName}\n` +
            `🏥 Sucursal: ${result.branchName}\n` +
            `📅 Nueva fecha: ${this.formatDateSpanish(result.newDate)}\n` +
            `🕐 Nueva hora: ${result.newTime}\n\n` +
            `La cita anterior (ID: ${result.oldAppointmentId}) ha sido anulada.`,
        },
      };
    } catch (error) {
      this.logger.error(`Error reagendando cita: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Cancela una cita
   */
  private async cancelAppointment(companyId: string, args: any): Promise<any> {
    try {
      const appointmentId = args.appointmentId || args.appointment_id;
      const reason = args.reason || args.razon || 'Cancelado por paciente';

      if (!appointmentId) {
        return {
          success: false,
          error: 'Se requiere el ID de la cita',
        };
      }

      const result = await this.medilinkService.cancelAppointment(companyId, {
        appointmentId: appointmentId.toString(),
        reason,
      });

      return {
        success: true,
        data: {
          ...result,
          message: 'Cita cancelada exitosamente.',
        },
      };
    } catch (error) {
      this.logger.error(`Error cancelando cita: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Busca un paciente
   */
  private async searchPatient(companyId: string, args: any): Promise<any> {
    try {
      const query = args.query || args.q || args.phone || args.rut;

      if (!query) {
        return {
          success: false,
          error: 'Se requiere un término de búsqueda (teléfono, RUT, nombre)',
        };
      }

      const patients = await this.medilinkService.searchPatient(companyId, query);

      return {
        success: true,
        data: {
          patients: patients.map(p => ({
            id: p.id,
            fullName: `${p.nombres} ${p.apellidos}`,
            rut: p.rut,
            email: p.email,
            phone: p.telefono,
          })),
          found: patients.length > 0,
          message: patients.length > 0
            ? `Se encontraron ${patients.length} pacientes.`
            : 'No se encontraron pacientes con ese criterio.',
        },
      };
    } catch (error) {
      this.logger.error(`Error buscando paciente: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Busca un paciente por RUT, email o teléfono
   */
  private async findPatientByContact(companyId: string, args: any): Promise<any> {
    try {
      const rut = args.rut;
      const email = args.email;
      // Mapear celular a telefono si viene (son lo mismo)
      const telefono = args.telefono || args.celular || args.phone;

      // Validar que al menos un parámetro esté presente
      if (!rut && !email && !telefono) {
        return {
          success: false,
          error: 'Se requiere al menos uno de los siguientes parámetros: rut, email o telefono',
        };
      }

      this.logger.log(`🔍 Buscando paciente por contacto: rut=${rut || 'N/A'}, email=${email || 'N/A'}, telefono=${telefono || 'N/A'}`);

      const patients = await this.medilinkService.findPatientByContact(companyId, {
        rut,
        email,
        telefono,
      });

      if (patients.length === 0) {
        return {
          success: true,
          data: {
            patient: null,
            found: false,
            message: 'No se encontró ningún paciente con los datos proporcionados.',
          },
        };
      }

      // Si hay múltiples resultados, retornar el primero (normalmente debería ser único)
      const patient = patients[0];

      // Normalizar datos del paciente
      const normalizedPatient = {
        id: patient.id,
        nombres: patient.nombres || '',
        apellidos: patient.apellidos || '',
        fullName: `${patient.nombres || ''} ${patient.apellidos || ''}`.trim(),
        rut: patient.rut || null,
        email: patient.email || null,
        telefono: patient.telefono || null,
        celular: patient.celular || null,
        fechaNacimiento: patient.fecha_nacimiento || null,
        direccion: patient.direccion || null,
        comuna: patient.comuna || null,
        ciudad: patient.ciudad || null,
      };

      this.logger.log(`✅ Paciente encontrado: ${normalizedPatient.fullName} (ID: ${normalizedPatient.id})`);

      return {
        success: true,
        data: {
          patient: normalizedPatient,
          found: true,
          totalResults: patients.length,
          message: patients.length === 1
            ? `Paciente identificado: ${normalizedPatient.fullName}${normalizedPatient.rut ? ` (RUT: ${normalizedPatient.rut})` : ''}`
            : `Se encontraron ${patients.length} pacientes. Se muestra el primero: ${normalizedPatient.fullName}`,
        },
      };
    } catch (error) {
      this.logger.error(`Error buscando paciente por contacto: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Obtiene las citas de un paciente
   */
  private async getPatientAppointments(companyId: string, args: any): Promise<any> {
    try {
      const patientPhone = args.patientPhone || args.patient_phone || args.phone;

      if (!patientPhone) {
        return {
          success: false,
          error: 'Se requiere el teléfono del paciente',
        };
      }

      this.logger.log(`📅 Buscando citas del paciente con teléfono: ${patientPhone}`);

      const appointments = await this.medilinkService.getPatientAppointmentsByPhone(companyId, patientPhone);

      if (appointments.length === 0) {
        return {
          success: true,
          data: {
            appointments: [],
            message: 'No se encontraron citas para este paciente.',
          },
        };
      }

      // Filtrar por estado si se especificó
      const status = args.status?.toLowerCase();
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      let filteredAppointments = appointments;

      if (status === 'upcoming') {
        filteredAppointments = appointments.filter(apt => apt.fecha >= today);
      } else if (status === 'past') {
        filteredAppointments = appointments.filter(apt => apt.fecha < today);
      }

      // Formatear citas para el LLM
      const formattedAppointments = filteredAppointments.map(apt => ({
        id: apt.id,
        date: apt.fecha,
        time: apt.hora_inicio,
        duration: apt.duracion,
        professionalId: apt.id_profesional.toString(),
        branchId: apt.id_sucursal.toString(),
        status: apt.id_estado,
        comment: apt.comentario,
        displayText: `Cita ${apt.id} - ${this.formatDateSpanish(apt.fecha)} a las ${apt.hora_inicio} (${apt.duracion} min)`,
      }));

      return {
        success: true,
        data: {
          appointments: formattedAppointments,
          totalAppointments: filteredAppointments.length,
          message: `Se encontraron ${filteredAppointments.length} citas. Para cancelar una cita, usa el ID de la cita con cancel_appointment.\n\n` +
            formattedAppointments.map(apt => `- ${apt.displayText}`).join('\n'),
        },
      };
    } catch (error) {
      this.logger.error(`Error obteniendo citas del paciente: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // === UTILIDADES ===

  private getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  private getDatePlusDays(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  private formatDateSpanish(dateStr: string): string {
    const date = new Date(dateStr + 'T12:00:00');
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const monthName = months[date.getMonth()];

    return `${dayName} ${day} de ${monthName}`;
  }
}