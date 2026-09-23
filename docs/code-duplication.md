# Code Duplication Rules

## Purpose

Keep business logic maintainable by avoiding unnecessary duplication.

### Rules

1. **Avoid duplicate business logic**

   * The same business logic should not be implemented independently in multiple places.
   * Prefer a shared service, utility, RPC, or appropriate abstraction.

2. **Do not duplicate service logic in Server Actions**

   * Server Actions should not reimplement business logic already handled by a service.

3. **Do not duplicate RPC logic**

   * If an RPC handles a business operation, do not create another implementation of the same operation unless there is a documented reason.

4. **Avoid copy-paste implementations**

   * Reuse existing functionality when the behavior is the same.
   * Extract genuinely shared logic when appropriate.

5. **Fallback logic**

   * Fallback implementations must not unnecessarily duplicate the primary implementation.
   * A fallback is acceptable when there is a legitimate documented reason.

6. **Audit rule**

   * Report `VIOLATION` only when the duplication clearly violates these rules.
   * If it is only a possible improvement, report it as `RECOMMENDATION`.
   * If there is insufficient evidence, report `UNKNOWN — needs verification`.

### Important

Do not classify code as duplicated merely because it looks similar. Confirm that it implements the same or substantially the same behavior.
