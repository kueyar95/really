# REALLY Monorepo

## Overview

This monorepo contains all the applications that make up the REALLY platform, an advanced multi-channel CRM system with automation capabilities powered by artificial intelligence. The platform allows businesses to manage customer conversations across multiple channels (WhatsApp, Instagram, Messenger), create custom sales funnels, and deploy AI bots to automate interactions.

## Monorepo Structure

```
monorepo/
├── apps/
│   ├── backend/         # NestJS REST API & WebSockets
│   └── frontend/        # React + Vite Web Application
```

## Applications

### Backend

The backend is an API built with NestJS (Node.js/TypeScript) that provides:

- RESTful API for CRUD operations and business logic
- Real-time communication via WebSockets (socket.io)
- Integration with OpenAI for conversational AI bot capabilities
- Management of communication channels (WhatsApp, Instagram, etc.)
- Funnel and stage system for managing sales processes
- Integrations with external services (Google Calendar, Google Sheets)

**Key Technologies:**
- NestJS (Node.js/TypeScript)
- PostgreSQL + TypeORM
- Supabase (Authentication)
- Socket.io (WebSockets)
- OpenAI API
- Docker

### Frontend

The frontend is a modern React application that offers an interface for:

- Managing communication channels
- Configuring AI agents (bots)
- Defining and visualizing sales funnels
- Interacting with clients via a chat interface
- Managing settings and viewing analytics

**Key Technologies:**
- React (v18+) with TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn/ui
- TanStack Query (React Query)
- Socket.IO Client
- React Router
- React Hook Form
- Axios

## Installation and Setup

### Prerequisites

- Node.js (v16+)
- PostgreSQL
- Docker (optional)
- Supabase account
- OpenAI account

### Backend

```bash
# Navigate to the backend directory
cd apps/backend

# Install dependencies
npm install

# Configure environment variables
cp .env.template .env
# Edit .env with the necessary credentials

# Apply migrations
npm run migration:run

# Start in development mode
npm run start:dev

# Or with Docker
docker-compose up -d --build
```

### Frontend

```bash
# Navigate to the frontend directory
cd apps/frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.template .env
# Edit .env with the necessary credentials

# Start in development mode
npm run dev
```

## Key Features

- **Multi-channel**: Integration with WhatsApp, Instagram, and other communication channels
- **AI Automation**: Conversational bots powered by OpenAI
- **Customizable Funnels**: Define tailored sales flows and processes
- **Integrations**: Connect with Google Calendar, Google Sheets, and more
- **Real-time**: Instant updates for messages and statuses
- **Roles & Permissions**: User system with different access levels

## Development

To contribute to development, please follow the established code conventions in each application. Refer to the specific README files for each application for more details:

- [Backend README](apps/backend/README.md)
- [Frontend README](apps/frontend/README.md)