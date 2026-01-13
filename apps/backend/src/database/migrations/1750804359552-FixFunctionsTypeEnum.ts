import { MigrationInterface, QueryRunner } from "typeorm";

export class FixFunctionsTypeEnum1750804359552 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // First, check if the functions table exists and what columns it has
        await queryRunner.query(`
            DO $$
            BEGIN
                -- Drop the existing enum if it exists
                DROP TYPE IF EXISTS functions_type_enum CASCADE;
                
                -- Recreate the enum with the correct values
                CREATE TYPE functions_type_enum AS ENUM ('change_stage', 'google_calendar', 'google_sheet');
                
                -- Check if the type column exists, if not add it
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'functions' AND column_name = 'type'
                ) THEN
                    ALTER TABLE functions ADD COLUMN type functions_type_enum NOT NULL DEFAULT 'change_stage';
                ELSE
                    -- If the column exists but lost its type due to CASCADE, re-add it
                    ALTER TABLE functions ALTER COLUMN type TYPE functions_type_enum USING 'change_stage'::functions_type_enum;
                    ALTER TABLE functions ALTER COLUMN type SET NOT NULL;
                END IF;
            END$$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert back to the original state if needed
        await queryRunner.query(`
            DO $$
            BEGIN
                -- This is a simple revert that recreates the enum
                DROP TYPE IF EXISTS functions_type_enum CASCADE;
                CREATE TYPE functions_type_enum AS ENUM ('change_stage', 'google_calendar', 'google_sheet');
                
                -- Re-add the type column if it doesn't exist
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'functions' AND column_name = 'type'
                ) THEN
                    ALTER TABLE functions ADD COLUMN type functions_type_enum NOT NULL DEFAULT 'change_stage';
                ELSE
                    ALTER TABLE functions ALTER COLUMN type TYPE functions_type_enum USING 'change_stage'::functions_type_enum;
                    ALTER TABLE functions ALTER COLUMN type SET NOT NULL;
                END IF;
            END$$;
        `);
    }

}
