# Shoppingo - Claude Code Context

## Project Overview
Shoppingo is a full-stack e-commerce application with a React frontend and Node.js API backend. The project uses a monorepo structure managed with Yarn workspaces.

## Architecture
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui + PWA (vite-plugin-pwa)
- **Backend**: Node.js + Koa + TypeScript + MongoDB
- **Additional Services**: MinIO (object storage), AI image generation (Gemini or OpenAI, configurable via `IMAGE_PROVIDER` env var)

## Requirements
- **Node.js**: v22
- **Package manager**: Yarn 4.x (Berry)

## Project Structure
```
shoppingo/
├── packages/
│   ├── api/          # Backend API (Koa + MongoDB)
│   ├── web/          # Frontend React app
│   └── types/        # Shared TypeScript types
├── .env              # Environment variables
├── biome.json        # Biome linter/formatter config
├── commitlint.config.js  # Conventional commit rules
├── .releaserc.json   # Semantic-release config (auto changelog & versioning)
├── package.json      # Root workspace configuration
└── yarn.lock         # Dependencies lockfile
```

## Key Scripts
Run these from the root directory:

### Development
- `yarn start` - Start both frontend and API
- `yarn start:web` - Start only frontend (port 4000)
- `yarn start:api` - Start only API (port 4001)
- `yarn start:with-mock` - Start with mock authentication (uses `packages/web/mock-auth-server.js`)

### Code Quality
- `yarn lint` - Run Biome linter across all packages
- `yarn lint:fix` - Auto-fix Biome linting issues
- `yarn tsc --noEmit` - Type-check without emitting (run from root or per package)

### Testing
- `yarn workspace @shoppingo/api test` - Run API tests (Vitest, 90% coverage threshold)
- Note: the web package currently has no test files

## Environment Setup
The project requires:
- MongoDB (localhost:27017)
- MinIO object storage (192.168.68.54:7000)
- Gemini AI API key or OpenAI API key (set `IMAGE_PROVIDER=gemini|openai`)

Environment variables are in `.env` file (development values).

## API Structure (`packages/api/`)
Clean architecture with:
- `domain/` - Business logic and entities (ListService, ImageService, AuthorizationService, IdGenerator)
- `infrastructure/` - External integrations (MongoListRepository, HttpAuthClient, BucketStore, GeminiImageGenerator, OpenAIImageGenerator, UuidGenerator, imageProcessor)
- `interfaces/` - Controllers (ListHandlers, ImageHandlers, LogHandlers)
- `routes/` - API route definitions
- `middleware/` - Koa middleware (auth)
- `dependencies/` - DI container setup
- `config/` - Configuration management

Key dependencies:
- Koa + Koa Router for HTTP server
- MongoDB native driver
- MinIO for file storage
- Google Gemini AI or OpenAI for AI image generation
- Sharp for image processing
- `@igor-siergiej/api-utils` - Shared utilities for configuration, database connections, and logging

## Frontend Structure (`packages/web/`)
Modern React app with:
- `components/` - Reusable UI components (shadcn/ui based)
- `pages/` - Route-based page components (ListsPage, ItemsPage, LoginPage, RegisterPage)
- `hooks/` - Custom React hooks (useConfirmation, useSearch, useClickOutside, usePWA)
- `api/` - API client and utilities
- `utils/` - Helper functions (logger, version, pwa-debug)
- `contexts/` - React context providers (ThemeContext, PWAContext)

Key dependencies:
- React 19 + React Router
- Radix UI + Tailwind CSS + shadcn/ui
- React Query for data fetching
- Framer Motion for animations
- react-hook-form + Zod for form validation
- `@igor-siergiej/web-utils` - Shared utilities for auth, config

## Shared Types (`packages/types/`)
Common TypeScript interfaces and types shared between frontend and backend.

## Development Workflow
1. **Starting development**: Run `yarn start` to start both services
2. **Code style**: The project uses **Biome** for linting and formatting (not ESLint)
3. **Testing**: Uses Vitest for API tests with coverage reporting
4. **Linting before commits**: **IMPORTANT** - Run `yarn lint:fix` to fix all linting issues before committing
5. **Building**: Use `yarn workspace @shoppingo/web build` for production build
6. **Commit messages**: Must follow Conventional Commits (enforced by commitlint + Husky)
7. **Versioning**: Automated via semantic-release on main branch merges

## Pre-commit Hooks (Husky)
- **pre-commit**: Runs lint-staged on `*.{ts,tsx,json}` files
- **commit-msg**: Validates commit message format via commitlint

## Code Quality Checklist (Before Committing)
**Claude must perform these checks before creating any commit:**
1. **Linting**: Run `yarn lint:fix` to auto-fix all Biome linting issues
2. **Type check**: Run `yarn tsc --noEmit` to verify no TypeScript errors
3. **Tests**: Run `yarn workspace @shoppingo/api test` to verify all API tests pass
4. **Builds**: Verify `yarn workspace @shoppingo/web build` and `yarn workspace @shoppingo/api build` succeed
5. **Git status**: Ensure no untracked files are accidentally committed (except `.env` configs)

## Useful Commands for Claude
- Check project status: `yarn lint` and `yarn workspace @shoppingo/api test`
- Fix linting: `yarn lint:fix` (run before every commit)
- Type check: `yarn tsc --noEmit`
- Start development: `yarn start` (or separate services as needed)
- File structure: Main code in `packages/api/src/` and `packages/web/src/`
- Types: Check `packages/types/` for shared interfaces

## Shared Utilities Integration
The project uses shared packages published to GitHub Packages:
- API package uses `@igor-siergiej/api-utils` for database connections, dependency injection, and logging
- Web package uses `@igor-siergiej/web-utils` for auth, config loading
- Published to GitHub Packages registry under the `@igor-siergiej` scope

## Deployment & Infrastructure
The project is deployed using **GitOps** with Kubernetes:
- **Staging**: `shoppingo.imapps.staging` - Automated deployment from main branch
- **Production**: `shoppingo.imapps.co.uk` - Controlled production releases
- **Container Registry**: `192.168.68.54:31834/shoppingo-api` and `shoppingo-web`
- **Orchestration**: Kubernetes with ArgoCD for GitOps deployment
- **Ingress**: Traefik for HTTP routing (`/api/*` to API, rest to web frontend)
- See `../argonaut/CLAUDE.md` for complete deployment infrastructure documentation

## CI/CD Pipeline (`.github/workflows/ci-cd.yml`)
Jobs run in sequence: **lint → test → release → build-publish**
1. **lint**: Biome linting + TypeScript type check (`yarn tsc --noEmit`)
2. **test**: `yarn workspace @shoppingo/api test`
3. **release**: semantic-release for automated versioning and changelog
4. **build-publish**: Docker image build and push to container registry

## Related Services
- **Authentication**: Uses `kivo` service (port 3008) for user authentication
- **Shared Utilities**: Depends on `@igor-siergiej/api-utils` and `@igor-siergiej/web-utils`
- **GitOps Deployment**: Managed via `argonaut` Kubernetes GitOps repository
- See `../kivo/CLAUDE.md`, `../im-apps-utils/CLAUDE.md`, and `../argonaut/CLAUDE.md` for related service documentation
