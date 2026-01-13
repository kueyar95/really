# REALLY Backend

## Overview
REALLY is a backend system built with NestJS and PostgreSQL that [brief description of what the application does].

## Table of Contents
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Database Setup](#database-setup)
- [Creating Module](#creating-module)
- [Available Commands](#available-commands)
- [Development Workflow](#development-workflow)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Additional Documentation](#additional-documentation)

## Prerequisites
- Node.js (v16+)
- Docker & Docker Compose
- npm or yarn

## Getting Started
1. Clone the repository
```bash
git clone [repository-url]
cd really/backend
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.template .env
# Edit .env file with your configuration
```

## Database Setup
The project uses PostgreSQL as the database. We provide a Docker Compose configuration to easily set up both PostgreSQL and pgAdmin for database management.

### First time running the database?
```bash
docker-compose up -d    # Run the docker compose configuration
npm run migration:run   # Run migrations
```

After this step you should be able to run the project without any issue.

### Start the database (and pgAdmin)
```bash
docker-compose up -d
```

### Environment configuration
Make sure your `.env` file contains the correct database URL:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/really
```

### Creating migrations
To create a new migration you should only run this command (notice the PascalCase)
```bash
npx typeorm migration:create src/database/migrations/<MigrationName>
```

After running this command you will have a new file named `<MigrationName>` where you should implement the logic for your database queries using raw queries or the database abstraction


### Managing the database with pgAdmin
pgAdmin is included in the Docker Compose setup for easy database management:
- URL: http://localhost:5050
- Default credentials:
  - Email: admin@example.com
  - Password: admin

#### Connecting to your database in pgAdmin:
1. Open pgAdmin at http://localhost:5050
2. Login with the credentials above
3. Right-click on "Servers" and select "Create > Server"
4. Name: really_local
5. Connection tab:
   - Host: really-postgres
   - Port: 5432
   - Username: postgres
   - Password: postgres
   - Database: really

## Creating modules
```bash
npx @nestjs/cli generate module modules/[module-name]
```

## Available Commands
```bash
# Development
npm run dev                # Start development server with watch mode


# Database
npm run migration:run      # Run database migrations
npm run migration:revert   # Revert last migration
npm run seed               # Seed the database with initial data

# Building and Running
npm run build              # Run migrations and build the application
npm start                  # Run the built application
npm run start:prod         # Run in production mode

# Testing
npm test                   # Run tests
npm run test:e2e           # Run end-to-end tests
```

## Development Workflow
1. Make changes to entities in `src/modules/**/*.entity.ts`
2. Generate and run migrations
3. Implement business logic and run tests
4. Follow coding standards and best practices

## API Documentation
API documentation is available using Swagger:
- Development: http://localhost:3000/api/docs
- Production: https://[your-production-url]/api/docs

## Troubleshooting

### Migration Issues
If you encounter migration errors:
1. Check if the database state matches the entity definitions
2. For constraint issues, you may need to manually adjust migrations or database state

### Common Errors
- **DB Connection Failed**: Check your DATABASE_URL in .env
- **Migration Errors**: Ensure database schema is synchronized with entity definitions
- **Port Already in Use**: Make sure ports 5432 and 5050 are available

## Additional Documentation
For more detailed documentation, please refer to:
- [API Documentation](docs/api.md)
- [Database Schema](docs/schema.md)
- [Deployment Guide](docs/deployment.md)
- [Contribution Guidelines](docs/contributing.md)
