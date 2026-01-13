import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMedilinkFunnelStages1729200000001 implements MigrationInterface {
  name = 'CreateMedilinkFunnelStages1729200000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear el funnel de healthcare_medilink
    await queryRunner.query(`
      INSERT INTO "funnels" (
        "id", "name", "description", "isActive", "company_id", "created_at", "updated_at"
      ) VALUES (
        gen_random_uuid(),
        'Funnel de Agendamiento Médico',
        'Funnel especializado para agendamiento de citas médicas con integración Medilink',
        true,
        (SELECT "id" FROM "companies" LIMIT 1),
        NOW(),
        NOW()
      )
    `);

    // Obtener el ID del funnel creado
    const funnelResult = await queryRunner.query(`
      SELECT "id" FROM "funnels" 
      WHERE "name" = 'Funnel de Agendamiento Médico' 
      ORDER BY "created_at" DESC 
      LIMIT 1
    `);
    const funnelId = funnelResult[0]?.id;

    if (!funnelId) {
      throw new Error('No se pudo crear el funnel de Medilink');
    }

    // Crear las etapas del funnel
    const stages = [
      {
        name: 'Identificación del Paciente',
        description: 'Etapa para identificar o registrar al paciente en el sistema',
        order: 1,
        type: 'INTAKE',
        isActive: true,
      },
      {
        name: 'Selección de Sucursal',
        description: 'Etapa para que el paciente seleccione la sucursal donde desea atenderse',
        order: 2,
        type: 'NEEDS',
        isActive: true,
      },
      {
        name: 'Selección de Profesional',
        description: 'Etapa para que el paciente seleccione el profesional médico',
        order: 3,
        type: 'SELECT_PROFESSIONAL',
        isActive: true,
      },
      {
        name: 'Selección de Horario',
        description: 'Etapa para que el paciente seleccione el horario disponible',
        order: 4,
        type: 'SELECT_SLOT',
        isActive: true,
      },
      {
        name: 'Resolución de Atención',
        description: 'Etapa para resolver información específica de la atención médica',
        order: 5,
        type: 'ATTENTION_RESOLVE',
        isActive: true,
      },
      {
        name: 'Confirmación de Cita',
        description: 'Etapa para confirmar todos los detalles de la cita',
        order: 6,
        type: 'CONFIRM',
        isActive: true,
      },
      {
        name: 'Proceso Completado',
        description: 'Etapa final cuando el proceso de agendamiento se ha completado',
        order: 7,
        type: 'DONE',
        isActive: true,
      },
    ];

    // Insertar cada etapa
    for (const stage of stages) {
      await queryRunner.query(`
        INSERT INTO "stages" (
          "name", "description", "order", "status", 
          "funnel_id", "created_at", "updated_at"
        ) VALUES (
          $1, $2, $3, 'active', $4, NOW(), NOW()
        )
      `, [
        stage.name,
        stage.description,
        stage.order,
        funnelId,
      ]);
    }

    // Nota: El bot y sus funciones se configurarán manualmente desde la UI
    // ya que requieren crear funciones en la tabla 'functions' primero

    console.log('✅ Funnel de Medilink creado exitosamente');
    console.log(`   - Funnel ID: ${funnelId}`);
    console.log(`   - Etapas creadas: ${stages.length}`);
    console.log('   - Nota: Bot y funciones se configurarán manualmente desde la UI');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar el funnel de Medilink y todas sus relaciones
    await queryRunner.query(`
      DELETE FROM "funnels" 
      WHERE "name" = 'Funnel de Agendamiento Médico'
    `);

    console.log('✅ Funnel de Medilink eliminado');
  }
}
