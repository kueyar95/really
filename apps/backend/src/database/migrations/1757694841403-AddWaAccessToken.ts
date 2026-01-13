import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWaAccessToken1757695136616 implements MigrationInterface {
  name = 'AddWaAccessToken1757695136616';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Asegura extensión UUID
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // 1) Tabla nueva sin riesgos
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "whatsapp_credentials" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "waba_id" character varying,
        "phone_number_id" character varying,
        "access_token" text NOT NULL,
        "status" character varying NOT NULL DEFAULT 'connected',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_1d01f32a5d843fa831ce10b7f19" PRIMARY KEY ("id")
      )
    `);

    // 2) Preparar cambio de PK en clients: agregar columna UUID paralela
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='clients' AND column_name='id_uuid'
        ) THEN
          ALTER TABLE "clients" ADD COLUMN "id_uuid" uuid DEFAULT uuid_generate_v4();
        END IF;
      END
      $$;
    `);

    // 3) Agregar columnas UUID paralelas en tablas que referencian a clients
    // client_stages
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='client_stages' AND column_name='client_id_uuid'
        ) THEN
          ALTER TABLE "client_stages" ADD COLUMN "client_id_uuid" uuid;
        END IF;
      END
      $$;
    `);

    // chat_history
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='chat_history' AND column_name='client_id_uuid'
        ) THEN
          ALTER TABLE "chat_history" ADD COLUMN "client_id_uuid" uuid;
        END IF;
      END
      $$;
    `);

    // calendar_events
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='calendar_events' AND column_name='client_id_uuid'
        ) THEN
          ALTER TABLE "calendar_events" ADD COLUMN "client_id_uuid" uuid;
        END IF;
      END
      $$;
    `);

    // 4) BACKFILL: mapear int -> uuid usando la columna puente en clients
    await queryRunner.query(`
      UPDATE "client_stages" cs
      SET "client_id_uuid" = c."id_uuid"
      FROM "clients" c
      WHERE cs."client_id" IS NOT NULL
        AND cs."client_id_uuid" IS NULL
        AND cs."client_id" = c."id"::integer
    `);

    await queryRunner.query(`
      UPDATE "chat_history" ch
      SET "client_id_uuid" = c."id_uuid"
      FROM "clients" c
      WHERE ch."client_id" IS NOT NULL
        AND ch."client_id_uuid" IS NULL
        AND ch."client_id" = c."id"::integer
    `);

    await queryRunner.query(`
      UPDATE "calendar_events" ce
      SET "client_id_uuid" = c."id_uuid"
      FROM "clients" c
      WHERE ce."client_id" IS NOT NULL
        AND ce."client_id_uuid" IS NULL
        AND ce."client_id" = c."id"::integer
    `);

    // 5) Soltar FKs antiguas (si existen) que apuntan a clients(id int)
    await queryRunner.query(`ALTER TABLE "client_stages"   DROP CONSTRAINT IF EXISTS "fk_client_stages_client"`);
    await queryRunner.query(`ALTER TABLE "chat_history"    DROP CONSTRAINT IF EXISTS "fk_chat_history_client"`);
    await queryRunner.query(`ALTER TABLE "calendar_events" DROP CONSTRAINT IF EXISTS "fk_calendar_events_client"`);

    // 6) Cambiar PK de clients: id(int) -> id(uuid)
    await queryRunner.query(`ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_pkey"`);
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN IF EXISTS "id"`);
    await queryRunner.query(`ALTER TABLE "clients" RENAME COLUMN "id_uuid" TO "id"`);
    await queryRunner.query(`ALTER TABLE "clients" ADD CONSTRAINT "PK_f1ab7cf3a5714dbc6bb4e1c28a4" PRIMARY KEY ("id")`);

    // 7) En tablas hijas: sustituir columnas
    await queryRunner.query(`ALTER TABLE "client_stages"   DROP COLUMN IF EXISTS "client_id"`);
    await queryRunner.query(`ALTER TABLE "client_stages"   RENAME COLUMN "client_id_uuid" TO "client_id"`);

    await queryRunner.query(`ALTER TABLE "chat_history"    DROP COLUMN IF EXISTS "client_id"`);
    await queryRunner.query(`ALTER TABLE "chat_history"    RENAME COLUMN "client_id_uuid" TO "client_id"`);

    await queryRunner.query(`ALTER TABLE "calendar_events" DROP COLUMN IF EXISTS "client_id"`);
    await queryRunner.query(`ALTER TABLE "calendar_events" RENAME COLUMN "client_id_uuid" TO "client_id"`);

    // 8) Recrear FKs como NOT VALID (validarlas luego en frío)
    await queryRunner.query(`
      ALTER TABLE "client_stages"
      ADD CONSTRAINT "fk_client_stages_client"
      FOREIGN KEY ("client_id") REFERENCES "clients"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION NOT VALID
    `);
    await queryRunner.query(`
      ALTER TABLE "chat_history"
      ADD CONSTRAINT "fk_chat_history_client"
      FOREIGN KEY ("client_id") REFERENCES "clients"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION NOT VALID
    `);
    await queryRunner.query(`
      ALTER TABLE "calendar_events"
      ADD CONSTRAINT "fk_calendar_events_client"
      FOREIGN KEY ("client_id") REFERENCES "clients"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION NOT VALID
    `);

    // 9) Otros ajustes de tu migración original (seguros)
    await queryRunner.query(`ALTER TABLE "functions" ALTER COLUMN "type" DROP DEFAULT`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'UQ_clients_phone_company'
        ) THEN
          ALTER TABLE "clients"
          ADD CONSTRAINT "UQ_clients_phone_company" UNIQUE ("phone","company_id");
        END IF;
      END
      $$;
    `);

    // (Opcional) Validar FKs aquí o en otra migración
    // await queryRunner.query(`ALTER TABLE "client_stages"   VALIDATE CONSTRAINT "fk_client_stages_client"`);
    // await queryRunner.query(`ALTER TABLE "chat_history"    VALIDATE CONSTRAINT "fk_chat_history_client"`);
    // await queryRunner.query(`ALTER TABLE "calendar_events" VALIDATE CONSTRAINT "fk_calendar_events_client"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "client_stages"   DROP CONSTRAINT IF EXISTS "fk_client_stages_client"`);
    await queryRunner.query(`ALTER TABLE "chat_history"    DROP CONSTRAINT IF EXISTS "fk_chat_history_client"`);
    await queryRunner.query(`ALTER TABLE "calendar_events" DROP CONSTRAINT IF EXISTS "fk_calendar_events_client"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "whatsapp_credentials"`);
  }
}
