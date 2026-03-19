# Shoppingo - Claude Code Context

## Project Overview
Shoppingo is a full-stack e-commerce application with a React frontend and Node.js API backend. The project uses a monorepo structure managed with Bun workspaces.

## Architecture
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui + PWA (vite-plugin-pwa)
- **Backend**: Node.js + Koa + TypeScript + MongoDB
- **Additional Services**: MinIO (object storage), AI image generation (Gemini or OpenAI, configurable via `IMAGE_PROVIDER` env var)

## Requirements
- **Bun**: v1.x
- **Package manager**: Bun 1.x

## Project Structure
```
shoppingo/
├── packages/
│   ├── api/          # Backend API (Koa + MongoDB)
│   ├── web/          # Frontend React app
│   └── types/        # Shared TypeScript types
├── .env              # Environment variables
├── .bunfig.toml      # Bun registry configuration
├── biome.json        # Biome linter/formatter config
├── commitlint.config.js  # Conventional commit rules
├── .releaserc.json   # Semantic-release config (auto changelog & versioning)
├── package.json      # Root workspace configuration
└── bun.lockb         # Dependencies lockfile
```

## Key Scripts
Run these from the root directory:

### Development
- `bun run start` - Start both frontend and API
- `bun run start:web` - Start only frontend (port 4000)
- `bun run start:api` - Start only API (port 4001)
- `bun run start:with-mock` - Start with mock authentication (uses `packages/web/mock-auth-server.js`)

### Code Quality
- `bun run lint` - Run Biome linter across all packages
- `bun run lint:fix` - Auto-fix Biome linting issues
- `bun run tsc --noEmit` - Type-check without emitting (run from root or per package)

### Testing
- `bun run --filter @shoppingo/api test` - Run API tests (Bun native test runner, 90% coverage threshold)
- `bun run --filter @shoppingo/web test` - Run web component tests (Bun native test runner)
- **IMPORTANT**: All tests use Bun's native test runner (`bun:test`). Import from `bun:test` only.

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
- `@imapps/api-utils` - Shared utilities for configuration, database connections, and logging

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
- `@imapps/web-utils` - Shared utilities for auth, config

## Shared Types (`packages/types/`)
Common TypeScript interfaces and types shared between frontend and backend.

## Development Workflow
1. **Starting development**: Run `bun run start` to start both services
2. **Code style**: The project uses **Biome** for linting and formatting (not ESLint)
3. **Testing**: Uses Vitest for API tests with coverage reporting
4. **Linting before commits**: **IMPORTANT** - Run `bun run lint:fix` to fix all linting issues before committing
5. **Building**: Use `bun run --filter @shoppingo/web build` for production build
6. **Commit messages**: Must follow Conventional Commits (enforced by commitlint + Husky)
7. **Versioning**: Automated via semantic-release on main branch merges

## Pre-commit Hooks (Husky)
- **pre-commit**: Runs lint-staged on `*.{ts,tsx,json}` files
- **commit-msg**: Validates commit message format via commitlint

## Code Quality Checklist (Before Committing)
**Claude must perform these checks before creating any commit:**
1. **Linting**: Run `bun run lint:fix` to auto-fix all Biome linting issues
2. **Type check**: Run `bun run tsc --noEmit` to verify no TypeScript errors
3. **Tests**: Run `bun run --filter @shoppingo/api test` to verify all API tests pass
4. **Builds**: Verify `bun run --filter @shoppingo/web build` and `bun run --filter @shoppingo/api build` succeed
5. **Git status**: Ensure no untracked files are accidentally committed (except `.env` configs)

## Useful Commands for Claude
- Check project status: `bun run lint` and `bun run --filter @shoppingo/api test`
- Fix linting: `bun run lint:fix` (run before every commit)
- Type check: `bun run tsc --noEmit`
- Start development: `bun run start` (or separate services as needed)
- File structure: Main code in `packages/api/src/` and `packages/web/src/`
- Types: Check `packages/types/` for shared interfaces

## Shared Utilities Integration
The project uses shared packages published to GitHub Packages (migration to public npm in progress):
- API package uses `@igor-siergiej/api-utils` for database connections, dependency injection, and logging
- Web package uses `@igor-siergiej/web-utils` for auth, config loading
- Registry configured via `.bunfig.toml` (requires `NODE_AUTH_TOKEN` env var)

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
1. **lint**: Biome linting + TypeScript type check (`bun run tsc --noEmit`)
2. **test**: `bun run --filter @shoppingo/api test`
3. **release**: semantic-release for automated versioning and changelog
4. **build-publish**: Docker image build and push to container registry

## Related Services
- **Authentication**: Uses `kivo` service (port 3008) for user authentication
- **Shared Utilities**: Depends on `@igor-siergiej/api-utils` and `@igor-siergiej/web-utils`
- **GitOps Deployment**: Managed via `argonaut` Kubernetes GitOps repository
- See `../kivo/CLAUDE.md`, `../im-apps-utils/CLAUDE.md`, and `../argonaut/CLAUDE.md` for related service documentation
