import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCalendarAccess1744139651025 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Crear la nueva tabla calendar_access
    await queryRunner.query(`
      CREATE TABLE calendar_access (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        company_id uuid NOT NULL,
        google_access_token character varying,
        google_refresh_token character varying,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        CONSTRAINT calendar_access_pkey PRIMARY KEY (id),
        CONSTRAINT fk_calendar_access_company FOREIGN KEY (company_id) REFERENCES companies(id)
      );
    `);

    // 2. Migrar los tokens existentes
    await queryRunner.query(`
      INSERT INTO calendar_access (company_id, google_access_token, google_refresh_token, created_at, updated_at)
      SELECT DISTINCT ON (company_id)
        company_id,
        "googleAccessToken" as google_access_token,
        "googleRefreshToken" as google_refresh_token,
        created_at,
        updated_at
      FROM calendar
      WHERE "googleRefreshToken" IS NOT NULL;
    `);

    // 3. Eliminar las columnas de tokens de la tabla calendar
    await queryRunner.query(`
      ALTER TABLE calendar
      DROP COLUMN "googleAccessToken",
      DROP COLUMN "googleRefreshToken";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Volver a agregar las columnas de tokens a calendar
    await queryRunner.query(`
      ALTER TABLE calendar
      ADD COLUMN "googleAccessToken" character varying,
      ADD COLUMN "googleRefreshToken" character varying;
    `);

    // 2. Restaurar los tokens
    await queryRunner.query(`
      UPDATE calendar c
      SET
        "googleAccessToken" = ca.google_access_token,
        "googleRefreshToken" = ca.google_refresh_token
      FROM calendar_access ca
      WHERE c.company_id = ca.company_id;
    `);

    // 3. Eliminar la tabla calendar_access
    await queryRunner.query(`DROP TABLE calendar_access;`);
  }
}