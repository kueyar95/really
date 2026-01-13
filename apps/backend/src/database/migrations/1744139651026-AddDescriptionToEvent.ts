import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDescriptionToEvent1744139651026 implements MigrationInterface {
    name = 'AddDescriptionToEvent1744139651026'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "description" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "calendar_events" DROP COLUMN "description"`);
    }
}