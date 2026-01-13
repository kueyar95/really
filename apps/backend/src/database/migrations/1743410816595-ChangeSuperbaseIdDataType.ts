import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeSuperbaseIdDataType1743410816595 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "supabase_id" TYPE uuid USING supabase_id::uuid`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "supabase_id" TYPE character varying`);
    }

}
