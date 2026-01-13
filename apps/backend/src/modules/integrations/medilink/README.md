# Integración Medilink

## Descripción General

La integración con Medilink permite a las empresas gestionar citas médicas directamente desde WhatsApp y otros canales. Es una solución multi-tenant donde cada empresa puede configurar su propia conexión con Medilink usando sus credenciales.

## Características Principales

- ✅ **Multi-tenant**: Cada empresa usa su propio token de Medilink
- ✅ **Agendamiento de citas**: Crear, reagendar y cancelar citas
- ✅ **Notificaciones proactivas**: Envío automático de plantillas WhatsApp
- ✅ **Funnel especializado**: Flujo guiado para agendamiento médico
- ✅ **Rate limiting**: Control de límites por tenant
- ✅ **Reintentos automáticos**: Manejo de errores 429/5xx con backoff exponencial
- ✅ **Cifrado de tokens**: Almacenamiento seguro con AES-256-GCM

## Configuración

### Variables de Entorno

```bash
# Medilink
MEDILINK_DEFAULT_BASE_URL=https://api.medilink.healthatom.com/api/v1
MEDILINK_ENCRYPTION_KEY_B64=<32_bytes_base64>  # Generar con: openssl rand -base64 32
MEDILINK_RATE_LIMIT_RPM=20
MEDILINK_SYNC_ENABLED=false

# WhatsApp Cloud API
WA_GRAPH_VERSION=20.0
WA_PHONE_NUMBER_ID=<your_phone_number_id>
WA_ACCESS_TOKEN=<your_meta_access_token>
WA_LANG_CODE=es_ES
WA_TEMPLATE_CITA_CREADA=cita_creada
WA_TEMPLATE_CITA_REAGENDADA=cita_reagendada
WA_TEMPLATE_CITA_ANULADA=cita_anulada
```

### Generar Clave de Encriptación

```bash
# Generar clave de 32 bytes en base64
openssl rand -base64 32

# O desde Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Flujo de Conexión

### 1. Obtener Token en Medilink

El administrador debe generar un token en el panel de Medilink:

1. Ir a **Administrador → Configuración API**
2. Click en **+Agregar cliente**
3. Click en **Ver token → Generar**
4. Copiar el token generado

### 2. Conectar desde la UI

```typescript
// POST /integrations/medilink/connect
{
  "accessToken": "token_from_medilink",
  "baseUrl": "https://api.medilink.healthatom.com/api/v1", // opcional
  "rateLimitPerMin": 20 // opcional
}
```

### 3. Validación de Conexión

El sistema realiza un "smoke test" automático:
- Obtiene lista de sucursales
- Obtiene estados de cita
- Guarda metadata para uso posterior

## APIs Disponibles

### Endpoints de Administración

| Método | Endpoint | Descripción | Rol Requerido |
|--------|----------|-------------|---------------|
| POST | `/integrations/medilink/connect` | Conectar integración | admin |
| POST | `/integrations/medilink/validate` | Validar conexión | admin |
| POST | `/integrations/medilink/disconnect` | Desconectar | admin |
| GET | `/integrations/medilink/metadata` | Obtener metadata | admin |
| GET | `/integrations/medilink/branches` | Listar sucursales | user |
| GET | `/integrations/medilink/professionals` | Listar profesionales | user |
| GET | `/integrations/medilink/branches/:id/chairs` | Obtener sillones | user |

### Endpoints de Bot

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/integrations/medilink/availability` | Obtener disponibilidad |
| POST | `/integrations/medilink/schedule` | Agendar cita |
| PUT | `/integrations/medilink/reschedule` | Reagendar cita |
| POST | `/integrations/medilink/cancel` | Cancelar cita |

## Funnel healthcare_medilink

### Etapas del Funnel

1. **INTAKE**: Identificación del paciente
   - Solicita nombre y apellidos
   - Opcionalmente RUT y email
   - Busca o crea paciente en Medilink

2. **NEEDS**: Preferencias de atención
   - Selección de sucursal
   - Opcionalmente especialidad

3. **SELECT_PROFESSIONAL**: Selección de profesional
   - Lista profesionales disponibles
   - Filtrado por sucursal

4. **SELECT_SLOT**: Selección de horario
   - Muestra slots disponibles (máx. 10)
   - Próximos 7 días por defecto

5. **ATTENTION_RESOLVE**: Resolver atención
   - Busca atención abierta del paciente
   - Si no existe → NEED_ATTENTION_HUMAN

6. **CONFIRM**: Confirmación
   - Muestra resumen de la cita
   - Requiere confirmación SI/NO

7. **DONE**: Proceso completado
   - Envía plantilla WhatsApp de confirmación
   - Cierra el funnel

### Manejo de Errores

El funnel maneja automáticamente:
- Timeouts por etapa
- Reintentos (máx. 3)
- Intervención humana cuando se requiere

## Plantillas WhatsApp

### Plantilla: cita_creada

```
Hola {1},

Tu cita médica ha sido agendada:
👨‍⚕️ Profesional: {2}
📅 Fecha: {3}
🕐 Hora: {4}
🏥 Sucursal: {5}
📝 Código: {6}

Te esperamos!
```

### Plantilla: cita_reagendada

```
Hola {1},

Tu cita médica ha sido reagendada:
👨‍⚕️ Profesional: {2}
📅 Nueva fecha: {3}
🕐 Nueva hora: {4}
🏥 Sucursal: {5}

Gracias por tu comprensión.
```

### Plantilla: cita_anulada

```
Hola {1},

Tu cita médica ha sido cancelada:
📅 Fecha: {2}
🕐 Hora: {3}
🏥 Sucursal: {4}

Si deseas reagendar, contáctanos.
```

## Casos de Error Comunes

### 401 - Token Inválido

**Síntoma**: Error de autenticación al conectar
**Solución**: 
- Verificar que el token sea correcto
- Regenerar token en Medilink si es necesario
- La integración se marca como `invalid_token`

### 429 - Rate Limit

**Síntoma**: Too Many Requests
**Solución**: 
- Sistema aplica backoff exponencial automático
- Ajustar `rateLimitPerMin` si es necesario

### NEED_ATTENTION_HUMAN

**Síntoma**: No se puede crear cita
**Causa**: Paciente sin atención abierta
**Solución**: 
- Crear atención manualmente en Medilink
- El sistema genera ticket para intervención

### Plantilla WhatsApp No Encontrada

**Síntoma**: Error al enviar notificación
**Causas**:
- Plantilla no existe en Meta Business
- Idioma incorrecto (usar es_ES no es)
**Solución**:
- Crear plantillas en Meta Business Suite
- Verificar que estén aprobadas
- Usar código de idioma correcto

## Snippets de Prueba

### Conectar Integración

```bash
curl -X POST http://localhost:3000/integrations/medilink/connect \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accessToken": "your_medilink_token",
    "rateLimitPerMin": 20
  }'
```

### Agendar Cita

```bash
curl -X POST http://localhost:3000/integrations/medilink/schedule \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneE164": "+56912345678",
    "patient": {
      "name": "Juan",
      "lastName": "Pérez",
      "rut": "12345678-9"
    },
    "branchId": "1",
    "professionalId": "31",
    "chairId": "2",
    "dateYmd": "2025-10-21",
    "time": "10:00"
  }'
```

### Obtener Disponibilidad

```bash
curl -X POST http://localhost:3000/integrations/medilink/availability \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "1",
    "professionalId": "31",
    "fromDate": "2025-10-20",
    "toDate": "2025-10-27"
  }'
```

## Arquitectura de Seguridad

### Cifrado de Tokens

- Algoritmo: AES-256-GCM
- Clave: 32 bytes almacenada en variable de entorno
- Formato almacenado: `base64(iv + tag + ciphertext)`

### Validación E.164

Todos los números de teléfono se validan y normalizan:
- Formato: `+[código país][número]`
- Chile por defecto: `+56`
- Validación estricta antes de enviar a WhatsApp

### Opt-in WhatsApp

- Se registra consentimiento explícito
- Solo se envían plantillas a usuarios con opt-in
- Se respeta opt-out inmediatamente

## Migraciones de Base de Datos

Ejecutar migraciones:

```bash
npm run migration:run
```

Tablas creadas:
- `medilink_integrations`: Configuración por empresa
- `medilink_mappings`: Mapeo ID interno ↔ externo
- `patient_links`: Vínculo teléfono ↔ paciente
- `booking_sessions`: Sesiones de reserva activas

## Testing

### Tests Unitarios

```bash
npm run test:unit medilink
```

Cobertura mínima:
- Cliente HTTP con mocks
- Manejo de errores 401/429/5xx
- Cifrado/descifrado de tokens
- Validación E.164

### Tests E2E

```bash
npm run test:e2e medilink
```

Flujos probados:
- Conectar integración
- Flujo completo de agendamiento
- Reagendamiento
- Cancelación
- Envío de plantillas WhatsApp

## Troubleshooting

### La integración no se conecta

1. Verificar token en Medilink
2. Verificar URL base (v1 vs v5)
3. Revisar logs del servidor
4. Verificar conectividad HTTPS

### No se envían notificaciones WhatsApp

1. Verificar `WA_PHONE_NUMBER_ID` y `WA_ACCESS_TOKEN`
2. Confirmar que las plantillas existen y están aprobadas
3. Verificar idioma de plantillas (es_ES)
4. Confirmar opt-in del paciente

### Error "NEED_ATTENTION_HUMAN"

1. Verificar en Medilink que el paciente tenga atención abierta
2. Crear atención manualmente si es necesario
3. El sistema registra el incidente para seguimiento

### Límite de rate excedido

1. Ajustar `MEDILINK_RATE_LIMIT_RPM`
2. Implementar cola de procesamiento si es necesario
3. Considerar múltiples tokens para alto volumen

## Roadmap

- [ ] Soporte para videoconsultas
- [ ] Sincronización bidireccional de citas
- [ ] Webhooks para cambios en Medilink
- [ ] Dashboard de métricas por empresa
- [ ] Soporte multi-idioma para plantillas
- [ ] Integración con calendario del paciente

## Soporte

Para soporte técnico:
- Revisar logs en `/var/log/medilink/`
- Contactar equipo de desarrollo
- Documentación API Medilink: https://api.medilink.healthatom.com/docs
