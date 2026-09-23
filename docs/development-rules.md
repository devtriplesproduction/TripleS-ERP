# Development Rules & Workflow

## 1. General Principles

* **Inspect First**: Always inspect existing project files and configurations before making modifications.

* **Minimal, Focused Changes**: Keep commits and modifications targeted. Do not refactor unrelated code or configurations.

* **No Overengineering**: Do not add unnecessary packages, premature microservices, complex state management, or unrequested business abstractions.

---

## 2. Quality Verification

Before completing any task or claiming work as complete, execute:

```bash
npm run lint
npm run build
```

* Verify the actual results of both commands.
* Do not claim the project is clean if either command fails.
* Distinguish pre-existing errors from errors introduced by the current changes.
* All errors introduced by the current changes must be resolved before claiming completion.

---

## 3. Database Schema Changes

1. Never apply untracked manual schema edits in production.

2. Generate and commit versioned SQL migrations under `supabase/migrations/`.

3. Regenerate TypeScript definitions in `src/types/database.ts` using the project's configured Supabase type-generation workflow.

---

## 4. Git & Secret Hygiene

1. Ensure `.env.local` and all private secrets remain untracked in `.gitignore`.

2. Update `.env.example` with placeholder names whenever a new environment variable is introduced.
