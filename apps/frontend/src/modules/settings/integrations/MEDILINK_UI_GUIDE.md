# 🎨 Guía de Usuario - Interfaz de Medilink

## 📍 Ubicación

La configuración de Medilink se encuentra en:

**Configuración → Integraciones → Sección "Salud" → Card de Medilink**

## 🚀 Cómo Conectar Medilink

### Paso 1: Generar Token en Medilink

1. Inicia sesión en tu panel de Medilink
2. Ve a **Administrador → Configuración API**
3. Click en **+ Agregar cliente**
4. Dale un nombre (ej: "REALLY WhatsApp Bot")
5. Click en **Ver token → Generar**
6. **Copia el token** (solo se muestra una vez)

### Paso 2: Conectar desde REALLY

1. Ve a **Configuración** en la barra lateral
2. Click en la pestaña **Integraciones**
3. En la sección **Salud**, click en la card de **Medilink**
4. En el modal que se abre:
   - Pega el **token** que copiaste
   - Selecciona la **versión de Medilink** que usa tu clínica:
     - `Medilink v1` para instalaciones antiguas
     - `Medilink v2/v5` o `v2/v6` para instalaciones recientes
   - Ajusta el **rate limit** si es necesario (por defecto 20 req/min)
5. Click en **Conectar Medilink**

### Paso 3: Verificar Conexión

Después de conectar:
- Verás un badge **verde "Conectado"** en la card
- En el tab **Estado** podrás ver:
  - Estado de la conexión
  - URL base configurada
  - Rate limit configurado
  - Fecha de última conexión exitosa
  - Errores recientes (si los hay)

## 📊 Pestañas del Modal

### 🔌 Conexión
- Formulario para pegar el token
- Selección de versión de Medilink
- Configuración de rate limit
- Botones para conectar/desconectar
- Botón "Probar Conexión" para validar

### 📈 Estado
- Estado actual de la integración
- URL base configurada
- Rate limit activo
- Última conexión exitosa
- Últimos errores (si existen)
- Botones para actualizar y probar

### 📚 Catálogos
- **Sucursales**: Lista de todas las sucursales disponibles
- **Profesionales**: Click en una sucursal para ver sus profesionales
- **Características**: Descripción de funcionalidades disponibles

## ✅ Estados Visuales

### 🟢 Conectado
- Badge verde con check
- Todos los tabs habilitados
- Funcionalidad completa

### 🔴 Token Inválido
- Badge rojo con advertencia
- Mensaje de error
- Opción para actualizar token

### ⚪ Desconectado
- Badge gris
- Solo tab de conexión disponible
- Mensaje para conectar

### ⏳ Cargando
- Badge con animación
- Spinner en botones
- Deshabilita interacciones

## 🎯 Funcionalidades Clave

### Probar Conexión
Valida que:
- ✅ Token es válido
- ✅ Se puede acceder a la API
- ✅ Se pueden listar sucursales
- ✅ Se pueden obtener estados de cita

### Ver Catálogos
Permite explorar:
- 🏥 **Sucursales**: Todas las locaciones
- 👨‍⚕️ **Profesionales**: Click en sucursal para ver lista
- 🪑 **Sillones**: Disponibles por sucursal
- 📋 **Estados**: Estados posibles de citas

### Actualizar Configuración
- Puedes cambiar el token sin desconectar
- Cambiar versión de Medilink
- Ajustar rate limit

## 🔒 Seguridad

- 🔐 **Token cifrado**: Se almacena con AES-256-GCM
- 👥 **Solo admin**: Solo admin/super_admin pueden conectar
- 🏢 **Multi-tenant**: Cada empresa tiene su propia conexión
- 🔍 **Sin logs sensibles**: Nunca se muestra el token en logs

## ⚠️ Mensajes de Error Comunes

### "Token de acceso inválido"
**Causa**: El token no es válido o expiró  
**Solución**: Generar un nuevo token en Medilink

### "Error de conexión"
**Causa**: No se puede acceder a la API  
**Solución**: 
- Verificar conectividad
- Confirmar que la URL sea correcta
- Verificar que Medilink esté operativo

### "No se encontraron sucursales"
**Causa**: Tu cuenta no tiene sucursales configuradas  
**Solución**: Configurar sucursales en Medilink primero

## 💡 Tips de Uso

1. **Versión correcta**: Confirma con tu proveedor de Medilink qué versión usar
2. **Rate limit conservador**: Empieza con 20 req/min y ajusta según necesidad
3. **Probar siempre**: Usa "Probar Conexión" después de configurar
4. **Ver catálogos**: Explora sucursales y profesionales para confirmar datos

## 🔄 Actualizar Token

Si necesitas cambiar el token:
1. Genera un nuevo token en Medilink
2. En la modal, pega el nuevo token
3. Click en **Actualizar Conexión**
4. No es necesario desconectar primero

## 🗑️ Desconectar

Para desconectar Medilink:
1. Abre el modal de configuración
2. Click en **Desconectar Medilink** (botón rojo)
3. Confirma la acción
4. La integración se marca como "revoked"

⚠️ **Nota**: Desconectar NO elimina los datos existentes (pacientes vinculados, historial de citas, etc.)

## 📱 Integración con WhatsApp

Una vez conectado Medilink:
- ✅ Los bots pueden agendar citas automáticamente
- ✅ Se envían notificaciones cuando se crea una cita
- ✅ Se notifica cuando se reagenda
- ✅ Se notifica cuando se cancela
- ✅ Funnel de agendamiento médico disponible

## 🆘 Soporte

Si necesitas ayuda:
1. Revisa el tab **Estado** para ver errores
2. Usa **Probar Conexión** para diagnosticar
3. Consulta con el equipo de desarrollo
4. Revisa documentación en el backend

---

**Última actualización**: Octubre 2025  
**Versión UI**: 1.0.0

