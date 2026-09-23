# Database Architecture & Standards

## Overview

ConstroTrait uses **PostgreSQL** hosted on **Supabase**. All database tables, columns, indexes, constraints, and Row Level Security (RLS) policies must adhere to the standards outlined in this document.

---

## 1. Table Design Standards

Every application table must include standard metadata fields unless a documented exception is justified by the table's purpose:

| Column       | Type          | Default             | Description                      |
| :----------- | :------------ | :------------------ | :------------------------------- |
| `id`         | `uuid`        | `gen_random_uuid()` | Unique primary key               |
| `created_at` | `timestamptz` | `now()`             | Record creation timestamp        |
| `updated_at` | `timestamptz` | `now()`             | Automatic last-updated timestamp |

### Naming Conventions

* **Table Names**: Lowercase, plural, snake_case (e.g., `organizations`, `projects`, `invoices`).

* **Column Names**: Lowercase, singular, snake_case (e.g., `user_id`, `organization_id`, `status`).

* **Primary Keys**: Always named `id`.

* **Foreign Keys**: Named `<singular_referenced_table>_id` (e.g., `organization_id`, `created_by`).

* **Indexes**: Named `idx_<table_name>_<column_name(s)>`.

---

## 2. Integrity & Relationships

1. **Foreign Keys**: Always define explicit `FOREIGN KEY` constraints with deliberate `ON DELETE` behavior (`CASCADE`, `SET NULL`, `RESTRICT`, `NO ACTION`, or another appropriate PostgreSQL option).

2. **Data Normalization**: Design tables up to 3NF. Avoid storing duplicate entity state across tables. Deliberate denormalization is permitted when justified by documented performance or domain requirements.

3. **Data Types**:

   * Use `uuid` for IDs.

   * Use `timestamptz` for all timestamps.

   * Use `text` or constrained `varchar` for strings.

   * Use `numeric(12, 2)` or `integer` for monetary amounts (avoid floating point values for currency).

   * Use `jsonb` only for semi-structured or truly dynamic metadata.

---

## 3. Row Level Security (RLS)

**RLS is mandatory on every application table.**

* Enable RLS immediately upon table creation:

  ```sql
  ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;
  ```

* Define explicit RLS policies for every database operation the application permits. Operations not permitted by design must remain denied.

* Multi-tenancy / Organization isolation: Always enforce tenant boundaries through policies verifying user membership (e.g. `organization_id` checking against authenticated user profile or membership table).

---

## 4. Indexing Guidelines

* Create indexes on foreign-key columns when supported by actual query, join, filtering, ordering, or referential-action patterns.

* Create indexes on frequently filtered columns (e.g., `status`, `organization_id`).

* Create composite indexes for queries with combined `WHERE` and `ORDER BY` filters.

* Avoid redundant indexes that slow down write performance.

---

## 5. Migrations Workflow

1. **No Manual Production Changes**: Never alter database schemas directly in production without a versioned migration.

2. **Supabase Migrations**: All schema updates must be committed as migration files (e.g. `supabase/migrations/<timestamp>_<description>.sql`).

3. **Type Generation**: After applying migrations, regenerate TypeScript database definitions using the project's configured Supabase type-generation workflow. Use `--local` when generating from the local database and the appropriate linked/project workflow when generating from a remote database.
