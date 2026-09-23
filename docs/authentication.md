# Coding Standards

## 1. TypeScript Standards

- **Strict Mode**: Keep TypeScript strict checking enabled. Do not disable strict checks to bypass errors.

- **No `any`**: Avoid using `any`. Prefer `unknown` with type narrowing or define explicit types. Use `any` only when technically unavoidable and document the reason.

- **Import Aliases**: Use `@/*` for imports from `src/` when the project's configured TypeScript/Next.js path alias supports it.

---

## 2. React & Next.js Conventions

- **Server Components by Default**: Create Server Components unless client state, browser event listeners, hooks, or other client-only behavior is required.

- **Client Components**: Add `"use client"` at the top of files that require client-side behavior.

- **Component File Structure**:
  - Keep components modular and focused on a single responsibility.
  - Follow the export conventions already established by the project and the installed Next.js version.

- **Avoid Unnecessary `useEffect`**: Derive values during render or handle side-effects in direct event handlers when appropriate instead of using unnecessary `useEffect` chains.

---

## 3. Styling & UI Conventions

- **Tailwind CSS**: Use the project's configured Tailwind CSS conventions.

- **Class Merging**: Use the existing `cn(...)` utility for conditional class merging when such a utility exists in the project.

- **Theme & Colors**: Follow the project's established theme, semantic colors, and design tokens. Do not introduce arbitrary styling conventions.

---

## 4. Reusability & DRY

- **Inspect Before Creating**: Always search the codebase to check whether an existing component, utility, type, or service already exists before writing new code.

- **Do Not Duplicate**: Reuse or extend existing shared calculations, constants, utilities, and components whenever appropriate.

- **Minimum Change**: Do not create new abstractions solely to avoid small amounts of duplication. Make the smallest change that satisfies the requirement.