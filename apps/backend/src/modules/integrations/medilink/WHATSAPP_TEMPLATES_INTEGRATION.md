# ✅ Integración de Templates de WhatsApp - COMPLETADA

## 🎯 Estado Actual

✅ **INTEGRACIÓN COMPLETADA** - Fecha: 27 de Octubre, 2025

La integración de los templates de WhatsApp Business con Medilink está **completamente implementada** y lista para usar.

---

## 📋 Resumen de Cambios Implementados

### 1. ✅ Servicio de Templates de WhatsApp

**Archivo:** `services/whatsapp-templates.service.ts`

El servicio ya estaba implementado con tres métodos principales:

- ✅ `sendTemplateAppointmentCreated()` - Envía notificación de cita creada
- ✅ `sendTemplateAppointmentRescheduled()` - Envía notificación de cita reagendada
- ✅ `sendTemplateAppointmentCancelled()` - Envía notificación de cita cancelada
- ✅ `registerOptIn()` - Registra el consentimiento del paciente
- ✅ `registerOptOut()` - Registra la revocación del consentimiento

**Características del servicio:**
- ✅ Verificación de opt-in antes de enviar
- ✅ Validación de números en formato E.164
- ✅ Manejo automático de idiomas (fallback es_ES ↔ es)
- ✅ Manejo robusto de errores
- ✅ Formateo de fechas en español

---

### 2. ✅ Integración en MedilinkService

**Archivo:** `medilink.service.ts`

Se han implementado los siguientes cambios:

#### a) Importación del servicio de templates
```typescript
import { WhatsAppTemplatesService } from './services/whatsapp-templates.service';
```

#### b) Inyección en el constructor
```typescript
constructor(
  // ... otros servicios
  private readonly whatsappTemplatesService: WhatsAppTemplatesService,
) {}
```

#### c) Métodos auxiliares agregados
```typescript
// Obtiene el nombre completo de un profesional
private async getProfessionalName(companyId: string, professionalId: string): Promise<string>

// Obtiene el nombre de una sucursal
private async getBranchName(companyId: string, branchId: string): Promise<string>
```

#### d) Integración en `createAppointment()`
- ✅ Obtiene nombres reales de profesional y sucursal
- ✅ Envía notificación de cita creada al paciente
- ✅ Maneja errores sin afectar la creación de la cita
- ✅ Retorna flag `whatsappMessageSent`

#### e) Integración en `rescheduleAppointment()`
- ✅ Obtiene nombres reales de profesional y sucursal
- ✅ Busca el teléfono del paciente en la BD
- ✅ Envía notificación de cita reagendada
- ✅ Incluye fecha/hora antigua y nueva
- ✅ Maneja errores sin afectar el reagendamiento

#### f) Integración en `cancelAppointment()`
- ✅ Obtiene nombres reales de profesional y sucursal
- ✅ Busca el teléfono del paciente en la BD
- ✅ Envía notificación de cita cancelada
- ✅ Respeta flag `sendWhatsapp` del DTO
- ✅ Maneja errores sin afectar la cancelación

---

## 🔧 Configuración Requerida

### Variables de Entorno

Para que los templates funcionen, necesitas configurar estas variables en tu `.env`:

```bash
# WhatsApp Cloud API
WA_GRAPH_VERSION=20.0
WA_PHONE_NUMBER_ID=<tu_phone_number_id>
WA_ACCESS_TOKEN=<tu_access_token>
WA_LANG_CODE=es_ES

# Nombres de los templates (deben coincidir exactamente con Meta Business Suite)
WA_TEMPLATE_CITA_CREADA=cita_creada
WA_TEMPLATE_CITA_REAGENDADA=cita_reagendada
WA_TEMPLATE_CITA_ANULADA=cita_anulada
```

### Obtener Credenciales de WhatsApp Business

1. **WA_PHONE_NUMBER_ID**:
   - Ve a [Meta for Developers](https://developers.facebook.com/)
   - Selecciona tu app de WhatsApp Business
   - Ve a "WhatsApp" → "API Setup"
   - Copia el "Phone number ID"

2. **WA_ACCESS_TOKEN**:
   - En la misma página de API Setup
   - Genera un token de acceso
   - Selecciona los permisos: `whatsapp_business_messaging`, `whatsapp_business_management`

---

## 📝 Crear Templates en Meta Business Suite

### Paso 1: Acceder a Meta Business Suite

Ve a: https://business.facebook.com/wa/manage/message-templates/

### Paso 2: Crear Template "cita_creada"

**Nombre:** `cita_creada`  
**Categoría:** UTILITY  
**Idioma:** Spanish (ES)

**Contenido del mensaje:**
```
Hola {{1}}, tu cita ha sido agendada exitosamente.

📅 *Detalles de tu cita:*
👨‍⚕️ Profesional: {{2}}
📆 Fecha: {{3}}
🕐 Hora: {{4}}
📍 Sucursal: {{5}}
🔢 Código de confirmación: {{6}}

¡Te esperamos!
```

**Parámetros:**
1. `{{1}}` - Nombre del paciente
2. `{{2}}` - Nombre del profesional
3. `{{3}}` - Fecha formateada
4. `{{4}}` - Hora
5. `{{5}}` - Nombre de la sucursal
6. `{{6}}` - Código de confirmación

---

### Paso 3: Crear Template "cita_reagendada"

**Nombre:** `cita_reagendada`  
**Categoría:** UTILITY  
**Idioma:** Spanish (ES)

**Contenido del mensaje:**
```
Hola {{1}}, tu cita ha sido reagendada.

📅 *Nueva fecha de tu cita:*
👨‍⚕️ Profesional: {{2}}
📆 Nueva fecha: {{3}}
🕐 Nueva hora: {{4}}
📍 Sucursal: {{5}}

¡Te esperamos!
```

**Parámetros:**
1. `{{1}}` - Nombre del paciente
2. `{{2}}` - Nombre del profesional
3. `{{3}}` - Nueva fecha formateada
4. `{{4}}` - Nueva hora
5. `{{5}}` - Nombre de la sucursal

---

### Paso 4: Crear Template "cita_anulada"

**Nombre:** `cita_anulada`  
**Categoría:** UTILITY  
**Idioma:** Spanish (ES)

**Contenido del mensaje:**
```
Hola {{1}}, tu cita ha sido cancelada.

📅 *Cita cancelada:*
📆 Fecha: {{2}}
🕐 Hora: {{3}}
📍 Sucursal: {{4}}

Si deseas agendar nuevamente, contáctanos.
```

**Parámetros:**
1. `{{1}}` - Nombre del paciente
2. `{{2}}` - Fecha formateada
3. `{{3}}` - Hora
4. `{{4}}` - Nombre de la sucursal

---

### Paso 5: Esperar Aprobación

Una vez creados los templates:
- ⏳ Meta los revisará (puede tomar de minutos a 24 horas)
- ✅ Recibirás una notificación cuando sean aprobados
- 🟢 Solo entonces podrás usarlos en producción

---

## 🧪 Cómo Probar

### 1. Verificar Configuración

```bash
# Verificar que las variables estén cargadas
curl http://localhost:3000/health
```

### 2. Crear una Cita de Prueba

```bash
POST /integrations/medilink/appointments
{
  "phoneE164": "+56912345678",
  "professionalId": "123",
  "branchId": "1",
  "chairId": "5",
  "dateYmd": "2025-10-28",
  "time": "10:00",
  "patient": {
    "name": "Juan",
    "lastName": "Pérez",
    "rut": "12345678-9",
    "email": "juan@example.com"
  }
}
```

**Respuesta esperada:**
```json
{
  "appointmentId": "456",
  "patientId": "789",
  "professionalName": "Dr. García",
  "branchName": "Sucursal Centro",
  "date": "2025-10-28",
  "time": "10:00",
  "whatsappMessageSent": true  // ✅ Template enviado
}
```

### 3. Verificar en WhatsApp

- 📱 El paciente debe recibir el mensaje en WhatsApp
- ✅ El mensaje debe tener el formato del template
- ✅ Todos los parámetros deben estar reemplazados

---

## 🔍 Troubleshooting

### Error: "WhatsApp no está configurado"

**Causa:** Faltan variables `WA_PHONE_NUMBER_ID` o `WA_ACCESS_TOKEN`

**Solución:**
```bash
# Agrega al .env
WA_PHONE_NUMBER_ID=tu_phone_number_id
WA_ACCESS_TOKEN=tu_access_token

# Reinicia la aplicación
npm run start:dev
```

---

### Error: "Template not found"

**Causa:** El template no existe o no está aprobado en Meta

**Solución:**
1. Ve a Meta Business Suite
2. Verifica que el template esté creado
3. Verifica que esté aprobado (estado: APPROVED)
4. Verifica que el nombre coincida exactamente

---

### Error: "Language mismatch"

**Causa:** El idioma del template no coincide con `WA_LANG_CODE`

**Solución:**
1. El servicio intenta automáticamente con `es_ES` y `es`
2. Verifica que el template tenga el idioma correcto
3. Si usas otro idioma, actualiza `WA_LANG_CODE` en `.env`

---

### Error: "No opt-in"

**Causa:** El paciente no ha dado consentimiento para recibir mensajes

**Solución:**
```typescript
// Registrar opt-in cuando el paciente acepta
await whatsappTemplatesService.registerOptIn(
  companyId,
  '+56912345678',
  'pacienteId123'
);
```

---

## 📊 Logs y Monitoreo

Los logs incluyen información detallada:

```
[MedilinkService] Notificación de cita creada enviada a +56912345678
[WhatsAppTemplatesService] Enviando plantilla cita_creada a +56912345678
[WhatsAppTemplatesService] Plantilla enviada exitosamente: wamid.xxx
```

**Errores no críticos:**
```
[MedilinkService] Error enviando notificación de cita creada: Template not found
[WhatsAppTemplatesService] Usuario +56912345678 no tiene opt-in para WhatsApp
```

> ⚠️ **Importante:** Los errores en el envío de WhatsApp NO afectan la creación/modificación de citas.

---

## ✅ Checklist de Implementación

- [x] ✅ `WhatsAppTemplatesService` implementado
- [x] ✅ Integración en `createAppointment()`
- [x] ✅ Integración en `rescheduleAppointment()`
- [x] ✅ Integración en `cancelAppointment()`
- [x] ✅ Métodos auxiliares para nombres de profesionales/sucursales
- [x] ✅ Manejo de errores sin afectar el flujo principal
- [x] ✅ Validación de opt-in
- [x] ✅ Formateo de fechas en español
- [x] ✅ Documentación completa
- [ ] ⏳ Configurar variables de entorno en producción
- [ ] ⏳ Crear templates en Meta Business Suite
- [ ] ⏳ Esperar aprobación de templates
- [ ] ⏳ Probar en producción

---

## 🎉 ¡Próximos Pasos!

1. **Configura las variables de entorno** en tu plataforma de deployment
2. **Crea los templates** en Meta Business Suite
3. **Espera la aprobación** de Meta (suele ser rápido)
4. **Prueba** enviando una cita de prueba
5. **¡Disfruta!** de las notificaciones automáticas por WhatsApp

---

## 📚 Referencias

- [Meta WhatsApp Business API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Message Templates](https://developers.facebook.com/docs/whatsapp/message-templates)
- [Template Components](https://developers.facebook.com/docs/whatsapp/api/messages/message-templates#components)
- [Meta Business Suite](https://business.facebook.com/)

---

**Cualquier duda, revisa los logs o consulta la documentación de Meta.**

✨ ¡Integración completada con éxito! ✨

