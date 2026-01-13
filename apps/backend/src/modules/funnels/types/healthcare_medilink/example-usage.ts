/**
 * Ejemplo de uso del funnel healthcare_medilink
 * 
 * Este archivo muestra cómo se utiliza el funnel de agendamiento médico
 * en diferentes escenarios de uso.
 */

import { HealthcareMedilinkContext, HealthcareMedilinkStage } from './definition';
import { HealthcareMedilinkRunners } from './runners';
import { MedilinkTools } from '../../../ai-bots/tools/medilink.tools';

/**
 * Ejemplo 1: Flujo completo exitoso
 */
export async function ejemploFlujoCompleto() {
  const context: HealthcareMedilinkContext = {
    currentStage: HealthcareMedilinkStage.INTAKE,
    companyId: 'company-123',
    channelId: 'whatsapp-456',
    clientId: 'client-789',
    patientData: {
      phoneE164: '+56912345678',
      name: 'Juan',
      lastName: 'Pérez',
      rut: '12345678-9',
      email: 'juan.perez@email.com',
    },
  };

  const runners = new HealthcareMedilinkRunners(
    // Inyectar dependencias reales
    null as any, // MedilinkService
    null as any, // E164Service
    null as any, // TimeService
  );

  // Ejecutar cada etapa del funnel
  console.log('🏥 Iniciando funnel de agendamiento médico...');

  // 1. INTAKE - Identificar paciente
  console.log('\n1️⃣ Etapa INTAKE: Identificando paciente...');
  const intakeResult = await runners.executeStage(HealthcareMedilinkStage.INTAKE, context);
  console.log('Resultado:', intakeResult);

  if (intakeResult.success) {
    context.currentStage = HealthcareMedilinkStage.NEEDS;
    
    // 2. NEEDS - Seleccionar sucursal
    console.log('\n2️⃣ Etapa NEEDS: Obteniendo sucursales...');
    const needsResult = await runners.executeStage(HealthcareMedilinkStage.NEEDS, context);
    console.log('Resultado:', needsResult);

    if (needsResult.success) {
      // Simular selección de sucursal
      context.preferences = {
        branchId: 'branch-001',
        branchName: 'Sucursal Centro',
      };
      context.currentStage = HealthcareMedilinkStage.SELECT_PROFESSIONAL;

      // 3. SELECT_PROFESSIONAL - Seleccionar profesional
      console.log('\n3️⃣ Etapa SELECT_PROFESSIONAL: Obteniendo profesionales...');
      const professionalResult = await runners.executeStage(HealthcareMedilinkStage.SELECT_PROFESSIONAL, context);
      console.log('Resultado:', professionalResult);

      if (professionalResult.success) {
        // Simular selección de profesional
        context.selections = {
          branchId: 'branch-001',
          professionalId: 'prof-001',
        };
        context.currentStage = HealthcareMedilinkStage.SELECT_SLOT;

        // 4. SELECT_SLOT - Seleccionar horario
        console.log('\n4️⃣ Etapa SELECT_SLOT: Obteniendo horarios...');
        const slotResult = await runners.executeStage(HealthcareMedilinkStage.SELECT_SLOT, context);
        console.log('Resultado:', slotResult);

        if (slotResult.success) {
          // Simular selección de horario
          context.selections = {
            ...context.selections,
            dateYmd: '2025-11-15',
            timeHhmm: '10:00',
            duration: 30,
          };
          context.currentStage = HealthcareMedilinkStage.ATTENTION_RESOLVE;

          // 5. ATTENTION_RESOLVE - Resolver atención
          console.log('\n5️⃣ Etapa ATTENTION_RESOLVE: Resolviendo atención...');
          const attentionResult = await runners.executeStage(HealthcareMedilinkStage.ATTENTION_RESOLVE, context);
          console.log('Resultado:', attentionResult);

          if (attentionResult.success) {
            context.currentStage = HealthcareMedilinkStage.CONFIRM;

            // 6. CONFIRM - Confirmar cita
            console.log('\n6️⃣ Etapa CONFIRM: Creando cita...');
            const confirmResult = await runners.executeStage(HealthcareMedilinkStage.CONFIRM, context);
            console.log('Resultado:', confirmResult);

            if (confirmResult.success) {
              context.currentStage = HealthcareMedilinkStage.DONE;

              // 7. DONE - Finalizar
              console.log('\n7️⃣ Etapa DONE: Finalizando proceso...');
              const doneResult = await runners.executeStage(HealthcareMedilinkStage.DONE, context);
              console.log('Resultado:', doneResult);

              console.log('\n✅ ¡Funnel completado exitosamente!');
              console.log('Cita creada:', context.appointment);
            }
          }
        }
      }
    }
  }
}

/**
 * Ejemplo 2: Paciente no encontrado (nuevo registro)
 */
export async function ejemploPacienteNuevo() {
  const context: HealthcareMedilinkContext = {
    currentStage: HealthcareMedilinkStage.INTAKE,
    companyId: 'company-123',
    channelId: 'whatsapp-456',
    clientId: 'client-789',
    patientData: {
      phoneE164: '+56987654321',
      name: 'María',
      lastName: 'González',
      rut: '87654321-0',
      email: 'maria.gonzalez@email.com',
    },
  };

  console.log('🆕 Ejemplo: Paciente nuevo en el sistema');
  console.log('Contexto inicial:', context);

  // El funnel manejará la creación del paciente automáticamente
  // cuando se llegue a la etapa CONFIRM
}

/**
 * Ejemplo 3: Sin horarios disponibles
 */
export async function ejemploSinHorarios() {
  const context: HealthcareMedilinkContext = {
    currentStage: HealthcareMedilinkStage.SELECT_SLOT,
    companyId: 'company-123',
    channelId: 'whatsapp-456',
    clientId: 'client-789',
    selections: {
      branchId: 'branch-001',
      professionalId: 'prof-001',
    },
  };

  console.log('❌ Ejemplo: Sin horarios disponibles');
  console.log('El bot debería sugerir:');
  console.log('- Probar con otro profesional');
  console.log('- Probar con otra sucursal');
  console.log('- Intentar en otra fecha');
}

/**
 * Ejemplo 4: Intervención humana requerida
 */
export async function ejemploIntervencionHumana() {
  const context: HealthcareMedilinkContext = {
    currentStage: HealthcareMedilinkStage.ATTENTION_RESOLVE,
    companyId: 'company-123',
    channelId: 'whatsapp-456',
    clientId: 'client-789',
    needsHumanIntervention: true,
    humanInterventionReason: 'Información médica compleja requiere revisión manual',
    retryCount: 3,
  };

  console.log('👨‍💼 Ejemplo: Intervención humana requerida');
  console.log('Razón:', context.humanInterventionReason);
  console.log('Reintentos:', context.retryCount);
}

/**
 * Ejemplo 5: Uso de herramientas del bot
 */
export async function ejemploHerramientasBot() {
  const tools = new MedilinkTools(
    null as any, // MedilinkService
  );

  const context: HealthcareMedilinkContext = {
    currentStage: HealthcareMedilinkStage.INTAKE,
    companyId: 'company-123',
    channelId: 'whatsapp-456',
    clientId: 'client-789',
  };

  console.log('🛠️ Ejemplo: Uso de herramientas del bot');

  // Buscar paciente
  console.log('\n1. Buscando paciente...');
  const searchResult = await tools.executeTool('search_patient', {
    phone: '+56912345678',
    rut: '12345678-9',
  }, context.companyId);
  console.log('Resultado búsqueda:', searchResult);

  // Listar sucursales
  console.log('\n2. Obteniendo sucursales...');
  const branchesResult = await tools.executeTool('list_branches', {}, context.companyId);
  console.log('Sucursales:', branchesResult);

  // Listar profesionales
  console.log('\n3. Obteniendo profesionales...');
  const professionalsResult = await tools.executeTool('list_professionals', {
    branchId: 'branch-001',
  }, context.companyId);
  console.log('Profesionales:', professionalsResult);

  // Obtener horarios
  console.log('\n4. Obteniendo horarios...');
  const slotsResult = await tools.executeTool('get_available_slots', {
    professionalId: 'prof-001',
    branchId: 'branch-001',
    startDate: '2025-11-01',
    endDate: '2025-11-30',
  }, context.companyId);
  console.log('Horarios:', slotsResult);

  // Crear cita
  console.log('\n5. Creando cita...');
  const appointmentResult = await tools.executeTool('schedule_appointment', {
    patientId: 'patient-123',
    professionalId: 'prof-001',
    branchId: 'branch-001',
    dateYmd: '2025-11-15',
    timeHhmm: '10:00',
    duration: 30,
  }, context.companyId);
  console.log('Cita creada:', appointmentResult);
}

/**
 * Ejemplo 6: Mensajes del bot por etapa
 */
export function ejemploMensajesBot() {
  const runners = new HealthcareMedilinkRunners(
    null as any, // MedilinkService
    null as any, // E164Service
    null as any, // TimeService
  );

  const context: HealthcareMedilinkContext = {
    currentStage: HealthcareMedilinkStage.INTAKE,
    companyId: 'company-123',
    channelId: 'whatsapp-456',
    clientId: 'client-789',
  };

  console.log('💬 Ejemplo: Mensajes del bot por etapa');

  // Mensajes de INTAKE
  console.log('\n📞 INTAKE:');
  console.log('- Welcome:', runners.getStageMessage(HealthcareMedilinkStage.INTAKE, 'welcome', context));
  console.log('- Request Name:', runners.getStageMessage(HealthcareMedilinkStage.INTAKE, 'requestName', context));
  console.log('- Patient Found:', runners.getStageMessage(HealthcareMedilinkStage.INTAKE, 'patientFound', context));

  // Mensajes de NEEDS
  console.log('\n🏥 NEEDS:');
  console.log('- Select Branch:', runners.getStageMessage(HealthcareMedilinkStage.NEEDS, 'selectBranch', context));

  // Mensajes de SELECT_PROFESSIONAL
  console.log('\n👨‍⚕️ SELECT_PROFESSIONAL:');
  console.log('- List Professionals:', runners.getStageMessage(HealthcareMedilinkStage.SELECT_PROFESSIONAL, 'listProfessionals', context));

  // Mensajes de SELECT_SLOT
  console.log('\n📅 SELECT_SLOT:');
  console.log('- List Slots:', runners.getStageMessage(HealthcareMedilinkStage.SELECT_SLOT, 'listSlots', context));

  // Mensajes de CONFIRM
  console.log('\n✅ CONFIRM:');
  console.log('- Confirm Details:', runners.getStageMessage(HealthcareMedilinkStage.CONFIRM, 'confirmDetails', context));
  console.log('- Appointment Created:', runners.getStageMessage(HealthcareMedilinkStage.CONFIRM, 'appointmentCreated', context));
}

/**
 * Ejemplo 7: Validaciones de datos
 */
export function ejemploValidaciones() {
  console.log('🔍 Ejemplo: Validaciones de datos médicos');

  // Validación de teléfono
  const phoneValid = /^\+56\d{8,9}$/.test('+56912345678');
  console.log('Teléfono +56912345678 válido:', phoneValid);

  // Validación de RUT
  const rutValid = /^\d{7,8}[0-9Kk]$/.test('12345678-9');
  console.log('RUT 12345678-9 válido:', rutValid);

  // Validación de email
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test('juan.perez@email.com');
  console.log('Email juan.perez@email.com válido:', emailValid);

  // Validación de fecha
  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test('2025-11-15');
  console.log('Fecha 2025-11-15 válida:', dateValid);

  // Validación de hora
  const timeValid = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test('10:00');
  console.log('Hora 10:00 válida:', timeValid);
}

/**
 * Ejemplo 8: Configuración del bot
 */
export function ejemploConfiguracionBot() {
  console.log('🤖 Ejemplo: Configuración del bot de Medilink');

  const config = {
    name: 'Asistente Médico Medilink',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 2000,
    functionsEnabled: true,
    contextWindow: 10,
    retryAttempts: 3,
    timeoutMs: 30000,
    customSettings: {
      validatePhoneFormat: true,
      validateRutFormat: true,
      requireConfirmation: true,
      maxBookingDays: 30,
      minAdvanceHours: 2,
      sendWhatsAppConfirmation: true,
      businessHours: {
        start: '08:00',
        end: '20:00',
        timezone: 'America/Santiago',
      },
      workingDays: [1, 2, 3, 4, 5],
      defaultAppointmentDuration: 30,
    },
  };

  console.log('Configuración:', JSON.stringify(config, null, 2));
}

/**
 * Función principal para ejecutar todos los ejemplos
 */
export async function ejecutarEjemplos() {
  console.log('🚀 Ejecutando ejemplos del funnel healthcare_medilink\n');

  try {
    await ejemploFlujoCompleto();
    await ejemploPacienteNuevo();
    await ejemploSinHorarios();
    await ejemploIntervencionHumana();
    await ejemploHerramientasBot();
    ejemploMensajesBot();
    ejemploValidaciones();
    ejemploConfiguracionBot();

    console.log('\n✅ Todos los ejemplos ejecutados correctamente');
  } catch (error) {
    console.error('❌ Error ejecutando ejemplos:', error);
  }
}

// Ejecutar ejemplos si se llama directamente
if (require.main === module) {
  ejecutarEjemplos();
}
