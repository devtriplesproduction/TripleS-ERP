# API & Data Access Rules

This document outlines the current API and data-access rules for ConstroTrait.

## Data Flow

Use the appropriate data flow for the operation:

```text
Read:
UI / Server Component → Service (src/services/) → Supabase

Mutation:
UI → Server Action / Route Handler → Service (src/services/) → Supabase