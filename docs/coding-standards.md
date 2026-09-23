# Coding Standards

This document defines the project coding standards for ConstroTrait.

## TypeScript

- **Strict typing**: TypeScript Strict Mode is mandatory. Do not disable strict checks to bypass errors.

- **Avoid `any`**: Avoid using `any`. Prefer generics, `unknown` with type narrowing, or specific types. Use `any` only when technically unavoidable and document the reason.

- **Reusable types**: Extract complex shared interfaces and types into `src/types/` where appropriate.

- **Database generated types**: Use the generated Supabase `Database` types when they are available in `src/types/database.ts`.

- **Naming conventions**: Use camelCase for variables/functions, PascalCase for components/types/interfaces, and UPPER_SNAKE_CASE for constants.

## React

- **Server Components by default**: Use Server Components for pages and data displays unless interactivity or other client-only behavior is required.

- **Use Client Components only when required**: Use `"use client"` only for components requiring browser events, React state, context hooks, or other client-side behavior.

- **Hooks rules**: Follow the standard Rules of Hooks. Avoid unnecessary `useEffect`—compute values during render or in event handlers when appropriate.

- **Component responsibilities**: Keep components focused. Separate presentation UI from business logic.

## Next.js

- **App Router**: Follow the App Router conventions of the installed Next.js version.

- **Route organization**: Group routes logically where appropriate (e.g., `(auth)`, `(dashboard)`).

- **Server Actions**: Use Server Actions for application mutations where appropriate instead of creating unnecessary API endpoints.

- **Proxy**: Follow the project's verified proxy implementation for routing, authentication, and authorization checks.

## Components

- **Reusable UI primitives**: Use existing foundational components in `src/components/ui/` when available.

- **Common components**: Reuse generic components shared across features when available.

- **Feature components**: Keep domain-specific UI close to its relevant feature/module structure.

- **Avoid unnecessary abstraction**: Build components that solve the current problem without over-engineering for hypothetical future use cases.

## Styling

Use the existing ConstroTrait design system via the project's configured Tailwind CSS setup.

- - **Primary**: `#FFFFFF`
- **Accent**: `#FFFFFF`
- **Background**: `#050505`
- **Surface**: `#0F0F10`
- **Surface Elevated**: `#151516`
- **Border**: `#2A2A2A`
- **Foreground**: `#FFFFFF`
- **Muted Foreground**: `#A1A1AA`
- **Muted Background**: `#18181B`
- **Input Background**: `#0B0B0C`
- **Font**: `Inter`

Do not introduce another design system or component library without explicit architectural necessity.

Before changing the design system, verify the current project configuration and existing component usage.