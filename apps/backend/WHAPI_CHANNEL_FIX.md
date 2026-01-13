# Fix para Canales Whapi.Cloud - Estado Desincronizado

## Problema

Los canales Whapi.Cloud pueden aparecer con estado incorrecto en la base de datos (CONNECTING, INACTIVE, ERROR) cuando en realidad están activos y autenticados en Whapi. Esto causa dos problemas:

1. **No se pueden enviar mensajes** porque el estado en BBDD no es "ACTIVE"
2. **No se pueden agregar nuevos canales** porque intenta obtener QR de un canal ya autenticado (error 409)

## Solución Implementada

### 1. Nuevo Método de Verificación

Se agregó el método `checkChannelIsValidAndAuthenticated()` en `WhapiCloudService` que:
- Verifica si el canal está activo en Whapi
- Verifica si está autenticado (conectado a WhatsApp)
- Retorna `true` solo si ambas condiciones se cumplen

### 2. Lógica Mejorada en Conexión

En `initiateWhapiCloudConnection()`:
- Si el canal está activo Y autenticado → reutilizar y marcar como ACTIVE
- Si el canal está activo pero NO autenticado → reutilizar para obtener QR
- Si el canal no está activo → eliminar

### 3. Validación Inteligente en Envío de Mensajes

En `sendMessage()`:
- Para canales Whapi.Cloud, verifica autenticación real antes de enviar
- Si está autenticado pero el estado en BBDD es incorrecto, lo corrige automáticamente

### 4. Endpoint de Sincronización

Nuevo endpoint: `POST /channels/whapi-cloud/sync-status?companyId=opcional`

## Cómo Resolver el Problema Actual

### Opción 1: Usar el Endpoint (Recomendado)

```bash
# Sincronizar todos los canales
curl -X POST http://localhost:3000/channels/whapi-cloud/sync-status

# Sincronizar solo canales de una compañía específica
curl -X POST "http://localhost:3000/channels/whapi-cloud/sync-status?companyId=67bb533d-2167-422e-8a2b-357506132251"
```

### Opción 2: Usar el Script de Consola

```bash
cd apps/backend
npm run sync:whapi
```

### Opción 3: Ejecutar Manualmente

```typescript
// En el código, llamar directamente:
const updatedCount = await channelsService.syncWhapiChannelsStatus();
console.log(`${updatedCount} canales actualizados`);
```

## Verificación

Después de ejecutar la sincronización:

1. **Verificar logs**: Deberías ver mensajes como:
   ```
   ✅ Actualizando canal 77dfd9ba-380c-4319-855a-1b5c8cd00946 a ACTIVE (estaba en CONNECTING)
   ```

2. **Verificar en BBDD**: Los canales que estaban conectados deberían aparecer como `ACTIVE`

3. **Probar envío de mensajes**: Debería funcionar sin errores

4. **Probar nueva conexión**: Debería poder agregar nuevos canales sin error 409

## Prevención

El problema se previene automáticamente con los cambios implementados:

- Al enviar mensajes, se verifica la autenticación real
- Al conectar nuevos canales, se verifica el estado real antes de intentar obtener QR
- Los estados se sincronizan automáticamente

## Archivos Modificados

1. `apps/backend/src/modules/channels/providers/api/whapi-cloud/whapi-cloud.service.ts`
   - Agregado `checkChannelIsValidAndAuthenticated()`

2. `apps/backend/src/modules/channels/channels.service.ts`
   - Modificado `initiateWhapiCloudConnection()`
   - Agregado `syncWhapiChannelsStatus()`

3. `apps/backend/src/modules/channels/core/services/channel-manager.service.ts`
   - Modificado `sendMessage()` con validación inteligente

4. `apps/backend/src/modules/channels/channels.controller.ts`
   - Agregado endpoint `POST /whapi-cloud/sync-status`

5. `apps/backend/scripts/sync-whapi-channels.ts`
   - Script de consola para sincronización

6. `apps/backend/package.json`
   
   - Agregado script `sync:whapi` 