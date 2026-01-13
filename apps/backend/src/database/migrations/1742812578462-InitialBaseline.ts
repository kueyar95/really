import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialBaseline1742812578462 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // First, create the migrations table to track migration history
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "migrations" (
                "id" SERIAL PRIMARY KEY,
                "timestamp" bigint NOT NULL,
                "name" character varying NOT NULL
            )
        `);

        // Create extension for UUID generation if not exists
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // Create custom enum types first
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_events_type_enum') THEN
                    CREATE TYPE calendar_events_type_enum AS ENUM ('appointment', 'block', 'holiday');
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'channels_status_enum') THEN
                    CREATE TYPE channels_status_enum AS ENUM ('active', 'inactive', 'connecting', 'error');
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_stages_status_enum') THEN
                    CREATE TYPE client_stages_status_enum AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED', 'ARCHIVED');
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stages_status_enum') THEN
                    CREATE TYPE stages_status_enum AS ENUM ('active', 'completed', 'paused', 'archived');
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
                    CREATE TYPE users_role_enum AS ENUM ('super_admin', 'admin', 'vendedor', 'supervisor', 'pending_onboarding');
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'functions_type_enum') THEN
                    CREATE TYPE functions_type_enum AS ENUM ('change_stage', 'google_calendar', 'google_sheet');
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'channels_type_enum') THEN
                    CREATE TYPE channels_type_enum AS ENUM ('whatsapp_web', 'whatsapp_cloud', 'whatsapp_baileys', 'instagram', 'facebook', 'telegram');
                END IF;
            END$$;
        `);

        // Create tables in order of dependencies (parent tables first)
        
        // 1. Companies (independent table)
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "companies" (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                created_at timestamp without time zone NOT NULL DEFAULT now(),
                updated_at timestamp without time zone NOT NULL DEFAULT now(),
                name character varying NOT NULL,
                PRIMARY KEY (id)
            )
        `);

        // 2. Clients (independent table)
        await queryRunner.query(`
            CREATE SEQUENCE IF NOT EXISTS clients_id_seq;
            CREATE TABLE IF NOT EXISTS "clients" (
                id integer NOT NULL DEFAULT nextval('clients_id_seq'::regclass),
                data jsonb,
                created_at timestamp without time zone NOT NULL DEFAULT now(),
                updated_at timestamp without time zone NOT NULL DEFAULT now(),
                phone character varying NOT NULL,
                name character varying NOT NULL,
                email character varying NOT NULL,
                PRIMARY KEY (id)
            )
        `);

        // 3. Users (depends on companies)
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "users" (
                created_at timestamp without time zone NOT NULL DEFAULT now(),
                updated_at timestamp without time zone NOT NULL DEFAULT now(),
                supabase_id character varying,
                email character varying NOT NULL,
                username character varying NOT NULL,
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                company_id uuid,
                role users_role_enum NOT NULL DEFAULT 'vendedor'::users_role_enum,
                PRIMARY KEY (id),
                CONSTRAINT fk_users_company FOREIGN KEY (company_id) REFERENCES companies(id)
            )
        `);

        // 4. Functions (depends on companies)
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "functions" (
                parameters jsonb NOT NULL,
                created_at timestamp without time zone NOT NULL DEFAULT now(),
                updated_at timestamp without time zone NOT NULL DEFAULT now(),
                activation_description text NOT NULL,
                description text NOT NULL,
                external_name character varying NOT NULL,
                name character varying NOT NULL,
                const_data jsonb NOT NULL,
                company_id uuid NOT NULL,
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                type functions_type_enum NOT NULL,
                PRIMARY KEY (id),
                CONSTRAINT fk_functions_company FOREIGN KEY (company_id) REFERENCES companies(id)
            )
        `);

        // 5. Funnels (depends on companies)
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "funnels" (
                description text,
                name character varying NOT NULL,
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                updated_at timestamp without time zone NOT NULL DEFAULT now(),
                created_at timestamp without time zone NOT NULL DEFAULT now(),
                "isActive" boolean NOT NULL DEFAULT true,
                company_id uuid NOT NULL,
                PRIMARY KEY (id),
                CONSTRAINT fk_funnels_company FOREIGN KEY (company_id) REFERENCES companies(id)
            )
        `);

        // 6. AI Bots (depends on companies)
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "ai_bots" (
                steps jsonb,
                updated_at timestamp without time zone NOT NULL DEFAULT now(),
                name character varying NOT NULL,
                "mainConfig" jsonb,
                "sysPrompt" jsonb,
                "functionsConfig" jsonb,
                "ragConfig" jsonb,
                company_id uuid NOT NULL,
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                created_at timestamp without time zone NOT NULL DEFAULT now(),
                PRIMARY KEY (id),
                CONSTRAINT fk_ai_bots_company FOREIGN KEY (company_id) REFERENCES companies(id)
            )
        `);

        // 7. Calendar (depends on companies)
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "calendar" (
                "googleAccessToken" character varying,
                "googleRefreshToken" character varying,
                "endHour" character varying NOT NULL DEFAULT '18:00'::character varying,
                company_id uuid NOT NULL,
                updated_at timestamp without time zone NOT NULL DEFAULT now(),
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                created_at timestamp without time zone NOT NULL DEFAULT now(),
                "startHour" character varying NOT NULL DEFAULT '09:00'::character varying,
                "googleCalendarId" character varying,
                PRIMARY KEY (id),
                CONSTRAINT fk_calendar_company FOREIGN KEY (company_id) REFERENCES companies(id)
            )
        `);

        // 8. Channels (depends on companies)
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "channels" (
                "connectionConfig" jsonb,
                created_at timestamp without time zone NOT NULL DEFAULT now(),
                status channels_status_enum NOT NULL DEFAULT 'inactive'::channels_status_enum,
                number character varying,
                name character varying NOT NULL,
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                company_id uuid NOT NULL,
                type channels_type_enum NOT NULL,
                updated_at timestamp without time zone NOT NULL DEFAULT now(),
                PRIMARY KEY (id),
                CONSTRAINT fk_channels_company FOREIGN KEY (company_id) REFERENCES companies(id)
            )
        `);

        // 9. Stages (depends on funnels and ai_bots)
        await queryRunner.query(`
            CREATE SEQUENCE IF NOT EXISTS stages_id_seq;
            CREATE TABLE IF NOT EXISTS "stages" (
                created_at timestamp without time zone NOT NULL DEFAULT now(),
                status stages_status_enum NOT NULL DEFAULT 'active'::stages_status_enum,
                "order" integer NOT NULL,
                bot_id uuid,
                funnel_id uuid NOT NULL,
                id integer NOT NULL DEFAULT nextval('stages_id_seq'::regclass),
                description text,
                name character varying NOT NULL,
                updated_at timestamp without time zone NOT NULL DEFAULT now(),
                PRIMARY KEY (id),
                CONSTRAINT fk_stages_funnel FOREIGN KEY (funnel_id) REFERENCES funnels(id),
                CONSTRAINT fk_stages_bot FOREIGN KEY (bot_id) REFERENCES ai_bots(id)
            )
        `);

        // 10. Bot Functions (depends on functions and ai_bots)
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "bot_functions" (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                is_active boolean NOT NULL DEFAULT true,
                context_data jsonb,
                updated_at timestamp without time zone NOT NULL DEFAULT now(),
                created_at timestamp without time zone NOT NULL DEFAULT now(),
                step_number integer,
                function_id uuid NOT NULL,
                bot_id uuid NOT NULL,
                PRIMARY KEY (id),
                CONSTRAINT fk_bot_functions_function FOREIGN KEY (function_id) REFERENCES functions(id),
                CONSTRAINT fk_bot_functions_bot FOREIGN KEY (bot_id) REFERENCES ai_bots(id) ON DELETE CASCADE
            )
        `);

        // 11. Funnel Channels (depends on channels and funnels)
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "funnel_channels" (
                "isActive" boolean NOT NULL DEFAULT true,
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                created_at timestamp without time zone NOT NULL DEFAULT now(),
                funnel_id uuid,
                channel_id uuid NOT NULL,
                PRIMARY KEY (id),
                CONSTRAINT fk_funnel_channels_funnel FOREIGN KEY (funnel_id) REFERENCES funnels(id),
                CONSTRAINT fk_funnel_channels_channel FOREIGN KEY (channel_id) REFERENCES channels(id)
            )
        `);

        // 12. Calendar Events (depends on calendar and clients)
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "calendar_events" (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                calendar_id uuid NOT NULL,
                client_id integer,
                date date NOT NULL,
                duration integer NOT NULL,
                type calendar_events_type_enum NOT NULL DEFAULT 'appointment'::calendar_events_type_enum,
                metadata jsonb,
                created_at timestamp without time zone NOT NULL DEFAULT now(),
                updated_at timestamp without time zone NOT NULL DEFAULT now(),
                start_time character varying NOT NULL,
                title character varying NOT NULL,
                PRIMARY KEY (id),
                CONSTRAINT fk_calendar_events_calendar FOREIGN KEY (calendar_id) REFERENCES calendar(id),
                CONSTRAINT fk_calendar_events_client FOREIGN KEY (client_id) REFERENCES clients(id)
            )
        `);

        // 13. Client Stages (depends on clients, funnel_channels, stages and users)
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "client_stages" (
                funnel_channel_id uuid NOT NULL,
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                stage_id integer NOT NULL,
                updated_at timestamp without time zone NOT NULL DEFAULT now(),
                created_at timestamp without time zone NOT NULL DEFAULT now(),
                status client_stages_status_enum NOT NULL DEFAULT 'ACTIVE'::client_stages_status_enum,
                last_interaction timestamp without time zone,
                data jsonb,
                assigned_user_id uuid,
                client_id integer NOT NULL,
                PRIMARY KEY (id),
                CONSTRAINT fk_client_stages_funnel_channel FOREIGN KEY (funnel_channel_id) REFERENCES funnel_channels(id),
                CONSTRAINT fk_client_stages_stage FOREIGN KEY (stage_id) REFERENCES stages(id),
                CONSTRAINT fk_client_stages_user FOREIGN KEY (assigned_user_id) REFERENCES users(id),
                CONSTRAINT fk_client_stages_client FOREIGN KEY (client_id) REFERENCES clients(id)
            )
        `);

        // 14. Chat History (depends on channels and clients)
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "chat_history" (
                session_id character varying NOT NULL DEFAULT 'default_session'::character varying,
                channel_id uuid NOT NULL,
                client_id integer NOT NULL,
                created_at timestamp without time zone NOT NULL DEFAULT now(),
                message text NOT NULL,
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                direction character varying NOT NULL,
                PRIMARY KEY (id),
                CONSTRAINT fk_chat_history_channel FOREIGN KEY (channel_id) REFERENCES channels(id),
                CONSTRAINT fk_chat_history_client FOREIGN KEY (client_id) REFERENCES clients(id)
            )
        `);

        // Create indexes for better query performance
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
            CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_chat_history_client ON chat_history(client_id);
            CREATE INDEX IF NOT EXISTS idx_chat_history_channel ON chat_history(channel_id);
            CREATE INDEX IF NOT EXISTS idx_client_stages_client ON client_stages(client_id);
            CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop tables in reverse order of creation to handle foreign key constraints
        await queryRunner.query(`DROP TABLE IF EXISTS "chat_history"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "client_stages"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "calendar_events"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "funnel_channels"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "bot_functions"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "stages"`);
        await queryRunner.query(`DROP SEQUENCE IF EXISTS stages_id_seq`);
        await queryRunner.query(`DROP TABLE IF EXISTS "channels"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "calendar"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "ai_bots"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "funnels"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "functions"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "clients"`);
        await queryRunner.query(`DROP SEQUENCE IF EXISTS clients_id_seq`);
        await queryRunner.query(`DROP TABLE IF EXISTS "companies"`);
        
        // Drop enum types
        await queryRunner.query(`
            DROP TYPE IF EXISTS calendar_events_type_enum;
            DROP TYPE IF EXISTS channels_status_enum;
            DROP TYPE IF EXISTS client_stages_status_enum;
            DROP TYPE IF EXISTS stages_status_enum;
            DROP TYPE IF EXISTS users_role_enum;
            DROP TYPE IF EXISTS functions_type_enum;
            DROP TYPE IF EXISTS channels_type_enum;
        `);
    }
}
