# 🔌 Guía de Activación de Medilink

## Estado Actual

✅ **Código implementado y listo para usar**  
⏸️ **Módulo desactivado** (no registrado en AppModule)

La integración de Medilink está completamente implementada pero **no activa**. Esto significa que:
- ✅ El código se puede desplegar sin errores
- ✅ No afecta a la aplicación actual
- ✅ No requiere configuración hasta que se active

## Cómo Activar la Integración

### Paso 1: Configurar Variables de Entorno

Agrega estas variables a tu archivo `.env`:

```bash
# Medilink API
MEDILINK_DEFAULT_BASE_URL=https://api.medilink.healthatom.com/api/v1
MEDILINK_ENCRYPTION_KEY_B64=<tu_clave_generada>
MEDILINK_RATE_LIMIT_RPM=20
MEDILINK_SYNC_ENABLED=false

# WhatsApp Cloud API (si aún no están configuradas)
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
# En terminal
openssl rand -base64 32

# O con Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Paso 2: Habilitar Módulo y Archivos

Todos los archivos de Medilink están desactivados. Para habilitarlos:

```bash
# Habilitar el módulo principal
cd apps/backend/src/modules/integrations
mv medilink.disabled medilink

# Habilitar la configuración
cd ../../config
mv medilink.config.ts.disabled medilink.config.ts

# Habilitar el funnel
cd ../modules/funnels/types
mv healthcare_medilink.disabled healthcare_medilink

# Habilitar las tools
cd ../../ai-bots/tools
mv medilink.tools.ts.disabled medilink.tools.ts

# Habilitar la migración
cd ../../../database/migrations
mv 1729200000000-CreateMedilinkTables.ts.disabled 1729200000000-CreateMedilinkTables.ts
```

### Paso 3: Ejecutar Migraciones

```bash
cd apps/backend
npm run migration:run
```

Esto creará las tablas:
- `medilink_integrations`
- `medilink_mappings`
- `patient_links`
- `booking_sessions`

### Paso 4: Instalar Dependencias Faltantes

```bash
cd apps/backend
npm install bottleneck @types/bottleneck
```

### Paso 5: Registrar el Módulo

Edita `apps/backend/src/app.module.ts` y agrega:

```typescript
// Importar el módulo
import { MedilinkModule } from './modules/integrations/medilink/medilink.module';

@Module({
  imports: [
    // ... otros módulos
    EmailModule,
    WhatsAppModule,
    MedilinkModule,  // 👈 Agregar aquí
  ],
  // ...
})
export class AppModule {}
```

### Paso 6: Registrar Entidades en TypeORM

En el mismo archivo `app.module.ts`, agrega las entidades:

```typescript
import { MedilinkIntegration } from './modules/integrations/medilink/entities/medilink-integration.entity';
import { MedilinkMapping } from './modules/integrations/medilink/entities/medilink-mapping.entity';
import { PatientLink } from './modules/integrations/medilink/entities/patient-link.entity';
import { BookingSession } from './modules/integrations/medilink/entities/booking-session.entity';

// ...

TypeOrmModule.forRootAsync({
  // ...
  useFactory: (configService: ConfigService) => {
    return {
      // ...
      entities: [
        Company,
        User,
        // ... otras entidades
        MedilinkIntegration,  // 👈 Agregar
        MedilinkMapping,      // 👈 Agregar
        PatientLink,          // 👈 Agregar
        BookingSession,       // 👈 Agregar
      ],
      // ...
    };
  },
  // ...
})
```

### Paso 7: Crear Plantillas en Meta Business Suite

1. Ve a https://business.facebook.com/wa/manage/message-templates/
2. Crea las siguientes plantillas con idioma **es_ES**:

#### Plantilla: `cita_creada`
```
Hola {{1}},

Tu cita médica ha sido agendada:
👨‍⚕️ Profesional: {{2}}
📅 Fecha: {{3}}
🕐 Hora: {{4}}
🏥 Sucursal: {{5}}
📝 Código: {{6}}

Te esperamos!
```

#### Plantilla: `cita_reagendada`
```
Hola {{1}},

Tu cita médica ha sido reagendada:
👨‍⚕️ Profesional: {{2}}
📅 Nueva fecha: {{3}}
🕐 Nueva hora: {{4}}
🏥 Sucursal: {{5}}

Gracias por tu comprensión.
```

#### Plantilla: `cita_anulada`
```
Hola {{1}},

Tu cita médica ha sido cancelada:
📅 Fecha: {{2}}
🕐 Hora: {{3}}
🏥 Sucursal: {{4}}

Si deseas reagendar, contáctanos.
```

### Paso 8: Reiniciar la Aplicación

```bash
npm run build
npm run start:prod

# O en desarrollo
npm run start:dev
```

### Paso 9: Verificar Activación

Prueba que el módulo está activo:

```bash
# Health check
curl http://localhost:3000/integrations/medilink/metadata

# Debería retornar error 401 (auth) o 404 (not found) en lugar de error de módulo
```

## Desactivación Rápida

Si necesitas desactivar el módulo temporalmente:

1. Comenta la línea en `app.module.ts`:
   ```typescript
   // MedilinkModule,  // 👈 Comentar para desactivar
   ```

2. Reinicia la aplicación

## Verificación de Estado

### ✅ Módulo Activado Correctamente
- Endpoints `/integrations/medilink/*` responden
- Las migraciones se ejecutaron sin errores
- No hay errores en los logs al iniciar

### ❌ Errores Comunes

**Error: "MEDILINK_ENCRYPTION_KEY_B64 no está configurado"**
- Solución: Agregar la variable de entorno

**Error: "Cannot find module 'medilink.module'"**
- Solución: Verificar imports y paths

**Error: "relation 'medilink_integrations' does not exist"**
- Solución: Ejecutar migraciones

**Error plantillas WhatsApp**
- Solución: Crear plantillas en Meta Business Suite

## Rollback

Si algo sale mal:

```bash
# Revertir migraciones
npm run migration:revert

# Remover módulo de app.module.ts
# Reiniciar aplicación
```

## Soporte

- 📖 Ver README.md para documentación completa
- 🐛 Revisar logs en caso de errores
- 💬 Contactar al equipo de desarrollo
