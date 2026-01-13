# Capa de Servicios API - Análisis Detallado para LLM

## 1. Descripción General y Propósito

El directorio `src/services` encapsula toda la lógica de comunicación con la API backend de la aplicación frontend REALLY. Actúa como una capa de abstracción bien definida que separa las preocupaciones de la interfaz de usuario (componentes, módulos) de los detalles de cómo obtener o modificar datos del servidor.

**Objetivo Principal:** Proporcionar un conjunto organizado y reutilizable de funciones (servicios) para interactuar con los diferentes endpoints de la API backend, manejando las solicitudes HTTP, la configuración base (como la URL base y la autenticación) y definiendo las estructuras de datos (tipos) esperadas para las solicitudes y respuestas.

## 2. Estructura del Directorio

La capa de servicios está organizada por recursos o entidades de la API, con subdirectorios dedicados a cada área funcional principal:

```
src/services/
├── api.ts              # Configuración central de la instancia de Axios (interceptor de auth)
├── queries.ts          # Servicios generales (e.g., UserService para obtener datos del usuario)
├── types.ts            # Tipos globales compartidos por varios servicios (e.g., NormalizedUser, Company)
├── README.MD           # Este archivo
│
├── Admin/              # Servicios relacionados con la gestión de usuarios (AdminService, createUserSignup, etc.)
│   ├── queries.ts
│   ├── types.ts
│   └── user.ts         # Servicios específicos para signup/onboarding
│
├── Bots/               # Servicios para CRUD de AiBots, gestión de steps y Functions (BotsService, FunctionsService)
│   ├── functions.ts
│   ├── queries.ts
│   └── types.ts
│
├── Calendar/           # Servicios para la integración con Google Calendar (CalendarService: auth, eventos, status)
│   ├── queries.ts
│   └── types.ts
│
├── Channels/           # Servicios para gestionar canales de comunicación (ChannelsService: CRUD, conexión Whapi)
│   ├── queries.ts
│   └── types.ts
│
├── chat-bot/           # Servicio para interactuar con un endpoint de chatbot genérico (ChatBotService)
│   └── queries.ts
│
├── Funnels/            # Servicios para CRUD de Funnels y análisis de sitios web (getFunnels, createFunnel, analyzeSite, etc.)
│   ├── queries.ts
│   └── types.ts
│
├── Sheets/             # Servicios para la integración con Google Sheets (SheetsService: auth, status, verifyAccess)
│   ├── queries.ts
│   └── types.ts
│
├── Stages/             # Servicios para CRUD de Stages, gestión de clientes en etapas y asignación de usuarios (StagesService)
│   ├── queries.ts
│   └── types.ts
│
├── Supabase/           # Servicios específicos para interactuar con endpoints relacionados con Supabase (SupabaseService: createUser)
│   └── queries.ts
│
├── Super_admin/        # Servicios específicos para la sección de Super Admin
│   └── Companies/      # Servicios para gestionar Compañías (CompanyService: CRUD, gestión de usuarios)
│       ├── queries.ts
│       └── types.ts
│
└── Whatsapp/           # Servicios específicos para la funcionalidad de chat de WhatsApp (WhatsAppService, hooks)
    ├── queries.ts      # Consultas principales para obtener chats, historial, enviar mensajes
    ├── types.ts        # Tipos específicos de WhatsApp (Channel, ChatClient, ChatMessage, etc.)
    └── hooks/
        └── useChannelConnection.ts # Hook complejo para gestionar el estado de conexión de un canal (status, QR, errores) vía WebSockets

```

## 3. Archivos y Conceptos Clave

-   **`api.ts`**:
    -   Define y exporta la instancia centralizada de `axios`.
    -   Configura la `baseURL` desde variables de entorno (`VITE_BACKEND_URL`).
    -   Implementa un **interceptor de solicitud** de Axios que recupera la sesión de Supabase (`supabase.auth.getSession()`) y adjunta automáticamente el `access_token` como `Bearer` token en la cabecera `Authorization` de cada solicitud saliente. Esto maneja la autenticación para todas las llamadas a la API.
-   **`*.queries.ts`** (dentro de cada subdirectorio):
    -   Generalmente contienen una clase (e.g., `BotsService`, `CalendarService`) o un objeto con métodos estáticos/funciones exportadas.
    -   Cada método corresponde a una operación específica de la API (e.g., `getAllBots`, `createEvent`, `getFunnelChats`).
    -   Utilizan la instancia de `api` para realizar las solicitudes HTTP (GET, POST, PATCH, DELETE).
    -   Manejan la lógica de la solicitud (parámetros, cuerpo) y la respuesta (extracción de `response.data`).
    -   Incluyen manejo básico de errores (log en consola y relanzamiento del error, a veces con mensajes más específicos basados en `AxiosError`).
    -   **Nota:** Estos servicios son consumidos típicamente por hooks de TanStack Query (React Query) definidos en los módulos de características (`src/modules/*`), que añaden caching, reintentos, invalidación, etc.
-   **`*.types.ts`** (dentro de cada subdirectorio):
    -   Definen interfaces TypeScript para las estructuras de datos (DTOs - Data Transfer Objects) utilizadas en las solicitudes y respuestas de los endpoints de ese recurso específico. Esto asegura la consistencia y el tipado fuerte en toda la aplicación.
-   **`types.ts` (raíz):** Define tipos globales que son compartidos o utilizados por múltiples servicios, como `NormalizedUser`, `Company`, `ExtendedUser`.

## 4. Tecnologías y Patrones

-   **Axios:** Utilizado para realizar las solicitudes HTTP. El uso de una instancia centralizada con interceptores es un patrón común para manejar la configuración global (URL base, autenticación).
-   **TypeScript:** Utilizado para definir tipos claros para DTOs y signaturas de funciones, mejorando la mantenibilidad y reduciendo errores.
-   **Organización por Recursos:** La estructura de carpetas sigue un patrón de organización basado en los recursos de la API, lo cual es una práctica estándar en el desarrollo de frontend.
-   **Manejo de Errores:** Básico, principalmente logging y relanzamiento. El manejo más sofisticado (e.g., mostrar mensajes al usuario) generalmente se delega a la capa que consume estos servicios (e.g., los hooks de TanStack Query o los componentes).

## 5. Interacción con el Resto de la Aplicación

-   Los componentes y hooks dentro de los módulos (`src/modules/*`) **importan** las funciones/métodos de servicio necesarios desde este directorio (`src/services`).
-   Comúnmente, estas funciones de servicio se utilizan como las `queryFn` o `mutationFn` dentro de los hooks de **TanStack Query** (`useQuery`, `useMutation`). Esto permite a la aplicación beneficiarse del caching, la sincronización en segundo plano, la invalidación automática y otras características de gestión del estado del servidor proporcionadas por TanStack Query.
-   Los **tipos** definidos aquí son cruciales para asegurar que los datos que fluyen entre la API, los servicios y la UI estén correctamente estructurados y tipados.

## 6. Consideraciones Clave para LLM

-   **Capa de Abstracción:** Entender que este directorio es la única parte del frontend que debería interactuar directamente con la API HTTP.
-   **Autenticación Centralizada:** El interceptor en `api.ts` maneja la autenticación de forma transparente para todos los servicios.
-   **Correspondencia API:** Cada subdirectorio y sus `queries.ts` generalmente se mapean a un conjunto de endpoints relacionados en el backend (e.g., `services/Bots/queries.ts` interactúa con los endpoints `/ai-bots/*`).
-   **Tipos Compartidos:** Los tipos definidos en `types.ts` (raíz y subdirectorios) son fundamentales para comprender las estructuras de datos que maneja la aplicación.
-   **Consumo por TanStack Query:** Aunque TanStack Query no está definido *aquí*, es el consumidor principal de estos servicios. Al modificar un servicio, es probable que también sea necesario ajustar el hook de TanStack Query que lo utiliza.
