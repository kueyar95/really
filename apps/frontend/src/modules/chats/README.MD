# Módulo Chats - Análisis Detallado para LLM

## 1. Descripción General y Propósito

El módulo `chats` es el núcleo de la interfaz de interacción con el cliente dentro de la aplicación frontend de REALLY. Proporciona a los usuarios (agentes) una vista consolidada para gestionar conversaciones con clientes a través de múltiples canales de comunicación (WhatsApp, Instagram, etc.), organizados dentro de funnels específicos.

Permite a los agentes ver listas de clientes, filtrar conversaciones, seleccionar un chat específico, ver el historial de mensajes y enviar nuevas respuestas. También integra actualizaciones en tiempo real para nuevos mensajes y cambios de estado.

**Objetivo Principal:** Ofrecer una interfaz de chat unificada, eficiente y en tiempo real para que los agentes gestionen las interacciones con los clientes asignados a ellos o dentro de los funnels/canales que supervisan.

## 2. Componentes Clave y sus Roles

La interfaz de chat se divide principalmente en una barra lateral (`Sidebar`) y un área de chat principal.

### 2.1. Barra Lateral (`components/sidebar/`)

-   **`ChatsSidebar.tsx`**: Componente principal de la barra lateral. Orquesta la visualización de la lista de clientes y los controles de filtrado.
    -   Obtiene la lista de clientes (`clients`) y los canales/funnels disponibles (`channels`) como props (probablemente derivados de una consulta de TanStack Query en `page.tsx`).
    -   Utiliza `useState` para gestionar el estado local de los filtros (búsqueda, asignación, fecha).
    -   Utiliza `useMemo` para calcular `filteredClients` basados en los filtros aplicados.
    -   Renderiza `ChannelSelector`, `SearchBar`, filtros (`AssignmentFilter`, `DateFilter`) y la lista de `ClientItem`.
-   **`ChannelSelector.tsx`**: Permite al usuario seleccionar si desea ver los chats de un funnel completo o de un canal específico dentro de un funnel. Utiliza `ChannelIcon` para mostrar el icono del canal.
-   **`SearchBar.tsx`**: Campo de entrada para buscar clientes por nombre, teléfono o contenido del último mensaje.
-   **`filters/`**:
    -   **`AssignmentFilter.tsx`**: Select para filtrar chats por estado de asignación (Todos, Con agente, Sin agente).
    -   **`DateFilter.tsx`**: Popover/Select complejo para filtrar chats por la fecha del último mensaje (Hoy, Últimos X días, Fecha exacta con DatePicker). Incluye lógica `isWithinDateRange` para la comprobación.
    -   **`StatusFilter.tsx`** (No usado directamente en `ChatsSidebar.tsx` en el código adjunto, pero presente): Select para filtrar chats por estado (Abiertos, Cerrados). *Nota: Podría ser una adición futura o usarse en otro contexto.*
-   **`ClientItem.tsx`**: Muestra una vista previa de un cliente individual en la lista de la barra lateral.
    -   Muestra el nombre del cliente, icono del canal (`ChannelIcon`), y hora del último mensaje.
    -   Muestra el estado actual del cliente (`ClientStatus`).
    -   Muestra una vista previa del último mensaje.
    -   Maneja el evento `onClick` para seleccionar un cliente.
-   **`ClientStatus.tsx`**: Muestra la etapa actual (`stage`) del cliente dentro del funnel y si está asignado a un usuario o bot. Utiliza iconos (`User`, `Bot`) y colores para indicar el estado.
-   **`ChannelIcon.tsx`**: Componente simple que devuelve un icono específico basado en el `type` del canal (whatsapp, instagram, etc.).

### 2.2. Área de Chat Principal

-   **`ChatHeader.tsx`**: Se muestra en la parte superior del área de chat cuando se selecciona un cliente.
    -   Muestra el nombre, teléfono, etapa (`Badge`) y usuario asignado (`Badge`) del cliente seleccionado.
    -   Incluye un botón "Cerrar conversación" (`X`) que interactúa con `StagesService.changeStage` para mover al cliente a la etapa inicial del funnel (orden 0) y desasignarlo. Requiere lógica para encontrar el `funnelId` y la `initialStage`.
-   **`ChatMessages.tsx`**: Contenedor principal para mostrar los mensajes de la conversación seleccionada.
    -   Recibe la lista de `messages` y el estado `isLoading`.
    -   Renderiza múltiples componentes `ChatMessage`.
    -   Utiliza `useRef` (`messagesEndRef`) y `useEffect` para hacer scroll automáticamente hacia abajo cuando llegan nuevos mensajes o cambia la lista de mensajes.
-   **`ChatMessage.tsx`**: Renderiza un único mensaje de chat.
    -   Aplica estilos diferentes según la dirección del mensaje (`inbound` vs `outbound`).
    -   Utiliza `ReactMarkdown` para renderizar el contenido del mensaje.
    -   Muestra la fecha/hora del mensaje.
    -   Tiene lógica básica para manejar `media`, aunque la implementación específica no está completa en el código adjunto.
-   **`ChatInput.tsx`**: Campo de entrada en la parte inferior para que el agente escriba y envíe mensajes.
    -   Utiliza `useState` para el contenido del input.
    -   Llama a `onSendMessage` (proporcionado por `page.tsx`) al enviar el formulario o presionar Enter.
    -   Se deshabilita (`disabled`) si no hay un cliente seleccionado o durante el envío.
-   **`EmptyState.tsx`**: Se muestra en el área de chat cuando no hay ningún cliente seleccionado.
-   **`MessageSkeleton.tsx`**: Muestra un estado de carga animado mientras se obtienen los mensajes.

### 2.3. Orquestación (`page.tsx`)

-   **Componente Principal:** `Chats()` es el componente de página que integra `ChatsSidebar` y el área de chat principal (`ChatHeader`, `ChatMessages`, `ChatInput` o `EmptyState`).
-   **Gestión de Estado:**
    -   Utiliza `useState` para `selectedFunnelId`, `selectedChannelId`, `selectedClientData`.
    -   Utiliza `useQuery` (TanStack Query) para:
        -   Obtener datos generales de la compañía, incluyendo funnels y canales (`WhatsAppService.findByCompanyId`).
        -   Obtener el historial de mensajes del cliente seleccionado (`WhatsAppService.getClientChatHistory`).
    -   Utiliza `useMemo` para calcular `sortedClients` basados en el funnel/canal seleccionado y para `selectedChannelValue`.
-   **Routing:** Utiliza `useSearchParams` y `useParams` para leer `clientId` y `channelId` de la URL y seleccionar el cliente/canal apropiado al cargar.
-   **Eventos en Tiempo Real:**
    -   Utiliza el hook `useChatEvents` para conectar con WebSockets.
    -   `useChatEvents` proporciona `sendMessage` (para enviar mensajes vía socket) y `isConnected`.
    -   El callback `onNewMessage` dentro de `useChatEvents` actualiza la caché de TanStack Query (`queryClient.setQueryData`) para los mensajes del cliente relevante o muestra una notificación (`toast`) si el mensaje es para otro chat.
    -   Implementa `refreshChatData` (también de `useChatEvents`) y un intervalo (`setInterval`) para refrescar periódicamente los datos del chat si es necesario.
-   **Acciones:**
    -   `handleSelectionChange`: Actualiza `selectedFunnelId`/`selectedChannelId` cuando se cambia la selección en `ChannelSelector`.
    -   `handleSelectClient`: Actualiza `selectedClientData` cuando se hace clic en un `ClientItem`.
    -   `handleSendMessage`: Llama a `sendMessage` del hook `useChatEvents`. También incluye lógica para auto-asignar el lead al usuario actual (`assignLeadToCurrentUser`) si el cliente no tiene un agente asignado al enviar el primer mensaje.
    -   `assignLeadToCurrentUser`: Lógica compleja que busca el `funnelId`, encuentra la primera etapa sin bot (`nonBotStage`) y utiliza `StagesService.changeStage` y `StagesService.assignUserToClientStage` para asignar el lead.

## 3. Flujo de Datos y Estado

1.  **Carga Inicial:**
    -   `page.tsx` obtiene los datos de funnels/canales/clientes iniciales usando `useQuery` (`WhatsAppService.findByCompanyId`).
    -   Si hay `channelId` o `clientId` en la URL, se seleccionan inicialmente. Sino, se selecciona el primer funnel por defecto.
    -   `ChatsSidebar` recibe estos datos y renderiza la lista (filtrada si es necesario).
2.  **Selección de Cliente:**
    -   Usuario hace clic en `ClientItem` en `ChatsSidebar`.
    -   `onClick` llama a `handleSelectClient` en `page.tsx`.
    -   `page.tsx` actualiza `selectedClientData`.
    -   Se activa la query `useQuery` para `WhatsAppService.getClientChatHistory` con el nuevo ID de cliente.
    -   `ChatMessages` recibe los nuevos mensajes (o el estado de carga) y los renderiza.
    -   `ChatHeader` recibe los datos del nuevo cliente y los muestra.
3.  **Recepción de Mensaje (Tiempo Real):**
    -   WebSocket (`SocketContext` gestionado por `useChatEvents`) recibe un evento `message`.
    -   El callback `onNewMessage` en `page.tsx` (pasado a `useChatEvents`) se ejecuta.
    -   Si el mensaje es para el cliente seleccionado, `queryClient.setQueryData` actualiza la caché de mensajes para ese cliente.
    -   `ChatMessages` re-renderiza con el nuevo mensaje y hace scroll hacia abajo.
    -   Si el mensaje es para otro cliente, se muestra una notificación (`toast`).
4.  **Envío de Mensaje:**
    -   Usuario escribe en `ChatInput` y hace clic en enviar.
    -   `onSubmit` llama a `handleSendMessage` en `page.tsx`.
    -   `handleSendMessage` llama a `sendMessage` proporcionado por `useChatEvents`.
    -   `useChatEvents` emite el mensaje a través del WebSocket.
    -   (Opcional) `handleSendMessage` llama a `assignLeadToCurrentUser` si es necesario.
    -   *Nota:* El mensaje enviado por el usuario no parece agregarse inmediatamente a la UI localmente en el código actual; se espera a que el backend lo devuelva a través del evento WebSocket para mostrarlo (lo cual es una práctica común pero puede tener una ligera latencia percibida).

## 4. Aspectos en Tiempo Real

-   La comunicación en tiempo real es fundamental y se maneja a través de `SocketContext` y el hook `useChatEvents`.
-   Se escuchan eventos para nuevos mensajes (`message`).
-   El estado de conexión (`isConnected`) se monitoriza.
-   Las actualizaciones de estado (como cambios de etapa o asignación que ocurren en otros módulos) probablemente invalidan queries de TanStack Query (`queryClient.invalidateQueries({ queryKey: ['company-chats'] })`) para forzar la recarga de datos en la barra lateral.

## 5. Dependencias e Interacciones

-   **Contextos Globales:** `AuthContext` (para `user`), `SocketContext` (implícito vía `useChatEvents`).
-   **Hooks Personalizados:** `useChatEvents` (esencial), `useToast`.
-   **Servicios API:** `WhatsAppService` (para obtener datos de chat/clientes), `StagesService` (para cambiar etapa y asignar usuario).
-   **UI:** shadcn/ui, Tailwind CSS.
-   **Estado del Servidor:** TanStack Query.
-   **Tipos:** Definiciones locales en `types.ts` y globales/compartidas (e.g., `ChatMessage`, `ChatClient` de `@/services/Whatsapp/types`).
-   **Otros Módulos:** Interactúa lógicamente con `Funnels` y `Stages` (cambio de etapa, asignación). Los datos iniciales dependen de la configuración hecha en los módulos de administración (`admin/funnels`, `admin/channels`).

## 6. Consideraciones Clave para LLM

-   **Centralidad de `page.tsx`:** Este archivo es el orquestador principal, conectando la barra lateral, el área de chat, las llamadas a la API (vía TanStack Query) y los eventos en tiempo real.
-   **Importancia de `useChatEvents`:** Entender este hook es crucial para comprender cómo se envían y reciben mensajes en tiempo real y cómo se actualiza el estado.
-   **Flujo de Datos de TanStack Query:** Identificar las `queryKey` relevantes (`company-chats`, `client-messages`) y cómo se obtienen y actualizan los datos (fetch inicial, actualizaciones por WebSocket, invalidaciones).
-   **Estructura de Componentes:** La división clara entre `sidebar` y el área de chat principal, y los componentes reutilizables dentro de cada una.
-   **Tipos:** Referenciar `types.ts` y los tipos importados de `@/services` para entender las estructuras de datos (`ChatClient`, `ChatMessage`, `Funnel`, `Channel`, `Stage`).
-   **Lógica de Negocio:** Comprender la lógica específica como el filtrado de clientes, el cierre de conversaciones (cambio a etapa inicial) y la asignación automática de leads.
-   **Interacción API/Servicios:** Saber qué métodos de `WhatsAppService` y `StagesService` se utilizan y para qué propósito.