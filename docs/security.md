# ConstroTrait — Security Rulebook

This document is the mandatory security rulebook for all ConstroTrait development and AI-agent changes. It must be read and adhered to by all developers and AI agents working on the project.

---

## 1. Core Security Principle

> **NEVER TRUST THE CLIENT.**

The server must independently verify:

* **WHO** the user is
* **WHAT** roles/permissions they have
* **WHICH** resource they can access
* **WHICH** action they can perform

The client is NEVER a trusted security boundary.

Do not trust:

* React state
* localStorage
* sessionStorage
* hidden inputs
* disabled buttons
* client-side role values
* URL parameters

Sensitive authorization must happen server-side.

---

## 2. Authentication

* Supabase Auth is the single source of truth for authentication.
* Protected operations must verify the authenticated session server-side.
* Never store passwords in application tables.
* Never log passwords or authentication secrets.
* Use secure SSR session handling for all authentications.

---

## 3. Authorization

* Authentication (who you are) and authorization (what you can do) are separate concepts.
* Sensitive operations must perform server-side authorization checks.
* Never trust client-side roles or permissions for access control.
* Hidden or disabled UI controls are not security measures.
* Server Actions and API routes must independently verify permissions before executing.

---

## 4. Roles & Permissions

* Keep role definitions centralized.
* Keep permission definitions centralized.
* Do not duplicate role lists across components, validation, services, navigation, or authorization logic.
* **An employee can hold multiple roles based on assigned responsibilities.**
* Authorization checks must account for all of the employee's assigned roles.
* Do not assume a specific database implementation for multi-role support; follow the approved project schema.
* The `SUPER_ADMIN` role (or equivalent) must not be assignable through an untrusted client request.

---

## 5. Employee Onboarding Security

Employee onboarding is a privileged operation.

* The server must verify that the current user has the required permission to onboard employees.
* The client must never be able to:

  * Assign unauthorized roles.
  * Create a privileged account.
  * Modify another employee's permissions.
  * Bypass validation or authorization checks.

---

## 6. Supabase Security

* Keep browser, server, and admin clients strictly separate.
* Service-role credentials are for server environments ONLY.
* Never expose service-role credentials to the browser.
* Never use service-role credentials in `NEXT_PUBLIC_*` variables.
* Never import the admin client into Client Components.

---

## 7. Database & RLS

* **Row Level Security (RLS) is mandatory on every application table.**
* Never rely only on frontend authorization.
* Tenant isolation must be enforced server-side/database-side where applicable.
* Never trust client-supplied organization/tenant identifiers.
* Use proper foreign keys and constraints to maintain data integrity.
* Avoid exposing unnecessary database columns in queries and API responses.

---

## 8. Server Actions & API

Every sensitive mutation must follow this sequence:

1. Authenticate the user.
2. Validate input.
3. Verify authorization.
4. Execute through the appropriate service/data-access layer.
5. Return safe errors.

Never trust client-supplied:

* User ID
* Role
* Permission
* Organization ID
* Ownership claims
* Authorization flags

---

## 9. Input Validation

* Validate all external input server-side.
* Use centralized validation schemas where appropriate (e.g., Zod).
* Validate forms, API requests, route parameters, query parameters, IDs, dates, numbers, roles, and uploaded files.

---

## 10. Query Security

* Never use `.select("*")` unnecessarily. Select only required columns.
* Avoid N+1 queries. Use appropriate Supabase relational queries where applicable.
* Avoid unnecessary repeated database queries.
* Never return sensitive fields unless absolutely required.

---

## 11. Environment Variables

* `.env.local` must never be committed to version control.
* `.env.example` must contain placeholders only.
* Secrets must never be hardcoded in the application source.
* Public (`NEXT_PUBLIC_*`) and private environment variables must remain clearly separated.

---

## 12. File Uploads

When handling file uploads, strictly enforce:

* Allowed file types.
* File size limits.
* Secure storage locations and access controls.
* Private-file access controls where required.
* Secure file-name handling.
* File-content validation where applicable.
* Prevention of executable uploads.

---

## 13. Sensitive Data & Logging

**Never expose unnecessarily:**

* Passwords
* Tokens
* Service-role keys
* Private credentials
* Financial information
* Personal employee information

**Never log:**

* Passwords
* Tokens
* Secrets
* Service-role keys
* Sensitive personal data

---

## 14. Error Handling

Do not expose internal details in errors:

* SQL errors
* Database internals
* Stack traces
* Credentials
* Security configuration

Always return safe, user-facing error messages.

---

## 15. Security Verification Checklist

Before completing any security-sensitive feature, verify:

* [ ] Authentication verified
* [ ] Server-side authorization verified
* [ ] Input validation implemented
* [ ] RLS reviewed
* [ ] Service-role key protected
* [ ] No secrets committed
* [ ] No passwords logged
* [ ] Sensitive data minimized
* [ ] Explicit database columns selected
* [ ] No unauthorized mutations
* [ ] Multi-role permissions handled correctly
* [ ] Error messages are safe
* [ ] `npm run lint` verified
* [ ] `npm run build` verified
* [ ] Security tests/manual verification completed

If lint or build already contains unrelated failures, distinguish them from failures introduced by the current change.

---

## 16. AI Agent Rule

Before implementing any change involving:

* Authentication
* Authorization
* Roles
* Permissions
* Row Level Security (RLS)
* Supabase admin client
* Service-role credentials
* Employee access
* Tenant isolation
* Sensitive data

The AI agent MUST:

1. Inspect `AGENTS.md`.
2. Inspect `docs/security.md`.
3. Inspect the relevant current implementation.
4. Inspect the current database schema when applicable.
5. Follow:

```text
VERIFY → AUDIT → RECOMMEND → IMPLEMENT → VERIFY
```

If the requested implementation conflicts with these rules, **STOP** and report the conflict before making changes.

---

## 17. Evidence-First Rule

This document defines security requirements. It does not prove that the current implementation satisfies them.

Before claiming that a security control exists, verify it from the current repository, schema, configuration, or other authoritative evidence.

If something cannot be verified:

> **UNKNOWN — needs verification.**

Never invent:

* authentication mechanisms
* roles
* permissions
* RLS policies
* security controls
* files
* configuration
* authorization behavior
