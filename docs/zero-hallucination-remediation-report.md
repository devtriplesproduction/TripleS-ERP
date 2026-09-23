# ConstroTrait — Zero-Hallucination Remediation Report

Source of truth: uploaded project ZIP supplied for this remediation.

## Confirmed remediations

1. Employee document uploads now use the `employee-documents` bucket path already defined by the project and include the authorized branch in the storage path. Server-side file size, extension, and magic-byte validation remains enforced.
2. Employee document Storage policies are branch-aware for HR and Branch Manager access; Super Admin retains global access.
3. Medical certificate upload was moved from browser-side direct Storage uploads to server-side service/action handling with 5 MB, extension, and magic-byte validation.
4. The application now uses `medical-certificates` as the canonical medical-certificate bucket. The latest migration forces it private and configures the allowed file types and 5 MB limit.
5. Medical certificate viewing now uses short-lived signed URLs instead of `getPublicUrl()`.
6. Medical certificate deletion now attempts Storage cleanup after the database action; legacy URL formats for the two repository-defined bucket names are parsed when possible.
7. The legacy four-argument `review_eod_rpc` overload is explicitly dropped. The active three-argument RPC derives the approver from `auth.uid()` and validates review status.
8. `update_eod_rpc` now rejects statuses other than `Approved` at the database boundary, while retaining the caller-identity check.
9. Leave/EOD frontend `any` usage identified in the previous audit was removed from the leave module.
10. The previous unescaped apostrophe in `ComingSoonModal` was corrected.
11. Ad-hoc scratch/local artifacts and the uploaded `.env.local` file are excluded from the remediated project package. `.gitignore` now also excludes generated/local Supabase and scratch state.

## Not claimed as verified

- Production Supabase state was not available from the ZIP. Migration application status is therefore **UNKNOWN — needs verification**.
- A clean `npm run lint` / `npm run build` result could not be verified because the dependency installation did not complete in the available execution environment. This is **UNKNOWN — needs verification**.
- Git branch/commit identity is **UNKNOWN — needs verification** because the uploaded ZIP contains no `.git` metadata.
- The business requirement for a multi-level leave approval workflow is not defined in the repository documentation inspected during this remediation, so no workflow redesign was invented.
