import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMedilinkTables1729200000000 implements MigrationInterface {
  name = 'CreateMedilinkTables1729200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear tipo enum para status de integración
    await queryRunner.query(`
      CREATE TYPE medilink_integration_status_enum AS ENUM (
        'connected',
        'invalid_token',
        'revoked'
      );
    `);

    // Crear tipo enum para kind de mapping
    await queryRunner.query(`
      CREATE TYPE medilink_mapping_kind_enum AS ENUM (
        'patient',
        'appointment',
        'professional',
        'branch',
        'chair',
        'attention'
      );
    `);

    // Crear tipo enum para status de sesión
    await queryRunner.query(`
      CREATE TYPE booking_session_status_enum AS ENUM (
        'active',
        'completed',
        'cancelled',
        'expired'
      );
    `);

    // Tabla medilink_integrations
    await queryRunner.query(`
      CREATE TABLE medilink_integrations (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        company_id character varying NOT NULL,
        base_url character varying NOT NULL,
        token_ciphertext text NOT NULL,
        status medilink_integration_status_enum NOT NULL DEFAULT 'connected',
        rate_limit_per_min integer NOT NULL DEFAULT 20,
        last_success_at timestamp,
        last_error_at timestamp,
        last_error text,
        sync_enabled boolean NOT NULL DEFAULT true,
        metadata jsonb,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        CONSTRAINT medilink_integrations_pkey PRIMARY KEY (id)
      );
    `);

    // Índice para medilink_integrations
    await queryRunner.query(`
      CREATE INDEX idx_medilink_integration_company 
      ON medilink_integrations (company_id);
    `);

    // Tabla medilink_mappings
    await queryRunner.query(`
      CREATE TABLE medilink_mappings (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        company_id character varying NOT NULL,
        kind medilink_mapping_kind_enum NOT NULL,
        internal_id character varying NOT NULL,
        external_id character varying NOT NULL,
        external_data jsonb,
        updated_external_at timestamp,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        CONSTRAINT medilink_mappings_pkey PRIMARY KEY (id),
        CONSTRAINT medilink_mappings_unique UNIQUE (company_id, kind, external_id)
      );
    `);

    // Índices para medilink_mappings
    await queryRunner.query(`
      CREATE INDEX idx_medilink_mapping_company 
      ON medilink_mappings (company_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_medilink_mapping_internal 
      ON medilink_mappings (company_id, kind, internal_id);
    `);

    // Tabla patient_links
    await queryRunner.query(`
      CREATE TABLE patient_links (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        company_id character varying NOT NULL,
        phone_e164 character varying NOT NULL,
        medilink_patient_id character varying NOT NULL,
        patient_data jsonb,
        opt_in_whatsapp boolean NOT NULL DEFAULT false,
        opt_in_date timestamp,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        CONSTRAINT patient_links_pkey PRIMARY KEY (id),
        CONSTRAINT patient_links_unique UNIQUE (company_id, phone_e164)
      );
    `);

    // Índices para patient_links
    await queryRunner.query(`
      CREATE INDEX idx_patient_link_company 
      ON patient_links (company_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_patient_link_phone 
      ON patient_links (phone_e164);
    `);

    // Tabla booking_sessions
    await queryRunner.query(`
      CREATE TABLE booking_sessions (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        company_id character varying NOT NULL,
        phone_e164 character varying NOT NULL,
        patient_id character varying,
        branch_id character varying,
        professional_id character varying,
        chair_id character varying,
        attention_id character varying,
        appointment_id character varying,
        date_ymd character varying,
        time_hhmm character varying,
        duration_minutes integer,
        status booking_session_status_enum NOT NULL DEFAULT 'active',
        current_stage character varying,
        context jsonb,
        expires_at timestamp NOT NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        CONSTRAINT booking_sessions_pkey PRIMARY KEY (id)
      );
    `);

    // Índices para booking_sessions
    await queryRunner.query(`
      CREATE INDEX idx_booking_session_company 
      ON booking_sessions (company_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_booking_session_phone 
      ON booking_sessions (phone_e164);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_booking_session_company_phone 
      ON booking_sessions (company_id, phone_e164);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar tablas en orden inverso
    await queryRunner.query(`DROP TABLE IF EXISTS booking_sessions;`);
    await queryRunner.query(`DROP TABLE IF EXISTS patient_links;`);
    await queryRunner.query(`DROP TABLE IF EXISTS medilink_mappings;`);
    await queryRunner.query(`DROP TABLE IF EXISTS medilink_integrations;`);

    // Eliminar tipos enum
    await queryRunner.query(`DROP TYPE IF EXISTS booking_session_status_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS medilink_mapping_kind_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS medilink_integration_status_enum;`);
  }
}
