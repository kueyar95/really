import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueFunnelChannelConstraint1757694841404 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Primero, desactivar duplicados dejando solo uno activo por canal
        await queryRunner.query(`
            UPDATE funnel_channels fc1
            SET "isActive" = false
            WHERE "isActive" = true
            AND channel_id IN (
                SELECT channel_id
                FROM funnel_channels
                WHERE "isActive" = true
                GROUP BY channel_id
                HAVING COUNT(*) > 1
            )
            AND id NOT IN (
                SELECT DISTINCT ON (channel_id) id
                FROM funnel_channels
                WHERE "isActive" = true
                ORDER BY channel_id, created_at DESC
            )
        `);

        // Crear índice único parcial para garantizar solo un FunnelChannel activo por canal
        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_active_funnel_per_channel" 
            ON "funnel_channels" (channel_id) 
            WHERE "isActive" = true
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Eliminar el índice único
        await queryRunner.query(`
            DROP INDEX IF EXISTS "idx_unique_active_funnel_per_channel"
        `);
    }
}

