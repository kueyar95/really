-- =====================================================================
-- SCRIPT DE OPTIMIZACIÓN DE BASE DE DATOS
-- Fecha: 2025-10-25
-- Objetivo: Agregar índices para mejorar el rendimiento de las consultas
-- más frecuentes identificadas en el análisis de consumo de 3GB/día
-- =====================================================================

-- =====================================================================
-- 1. ÍNDICES PARA TABLA chat_history
-- Esta tabla es la que más consultas recibe (80M+ filas retornadas)
-- =====================================================================

-- Índice para consultas por channel_id (184,499 consultas identificadas)
CREATE INDEX IF NOT EXISTS idx_chat_history_channel_id 
ON chat_history(channel_id);

-- Índice para consultas por client_id
CREATE INDEX IF NOT EXISTS idx_chat_history_client_id 
ON chat_history(client_id);

-- Índice para ordenamiento por fecha (muy usado en paginación)
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at 
ON chat_history(created_at DESC);

-- Índice compuesto para consultas que filtran por channel y client
CREATE INDEX IF NOT EXISTS idx_chat_history_channel_client 
ON chat_history(channel_id, client_id);

-- Índice compuesto para consultas con filtro y ordenamiento
CREATE INDEX IF NOT EXISTS idx_chat_history_channel_created 
ON chat_history(channel_id, created_at DESC);

-- Índice para session_id (usado en algunos flujos)
CREATE INDEX IF NOT EXISTS idx_chat_history_session_id 
ON chat_history(session_id);

-- =====================================================================
-- 2. ÍNDICES PARA TABLA channels
-- Consultas más costosas del sistema (79M+ filas, 51 horas CPU)
-- =====================================================================

-- Índice para consultas por company_id (muy frecuente)
CREATE INDEX IF NOT EXISTS idx_channels_company_id 
ON channels(company_id);

-- Índice para filtros por tipo de canal
CREATE INDEX IF NOT EXISTS idx_channels_type 
ON channels(type);

-- Índice para filtros por estado
CREATE INDEX IF NOT EXISTS idx_channels_status 
ON channels(status);

-- Índice compuesto para la consulta más común: company + type + status
CREATE INDEX IF NOT EXISTS idx_channels_company_type_status 
ON channels(company_id, type, status);

-- Índice para búsqueda por número de teléfono
CREATE INDEX IF NOT EXISTS idx_channels_number 
ON channels(number) WHERE number IS NOT NULL;

-- Índice para ordenamiento por fecha de creación
CREATE INDEX IF NOT EXISTS idx_channels_created_at 
ON channels(created_at DESC);

-- =====================================================================
-- 3. ÍNDICES PARA TABLA clients
-- Consultas frecuentes con millones de filas
-- =====================================================================

-- Índice compuesto para búsqueda por phone + company (findOrCreateByPhoneAndCompany)
CREATE INDEX IF NOT EXISTS idx_clients_phone_company 
ON clients(phone, company_id);

-- Índice para consultas por company_id
CREATE INDEX IF NOT EXISTS idx_clients_company_id 
ON clients(company_id);

-- Índice para búsqueda por email
CREATE INDEX IF NOT EXISTS idx_clients_email 
ON clients(email) WHERE email IS NOT NULL;

-- =====================================================================
-- 4. ÍNDICES PARA TABLA client_stages
-- Relación muy consultada
-- =====================================================================

-- Índice para consultas por client_id
CREATE INDEX IF NOT EXISTS idx_client_stages_client_id 
ON client_stages(client_id);

-- Índice para consultas por funnel_channel_id
CREATE INDEX IF NOT EXISTS idx_client_stages_funnel_channel_id 
ON client_stages(funnel_channel_id);

-- Índice para consultas por stage_id
CREATE INDEX IF NOT EXISTS idx_client_stages_stage_id 
ON client_stages(stage_id);

-- Índice para filtros por estado
CREATE INDEX IF NOT EXISTS idx_client_stages_status 
ON client_stages(status);

-- Índice compuesto para consultas comunes
CREATE INDEX IF NOT EXISTS idx_client_stages_funnel_client 
ON client_stages(funnel_channel_id, client_id);

-- Índice para assigned_user_id (usado en asignaciones)
CREATE INDEX IF NOT EXISTS idx_client_stages_assigned_user_id 
ON client_stages(assigned_user_id) WHERE assigned_user_id IS NOT NULL;

-- Índice para last_interaction (usado en ordenamientos)
CREATE INDEX IF NOT EXISTS idx_client_stages_last_interaction 
ON client_stages(last_interaction DESC) WHERE last_interaction IS NOT NULL;

-- =====================================================================
-- 5. ÍNDICES PARA TABLA funnel_channels
-- Relación frecuentemente consultada
-- =====================================================================

-- Índice para consultas por channel_id
CREATE INDEX IF NOT EXISTS idx_funnel_channels_channel_id 
ON funnel_channels(channel_id);

-- Índice para consultas por funnel_id
CREATE INDEX IF NOT EXISTS idx_funnel_channels_funnel_id 
ON funnel_channels(funnel_id);

-- Índice compuesto para consultas con filtro de activos
CREATE INDEX IF NOT EXISTS idx_funnel_channels_channel_active 
ON funnel_channels(channel_id, "isActive");

-- =====================================================================
-- 6. ÍNDICES PARA TABLA funnels
-- =====================================================================

-- Índice para consultas por company_id
CREATE INDEX IF NOT EXISTS idx_funnels_company_id 
ON funnels(company_id);

-- Índice para filtros por estado activo
CREATE INDEX IF NOT EXISTS idx_funnels_isactive 
ON funnels("isActive");

-- Índice para ordenamiento por fecha de creación
CREATE INDEX IF NOT EXISTS idx_funnels_created_at 
ON funnels(created_at DESC);

-- =====================================================================
-- 7. ÍNDICES PARA TABLA stages
-- =====================================================================

-- Índice para consultas por funnel_id
CREATE INDEX IF NOT EXISTS idx_stages_funnel_id 
ON stages(funnel_id);

-- Índice para consultas por bot_id
CREATE INDEX IF NOT EXISTS idx_stages_bot_id 
ON stages(bot_id) WHERE bot_id IS NOT NULL;

-- Índice para ordenamiento por orden
CREATE INDEX IF NOT EXISTS idx_stages_order 
ON stages("order");

-- Índice para filtros por estado
CREATE INDEX IF NOT EXISTS idx_stages_status 
ON stages(status);

-- =====================================================================
-- 8. ÍNDICES PARA TABLA users
-- =====================================================================

-- Índice para búsqueda por supabase_id (autenticación)
CREATE INDEX IF NOT EXISTS idx_users_supabase_id 
ON users(supabase_id);

-- Índice para consultas por company_id
CREATE INDEX IF NOT EXISTS idx_users_company_id 
ON users(company_id);

-- Índice para consultas por email
CREATE INDEX IF NOT EXISTS idx_users_email 
ON users(email);

-- Índice para consultas por role
CREATE INDEX IF NOT EXISTS idx_users_role 
ON users(role);

-- =====================================================================
-- 9. ÍNDICES PARA TABLA companies
-- =====================================================================

-- Índice para búsqueda por nombre
CREATE INDEX IF NOT EXISTS idx_companies_name 
ON companies(name);

-- =====================================================================
-- 10. ÍNDICES JSONB PARA BÚSQUEDAS EN CAMPOS JSON
-- =====================================================================

-- Índice GIN para búsquedas en metadata de channels
CREATE INDEX IF NOT EXISTS idx_channels_metadata_gin 
ON channels USING GIN (metadata);

-- Índice GIN para búsquedas en connectionConfig de channels
CREATE INDEX IF NOT EXISTS idx_channels_connection_config_gin 
ON channels USING GIN ("connectionConfig");

-- Índice específico para búsqueda por whapiChannelId
CREATE INDEX IF NOT EXISTS idx_channels_whapi_channel_id 
ON channels (("connectionConfig"->>'whapiChannelId')) 
WHERE "connectionConfig"->>'whapiChannelId' IS NOT NULL;

-- Índice específico para búsqueda por phoneNumberId (WhatsApp Cloud)
CREATE INDEX IF NOT EXISTS idx_channels_phone_number_id 
ON channels (("connectionConfig"->>'phoneNumberId')) 
WHERE "connectionConfig"->>'phoneNumberId' IS NOT NULL;

-- =====================================================================
-- VERIFICACIÓN DE ÍNDICES CREADOS
-- =====================================================================

-- Para verificar los índices creados, ejecutar:
-- SELECT 
--     schemaname,
--     tablename,
--     indexname,
--     indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;

-- Para ver el tamaño de los índices:
-- SELECT
--     tablename,
--     indexname,
--     pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY pg_relation_size(indexname::regclass) DESC;

-- =====================================================================
-- NOTAS IMPORTANTES
-- =====================================================================

-- 1. Estos índices mejorarán significativamente el rendimiento de las
--    consultas más frecuentes identificadas en el análisis.

-- 2. Los índices tienen un costo en espacio de almacenamiento y en
--    velocidad de escritura (INSERT/UPDATE), pero el beneficio en
--    consultas es mucho mayor.

-- 3. Monitorear el uso de índices después de la implementación:
--    SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public';

-- 4. Si algún índice no se está usando (idx_scan = 0 después de un tiempo),
--    considerar eliminarlo.

-- 5. Se recomienda ejecutar ANALYZE después de crear los índices:
--    ANALYZE chat_history;
--    ANALYZE channels;
--    ANALYZE clients;
--    ANALYZE client_stages;
--    ANALYZE funnel_channels;

-- =====================================================================
-- FIN DEL SCRIPT
-- =====================================================================

