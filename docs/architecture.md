# Architecture

This document outlines the current architecture of the ConstroTrait platform.

## Application Flow

Use the appropriate flow for the operation:

```text
Read:
UI / Server Component → Service Layer (src/services/) → Supabase → PostgreSQL

Mutation:
UI → Server Action / Route Handler → Service Layer (src/services/) → Supabase → PostgreSQL
## Folder Responsibilities

- **`src/app/`**: Next.js App Router. Contains pages, layouts, and route groups (e.g., `(auth)`, `(dashboard)`).
- **`src/actions/`**: Server Actions. Used for data mutations and forms from Client Components.
- **`src/components/`**: Reusable UI components.
- **`src/config/`**: Application configuration and constants.
- **`src/hooks/`**: Custom React hooks.
- **`src/lib/`**: Utilities, validation schemas, and Supabase client factories (`supabase/client.ts`, `supabase/server.ts`).
- **`src/services/`**: The Service Layer. Centralizes all database access and business logic. No Supabase queries should exist outside this directory.
- **`src/types/`**: TypeScript interfaces and generated database types.
- **`supabase/`**: Contains database migrations and Supabase configuration.
- **`docs/`**: Project documentation (architecture, database, API, etc.).

## Component Architecture

- **`ui/`**: Minimal foundational primitives (Button, Input, Card).
- **`common/`**: Shared generic UI elements used across different features.
- **`layout/`**: Shared navigation, sidebars, and structural scaffolding.
- **`forms/`**: Form wrappers and complex inputs.
- **`modules/` (or `features/`)**: Domain-specific feature components.

## Server vs Client

- **Server Components**: Used by default for all pages and data displays. They securely fetch data and reduce client bundle size.
- **Client Components**: Used only when interactivity is required (browser events, React state, or hooks). Declared with `"use client"`.
- **Server Actions**: Used for mutations triggered by user actions (like form submissions) in Client Components.
- **Route Handlers**: Used in `src/app/api/` for exposing webhooks or external API endpoints.

## Reusability

- **DRY (Don't Repeat Yourself)**: Never duplicate existing functionality. Extend existing tested components/functions whenever feasible.
- **Common Components**: Search `src/components/ui/` and `src/components/common/` before creating a new component.
