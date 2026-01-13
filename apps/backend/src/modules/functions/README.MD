# Functions Module (`functions`)

## 1. Purpose and Overview

The `functions` module provides a powerful mechanism to extend the capabilities of AI Bots (`ai-bots` module) beyond simple text-based conversation. It allows defining specific, executable actions (Functions) that the AI can request to be performed.

Think of these Functions as tools in the AI Bot's toolbox. When the AI, during a conversation processing step (handled by `BotMessageProcessorService` in the `funnels` module), determines that an action needs to be taken (like changing a client's stage, creating a calendar event, or adding data to a spreadsheet), it can invoke one of these predefined Functions.

**Core Responsibilities:**

*   **Function Definition:** Allows administrators or developers to define new functions, specifying:
    *   `type`: The category of the function (e.g., `CHANGE_STAGE`, `GOOGLE_CALENDAR`, `GOOGLE_SHEET`).
    *   `name`, `description`, `activationDescription`: Human-readable info and usage guidance for the AI.
    *   `external_name`: A unique identifier used when presenting the function as a tool to the AI model.
    *   `parameters`: A JSON schema defining the arguments the AI must provide to execute the function.
    *   `constData`: Static configuration data needed for the function's execution (e.g., the specific Stage ID for `CHANGE_STAGE`, the Google Calendar ID, or Sheet URL).
*   **Function Registration & Discovery:** Makes defined functions discoverable by other parts of the system, particularly the AI bot processing logic.
*   **Function Execution:** Provides a central service (`FunctionsService`) to execute a specific function implementation based on its ID, passing the arguments provided by the AI and the necessary execution context.

## 2. Architecture and Key Components

The module centralizes function definition and execution, with specific logic delegated to implementation classes.

```
functions/
├── functions.module.ts       # NestJS module definition, dependencies, providers
├── functions.controller.ts     # API endpoints (primarily for listing/creating functions)
├── functions.service.ts        # Core service for registering and executing functions
│
├── core/
│   └── types/                # Shared TypeScript types for function parameters & const data
│       ├── function.types.ts   # Main enum FunctionType, union types for Params/ConstData
│       ├── calendar.types.ts   # Specific types for Google Calendar functions
│       ├── sheet.types.ts      # Specific types for Google Sheet functions
│       └── stage.types.ts      # Specific types for Change Stage function
│
├── dto/                    # Data Transfer Objects
│   └── create-function.dto.ts # DTO for defining/creating new functions via API
│
├── entities/               # TypeORM entity definitions
│   ├── function.entity.ts    # Represents a defined Function in the database
│   └── example.json        # Example JSON structure for a function entity
│
└── implementations/        # Concrete logic for each function type
    ├── calendar/
    │   ├── create-event.ts
    │   ├── delete-event.ts
    │   ├── get-availability.ts
    │   ├── list-events.ts
    │   └── update-event.ts
    ├── sheet/
    │   └── add-row.ts
    └── stage/
        └── change-stage.ts
```

### 2.1. Key Components

*   **`FunctionsService`**: The central service of the module. 
    *   `create()`: Handles the creation of new `Function` entities based on the provided type and data, generating the appropriate `parameters` schema and `constData` structure.
    *   `executeFunction()`: This is the critical method called by other services (like `BotMessageProcessorService`). It receives a `functionId`, arguments (`args` provided by the AI), and an `executionContext`. It finds the corresponding `Function` entity, determines its type, and delegates the execution to the appropriate *Implementation Class* (e.g., `ChangeStageImplementation`, `CreateEventImplementation`).
    *   Provides methods for finding functions (`findOne`, `findByCompany`, `findAll`).
*   **`Function` (Entity)**: Represents a defined function in the database. Stores all the configuration details mentioned in the Purpose section (`type`, `name`, `description`, `parameters` schema, `constData`, `external_name`, etc.).
*   **Implementation Classes (e.g., `ChangeStageImplementation`, `CreateEventImplementation`, `AddRowImplementation`)**: Each class within the `implementations/` directory contains the actual logic for executing a specific type of function (or a specific action within a type, like calendar event creation vs. deletion).
    *   They receive the `Function` entity (containing `constData`), the `args` from the AI, and the `context`.
    *   They interact with other necessary services (e.g., `ClientStageService`, `CalendarEventService`, `GoogleSheetsService`) to perform the action.
    *   They return a standardized `FunctionResult` object (`{ success: boolean, data: any, error?: string, metadata?: any }`).
*   **Core Types (`core/types/`)**: Define the structure for `FunctionParameters` (JSON schema used by OpenAI) and `FunctionConstData` (static configuration) for each `FunctionType`. This ensures type safety and consistency.
*   **`FunctionsController`**: Provides API endpoints, primarily for administrative purposes like creating new functions (`POST /functions`) or listing available functions (`GET /functions/company`).
*   **DTOs (`CreateFunctionDto`)**: Define the structure for creating functions via the API, including nested structures for different function types.

## 3. Key Workflows

### 3.1. Defining a New Function

1.  **API Request:** `POST /functions` with the function `type` and `data` specific to that type (e.g., for `CHANGE_STAGE`, the `stageId`, `name`, `description`).
2.  **`FunctionsController.create`**: Calls `FunctionsService.create`.
3.  **`FunctionsService.create`**: 
    *   Calls a private helper method based on the `type` (e.g., `createChangeStageFunction`, `createGoogleCalendarFunction`).
    *   The helper method generates the unique `id` and `external_name`, constructs the `parameters` JSON schema (defining what arguments the AI needs to provide), and structures the `constData` (static config).
    *   Creates the `Function` entity using `functionRepository.create()`.
    *   Saves the entity using `functionRepository.save()`.
    *   Returns the saved `Function` entity.

### 3.2. Executing a Function (Triggered by AI)

This flow typically starts within `BotMessageProcessorService` (in `funnels` module) after the AI model responds with a tool call.

1.  **Tool Call Received:** `BotMessageProcessorService` identifies that the AI wants to call a function (e.g., `xyz123_change_stage`). It extracts the function's `external_name` and the `arguments` provided by the AI.
2.  **Find BotFunction:** It looks up the `BotFunction` entity associated with the current bot that has the matching `external_name` (via the related `Function` entity).
3.  **Delegate Execution:** `BotMessageProcessorService` calls `FunctionsService.executeFunction`, passing:
    *   `functionId`: The ID of the `Function` entity found.
    *   `args`: The arguments JSON provided by the AI (parsed into an object).
    *   `context`: The relevant execution context (`companyId`, `clientId`, `funnelId`, etc.).
4.  **`FunctionsService.executeFunction`**: 
    *   Retrieves the full `Function` entity using the `functionId`.
    *   Validates the context based on the `function_.type`.
    *   Uses a `switch` statement based on `function_.type` (and potentially `function_.constData.type` for multi-action types like `GOOGLE_CALENDAR`) to determine the correct Implementation Class.
    *   Calls the `execute` method of the selected Implementation Class (e.g., `this.changeStageImplementation.execute(...)`), passing the `function_` entity, the `args`, and the `context`.
5.  **Implementation Execution:** The specific implementation class (e.g., `ChangeStageImplementation`) runs its logic:
    *   Accesses `function_.constData` for static config (e.g., the target `stageId`).
    *   Uses the `args` provided by the AI.
    *   Uses the `context` (`clientId`, `companyId`).
    *   Calls other services (e.g., `ClientStageService`, `CalendarEventService`) to perform the action.
    *   Returns the `FunctionResult` object.
6.  **Return Result:** `FunctionsService` receives the `FunctionResult` from the implementation and passes it back to the caller (`BotMessageProcessorService`).
7.  **Process Result:** `BotMessageProcessorService` takes the `FunctionResult` and typically formats it as a JSON string to send back to the AI model in the next turn, allowing the AI to formulate a response based on the function's outcome.

## 4. Considerations for LLMs and Developers

*   **AI Tool Definition:** The `parameters` field (JSON schema) in the `Function` entity is crucial. It dictates exactly what information the AI needs to gather from the user conversation *before* it can request the function execution.
*   **`external_name`:** This unique name is how the function is identified in the `tools` array sent to the AI and how the AI refers to it in `tool_calls`. It should be descriptive but concise.
*   **`description` & `activationDescription`:** These fields guide the AI on *what* the function does and *when* it should consider using it. Clear descriptions are vital for the AI to use tools effectively.
*   **`constData` vs `parameters`:** Understand the difference. `constData` is static configuration set when the function is *defined* (e.g., the specific Sheet URL). `parameters` defines the dynamic arguments the AI must provide at *runtime* (e.g., the actual row data to add to the sheet).
*   **Implementation Logic:** The core action logic resides in the `implementations/` classes. When adding new functions or modifying existing ones, these are the primary files to edit.
*   **Context is Key:** The `executionContext` passed to `FunctionsService.executeFunction` provides necessary IDs (`companyId`, `clientId`, etc.) for the implementation logic to operate correctly within the application's scope.
*   **Error Handling:** Implementation classes should handle potential errors during their execution (e.g., API errors from Google Calendar, database errors) and return `success: false` with an informative error message in the `FunctionResult`.
*   **Extensibility:** Adding new function types involves:
    1.  Defining new types/interfaces in `core/types/`.
    2.  Creating a new Implementation Class in `implementations/`.
    3.  Updating `FunctionType` enum in `core/types/function.types.ts`.
    4.  Adding a case to the `switch` statement in `FunctionsService.executeFunction`.
    5.  Adding a helper creation method in `FunctionsService` (like `createChangeStageFunction`).
    6.  Updating the `CreateFunctionDto` if necessary.
    7.  Registering the new Implementation Class as a provider in `functions.module.ts`.
