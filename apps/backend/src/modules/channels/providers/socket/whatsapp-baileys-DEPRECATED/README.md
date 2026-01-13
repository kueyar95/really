# 🔄 Flujo de Conexión de WhatsApp Baileys

## 📝 Introducción
Este documento explica en detalle el flujo completo para establecer una conexión a WhatsApp utilizando la biblioteca Baileys a través de WebSockets, desde la solicitud del usuario hasta la entrega del código QR.

## 🏗️ Arquitectura general 
El sistema utiliza un patrón de estrategia para manejar diferentes tipos de canales de WhatsApp (Web, Cloud y Baileys). La conexión se realiza a través de WebSockets, utilizando Socket.io para la comunicación en tiempo real.

## 🔄 Diagrama de flujo
Cliente WebSocket → Solicitud de conexión → WhatsAppGateway
WhatsAppGateway → Validación y procesamiento → ChannelsService
ChannelsService → Creación/Actualización del canal → ChannelManagerService
ChannelManagerService → Selección de estrategia → WhatsAppBaileysStrategy
WhatsAppBaileysStrategy → Inicialización del cliente → WhatsAppBaileysService
WhatsAppBaileysService → Configuración de eventos → Cliente WebSocket

## 📋 Flujo detallado paso a paso

### 1️⃣ Solicitud de conexión (Gateway)
El flujo comienza cuando un cliente envía un mensaje WebSocket a través del evento connectWhatsApp con los datos necesarios:

```typescript
// Evento WebSocket: connectWhatsApp
// Payload: { companyId: string, type: ChannelType }    
```

En el WhatsAppGateway, se procesa esta solicitud:
- Se valida que el usuario tenga acceso a la compañía especificada
- Se verifica que se proporcione un ID de compañía válido
- Se llama al servicio de canales para iniciar el proceso de conexión

### 2️⃣ Gestión del canal (ChannelsService)
El ChannelsService maneja la lógica de negocio:
- Valida que el tipo de conexión sea válido (WHATSAPP_WEB o WHATSAPP_BAILEYS)
- Verifica si ya existe un canal para la compañía y el tipo especificado
- Si existe un canal activo, lanza una excepción
- Si existe un canal inactivo, lo actualiza a estado "connecting"
- Si no existe un canal, crea uno nuevo en estado "connecting"
- Finalmente, delega la conexión al ChannelManagerService

### 3️⃣ Gestión de la conexión (ChannelManagerService)
El ChannelManagerService implementa el patrón de estrategia:
- Mantiene un registro de estrategias para diferentes tipos de canales
- Para canales tipo socket (como Baileys), selecciona la estrategia adecuada
- Llama al método connect de la estrategia seleccionada pasando el ID de la compañía

### 4️⃣ Implementación de la estrategia (WhatsAppBaileysStrategy)
La WhatsAppBaileysStrategy maneja la lógica específica de Baileys:
- Llama al WhatsAppBaileysService para inicializar el cliente
- Configura los eventos para procesar mensajes entrantes
- Maneja errores y actualiza el estado del canal según sea necesario

### 5️⃣ Inicialización del cliente (WhatsAppBaileysService)
El WhatsAppBaileysService es responsable de la comunicación directa con la biblioteca Baileys:
- Gestiona la ruta de sesión para la autenticación
- Inicializa el cliente WhatsApp con la configuración adecuada
- Configura los manejadores de eventos para la conexión:
  * connection.update: Maneja cambios en el estado de la conexión
  * creds.update: Almacena las credenciales actualizadas
  * messages.upsert: Procesa mensajes entrantes

### 6️⃣ Generación y envío del código QR
Cuando se recibe un código QR:
- Se emite el evento a través del WhatsAppGateway utilizando emitQR
- Se actualiza el estado del cliente a "connecting"
- Se actualiza el estado del canal en la base de datos

### 7️⃣ Establecimiento de la conexión
Una vez escaneado el QR y establecida la conexión:
- Se actualiza el estado del canal a "active"
- Se obtiene el número de teléfono del usuario conectado
- Se emite el evento "ready" con los datos relevantes
- Se actualiza la información del cliente para posibles reconexiones

## ⚠️ Manejo de errores y reconexión
El sistema incluye una lógica robusta para manejar errores:
- Límite configurado de intentos de reconexión (MAX_RECONNECT_ATTEMPTS)
- Retraso entre intentos de reconexión (RECONNECT_DELAY)
- Actualización del estado del canal a "error" o "inactive" según corresponda
- Notificación al cliente sobre el estado de la conexión

## 🔑 Consideraciones importantes
- **Persistencia de sesiones**: Las sesiones se almacenan en el directorio .baileys_auth para permitir reconexiones sin necesidad de escanear nuevamente el QR.
- **Seguridad**: Se valida el acceso del usuario a la compañía antes de permitir la conexión.
- **Concurrencia**: Se utiliza un mapa para almacenar y gestionar múltiples conexiones simultáneas.
- **Eventos en tiempo real**: Todos los eventos importantes se notifican al cliente a través de WebSockets.

## 🎯 Conclusión
El flujo de conexión de WhatsApp Baileys está diseñado para ser robusto, seguro y escalable, permitiendo a los clientes establecer fácilmente conexiones a WhatsApp a través de un código QR, mientras el sistema maneja automáticamente la autenticación, reconexión y procesamiento de mensajes.