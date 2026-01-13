# AI Bots Module (`ai-bots`)

## 1. Purpose and Overview

The `ai-bots` module is responsible for defining and managing the configuration of the AI agents used within the platform. These bots are the core intelligence that interacts with clients in specific stages of a funnel (`funnels` module).

This module allows users to:

*   **Create and Configure Bots:** Define new AI bots, specifying their name, associated company, core behavior (model, temperature, etc.), system prompts, and structured conversational steps.
*   **Manage Functions:** Associate predefined functions (`functions` module) with specific bots or steps within a bot's logic, enabling the AI to perform actions beyond simple conversation.
*   **Define Conversational Structure:** Optionally define a sequence of steps (`BotStep`) that guide the bot's interaction flow, potentially associating specific functions with each step.
*   **(Future/Implied) RAG Configuration:** Manage Retrieval-Augmented Generation settings (though the specific implementation isn't fully detailed in the provided files).

Essentially, this module acts as the configuration hub for the AI agents deployed in the system.

## 2. Architecture and Key Components

The module follows standard NestJS practices:

```
ai-bots/
├── ai-bots.module.ts       # NestJS module definition
├── ai-bots.controller.ts     # API endpoints for bot CRUD and function association
├── ai-bots.service.ts        # Main service for bot CRUD and step/function management
│
├── dto/                    # Data Transfer Objects
│   ├── create-ai-bot.dto.ts  # DTO for creating a bot (includes nested DTOs for steps/functions)
│   ├── update-ai-bot.dto.ts  # DTO for partially updating a bot
│   ├── add-functions.dto.ts # (Commented out) DTO potentially for adding functions
│   └── try-chat.dto.ts       # DTO for testing bot responses via API
│
├── entities/               # TypeORM entity definitions
│   ├── ai-bot.entity.ts      # Represents an AI Bot configuration
│   └── bot-function.entity.ts # Links an AiBot to a Function
│
├── interfaces/             # Shared TypeScript interfaces
│   └── step-function.interface.ts # Defines structure for functions within a step
│
└── services/               # Additional specialized services
    └── bot-functions.service.ts # Service specifically for managing BotFunction relationships
```

### 2.1. Key Components

*   **`AiBotsService`**: The primary service for managing `AiBot` entities. Handles CRUD operations, updating bot steps, and associating/disassociating functions (`BotFunction` entities) based on the steps defined.
*   **`BotFunctionsService`**: A specialized service focused solely on managing the `BotFunction` relationship entity. It allows assigning functions to bots (potentially tied to specific steps), fetching assigned functions, and deactivating associations.
*   **`AiBotsController`**: Exposes API endpoints (`/ai-bots`) for creating, reading, updating, and deleting AI bot configurations. It also provides endpoints for managing the functions associated with a bot and updating its steps.
*   **`AiBot` (Entity)**: Represents the configuration of a single AI bot. Key fields include:
    *   `name`: Human-readable name.
    *   `companyId`: Links the bot to a company.
    *   `sysPrompt`: An array of `PromptBlock` objects, allowing structured system prompts (e.g., persona, instructions, steps).
    *   `mainConfig`: General configuration like the AI model (`gpt-4o-mini`, etc.), `maxTokens`, `temperature`.
    *   `steps`: An array of `BotStep` objects defining a structured conversation flow. Each step has text (likely instructions for the bot at that point) and can have associated `StepFunction`s.
    *   `botFunctions`: A one-to-many relation to `BotFunction` entities, linking this bot to available functions.
*   **`BotFunction` (Entity)**: A join table entity connecting an `AiBot` to a `Function` (from the `functions` module). It stores `botId`, `functionId`, `isActive` status, an optional `stepNumber` to link the function to a specific step in the `AiBot.steps` array, and potentially `contextData`.
*   **DTOs (`CreateAiBotDto`, `UpdateAiBotDto`, etc.)**: Define the expected data structure for API requests when creating or modifying bots.
*   **`TryChatDto` & Controller Endpoint:** Allows testing an AI configuration (prompt, model settings) via API without needing a full funnel/client context, using the `OpenAIService` directly.

## 3. Key Workflows

### 3.1. Creating/Updating an AI Bot with Steps and Functions

1.  **API Request:** `POST /ai-bots` (create) or `PATCH /ai-bots/:id` (update) with the bot configuration data, including the `steps` array. Each object in the `steps` array contains a `number`, `text`, and an optional `functions` array (containing objects with `id`, `name`, `description`, `activation`, `external_name` for each function relevant to that step).
2.  **`AiBotsController`**: Receives the request, validates the DTO, ensures the user has access to the company, and calls the appropriate `AiBotsService` method (`create` or `update`).
3.  **`AiBotsService.create` / `AiBotsService.update`**: 
    *   Handles the basic creation or update of the `AiBot` entity fields (`name`, `sysPrompt`, `mainConfig`, etc.).
    *   Crucially, when steps are updated (via `AiBotsController.updateSteps` calling `AiBotsService.updateSteps`), it performs the logic to synchronize the associated `BotFunction` entities:
        *   Extracts all unique function IDs mentioned across all steps.
        *   Compares these IDs with the existing `BotFunction` records for the bot.
        *   Creates new `BotFunction` records for functions mentioned in steps but not yet associated with the bot.
        *   Deletes `BotFunction` records for functions previously associated but no longer mentioned in any step.
        *   Updates the `stepNumber` on existing/new `BotFunction` records to match the step they are associated with in the `steps` array.
        *   Updates/creates a specific block (e.g., `steps_to_follow`) within the `AiBot.sysPrompt` to store the structured steps, likely for the AI model to reference.
4.  **Response:** Returns the created or updated `AiBot` entity.

### 3.2. Assigning a Bot to a Stage

*   This action happens within the `stages` module, not directly here. When creating or updating a `Stage` (`stages` module), a user can select an `AiBot` (created via this `ai-bots` module) to associate with that stage (`StageEntity.botId`).

### 3.3. Bot Usage during Conversation (Orchestrated by `funnels` module)

1.  **Context:** A client message arrives, and `FunnelsService` determines the client is in a `Stage` linked to an `AiBot`.
2.  **Delegation:** `FunnelsService` calls `BotMessageProcessorService.processMessage` (in the `funnels` module).
3.  **Bot Configuration Retrieval:** `BotMessageProcessorService` accesses the `ClientStage` object, which has the `Stage` and its associated `AiBot` entity (including `sysPrompt`, `mainConfig`, and the loaded `botFunctions` relation with their linked `Function` details).
4.  **Tool Preparation:** `BotMessageProcessorService` maps the active `BotFunction` entities associated with the *current* `AiBot` into the `tools` format expected by `OpenAIService`, using the `function.external_name` and `function.parameters` from the related `Function` entity.
5.  **AI Interaction:** `BotMessageProcessorService` calls `OpenAIService.agentWithTools`, providing the message, history, the bot's system prompt (`sysPrompt`), main configuration (`mainConfig`), and the prepared `tools`.
6.  **(Function Execution - handled in `funnels`/`functions`):** If the AI requests a tool call, `BotMessageProcessorService` identifies the corresponding `Function` using the `external_name`, calls `FunctionsService.executeFunction`, and potentially gets a final response from the AI.

## 4. Considerations for LLMs and Developers

*   **Configuration Center:** This module defines *what* an AI bot is and *what* it can do (its prompt, structure, and associated functions). The actual *execution* during a conversation is primarily handled by `BotMessageProcessorService` in the `funnels` module, which reads the configuration set here.
*   **System Prompt (`sysPrompt`):** This is critical for defining the bot's persona, core instructions, and potentially the structured steps it should follow. The `steps_to_follow` block within the prompt seems particularly important for guiding the AI through the defined `steps`.
*   **Steps (`steps` array):** This provides a way to structure the bot's logic into distinct phases. The `text` likely provides context/instructions to the AI for that specific step, and the `functions` array dictates which tools are *most relevant* or available at that point.
*   **Function Association (`BotFunction`):** This entity links the abstract bot configuration to concrete, executable actions defined in the `functions` module. The synchronization logic in `AiBotsService.updateSteps` ensures these links are kept up-to-date based on the `steps` definition.
*   **`external_name`:** The `function.external_name` field (from the related `Function` entity) is used as the identifier when presenting tools to the AI model and when processing tool calls.
*   **Modularity:** Separating bot configuration (`ai-bots`) from function definitions (`functions`) and execution logic (`funnels`) allows for reuse and independent management.
*   **Testing (`TryChatDto`):** The `/try-chat` endpoint is useful for isolated testing of prompt/model configurations without needing the full application context.
