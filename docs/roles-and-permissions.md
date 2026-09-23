# ConstroTrait Roles & Permissions

## Roles Overview

ConstroTrait defines the following 13 roles:

1. **SUPER_ADMIN**: Full system access. Cannot be provisioned through standard employee onboarding.

2. **BRANCH_MANAGER_ADMINISTRATIVE**: Branch-level administrative tasks.

3. **HR**: Human Resources; can onboard and manage employees.

4. **QUALITY_MANAGER**: Manages quality control and compliance.

5. **TECHNICAL_MANAGER**: Oversees technical operations.

6. **ADMIN_INWARD_CRE**: Administrative, inward processing, and customer relations.

7. **ACCOUNTANT**: Manages financial operations and invoicing.

8. **TEST_ENGINEER**: Performs material testing.

9. **LAB_ANALYST**: Analyzes test results.

10. **LAB_ASSISTANT**: Assists in laboratory tasks.

11. **SAMPLER**: Handles sample collection.

12. **MARKETING_EXECUTIVE**: Field marketing and sales.

13. **DIGITAL_MARKETING**: Digital marketing operations.

---

## Multiple Roles

An employee may hold multiple roles based on assigned responsibilities.

Authorization must evaluate **all roles assigned to the employee**.

Rules:

* Do not assume an employee has only one role.
* Do not overwrite existing roles when assigning an additional role.
* Role definitions must be centralized.
* Authorization checks must support multiple assigned roles.
* Privileged roles must require trusted server-side authorization.
* The exact database representation of multiple roles must follow the approved project schema.

---

## Authorization Mechanism

Authorization may be enforced at multiple trusted layers:

1. **Route Protection**: Protect authenticated routes and apply appropriate route-level authorization.

2. **Server Actions / Services**: Authenticate the caller and verify required permissions before sensitive operations.

3. **Row Level Security (RLS)**: Enforce database-level access according to the application's verified role and tenant model.

Client-side role values must never be trusted for sensitive authorization.

---

## Role Source of Truth

The authoritative source of assigned roles must be the approved PostgreSQL/domain model.

Authentication metadata such as Supabase `app_metadata` may be used as a synchronized authorization claim where appropriate.

JWT metadata must not create an authorization path that contradicts the authoritative database role model.

Do not assume a specific column, array, or role-assignment table without verifying the current schema.

---

## Privileged Roles

Privileged roles, including `SUPER_ADMIN`, must not be assignable through an untrusted client request.

Server-side authorization must verify that the caller has permission to assign or modify privileged roles.

---

## Super Admin Provisioning

The initial `SUPER_ADMIN` must be provisioned through a secure, trusted server-side process.

Standard employee onboarding must not allow an untrusted client to assign the `SUPER_ADMIN` role.

The actual bootstrap mechanism must be verified from the current repository before claiming that a specific script or provisioning flow exists.

---

## Evidence-First Rule

This document defines the intended role and authorization requirements.

It does not prove that the current implementation follows them.

Before changing roles, permissions, RBAC, or RLS:

**VERIFY → AUDIT → RECOMMEND → IMPLEMENT → VERIFY**

If a role, permission, database field, JWT claim, policy, or authorization mechanism cannot be verified:

> **UNKNOWN — needs verification.**

Never invent role storage, permissions, policies, or authorization behavior.
