# Funnels Module (`funnels`)

## 1. Purpose and Overview

The `funnels` module is responsible for managing the sales pipelines, customer journeys, or any defined process through which a client progresses. It allows associating these funnels with specific communication channels and orchestrates the client's movement between different stages (`stages` module) within a funnel.

A key function of this module is to determine how incoming messages are handled based on the client's current position (stage) within an active funnel, potentially involving AI bots (`ai-bots` module) and executable functions (`functions` module).

**Core Responsibilities:**

*   **Funnel Management:** CRUD operations for funnels (defining processes).
*   **Channel Association:** Linking funnels to one or more communication channels (`channels` module) via the `FunnelChannel` entity.
*   **Client Stage Management:** Tracking which stage a client (`clients` module) is currently in for a specific funnel and channel.
*   **Message Processing Orchestration:** Receiving incoming messages (routed from `channels` module) and deciding the next action based on the client's stage, potentially invoking AI bots or other logic.

## 2. Architecture and Key Components

The module is structured with clear separation of concerns:

```
funnels/
├── funnels.module.ts       # NestJS module definition, imports, exports
├── funnels.controller.ts     # API endpoints for funnel CRUD
│
├── dto/                    # Data Transfer Objects
│   ├── create-funnel.dto.ts
│   └── update-funnel.dto.ts
│
├── entities/               # TypeORM entity definitions
│   ├── funnel.entity.ts      # Represents a sales funnel/process
│   └── funnel-channel.entity.ts # Links a Funnel to a Channel
│
└── services/               # Business logic services
    ├── funnels.service.ts        # Main service for funnel logic & message processing entry point
    ├── client-stage-manager.service.ts # Manages finding/creating client's stage in a funnel
    └── bot-message-processor.service.ts # Handles interaction with AI bot when a client is in a bot-managed stage
```

### 2.1. Key Components

*   **`FunnelsService`**: The main orchestrator for the module. Handles CRUD operations for `Funnel` entities. Its crucial role is receiving processed incoming messages (`processIncomingMessage` method called by `MessageProcessorService` in the `channels` module). It uses `ClientStageManagerService` to determine the client's current stage and then delegates further processing, often to `BotMessageProcessorService` if the stage involves an AI bot.
*   **`ClientStageManagerService`**: Responsible for managing the `ClientStage` entity, which links a specific client to a specific stage within a specific funnel-channel association. It handles finding the current stage for a client or creating a new `ClientStage` entry (typically placing the client in the initial stage of the funnel) if they are interacting for the first time within that funnel context.
*   **`BotMessageProcessorService`**: This service takes over when an incoming message is for a client currently in a stage (`StageEntity`) that has an associated AI Bot (`AiBotEntity`). It prepares the context (message history, available functions/tools), interacts with the `OpenAIService` (from the `ai` module) to get the bot's response, handles potential function calls requested by the bot (via `FunctionsService`), and saves/sends the final bot response back through the `ChannelsService`.
*   **`FunnelsController`**: Provides the API endpoints (`/funnels`) for managing funnels (creating, reading, updating, deleting) and associating them with channels.
*   **`Funnel` (Entity)**: Represents a defined process or pipeline (e.g., Sales Funnel). It contains basic information like `name`, `description`, `isActive`, and holds relations to the `Company`, its associated `Stages`, and the `FunnelChannel` links.
*   **`FunnelChannel` (Entity)**: A join table entity linking a `Funnel` to a `Channel`. This allows a single funnel to be active across multiple communication channels, or different funnels to be active on different channels for the same company.

## 3. Key Workflows

### 3.1. Processing an Incoming Message

This workflow typically starts in the `channels` module and arrives at `FunnelsService`.

1.  **Entry Point:** `MessageProcessorService` (from `channels`) successfully processes an incoming message, identifies the `Channel`, finds/creates the `Client`, saves the message to `ChatHistory`, and determines if there's an active `FunnelChannel` associated with the `Channel`.
2.  **Delegation:** If an active `FunnelChannel` exists, `MessageProcessorService` calls `FunnelsService.processIncomingMessage`, passing the `funnelChannelId`, `clientId`, the message content, recent chat history, and the channel's phone number.
3.  **`FunnelsService.processIncomingMessage`**: Retrieves the `FunnelChannel` and its associated `Funnel` and `Stages`.
4.  **Find/Create Client Stage:** Calls `ClientStageManagerService.findOrCreateClientStage` to get the `ClientStage` record for this client within this specific `funnelChannel`. This service will either find the existing record or create a new one, placing the client in the first stage (lowest `order`) of the funnel.
5.  **Load Relations:** The `ClientStage` entity is loaded with necessary relations (`stage`, `stage.bot`, `stage.bot.botFunctions`, etc.).
6.  **Check for Bot:** `FunnelsService` checks if the client's *current* stage (`clientStage.stage`) has an `AiBotEntity` associated with it (`clientStage.stage.bot`).
7.  **Delegate to Bot Processor:** If a bot is associated with the stage, `FunnelsService` delegates the processing to `BotMessageProcessorService.processMessage`, passing the message, history, and the fully loaded `ClientStage`.
8.  **`BotMessageProcessorService.processMessage`**: 
    *   Prepares available tools/functions based on `clientStage.stage.bot.botFunctions`.
    *   Calls `OpenAIService.agentWithTools` with the message, history, bot configuration, and tools.
    *   **If Tool Call(s) Requested:** 
        *   Iterates through requested tool calls.
        *   Finds the corresponding `BotFunction` mapping.
        *   Calls `FunctionsService.executeFunction` with the function ID, arguments, and context (`companyId`, `clientId`, `funnelId`).
        *   Handles the results, potentially including stage changes triggered by a function (like `change-stage`).
        *   If a stage change occurred, it might recursively call itself (`executeAgentWithTools`) with the *new* `ClientStage` context or stop if the new stage has no bot.
        *   If no stage change but functions were executed, it calls `OpenAIService.agentWithTools` again, providing the function results to get a final conversational response.
    *   **If No Tool Calls:** Uses the direct content response from the first `OpenAIService` call.
9.  **Send Response:** `BotMessageProcessorService` saves the final bot response to `ChatHistory` and uses `ChannelsService.sendMessage` to send the response back to the client through the original channel. It also emits WebSocket events (`bot_response`) via `WhatsAppGateway`.
10. **No Bot:** If the client's stage does *not* have an associated bot, `FunnelsService.processIncomingMessage` currently finishes without further processing (implicitly meaning the conversation might require human attention or different handling not shown here).

### 3.2. Creating a Funnel

1.  **API Request:** `POST /funnels` with `companyId`, `name`, `description` (optional), `isActive` (optional), and an array of `channelIds`.
2.  **`FunnelsController.create`**: Validates that the user belongs to the `companyId` specified. Calls `FunnelsService.create`.
3.  **`FunnelsService.create`**: 
    *   Verifies that all provided `channelIds` exist in the database.
    *   Creates the `Funnel` entity.
    *   Creates `FunnelChannel` entities to link the new `Funnel` to each specified `Channel`.
    *   Saves the entities.
    *   Returns the newly created `Funnel` with its relations.

## 4. Considerations for LLMs and Developers

*   **Central Orchestration Point:** `FunnelsService.processIncomingMessage` is the key entry point for deciding *how* an incoming message is handled based on the customer journey (funnel/stage).
*   **Client State:** The `ClientStage` entity is critical for tracking a client's progress. Understanding how `ClientStageManagerService` finds or initializes this state is important.
*   **Bot Interaction:** `BotMessageProcessorService` encapsulates the complex logic of interacting with the AI, including handling function calls (tools). Modifying bot behavior within a funnel likely involves changes here or in the associated `AiBotEntity` configuration (prompt, model) and potentially the `functions` module.
*   **Stage Definition:** The behavior within the funnel is heavily dependent on how `Stage` entities are configured, specifically which `AiBotEntity` (if any) is linked to each stage.
*   **Dependencies:** This module heavily relies on `channels` (for message I/O), `clients` (for client info and history), `stages` (for funnel structure), `ai-bots` (for bot definitions), `ai` (for OpenAI calls), and `functions` (for tool execution).
*   **Error Handling:** Robust error handling within `BotMessageProcessorService` (especially during function execution) is important to prevent conversational breakdowns.
*   **Extensibility:** While currently focused on bot processing, the structure allows for potentially adding other types of stage processors in the future (e.g., assigning to human agents, triggering external webhooks directly from `FunnelsService`).
*   **Database Relations:** Understanding the relationships (`Funnel` -> `Stage`, `Funnel` -> `FunnelChannel` -> `Channel`, `ClientStage` -> `Stage`, `ClientStage` -> `Client`, `ClientStage` -> `FunnelChannel`) is key to querying and modifying funnel data.
