# Backend CRM Inteligente Multicanal

## 1. Visión General

Este repositorio contiene el código fuente del backend para una plataforma avanzada de gestión de relaciones con clientes (CRM) y automatización de conversaciones. La plataforma permite a las empresas conectar múltiples canales de comunicación (como WhatsApp, Instagram, Messenger), definir embudos de ventas o procesos (funnels), y desplegar agentes de inteligencia artificial (AI Bots) para interactuar automáticamente con los clientes.

El backend está diseñado para ser consumido por una aplicación frontend, proporcionando una API RESTful robusta y comunicación en tiempo real mediante WebSockets para la gestión de canales.

**Objetivo Principal:** Automatizar y optimizar la comunicación con el cliente a través de IA, centralizando la gestión en una única plataforma multicanal y basada en funnels.

## 2. Arquitectura Tecnológica

-   **Framework:** [NestJS](https://nestjs.com/) (Node.js / TypeScript) - Un framework progresivo para construir aplicaciones eficientes, escalables y mantenibles del lado del servidor.
-   **Base de Datos:** [TypeORM](https://typeorm.io/) - Un ORM para TypeScript y JavaScript que soporta PostgreSQL, MySQL, MariaDB, etc. (Se utiliza PostgreSQL según las migraciones y configuración).
-   **Autenticación:**
    -   Gestión de usuarios y sesiones mediante integración con [Supabase](https://supabase.io/).
    -   Guardas de NestJS (`AuthGuard`, `RolesGuard`) para proteger rutas basadas en roles y estado de autenticación.
-   **Comunicación:**
    -   API RESTful para operaciones CRUD y lógica de negocio.
    -   WebSockets (`socket.io`) para comunicación bidireccional en tiempo real, principalmente para la gestión de canales (QR, estado, mensajes).
-   **Inteligencia Artificial:** Integración con [OpenAI](https://openai.com/) para las capacidades conversacionales de los AI Bots.
-   **Contenerización:** [Docker](https://www.docker.com/) y `docker-compose.yml` para facilitar el despliegue y la gestión del entorno.
-   **Manejo de Errores:** Un filtro global de excepciones (`GlobalExceptionFilter`) para estandarizar las respuestas de error.
-   **Configuración:** Gestión centralizada mediante módulos de configuración de NestJS y variables de entorno (`.env`).

## 3. Estructura del Proyecto (`src`)

El código fuente se organiza siguiendo las convenciones de NestJS, con una clara separación por módulos funcionales.

```
src/
├── app.module.ts         # Módulo raíz de la aplicación
├── main.ts               # Punto de entrada de la aplicación (bootstrap)
├── app.service.ts        # Servicio raíz (ejemplo)
│
├── auth/                 # Autenticación y Autorización
│   ├── config/           # Configuración (Supabase)
│   ├── decorators/       # Decoradores personalizados (@CurrentUser, @Public, @Roles)
│   ├── enums/            # Enumeraciones (Roles)
│   ├── guards/           # Guardas de ruta (AuthGuard, RolesGuard)
│   ├── services/         # Servicios (Supabase)
│   ├── types/            # Tipos de datos específicos de auth
│   ├── auth.controller.ts  # Controlador API para autenticación
│   └── auth.module.ts      # Módulo de autenticación
│
├── common/               # Elementos comunes reutilizables
│   ├── decorators/       # Decoradores (@Company)
│   ├── filters/          # Filtros de excepción (GlobalExceptionFilter)
│   ├── interceptors/     # Interceptores (CompanyContextInterceptor)
│   ├── utils/            # Utilidades generales
│   └── common.module.ts    # Módulo común
│
├── database/             # Configuración de base de datos, migraciones y seeds
│   ├── migrations/       # Migraciones de TypeORM
│   ├── seeds/            # Datos iniciales (seeds) para desarrollo/testing
│   └── typeorm.config.ts # Configuración de la conexión TypeORM
│
├── modules/              # Módulos de negocio principales
│   ├── ai/               # Integración con servicios de IA (OpenAI)
│   ├── ai-bots/          # Gestión de Agentes de IA (creación, configuración, funciones)
│   ├── calendar/         # Integración con Google Calendar (auth, eventos, disponibilidad)
│   ├── channels/         # Gestión de canales de comunicación (WhatsApp, etc.)
│   ├── clients/          # Gestión de clientes y historial de chats
│   ├── companies/        # Gestión de empresas/cuentas
│   ├── functions/        # Sistema de funciones ejecutables por AI Bots
│   ├── funnels/          # Gestión de embudos/pipelines de venta
│   ├── sheets/           # Integración con Google Sheets (auth, manipulación de datos)
│   ├── stages/           # Gestión de etapas dentro de los funnels
│   ├── users/            # Gestión de usuarios de la plataforma
│   └── web-scraping/     # Funcionalidades de extracción de datos web
│
└── utils/                # Utilidades específicas de la aplicación (ej: fechas)

```

## 4. Módulos Principales (`src/modules`)

Cada módulo encapsula una funcionalidad específica del negocio:

### 4.1. `ai`
-   **Propósito:** Gestionar la interacción con proveedores de modelos de lenguaje (actualmente OpenAI).
-   **Componentes Clave:**
    -   `OpenaiService`: Servicio para interactuar con la API de OpenAI (completions, embeddings, etc.).
    -   `OpenAiModule`: Módulo que configura y provee `OpenaiService`.

### 4.2. `ai-bots`
-   **Propósito:** Crear, configurar y gestionar los agentes de inteligencia artificial que interactuarán con los clientes.
-   **Componentes Clave:**
    -   `AiBotEntity`: Representación en BD de un bot (modelo, prompt, configuración).
    -   `BotFunctionEntity`: Representación en BD de la asociación entre un bot y una función disponible (`modules/functions`).
    -   `AiBotsService`: Lógica para crear, actualizar, buscar bots y gestionar sus funciones.
    -   `BotFunctionsService`: Lógica específica para asociar/desasociar funciones a bots.
    -   `AiBotsController`: Endpoints API para la gestión de bots (CRUD, añadir/quitar funciones, probar chat).
    -   `TryChatDto`: DTO para probar la respuesta de un bot sin un cliente real.

### 4.3. `calendar`
-   **Propósito:** Integración con Google Calendar para gestionar autenticación, calendarios, eventos y disponibilidad.
-   **Componentes Clave:**
    -   `CalendarAccessEntity`, `CalendarEntity`, `EventEntity`: Modelos de datos.
    -   `GoogleCalendarAuthService`: Maneja el flujo OAuth2 con Google Calendar.
    -   `GoogleCalendarSetupService`: Gestiona la configuración inicial y webhooks.
    -   `CalendarEventService`: Lógica para CRUD de eventos en Google Calendar.
    -   `CalendarAvailabilityService`: Calcula la disponibilidad basada en calendarios y eventos.
    -   `CalendarAuthController`, `EventController`: Endpoints API para autenticación y gestión de eventos.

### 4.4. `channels`
-   **Propósito:** Módulo central para la gestión de múltiples canales de comunicación. Abstrae la complejidad de diferentes proveedores (WhatsApp Cloud API, Whapi Cloud, WhatsApp Web JS, Baileys).
-   **Componentes Clave:**
    -   `ChannelEntity`: Representación en BD de un canal (tipo, credenciales, estado).
    -   **Core:**
        -   `ChannelManagerService`: Orquesta la conexión, desconexión y estado de los canales. Mantiene instancias activas.
        -   `MessageProcessorService`: Procesa mensajes entrantes y los dirige al `BotMessageProcessorService` o lógica correspondiente.
        -   `CompanyAccessService`: Verifica el acceso de la empresa al canal.
        -   `Channel`: Interfaz que define el contrato para cualquier proveedor de canal.
        -   `Message`: Interfaz para la estructura de mensajes.
    -   **Providers:** Implementaciones específicas para cada proveedor:
        -   `api/whatsapp-cloud`: Estrategia y servicio para la API oficial de WhatsApp Cloud.
        -   `api/whapi-cloud`: Estrategia y servicio para la API de Whapi Cloud.
        -   `socket/whatsapp-web`: (Implícito) Estrategia y servicio para WhatsApp Web usando `whatsapp-web.js`.
        -   `socket/whatsapp-baileys`: (Implícito) Estrategia y servicio para WhatsApp usando `Baileys`.
    -   **Infrastructure:**
        -   `WhatsappGateway`: Gateway de WebSocket (`socket.io`) para manejar eventos en tiempo real (QR, autenticación, estado, mensajes).
        -   `WsAuthGuard`: Guarda para proteger el acceso al WebSocket.
    -   `ChannelsService`: Lógica de negocio principal para canales (CRUD, conexión, envío de mensajes).
    -   `ChannelsController`: Endpoints API para gestión de canales y envío de mensajes.

### 4.5. `clients`
-   **Propósito:** Gestionar la información de los clientes finales y su historial de conversaciones.
-   **Componentes Clave:**
    -   `ClientEntity`: Representación en BD de un cliente (nombre, teléfono, email, etc.).
    -   `ChatHistoryEntity`: Almacena los mensajes intercambiados con un cliente.
    -   `ClientStageEntity`: Vincula un cliente a una etapa específica de un funnel.
    -   `ClientsService`: Lógica para CRUD de clientes.
    -   `ChatHistoryService`: Lógica para guardar y consultar historial de chats. Gestiona la asignación de conversaciones a usuarios o bots.
    -   `ClientStageService`: Lógica para gestionar la etapa del cliente en un funnel.
    -   `ClientsController`, `ChatHistoryController`, `ClientStageController`: Endpoints API relacionados.

### 4.6. `companies`
-   **Propósito:** Gestionar las cuentas de las empresas que utilizan la plataforma.
-   **Componentes Clave:**
    -   `CompanyEntity`: Representación en BD de una empresa.
    -   `CompaniesService`: Lógica de negocio para CRUD de empresas y proceso de onboarding.
    -   `CompaniesController`: Endpoints API para la gestión de empresas.

### 4.7. `functions`
-   **Propósito:** Define un sistema de "funciones" que los AI Bots pueden invocar para interactuar con otros módulos o sistemas externos. Esto permite extender las capacidades de los bots más allá de la simple conversación.
-   **Componentes Clave:**
    -   `FunctionEntity`: Representación en BD de una función (nombre, descripción, schema de parámetros/respuesta).
    -   `FunctionsService`: Servicio central que registra y ejecuta las implementaciones de las funciones. Mapea nombres de función a su lógica real.
    -   `FunctionsController`: Endpoints API para listar y (potencialmente) gestionar funciones.
    -   **Implementations:** Lógica concreta para cada función disponible:
        -   `calendar/`: Funciones para interactuar con `CalendarModule` (listar/crear/actualizar/eliminar eventos, obtener disponibilidad).
        -   `sheet/`: Funciones para interactuar con `SheetsModule` (añadir filas).
        -   `stage/`: Funciones para interactuar con `StagesModule` (cambiar la etapa de un cliente).
    -   **Core/Types:** Definiciones de tipos y schemas (OpenAPI/JSON Schema) para los parámetros y respuestas de cada función.

### 4.8. `funnels`
-   **Propósito:** Gestionar los embudos de ventas o procesos personalizados definidos por las empresas.
-   **Componentes Clave:**
    -   `FunnelEntity`: Representación en BD de un funnel (nombre, descripción).
    -   `FunnelChannelEntity`: Vincula un funnel a un canal específico.
    -   `FunnelsService`: Lógica de negocio para CRUD de funnels y gestión de la lógica asociada a ellos.
    -   `ClientStageManagerService`: Gestiona la asignación y movimiento de clientes entre etapas del funnel.
    -   `BotMessageProcessorService`: Procesa mensajes cuando un bot está asignado, interactúa con `AiBotsService` y `FunctionsService` para generar respuestas o ejecutar acciones.
    -   `FunnelsController`: Endpoints API para la gestión de funnels.

### 4.9. `sheets`
-   **Propósito:** Integración con Google Sheets.
-   **Componentes Clave:**
    -   `SheetEntity`: Representación en BD de una hoja de cálculo vinculada.
    -   `GoogleSheetsAuthService`: Maneja el flujo OAuth2 con Google Sheets API.
    -   `GoogleSheetsService`: Lógica para interactuar con la API de Google Sheets (leer/escribir datos).
    -   `SheetsAuthController`: Endpoints API para el proceso de autenticación.

### 4.10. `stages`
-   **Propósito:** Gestionar las etapas individuales que componen un funnel.
-   **Componentes Clave:**
    -   `StageEntity`: Representación en BD de una etapa (nombre, descripción, orden, funnel asociado, posible AI Bot asignado).
    -   `StagesService`: Lógica de negocio para CRUD de etapas.
    -   `StagesController`: Endpoints API para la gestión de etapas.

### 4.11. `users`
-   **Propósito:** Gestionar los usuarios de la plataforma (administradores, agentes) que pertenecen a una empresa.
-   **Componentes Clave:**
    -   `UserEntity`: Representación en BD de un usuario (nombre, email, rol, empresa asociada, ID de Supabase).
    -   `UsersService`: Lógica de negocio para CRUD de usuarios, asignación de roles y vinculación con Supabase.
    -   `UsersController`: Endpoints API para la gestión de usuarios.
    -   `RoleEnum`: Define los roles disponibles en el sistema.

### 4.12. `web-scraping`
-   **Propósito:** (Inferido) Proporcionar capacidades de extracción de datos de sitios web, posiblemente para enriquecer perfiles de clientes o alimentar a los AI Bots. La implementación específica no está visible en la estructura proporcionada.
-   **Componentes Clave:** Servicios y controladores relacionados con Puppeteer u otras librerías de scraping.

## 5. Flujo de Datos Principal (Ejemplo: Mensaje Entrante de WhatsApp)

1.  **Recepción:** El proveedor del canal (ej: Whapi Cloud) recibe un mensaje y lo envía al webhook configurado en el `ChannelsController` o lo emite vía WebSocket si es un proveedor basado en socket (`WhatsappGateway`).
2.  **Identificación del Canal:** `ChannelsService` o `ChannelManagerService` identifica el `ChannelEntity` correspondiente al origen del mensaje.
3.  **Procesamiento Inicial:** `MessageProcessorService` recibe el mensaje normalizado.
4.  **Verificación de Acceso:** `CompanyAccessService` verifica que la empresa propietaria del canal esté activa.
5.  **Búsqueda del Cliente:** `ChatHistoryService` busca o crea un `ClientEntity` basado en el identificador del remitente (ej: número de teléfono).
6.  **Determinación del Funnel/Etapa:** `ClientStageManagerService` determina el `FunnelEntity` y `StageEntity` actual del cliente.
7.  **Asignación de Conversación:**
    *   Si la etapa tiene un `AiBotEntity` asignado (`StageEntity.aiBotId`), la conversación se dirige a `BotMessageProcessorService`.
    *   Si no hay bot, la lógica podría asignarlo a un agente humano (`UserEntity`) o seguir otras reglas.
8.  **Procesamiento por Bot (si aplica):**
    *   `BotMessageProcessorService` recupera el historial (`ChatHistoryService`).
    *   Consulta `AiBotsService` para obtener la configuración del bot (prompt, modelo).
    *   Verifica las `BotFunctionEntity` asociadas al bot.
    *   Llama a `OpenaiService` con el prompt, historial y definición de funciones disponibles.
    *   Si OpenAI indica que debe llamar a una función:
        *   `BotMessageProcessorService` llama a `FunctionsService.executeFunction()` con los argumentos proporcionados por OpenAI.
        *   `FunctionsService` ejecuta la implementación correspondiente (ej: `calendar/create-event.ts`).
        *   El resultado de la función se envía de vuelta a `OpenaiService` para obtener la respuesta final al usuario.
    *   Si OpenAI genera una respuesta directa, esta se utiliza.
9.  **Almacenamiento:** `ChatHistoryService` guarda el mensaje entrante y la respuesta generada (sea del bot o de una función).
10. **Envío de Respuesta:** `ChannelsService` utiliza la instancia activa del proveedor de canal (`ChannelManagerService`) para enviar la respuesta al cliente final a través del canal original.

## 6. Configuración y Puesta en Marcha

1.  **Clonar Repositorio:** `git clone <repository-url>`
2.  **Instalar Dependencias:** `cd apps/backend && npm install`
3.  **Configurar Variables de Entorno:** Crear un archivo `.env` basado en `.env.template` y rellenar los valores (credenciales de BD, Supabase, OpenAI, APIs de canales, etc.).
4.  **Base de Datos:** Asegurarse de tener una instancia de PostgreSQL corriendo y accesible.
5.  **Aplicar Migraciones:** `npm run migration:run` (Crea las tablas en la BD).
6.  **(Opcional) Ejecutar Seeds:** `npm run seed:run` (Puebla la BD con datos iniciales/ejemplo).
7.  **Iniciar en Modo Desarrollo:** `npm run start:dev` (Inicia con hot-reload).
8.  **Iniciar en Modo Producción:** `npm run build && npm run start:prod`
9.  **Usando Docker:** `docker-compose up -d --build` (Construye y levanta los servicios definidos en `docker-compose.yml`).

## 7. API

La API sigue las convenciones RESTful. NestJS integra [Swagger](https://swagger.io/) para documentación interactiva de la API. Una vez iniciada la aplicación (en modo desarrollo), la documentación suele estar disponible en `/api` (ej: `http://localhost:3000/api`). Revisar `main.ts` para la configuración exacta del path de Swagger.

Endpoints principales agrupados por controladores en cada módulo (ej: `UsersController`, `ChannelsController`, `AiBotsController`, etc.).

## 8. Consideraciones Clave para LLMs y Desarrolladores

-   **Modularidad:** La alta modularidad facilita la comprensión y extensión de funcionalidades específicas sin afectar otras partes del sistema.
-   **Abstracción de Canales:** La interfaz `Channel` y el `ChannelManagerService` permiten añadir nuevos proveedores de canales con relativa facilidad implementando la interfaz requerida.
-   **Sistema de Funciones (`functions`):** Es un componente crucial para la potencia de los AI Bots. Permite definir acciones concretas y estructuradas que la IA puede invocar. La integración con OpenAI Functions (o similar) es clave aquí.
-   **Gestión de Estado:** La gestión del estado de conexión de los canales (especialmente los basados en sockets como WhatsApp Web) es compleja y reside principalmente en `ChannelManagerService` y los gateways/estrategias de socket.
-   **Flujo Asíncrono:** Muchas operaciones son asíncronas (llamadas a APIs externas, operaciones de BD, IA). El uso de `async/await` es extensivo.
-   **Seguridad:** La autenticación (Supabase) y autorización (Guards) son fundamentales. Prestar atención a los decoradores `@Public()`, `@Roles()` y `AuthGuard`.
-   **Configuración:** La correcta configuración de variables de entorno es vital para el funcionamiento de todas las integraciones.

Este README proporciona una base sólida para entender el backend. Para detalles específicos de implementación, referirse al código fuente dentro de cada módulo y servicio.
