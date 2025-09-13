# Shoppingo - Claude Code Context

## Project Overview
Shoppingo is a full-stack e-commerce application with a React frontend and Node.js API backend. The project uses a monorepo structure managed with Yarn workspaces.

## Architecture
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Koa + TypeScript + MongoDB
- **Additional Services**: MinIO (object storage), Google Gemini AI integration

## Project Structure
```
shoppingo/
├── packages/
│   ├── api/          # Backend API (Koa + MongoDB)
│   ├── web/          # Frontend React app
│   └── types/        # Shared TypeScript types
├── .env              # Environment variables
├── package.json      # Root workspace configuration
└── yarn.lock         # Dependencies lockfile
```

## Key Scripts
Run these from the root directory:

### Development
- `yarn start` - Start both frontend and API
- `yarn start:web` - Start only frontend (port 4000)
- `yarn start:api` - Start only API (port 4001)
- `yarn start:with-mock` - Start with mock authentication

### Code Quality
- `yarn lint` - Run ESLint across all packages
- `yarn lint:fix` - Auto-fix ESLint issues

### Testing
- `yarn workspace @shoppingo/api test` - Run API tests (Vitest)
- `yarn workspace @shoppingo/web test` - Run web tests (Vitest + Testing Library)

## Environment Setup
The project requires:
- MongoDB (localhost:27017)
- MinIO object storage (192.168.68.54:7000)
- Gemini AI API key

Environment variables are in `.env` file (development values).

## API Structure (`packages/api/`)
Clean architecture with:
- `domain/` - Business logic and entities
- `infrastructure/` - External integrations (DB, storage)
- `interfaces/` - Controllers and adapters
- `routes/` - API route definitions
- `config/` - Configuration management

Key dependencies:
- Koa + Koa Router for HTTP server
- MongoDB native driver
- MinIO for file storage
- Google Gemini AI for AI features
- Sharp for image processing
- `@igor-siergiej/api-utils` - Shared utilities for configuration, database connections, and logging

## Frontend Structure (`packages/web/`)
Modern React app with:
- `components/` - Reusable UI components (shadcn/ui based)
- `pages/` - Route-based page components
- `hooks/` - Custom React hooks
- `api/` - API client and utilities
- `utils/` - Helper functions
- `context/` - React context providers

Key dependencies:
- React 19 + React Router
- Radix UI + Tailwind CSS + shadcn/ui
- React Query for data fetching
- Framer Motion for animations

## Shared Types (`packages/types/`)
Common TypeScript interfaces and types shared between frontend and backend.

## Development Workflow
1. **Starting development**: Run `yarn start` to start both services
2. **Code style**: The project uses ESLint with TypeScript, React, and import sorting rules
3. **Testing**: Uses Vitest for both packages with coverage reporting
4. **Building**: Use `yarn workspace @shoppingo/web build` for production build

## Useful Commands for Claude
- Check project status: `yarn lint` and individual package tests
- Start development: `yarn start` (or separate services as needed)
- File structure: Main code in `packages/api/src/` and `packages/web/src/`
- Types: Check `packages/types/` for shared interfaces

## Shared Utilities Integration
The project uses **im-apps-utils** monorepo for shared functionality:
- API package uses `@igor-siergiej/api-utils` for database connections, dependency injection, and logging
- Published to GitHub Packages registry
- See `../im-apps-utils/CLAUDE.md` for detailed utilities documentation

## IDE Configuration
The project includes:
- ESLint config with TypeScript and React rules
- VS Code workspace settings in `.vscode/`
- TypeScript strict configuration
- Tailwind CSS IntelliSense support

## Deployment & Infrastructure
The project is deployed using **GitOps** with Kubernetes:
- **Staging**: `shoppingo.imapps.staging` - Automated deployment from main branch
- **Production**: `shoppingo.imapps.co.uk` - Controlled production releases
- **Container Registry**: `192.168.68.54:31834/shoppingo-api` and `shoppingo-web`
- **Orchestration**: Kubernetes with ArgoCD for GitOps deployment
- **Ingress**: Traefik for HTTP routing (`/api/*` to API, rest to web frontend)
- See `../argonaut/CLAUDE.md` for complete deployment infrastructure documentation

## Related Services
- **Authentication**: Uses `kivo` service (port 3008) for user authentication
- **Shared Utilities**: Depends on `im-apps-utils` for common functionality
- **GitOps Deployment**: Managed via `argonaut` Kubernetes GitOps repository
- See `../kivo/CLAUDE.md`, `../im-apps-utils/CLAUDE.md`, and `../argonaut/CLAUDE.md` for related service documentation