# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Primary Commands
- `pnpm dev` - Start all applications (web on port 5173, server on port 8787)
- `pnpm build` - Build all applications for production
- `pnpm check` - Run Biome linting and formatting (fixes issues automatically)
- `pnpm check-types` - TypeScript type checking across all apps

### Individual App Commands
- `pnpm dev:web` - Start only the React frontend
- `pnpm dev:server` - Start only the Hono API server
- `pnpm dev:native` - Start native app (if needed)

### Database Commands
- `pnpm db:push` - Apply schema changes to database (use after schema modifications)
- `pnpm db:studio` - Open Drizzle Studio for database GUI
- `pnpm db:generate` - Generate database migrations
- `pnpm db:migrate` - Run database migrations

### Testing & Quality
- Always run `pnpm check` before committing (handles linting and formatting)
- Check TypeScript types with `pnpm check-types`
- Biome configuration enforces specific code style (single quotes, 2-space indent, 100 char width)

## Architecture Overview

### Tech Stack
- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend**: React 19 + Vite + TanStack Router + Zustand + TailwindCSS v4
- **Backend**: Hono server on Cloudflare Workers
- **Database**: SQLite with Drizzle ORM (Cloudflare D1 in production)
- **Storage**: Cloudflare R2 for file uploads
- **AI**: Google AI SDK (Gemini) for calendar event creation
- **Authentication**: LINE LIFF (LINE Front-end Framework)

### Project Structure
```
apps/
├── web/           # React frontend (port 5173)
├── server/        # Hono API server (port 8787)  
└── ai-app/        # Next.js AI service
```

### Key Features
1. **LINE Bot Integration**: Webhook handling for messages and files
2. **AI Calendar Events**: Natural language processing to create calendar events
3. **File Management**: Upload/download with R2 storage
4. **Real-time Calendar**: Drag-and-drop event management
5. **Type-safe APIs**: oRPC for end-to-end type safety

## Important Implementation Details

### Authentication Flow
- Frontend uses LINE LIFF for user authentication
- Server validates LIFF access tokens via `verifyLiffAccessToken` middleware
- User ID matching enforced with `verifyUserIdMatch` middleware
- ORPC routes protected with `verifyOrpcAuth` middleware

### Database Schema
Main tables: `users`, `files`, `messages`, `calendar_events`
- Schema defined in `apps/server/src/db/schema.ts`
- Use Drizzle ORM for all database operations
- Always run `pnpm db:push` after schema changes

### File Storage
- Files stored in Cloudflare R2 bucket (configured via `APP_STORAGE` binding)
- File metadata stored in database
- MIME type detection using `file-type` library
- Access via `/{userId}/{fileId}` pattern (local development only)

### AI Integration
- Google AI (Gemini) for calendar event creation from natural language
- AI prompts defined in `apps/ai-app/src/lib/prompts/`
- Event creation logic in `apps/server/src/lib/ai.ts`

### Error Handling
- Global error middleware catches unhandled errors
- Structured error responses with user-friendly messages
- Error parsing utility in `apps/server/src/lib/error-handler.ts`

## Code Conventions

### TypeScript
- Strict TypeScript configuration
- Use `type` for type definitions, `interface` for extensible objects
- Prefer `as const` assertions for literal types

### React/Frontend
- File-based routing with TanStack Router
- Zustand for state management
- TanStack Query for server state
- shadcn/ui components in `apps/web/src/components/ui/`
- Use `cn()` utility for conditional classes

### API/Backend
- Hono framework with oRPC for type-safe APIs
- Controllers in separate files (e.g., `FileController`, `CalendarEventController`)
- Middleware for authentication and validation
- Environment variables via Cloudflare Workers bindings

### Database
- Use Drizzle ORM with prepared statements
- Database instance accessible via `c.get('db')` in Hono context
- Always handle database errors gracefully

## Development Notes

### Local Development
- Server runs on Cloudflare Workers environment locally
- Database uses local SQLite (D1 local mode)
- CORS configured for local development
- Hot reload enabled for both frontend and backend

### Environment Variables
Server environment variables (Cloudflare Workers bindings):
- `LINE_ACCESS_TOKEN` - LINE Bot access token
- `LINE_CHANNEL_SECRET` - LINE Bot channel secret
- `GOOGLE_AI_API_KEY` - Google AI API key
- `APP_STORAGE` - R2 bucket binding
- `DB` - D1 database binding
- `ENV` - Environment (local/production)
- `CORS_ORIGIN` - CORS configuration

### Common Patterns
- Use controllers for business logic separation
- Implement proper error handling with user-friendly messages
- Validate user permissions before data access
- Use TypeScript strict mode throughout
- Follow Biome formatting rules (enforced on pre-commit)