# ConstroTrait Documentation Index

Welcome to the technical documentation for **ConstroTrait**.

## Architecture & Standards

* **[System Architecture](architecture.md)**: Overall application design, folder organization, layer responsibilities, and approved data flows between UI, Server Components, Server Actions, Route Handlers, Services, Supabase, and PostgreSQL.

* **[Database Standards](database.md)**: Schema rules, naming conventions, primary keys, audit fields, foreign keys, indexes, migrations, data integrity, and Row Level Security (RLS).

* **[API & Data Access Rules](api.md)**: Query optimization, column projection, duplicate-query prevention, N+1 prevention, server/client data access, pagination, and service/data-access patterns.

* **[Authentication & Sessions](authentication.md)**: Supabase SSR authentication, session handling, server-side identity verification, route protection, RBAC, privileged operations, and authentication security.

* **[Security Guidelines](security.md)**: Credential safety, environment isolation, input validation, authorization, RLS enforcement, secret protection, and security verification.

* **[Coding Standards](coding-standards.md)**: TypeScript, React, Next.js, styling, naming, reusability, and code-quality standards.

* **[Development Rules](development-rules.md)**: Development workflow, minimal changes, database migrations, verification, Git hygiene, and secret management.

* **[Compliance and Security Baseline](compliance-audit.md)**: Final compliance audit baseline for future development to prevent security, architecture, and coding-standard regressions.

---

## Evidence-First Principle

These documents define **project requirements and standards**.

They do not prove that the current implementation follows them.

Before modifying or auditing the codebase:

**VERIFY → AUDIT → RECOMMEND → IMPLEMENT → VERIFY**

If something cannot be verified from the current repository:

> **UNKNOWN — needs verification.**
