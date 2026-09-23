<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ConstroTrait — AI Agent Instructions & Guidelines

Every AI coding agent working on ConstroTrait must read and adhere to these guidelines BEFORE making any changes.

---

## 1. General Rules

* **Read `AGENTS.md` before modifying code**: Always ground your actions in this document.

* **Inspect before creating**: Inspect existing code, files, and configurations before adding new code.

* **Never blindly overwrite files**: Understand what an existing file does before modifying it.

* **Prefer minimal changes**: Keep edits targeted to the task requirements.

* **Do not refactor unrelated code**: Leave functioning, unrelated parts of the codebase untouched.

* **Do not introduce unnecessary dependencies**: Do not install packages without explicit architectural necessity.

---

## 2. Reusability & DRY

* **Components**: Search `src/components/ui/`, `src/components/common/`, and existing features before creating a new component.

* **Utilities**: Search `src/lib/utils/` before implementing utility functions.

* **Services**: Search `src/services/` before writing data-access functions.

* **Validation**: Search `src/lib/validations/` before writing validation schemas.

* **Never duplicate existing functionality**: Extend existing tested components/functions whenever feasible.

---

## 3. React & Next.js (App Router)

* **Default to Server Components**: Use Server Components for pages and data displays unless client execution is required.

* **Client Components**: Use `"use client"` only when browser events, client state, hooks, or other client-only behavior is required.

* **Avoid unnecessary `useEffect`**: Prefer derived values during render or direct event handlers when appropriate.

* **Avoid unnecessary client-side fetching**: Prefer server-side data fetching for initial data.

* **Keep components focused**: Separate presentation from business and data-access logic.

* **Use import aliases**: Use `@/*` for imports from `src/` when the repository's configured path alias supports it.

* **Follow the installed Next.js version**: Before using or changing Next.js APIs, inspect the installed version and relevant documentation.

---

## 4. Supabase Integration

* **Centralized clients**: Use the project's verified Supabase client factories for browser and server execution.

* **Zero Secret Exposure**: NEVER expose `SUPABASE_SERVICE_ROLE_KEY` or other secret keys to client-side code or commit them to Git.

* **Never bypass RLS**: RLS must protect every application table according to project requirements.

* **Schema Migrations**: Use versioned Supabase SQL migrations for schema updates.

* **Selective Projection**: Do not use `.select('*')` unnecessarily. Select only required columns.

* **Avoid N+1 queries**: Use appropriate Supabase relational queries where they reduce unnecessary database roundtrips.

* **Inspect before modifying Supabase code**: Verify the existing client implementation and installed package versions before changing authentication or database access.

---

## 5. API & Service Architecture

Use the appropriate data flow for the operation:

```text
Read:
UI / Server Component → Service → Supabase → PostgreSQL

Mutation:
UI → Server Action / Route Handler → Service → Supabase → PostgreSQL
```

Rules:

* Keep reusable database access in the service layer where the project's architecture requires it.
* Do not duplicate Supabase queries across components.
* Do not put complex database queries or business logic directly inside UI components.
* Validate external input before executing sensitive operations.
* Server Actions are the primary mechanism for application mutations where appropriate.
* Route Handlers are used when an HTTP endpoint is actually required.
* Services may be called directly by Server Components for server-side reads.
* Return predictable service results where the existing service architecture requires them.

---

## 6. Database Standards

* **Standard audit columns**: Application tables should use `id`, `created_at`, and `updated_at` where appropriate, according to `docs/database.md`.

* **Foreign Keys & Constraints**: Define explicit foreign keys with deliberate `ON DELETE` behavior and appropriate integrity constraints.

* **Indexes**: Add indexes based on actual foreign-key usage, filtering, joins, ordering, and frequent query patterns. Avoid unnecessary or redundant indexes.

* **RLS Mandatory**: Enable and define appropriate RLS policies for every application table.

* **Normalization**: Prefer normalized relational design, generally up to 3NF. Allow documented denormalization when justified by domain or performance requirements.

---

## 7. Security Rules

* Never commit `.env.local`, API keys, private credentials, or secrets to version control.

* Ensure `.env.example` contains placeholder values only.

* Validate authenticated user state on the server using the project's verified Supabase authentication mechanism. When the project uses `supabase.auth.getUser()`, use it for authoritative server-side identity verification.

* Never trust client-provided roles, permissions, user IDs, organization IDs, or ownership claims.

* Sensitive authorization must be enforced server-side and, where applicable, through RLS.

---

## 8. Before Creating New Code — 5 Mandatory Questions

Always ask:

1. **Does this already exist?**
2. **Can I reuse it?**
3. **Can I extend it?**
4. **Will this create duplicate logic?**
5. **Is this the correct architectural layer?**

---

## 9. Before Completing Work — Verification

Always run and verify:

```bash
npm run lint
npm run build
```

* Verify the actual results.
* Fix all errors introduced by the current changes.
* Distinguish pre-existing failures from failures introduced by the current changes.
* Do not claim the project is clean if either command fails.
* Do not claim completion based only on an AI-generated report.

---

## 10. Evidence-First Development

For every task, follow:

```text
VERIFY → AUDIT → RECOMMEND → IMPLEMENT → VERIFY
```

Before modifying existing functionality, inspect the relevant implementation.

Never assume that documentation, previous plans, AI reports, or previous conversations prove that an implementation exists.

Do not invent:

* files
* tables
* columns
* roles
* permissions
* APIs
* services
* components
* RLS policies
* authentication flows
* migrations
* dependencies

If required information cannot be verified:

> **UNKNOWN — needs verification.**

For authentication, authorization, roles, permissions, RLS, service-role credentials, tenant isolation, or sensitive data changes:

1. Read `AGENTS.md`.
2. Read `docs/security.md`.
3. Inspect the current implementation.
4. Inspect the current database schema when applicable.
5. Read relevant installed framework/library documentation.
6. Make the minimum necessary change.

If the requested implementation conflicts with these rules, **STOP** and report the conflict before making changes.
