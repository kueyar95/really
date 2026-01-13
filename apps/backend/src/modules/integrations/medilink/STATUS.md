# ✅ Módulo Medilink - ACTIVADO

## Estado Actual

🟢 **MÓDULO COMPLETAMENTE ACTIVADO Y LISTO PARA USAR**

Fecha de activación: 24 de Octubre, 2025

## ✅ Pasos Completados

### 1. Archivos Habilitados
- ✅ Módulo principal: `medilink/` (renombrado desde `medilink.disabled/`)
- ✅ Configuración: `medilink.config.ts`
- ✅ Funnel: `healthcare_medilink/`
- ✅ Tools: `medilink.tools.ts`
- ✅ Migración: `1729200000000-CreateMedilinkTables.ts`
- ✅ Todos los archivos internos del módulo restaurados

### 2. Dependencias Instaladas
- ✅ `bottleneck` - Para rate limiting

### 3. Módulo Registrado
- ✅ `MedilinkModule` agregado a `app.module.ts`

### 4. Entidades Registradas en TypeORM
- ✅ `MedilinkIntegration`
- ✅ `MedilinkMapping`
- ✅ `PatientLink`
- ✅ `BookingSession`

## 🎯 Próximos Pasos

### 1. Configurar Variables de Entorno

Necesitas agregar estas variables a tu archivo `.env`:

```bash
# Medilink API
MEDILINK_DEFAULT_BASE_URL=https://api.medilink.healthatom.com/api/v1
MEDILINK_ENCRYPTION_KEY_B64=<tu_clave_generada>
MEDILINK_RATE_LIMIT_RPM=20
MEDILINK_SYNC_ENABLED=false

# WhatsApp Cloud API (si aún no están)
WA_GRAPH_VERSION=20.0
WA_PHONE_NUMBER_ID=<tu_phone_number_id>
WA_ACCESS_TOKEN=<tu_access_token>
WA_LANG_CODE=es_ES
WA_TEMPLATE_CITA_CREADA=cita_creada
WA_TEMPLATE_CITA_REAGENDADA=cita_reagendada
WA_TEMPLATE_CITA_ANULADA=cita_anulada
```

**Generar clave de encriptación:**
```bash
openssl rand -base64 32
```

### 2. Ejecutar Migraciones

```bash
cd apps/backend
npm run migration:run
```

Esto creará las tablas:
- `medilink_integrations`
- `medilink_mappings`
- `patient_links`
- `booking_sessions`

### 3. Crear Plantillas en Meta Business Suite

Ve a https://business.facebook.com/wa/manage/message-templates/ y crea:

1. **cita_creada** (con idioma `es_ES`)
2. **cita_reagendada** (con idioma `es_ES`)
3. **cita_anulada** (con idioma `es_ES`)

Ver detalles en [ACTIVATION.md](./ACTIVATION.md)

### 4. Reiniciar la Aplicación

```bash
npm run build
npm run start:prod
```

## 🔍 Verificar que Todo Funciona

### Test 1: API Endpoints Disponibles

```bash
# Debe responder (requiere autenticación)
curl http://localhost:3000/integrations/medilink/metadata
```

### Test 2: Conectar Integración

```bash
curl -X POST http://localhost:3000/integrations/medilink/connect \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accessToken": "tu_token_de_medilink",
    "rateLimitPerMin": 20
  }'
```

## 📊 Endpoints Disponibles

### Admin
- `POST /integrations/medilink/connect` - Conectar integración
- `POST /integrations/medilink/validate` - Validar conexión
- `POST /integrations/medilink/disconnect` - Desconectar
- `GET /integrations/medilink/metadata` - Obtener metadata
- `GET /integrations/medilink/branches` - Listar sucursales
- `GET /integrations/medilink/professionals` - Listar profesionales
- `GET /integrations/medilink/branches/:id/chairs` - Obtener sillones
- `GET /integrations/medilink/appointment-states` - Estados de cita

### Bot
- `POST /integrations/medilink/availability` - Ver disponibilidad
- `POST /integrations/medilink/schedule` - Agendar cita
- `PUT /integrations/medilink/reschedule` - Reagendar cita
- `POST /integrations/medilink/cancel` - Cancelar cita

### Pacientes
- `GET /integrations/medilink/patients/search` - Buscar pacientes
- `GET /integrations/medilink/patients/:id/attentions` - Ver atenciones

## 🔧 Características Activas

- ✅ Multi-tenant (cada empresa con su token)
- ✅ Rate limiting por tenant
- ✅ Reintentos automáticos con backoff exponencial
- ✅ Cifrado de tokens (AES-256-GCM)
- ✅ Validación E.164 de teléfonos
- ✅ Plantillas WhatsApp proactivas
- ✅ Funnel de agendamiento médico
- ✅ Tools para bots (AI)
- ✅ Manejo de atenciones
- ✅ Sesiones de reserva

## 📖 Documentación

- **[README.md](./README.md)** - Documentación completa de la integración
- **[ACTIVATION.md](./ACTIVATION.md)** - Guía paso a paso de activación
- **[DEPLOY-SAFE.md](./DEPLOY-SAFE.md)** - Información sobre despliegue seguro

## ⚠️ Importante

- **Tokens cifrados**: Los tokens de Medilink se almacenan cifrados en la BD
- **Opt-in WhatsApp**: Solo se envían mensajes a usuarios con consentimiento
- **HTTPS obligatorio**: Todas las conexiones a Medilink son HTTPS
- **Sin PII en logs**: Nunca se loggean datos sensibles

## 🆘 Troubleshooting

### Error 401 - Token Inválido
- Verificar que el token sea correcto
- Regenerar token en Medilink si es necesario
- La integración se marca automáticamente como `invalid_token`

### Error 429 - Rate Limit
- El sistema aplica backoff automático
- Ajustar `MEDILINK_RATE_LIMIT_RPM` si es necesario

### "NEED_ATTENTION_HUMAN"
- El paciente no tiene atención abierta en Medilink
- Crear atención manualmente en Medilink
- El sistema genera ticket para seguimiento

### Plantillas WhatsApp No Funcionan
- Verificar que existan en Meta Business Suite
- Verificar que estén aprobadas
- Usar idioma correcto (`es_ES`)
- Verificar opt-in del paciente

## 📞 Soporte

Si encuentras problemas:
1. Revisar logs del servidor
2. Consultar [README.md](./README.md) para troubleshooting detallado
3. Contactar al equipo de desarrollo

---

**¡El módulo está listo para usarse!** 🎉
