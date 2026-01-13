import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSheetsTable1743796100000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "sheets" (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                company_id uuid NOT NULL,
                "googleRefreshToken" character varying,
                "googleAccessToken" character varying,
                created_at timestamp without time zone NOT NULL DEFAULT now(),
                updated_at timestamp without time zone NOT NULL DEFAULT now(),
                PRIMARY KEY (id),
                CONSTRAINT fk_sheets_company FOREIGN KEY (company_id) REFERENCES companies(id)
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "sheets"`);
    }
}