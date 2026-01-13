-- =====================================================================
-- SCRIPT PARA LIMPIAR CANALES WHAPI MUERTOS
-- Fecha: 2025-10-25
-- Problema: Canales con 16,000+ strikes que ya no existen en Whapi.Cloud
--           pero siguen en la BD generando consultas constantes
-- =====================================================================

-- =====================================================================
-- PASO 1: IDENTIFICAR CANALES PROBLEMÁTICOS
-- =====================================================================

-- Ver canales Whapi.Cloud en estado ERROR
SELECT 
    id,
    name,
    number,
    status,
    company_id,
    "connectionConfig"->>'whapiChannelId' as whapi_channel_id,
    created_at,
    updated_at,
    EXTRACT(EPOCH FROM (NOW() - updated_at))/3600 as hours_since_update
FROM channels
WHERE type = 'whapi_cloud'
    AND status = 'error'
ORDER BY updated_at DESC;

-- =====================================================================
-- PASO 2: MARCAR CANALES PARA NO VERIFICAR MÁS (OPCIÓN SUAVE)
-- Esta opción deshabilita el heartbeat sin eliminar datos
-- =====================================================================

-- Agregar un flag en metadata para excluir del heartbeat
UPDATE channels
SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"excludeFromHeartbeat": true}'::jsonb
WHERE type = 'whapi_cloud'
    AND status = 'error'
    AND updated_at < NOW() - INTERVAL '24 hours'; -- Solo los que llevan +24hrs en error

-- Ver cuántos fueron marcados:
SELECT COUNT(*) as canales_marcados
FROM channels
WHERE type = 'whapi_cloud'
    AND status = 'error'
    AND metadata->>'excludeFromHeartbeat' = 'true';

-- =====================================================================
-- PASO 3: ELIMINAR CANALES MUERTOS (OPCIÓN FUERTE)
-- ADVERTENCIA: Esto elimina permanentemente los canales
-- =====================================================================

-- ANTES DE EJECUTAR: Hacer backup de los canales que se van a eliminar
CREATE TABLE IF NOT EXISTS channels_backup_dead (
    LIKE channels INCLUDING ALL
);

-- Hacer backup
INSERT INTO channels_backup_dead
SELECT * FROM channels
WHERE type = 'whapi_cloud'
    AND status = 'error'
    AND updated_at < NOW() - INTERVAL '7 days'; -- Canales con +7 días en error

-- Ver el backup
SELECT 
    COUNT(*) as total_backed_up,
    COUNT(DISTINCT company_id) as companies_affected
FROM channels_backup_dead;

-- =====================================================================
-- ELIMINAR CANALES MUERTOS (EJECUTAR SOLO SI ESTÁS SEGURO)
-- =====================================================================

-- Primero eliminar registros relacionados
BEGIN;

-- 1. Eliminar client_stages relacionados
DELETE FROM client_stages 
WHERE funnel_channel_id IN (
    SELECT fc.id 
    FROM funnel_channels fc
    INNER JOIN channels c ON c.id = fc.channel_id
    WHERE c.type = 'whapi_cloud'
        AND c.status = 'error'
        AND c.updated_at < NOW() - INTERVAL '7 days'
);

-- 2. Eliminar funnel_channels
DELETE FROM funnel_channels
WHERE channel_id IN (
    SELECT id FROM channels
    WHERE type = 'whapi_cloud'
        AND status = 'error'
        AND updated_at < NOW() - INTERVAL '7 days'
);

-- 3. Eliminar chat_history (OPCIONAL - comentar si quieres conservar)
-- DELETE FROM chat_history
-- WHERE channel_id IN (
--     SELECT id FROM channels
--     WHERE type = 'whapi_cloud'
--         AND status = 'error'
--         AND updated_at < NOW() - INTERVAL '7 days'
-- );

-- 4. Finalmente, eliminar los canales
DELETE FROM channels
WHERE type = 'whapi_cloud'
    AND status = 'error'
    AND updated_at < NOW() - INTERVAL '7 days';

COMMIT;

-- =====================================================================
-- VERIFICACIÓN POST-LIMPIEZA
-- =====================================================================

-- Verificar canales restantes en error
SELECT 
    status,
    COUNT(*) as cantidad,
    COUNT(CASE WHEN metadata->>'excludeFromHeartbeat' = 'true' THEN 1 END) as excluidos_heartbeat
FROM channels
WHERE type = 'whapi_cloud'
GROUP BY status
ORDER BY status;

-- Ver últimos canales en error
SELECT 
    id,
    name,
    status,
    metadata->>'excludeFromHeartbeat' as excluido,
    EXTRACT(EPOCH FROM (NOW() - updated_at))/3600 as hours_in_error
FROM channels
WHERE type = 'whapi_cloud'
    AND status = 'error'
ORDER BY updated_at DESC
LIMIT 10;

-- =====================================================================
-- QUERY PARA RESTAURAR SI ES NECESARIO
-- =====================================================================

-- Si algo sale mal, restaurar desde el backup:
-- INSERT INTO channels SELECT * FROM channels_backup_dead WHERE id = 'CHANNEL_ID_TO_RESTORE';

-- =====================================================================
-- NOTAS IMPORTANTES
-- =====================================================================

/*
RECOMENDACIÓN:

1. PRIMERO ejecutar PASO 2 (marcar canales para excluir)
2. Esperar 24 horas y verificar que los logs dejen de aparecer
3. Si todo está bien, ejecutar PASO 3 (eliminar canales)

NÚMEROS ESPERADOS:
- Si hay 4-10 canales muertos, esto reducirá ~100K queries/día
- Reducción adicional de ~300-500MB de consumo diario

ALTERNATIVA (MODIFICAR CÓDIGO):
En lugar de eliminar canales, modificar WhapiHeartbeatService para:
- Ignorar canales con metadata.excludeFromHeartbeat = true
- Parar de verificar canales con más de X strikes consecutivos
*/

