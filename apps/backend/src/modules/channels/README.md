# Channels Module (`channels`)

## 1. Purpose and Overview

The `channels` module is the heart of the platform's multi-channel functionality. Its primary responsibility is to abstract the complexity of interacting with various messaging APIs and protocols (WhatsApp Cloud API, Whapi.cloud, WhatsApp Web via sockets, etc.), providing a unified interface for:

*   **Channel Management:** Creating, configuring, connecting, disconnecting, and deleting communication channel instances associated with a company.
*   **Message Sending:** Sending outgoing messages through any configured and active channel.
*   **Message Receiving:** Receiving and processing incoming messages from different channels, normalizing them, and directing them to the processing system (funnels, bots, history).
*   **Status Management:** Monitoring and reporting the connection status of each channel (active, inactive, connecting, error, QR required).
*   **Real-time Communication:** Providing status updates, QR codes, and messages to the frontend via WebSockets.

The goal is to allow the rest of the application to interact with channels agnostically to the underlying provider.

## 2. Architecture and Key Components

The module follows a layered architecture, separating core logic, infrastructure, persistence, and provider-specific implementations.

```
channels/
├── channels.module.ts       # NestJS module definition, imports, and exports
├── channels.controller.ts     # RESTful API endpoints for CRUD management and actions
├── channels.service.ts        # Main business logic (orchestration)
│
├── core/                    # Core logic and abstractions
│   ├── interfaces/          # Contracts (TypeScript interfaces)
│   │   ├── channel.interface.ts # Defines IAPIChannelStrategy, ISocketChannelStrategy
│   │   └── message.interface.ts # Defines IMessage, IProcessedMessage
│   ├── services/            # Reusable core services
│   │   ├── channel-manager.service.ts # Manages instances and strategies
│   │   ├── message-processor.service.ts # Processes incoming messages
│   │   └── company-access.service.ts  # Validates user access to companies
│   └── types/               # Common types and enumerations
│       └── channel.types.ts   # Enums (ChannelType, ChannelStatus, MessageDirection)
│
├── dto/                     # Data Transfer Objects for API and WebSockets
│   ├── create-channel.dto.ts
│   ├── update-channel.dto.ts
│   ├── connect-channel.dto.ts
│   ├── send-message.dto.ts
│   └── ... (other specific DTOs)
│
├── infrastructure/          # Infrastructure components
│   ├── gateway/             # WebSocket communication
│   │   └── whatsapp.gateway.ts # WebSocket server (socket.io)
│   └── guards/              # Security guards
│       └── ws-auth.guard.ts   # Authentication guard for WebSockets
│
├── persistence/             # Database interaction
│   └── entities/            # TypeORM entity definitions
│       └── channel.entity.ts  # Data model for a channel
│
└── providers/               # Specific implementations for each provider
    ├── api/                 # API-based providers (Webhooks)
    │   ├── whatsapp-cloud/  # Official Meta API
    │   │   ├── whatsapp-cloud.strategy.ts
    │   │   └── whatsapp-cloud.service.ts
    │   └── whapi-cloud/     # Whapi.cloud API
    │       ├── whapi-cloud.strategy.ts
    │       ├── whapi-cloud.service.ts
    │       └── whapi-cloud.types.ts
    └── socket/              # Socket-based providers (persistent connection)
        ├── whatsapp-web-DEPRECATED/    # Using whatsapp-web.js (Not fully visible)
        │   ├── whatsapp-web.strategy.ts
        │   └── whatsapp-web.service.ts
        └── whatsapp-baileys-DEPRECATED/ # Using Baileys (Not fully visible)
            ├── whatsapp-baileys.strategy.ts
            └── whatsapp-baileys.service.ts
```

### 2.1. Key Components

*   **`ChannelsService`**: Orchestrates the main operations of the module. Delegates tasks to `ChannelManagerService` and specific strategies. It's the primary entry point for channel-related business logic.
*   **`ChannelManagerService`**: Responsible for managing active instances of channel *strategies*. Maintains maps of strategies (`apiStrategies`, `socketStrategies`) and selects the appropriate one based on `ChannelType`. Orchestrates connection, disconnection, and message sending by delegating to the correct strategy.
*   **`MessageProcessorService`**: Receives normalized incoming messages (from strategies or `ChannelsService`), finds/creates the client, saves the history (`ChatHistoryEntity`), and directs the message to the `Funnels` module (`FunnelsService.processIncomingMessage`) if an active funnel exists for that channel. It also emits the processed message to the frontend via `WhatsAppGateway`.
*   **`WhatsAppGateway`**: Implements the WebSocket server (`socket.io`) under the `/whatsapp` namespace. Handles authentication (`WsAuthGuard`), joining clients to company rooms (`joinCompany`), and emitting real-time events (QR, connection status, incoming messages, errors) to connected frontend clients.
*   **`Channel` (Entity)**: Represents a channel in the database, storing its `id`, `companyId`, `type`, `status`, `number`, `name`, `connectionConfig` (provider-specific credentials), and `metadata`.
*   **Strategies (`IAPIChannelStrategy`, `ISocketChannelStrategy`)**: Concrete implementations for each channel provider (e.g., `WhapiCloudStrategy`, `WhatsAppBaileysStrategy`). Each strategy encapsulates the specific logic to connect, disconnect, send messages, handle webhooks (API) or socket events (Socket), and get status according to the provider's specifics.
    *   **API Strategies (`IAPIChannelStrategy`)**: Used for channels that operate primarily via webhooks (e.g., WhatsApp Cloud, Whapi.cloud). They have methods like `configure`, `sendMessage`, `handleWebhook`, `disconnect`, `getStatus`, `cleanup`.
    *   **Socket Strategies (`ISocketChannelStrategy`)**: Used for channels requiring a persistent connection (e.g., WhatsApp Web, Baileys). They have methods like `connect`, `disconnect`, `sendMessage`, `getStatus`, `handleMessage`.
*   **Provider Services (e.g., `WhapiCloudService`, `WhatsAppBaileysService`)**: Contain the low-level logic to interact directly with the specific provider's API or library. They are used by the corresponding *Strategies*.

## 3. Key Workflows

### 3.1. Connecting a Channel (Example: Whapi.cloud)

1.  **API Request (Frontend):** `POST /channels/whapi-cloud/initiate` with `companyId`.
2.  **`ChannelsController.initiateWhapiCloudConnection`**: Calls `ChannelsService.initiateWhapiCloudConnection`.
3.  **`ChannelsService`**: Checks for a pending channel; if none, calls `WhapiCloudService.createWhapiPartnerChannel` to get `channelId` and `token` from the Partner API. Creates or updates the `Channel` entity in the DB with `CONNECTING` status and saves credentials in `connectionConfig`.
4.  **`ChannelsService`**: Calls `ChannelManagerService.initiateWhapiQrSession` (without `await`) to start QR code retrieval in the background.
5.  **`ChannelsService`**: Immediately returns the `Channel` entity (with `CONNECTING` status) to the frontend.
6.  **`ChannelManagerService.initiateWhapiQrSession`**: Gets the `WhapiCloudStrategy`.
7.  **`WhapiCloudStrategy.initiateQrSession`**: Calls `WhapiCloudService.getQrCode` with the channel token. This method might retry if the QR is not ready.
8.  **`WhapiCloudService`**: Makes the API call to Whapi.cloud to get the QR code.
9.  **`WhapiCloudStrategy`**: If the QR is obtained, calls `WhatsAppGateway.emitToCompany` with the `whapi:qr` event and QR data.
10. **Frontend:** Receives the WebSocket event and displays the QR code.
11. **Webhook (Whapi.cloud):** When the user scans the QR, Whapi.cloud sends a `users` / `post` status webhook to `POST /channels/whapi-cloud/webhook`.
12. **`ChannelsController.handleWhapiCloudWebhook`**: Calls `ChannelsService.handleWebhook` with `ChannelType.WHAPI_CLOUD` and the webhook's `channel_id` as the identifier.
13. **`ChannelsService`**: Calls `ChannelManagerService.handleWebhook`.
14. **`ChannelManagerService`**: Gets the `WhapiCloudStrategy`.
15. **`WhapiCloudStrategy.handleWebhook`**: Identifies the channel by `whapiChannelId` and calls `handleUserStatusWebhook`.
16. **`WhapiCloudStrategy.handleUserStatusWebhook`**: Updates the `Channel` entity to `ACTIVE` status, saves the phone number, and emits the `whapi:status` ('connected') event via `WhatsAppGateway`.
17. **Frontend:** Receives the connection status and updates the UI.

### 3.2. Sending a Message (Example: API)

1.  **API Request (Frontend/Other Module):** `POST /channels/:id/send` with `to` and `message`.
2.  **`ChannelsController.sendMessage`**: Calls `ChannelsService.sendMessage`.
3.  **`ChannelsService`**: Calls `ChannelManagerService.sendMessage`.
4.  **`ChannelManagerService`**: Finds the `Channel` entity, verifies it's `ACTIVE`, determines if it's API or Socket, gets the corresponding strategy (e.g., `WhapiCloudStrategy`).
5.  **`ChannelManagerService`**: Calls the strategy's `sendMessage` method, passing the `payload` (and `channelId` for API).
6.  **`WhapiCloudStrategy.sendMessage`**: Gets the `channelToken` from `connectionConfig`, prepares parameters (`WhapiSendTextParams`), and calls `WhapiCloudService.sendMessage`.
7.  **`WhapiCloudService`**: Makes the POST call to the Whapi.cloud API.
8.  **`WhapiCloudStrategy`**: Receives the response, finds/creates the `Client`, saves the outgoing message in `ChatHistory`, and returns a standardized response.
9.  **API Response:** The strategy's response propagates back to `ChannelsController` and the original client.

### 3.3. Receiving a Message (Example: Whapi.cloud Webhook)

1.  **Webhook (Whapi.cloud):** Sends a POST to `POST /channels/whapi-cloud/webhook` with the message payload.
2.  **`ChannelsController.handleWhapiCloudWebhook`**: Extracts the `channel_id` and calls `ChannelsService.handleWebhook`.
3.  **`ChannelsService`**: Calls `ChannelManagerService.handleWebhook`.
4.  **`ChannelManagerService`**: Gets the `WhapiCloudStrategy`.
5.  **`WhapiCloudStrategy.handleWebhook`**: Identifies the `Channel` entity by `whapiChannelId`, determines it's a message webhook (`messages` / `post`), and calls `handleMessagesWebhook`.
6.  **`WhapiCloudStrategy.handleMessagesWebhook`**: Iterates over messages, extracts relevant info (content, sender, metadata, media if exists), transforms the message to `IMessage` format.
7.  **`WhapiCloudStrategy`**: Calls `MessageProcessorService.processIncomingMessage` with the `Channel` entity, the transformed `IMessage`, and contact info.
8.  **`MessageProcessorService`**: Finds/creates the `ClientEntity`, (optionally transcribes audio if needed), saves the message in `ChatHistoryEntity`, emits the processed message (`IProcessedMessage`) to the frontend via `WhatsAppGateway`, and if an active `FunnelChannel` exists, calls `FunnelsService.processIncomingMessage` to continue the automation/AI flow.

## 4. Considerations for LLMs and Developers

*   **Central Hub:** This module is crucial. Any interaction with a specific channel (sending/receiving/status) goes through here.
*   **Abstraction is Key:** The separation between `ChannelsService`/`ChannelManagerService` and the *Strategies* allows adding new channel types (Telegram, Slack, etc.) by implementing the `IAPIChannelStrategy` or `ISocketChannelStrategy` interfaces and registering them in `ChannelManagerService`.
*   **State Management:** Synchronizing the state (`ChannelStatus`) in the DB with the actual provider state (especially for sockets) is vital and handled through events emitted by strategies and captured by `ChannelsService` or `WhatsAppGateway`.
*   **WebSockets (`WhatsAppGateway`)**: The primary communication channel with the frontend for real-time events. Ensure authentication (`WsAuthGuard`) and room management (`companyRooms`) work correctly.
*   **Errors and Retries:** Error handling in external API calls (e.g., in `WhapiCloudService`) and potential retry logic (like in `WhapiCloudService.getQrCode`) are important for robustness.
*   **Security:** Access validation (`CompanyAccessService` in `WhatsAppGateway`) is necessary to ensure a user only interacts with their own company's channels.
*   **Configuration:** Specific channel credentials and settings are stored in `Channel.connectionConfig`. Handling this information securely is crucial.
*   **Incoming Message Flow:** `MessageProcessorService` acts as a key router for incoming messages, connecting the `channels` module with the `clients` and `funnels` modules.
*   **Cleanup (`cleanup`)**: The `cleanup` logic in strategies and the `ChannelsService.remove` method are important for releasing external resources (e.g., deleting channels in Whapi.cloud) and local ones (Baileys sessions) when a channel is removed from the platform. 