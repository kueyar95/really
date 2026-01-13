import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMetadataToChannel1745199747000 implements MigrationInterface {
    name = 'AddMetadataToChannel1745199747000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE channels_type_enum ADD VALUE IF NOT EXISTS 'whapi_cloud'`);
        await queryRunner.query(`ALTER TABLE "channels" ADD "metadata" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "channels" DROP COLUMN "metadata"`);
    }
} 