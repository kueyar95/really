# Frontend Platform - Detailed Analysis for LLM

## 1. Overview & Purpose

This repository contains the frontend application for the REALLY platform, a comprehensive CRM and communication automation system. The frontend provides the user interface for businesses to manage communication channels, configure AI agents (bots), define sales/process funnels, interact with clients via a chat interface, manage settings, and view analytics.

It interacts heavily with a dedicated backend API (presumably the one analyzed previously) to fetch data, trigger actions, and receive real-time updates via WebSockets.

**Primary Goal:** To offer a user-friendly, feature-rich interface for managing the platform's core functionalities: multi-channel communication, AI bot configuration, funnel management, and client interaction.

## 2. Technology Stack

-   **Framework:** React (v18+) with TypeScript.
-   **Build Tool / Dev Server:** Vite.
-   **Styling:** Tailwind CSS, leveraging shadcn/ui components (built on Radix UI primitives) for a consistent and modern look and feel. CSS variables are used for theming.
-   **State Management:**
    *   **Global State:** React Context API (`AuthContext`, `SocketContext`, `InactivityContext`).
    *   **Server State / Caching:** TanStack Query (React Query v5) for fetching, caching, and synchronizing server state.
-   **Routing:** React Router DOM (v7).
-   **Forms:** React Hook Form, potentially supplemented with Formik/Yup/Zod for validation (schemas observed in backend DTOs, likely used here too, although specific form lib usage varies across components).
-   **API Communication:** Axios for standard HTTP requests, configured with interceptors for authentication tokens.
-   **Real-time Communication:** Socket.IO Client for WebSocket connections (primarily for chat and status updates).
-   **Charts / Data Visualization:** Recharts.
-   **UI Components:** shadcn/ui (including primitives like Dialog, Select, Button, Card, Table, etc.).
-   **Linting/Formatting:** ESLint, potentially Prettier (implied by common practices).
-   **Authentication Client:** Supabase Client library for interacting with Supabase Auth.

## 3. Project Structure (`src` directory)

The frontend follows a feature-based or module-based structure, organizing code by major application areas.

```
src/
├── App.tsx                 # Main application component, sets up routing and providers
├── main.tsx                # Application entry point, renders root component
├── index.css               # Global Tailwind CSS base styles and custom utilities
│
├── assets/                 # Static assets (images, logos)
│
├── components/             # Reusable UI components
│   ├── ui/                 # shadcn/ui generated/customized components (Button, Card, etc.)
│   ├── layouts/            # Layout structures (e.g., AuthLayout, AppSidebar)
│   ├── auth/               # Auth-related components (Callback, Route Guards)
│   ├── calendar/           # Components for the calendar view
│   ├── DataTable/          # Reusable data table component
│   └── ... (other shared UI elements)
│
├── contexts/               # React Context providers for global state
│   ├── AuthContext.tsx       # Manages user authentication state and actions
│   ├── SocketContext.tsx     # Manages WebSocket connection and instance status
│   └── InactivityContext.tsx # Handles user inactivity detection and logout
│
├── data/                   # Static data, potentially mock data (data.ts)
│
├── hooks/                  # Custom React Hooks for reusable logic
│   ├── useAuth.ts          # (Implicit via AuthContext)
│   ├── useSocket.ts        # (Implicit via SocketContext)
│   ├── useInactivity.ts    # (Implicit via InactivityContext)
│   ├── useToast.ts         # Hook for displaying notifications (shadcn/ui toaster)
│   ├── useChatEvents.ts    # Handles WebSocket events related to chat messages
│   ├── useWhatsAppEvents.ts # Specific hooks for WhatsApp events (potentially overlapping/refactoring needed?)
│   ├── useWhatsAppIntegration.ts # Hooks for managing specific WhatsApp connection types
│   ├── useGoogleCalendar.ts # Hook for Google Calendar integration logic
│   ├── useGoogleSheets.ts  # Hook for Google Sheets integration logic
│   └── ... (other hooks like useStageEvents, useTimeBlockSelection)
│
├── lib/                    # General utility functions
│   ├── utils.ts            # Tailwind CSS class merging (cn function)
│   └── socket.ts           # Socket.IO client instance setup (potentially duplicated/refactor needed)
│
├── modules/                # Feature modules - Core application sections
│   ├── admin/              # Admin-specific views (User, Funnel, Bot management)
│   ├── calendar/           # Calendar view/page
│   ├── chat-bot/           # (Potentially) Chatbot testing or configuration UI
│   ├── chats/              # Main chat interface module
│   ├── dashboard/          # Main dashboard view
│   ├── funnels/            # Funnel visualization/management view (likely user-facing)
│   ├── leads/              # (Potentially) Lead management view
│   ├── login/              # Login page
│   ├── onboarding/         # User/Company onboarding flow
│   ├── register/           # Company registration page (likely for invited users)
│   ├── settings/           # User/Company settings page
│   ├── signup/             # Public signup page
│   └── super_admin/        # Super Admin views (Company management, etc.)
│
├── services/               # API interaction layer
│   ├── api.ts              # Axios instance configuration with auth interceptor
│   ├── queries.ts          # (Likely) TanStack Query query/mutation definitions (organized by feature)
│   ├── types.ts            # Shared API type definitions
│   └── ... (feature-specific API service files: Bots, Calendar, Channels, etc.)
│
└── types/                  # Global TypeScript type definitions
    ├── index.ts
    └── whatsapp.ts         # Specific types for WhatsApp integration

```

## 4. Core Concepts & Modules

### 4.1. Authentication (`AuthContext`, `/modules/login`, `/modules/signup`, `/modules/register`, `/components/auth`)

-   Handles user login (Email/Password, Google OAuth via Supabase).
-   Manages user session state globally using `AuthContext`.
-   Persists basic user data in `localStorage` for faster initial load.
-   Fetches extended user data (company info, role) from the backend API (`UserService.getUser`) after Supabase authentication.
-   Provides route guards (`AdminRoute`, `SuperAdminRoute`) based on user roles stored in the context.
-   Handles the OAuth callback (`AuthCallback.tsx`).
-   Includes signup and registration flows, interacting with backend endpoints to create users in both Supabase and the application database.

### 4.2. Real-time Communication (`SocketContext`, `hooks/useChatEvents`, `hooks/useWhatsApp*`)

-   Establishes and manages a WebSocket connection using `socket.io-client` via `SocketContext`.
-   Authenticates the WebSocket connection using the Supabase auth token.
-   Joins company-specific rooms on the backend.
-   `useChatEvents`: Central hook listens for incoming messages (`message`, `bot_response`) and status updates, updating the React Query cache for relevant queries (e.g., `channel-chats`, `client-messages`).
-   `useWhatsAppIntegration`/`useBaileysIntegration`/`useChannelConnection`: Hooks likely responsible for initiating WhatsApp connections (e.g., requesting QR codes via socket emits like `connectWhatsApp`), handling connection status events (`connectionStatus`), and QR code events (`qr`, `whapi:qr`) specific to different providers (Whapi, Baileys/WebJS). *Note: There seems to be some overlap/potential refactoring need between these hooks.*
-   Handles socket disconnection and reconnection logic.

### 4.3. Chat Interface (`modules/chats`)

-   **Main View:** Displays the list of clients/conversations in a sidebar (`ChatsSidebar`) and the selected chat's messages in the main panel.
-   **Sidebar (`ChatsSidebar`):**
    *   Uses `ChannelSelector` to switch between viewing all chats for a Funnel or a specific Channel.
    *   Fetches client list data (likely via TanStack Query wrapping `WhatsAppService.findByCompanyId` or similar).
    *   Displays `ClientItem` components, showing client name, status (including stage and assigned user via `ClientStatus`), last message preview, and channel icon.
    *   Includes filtering capabilities (`SearchBar`, `AssignmentFilter`, `DateFilter`).
-   **Message Area:**
    *   `ChatHeader`: Displays selected client details.
    *   `ChatMessages`: Fetches message history for the selected client (`WhatsAppService.getClientChatHistory`) and renders `ChatMessage` components. Implements auto-scrolling.
    *   `ChatInput`: Handles user input and calls the `sendMessage` function provided by `useChatEvents` (which emits via socket).
-   **State Management:** Relies heavily on TanStack Query for fetching and caching chat/client data. `useChatEvents` updates the cache upon receiving WebSocket events.

### 4.4. Funnel & Stage Management (`modules/admin/funnels`, `modules/funnels`, `services/Funnels`, `services/Stages`)

-   **Admin View (`admin/funnels`):**
    *   Displays a table of funnels (`FunnelsTable`).
    *   Allows creating new funnels (`CreateFunnelSheet` / `create.tsx`), potentially using templates (`funnelTemplates`).
    *   Allows editing funnels (`edit.tsx`), including managing stages and associated channels (`FunnelChannels`, `FunnelStagesDialog`).
    *   Includes functionality for personalizing templates using web scraping (`WebScrapingStatus`).
-   **User View (`/modules/funnels`):** Visualizes funnels using `StepCard` components, showing clients within each stage (`StepCardItem`). Uses `useStageEvents` hook to listen for real-time client movements between stages.
-   **API Interaction:** Uses `FunnelsService` and `StagesService` for CRUD operations on funnels and stages, and fetching associated data like clients per stage.

### 4.5. AI Bot Configuration (`modules/admin/bots`, `services/Bots`, `services/Bots/functions`)

-   **Admin View (`admin/bots`):**
    *   Lists existing bots (`BotsTable`).
    *   Allows creating new bots (`create-page.tsx`) and editing existing ones (`edit-page.tsx`).
    *   Provides a complex UI (`PromptBlocksContainer`, `PromptBlockEditor`, `StepsEditor`) for defining the bot's `sysPrompt` (using predefined and custom blocks) and structured `steps`.
    *   Integrates modals (`CreateChangeStageFunctionModal`, `CreateCalendarFunctionModal`, `CreateSheetFunctionModal`) to create new Functions (`functions` module) and associate them with bot steps.
    *   Allows testing bot configurations (`try-page.tsx`) by directly calling a backend endpoint (`/ai-bots/try-chat`).
-   **API Interaction:** Uses `BotsService` for bot CRUD and step updates. Uses `FunctionsService` to fetch available functions and create new ones.

### 4.6. Settings (`modules/settings`)

-   Provides a tabbed interface (`GeneralTab`, `ChannelsTab`, `IntegrationsTab`).
-   **Channels:** Lists connected communication channels (`ChannelCard`), allows adding new channels (`AddChannelModal`), shows connection status (using `useChannelConnection`), and displays QR codes (`QRModal`). Allows connecting channels to funnels (`ConnectFunnelModal`).
-   **Integrations:** Manages connections to external services like Google Calendar and Google Sheets (using `useGoogleCalendar`, `useGoogleSheets` hooks, handling OAuth flow).
-   **General:** Configures general AI behavior (wait time, message splitting, context limits).

### 4.7. Super Admin (`modules/super_admin`)

-   Provides views accessible only to Super Admins.
-   **Companies (`companies/page.tsx`):** Lists all companies on the platform, likely using `CompanyService`.
-   **Bots (`bots/page.tsx`):** Potentially lists all bots across all companies.
-   Uses `SuperAdminRoute` guard for access control.

### 4.8. UI Components (`components/ui`, `components/layouts`)

-   Extensive use of shadcn/ui components, providing a consistent design system.
-   Custom layouts like `AuthLayout` (for dashboard views, includes `AppSidebar`) and potentially others.
-   Specialized components like `CalendarBase` for calendar views.

## 5. Data Flow & State Management

-   **Server State:** TanStack Query is the primary tool for fetching, caching, and managing data from the backend API. Queries are organized in `services/*`. Keys often include identifiers like company ID, funnel ID, channel ID, or client ID.
-   **Real-time Updates:** WebSocket events received via `SocketContext` trigger cache invalidations or direct cache updates (e.g., `queryClient.setQueriesData` in `useChatEvents`) to keep the UI synchronized without constant polling.
-   **Global UI State:** React Context (`AuthContext`, `SocketContext`, `InactivityContext`) holds global state like authentication status, socket connection details, and inactivity timers.
-   **Local Component State:** `useState` and `useRef` are used for managing component-level state (e.g., form inputs, modal visibility, UI toggles).
-   **Forms:** React Hook Form (likely used in combination with resolvers like Zod) manages form state, validation, and submission.

## 6. Key Considerations for LLMs

-   **Modularity:** The code is well-organized into modules based on features (chats, funnels, bots, settings, etc.), making it easier to locate relevant code.
-   **Component Library:** Heavy reliance on shadcn/ui means understanding its components (props, variants, usage) is crucial for UI modifications.
-   **Data Fetching:** TanStack Query is central. Modifying data fetching or adding new data requirements involves understanding query keys, query functions (defined in `services/`), and potentially mutation logic.
-   **Real-time Logic:** The `SocketContext` and related hooks (`useChatEvents`, `useChannelConnection`) are critical for understanding how real-time updates affect the application state and UI.
-   **State Flow:** Trace how data flows from API/WebSocket -> TanStack Query Cache / Context -> Components.
-   **Routing:** `App.tsx` defines the main application routes using React Router v7, including protected routes based on user roles.
-   **API Services:** The `services/` directory acts as the interface to the backend. Understanding the available service methods and their corresponding backend endpoints is key.
-   **Types:** Extensive use of TypeScript. Type definitions in `services/types.ts`, `types/index.ts`, and within specific modules/services are important for understanding data structures.
-   **Authentication Flow:** Understand the interplay between Supabase Auth client calls, the backend API for user data, and the `AuthContext` for managing the session in the frontend.
-   **Hooks:** Custom hooks abstract complex logic (e.g., managing specific WebSocket connections, handling integrations). Understanding their purpose and return values is necessary when working with related features.
