# TripleS ERP — Payroll Divisor Policy & Financial Reconciliation Verification

**Document Version:** 1.0.0  
**Audit Date:** November 4, 2026  
**Status:** PRODUCTION VERIFIED & RECONCILED  
**Scope:** Payroll Divisor Policy, Financial Reconciliation Baseline, Dynamic Monthly Working Days, Historical Protection, UI Integration

---

## 1. Executive Summary & Root Cause Investigation

### 1.1 The Reported Discrepancy (from Screenshot)
In the Automated Reconciliation Audit UI, the following values were displayed for Omkar Sawant (EMP-003) for October 2026:

| Field | Displayed Value | Mathematical Analysis |
| :--- | :--- | :--- |
| **Divisor Policy** | `Fixed (26 Days)` | Policy configuration setting |
| **Monthly Base Salary** | `₹8,000.00` | Contractual compensation |
| **Scheduled Working Days** | `27 days` | 31 calendar days − 4 Sundays |
| **Payable Days** | `16.5 days` | Worked + approved leave |
| **Deducted Days** | `10.5 days` | Unpaid / absent days |
| **Daily Rate** | `₹307.69/day` | $₹8,000 / 26 = ₹307.6923...$ |
| **Net Payable** | `₹4,769.23` | **Discrepant Value** ($8000 - 3230.77$) |
| **Total Deductions** | `₹3,230.77` | $10.5 \times ₹307.6923... = ₹3,230.77$ |
| **Reconciled Sum** | `₹8,000.00 / ₹8,000.00` | Artificially balanced against ₹8,000 |

### 1.2 Mathematical Proof of the Mismatch
Under the `Fixed 26 Days` policy:
- $\text{Daily Rate} = \frac{₹8,000}{26} = ₹307.6923...$
- If the employee has **16.5 payable days**, their earned pay should be:
  $$\text{Earned Pay} = 16.5 \times ₹307.692307... = \mathbf{₹5,076.92}$$
- The UI displayed **₹4,769.23**.
- The discrepancy is exactly:
  $$₹5,076.92 - ₹4,769.23 = \mathbf{₹307.69} \quad (\text{exactly 1 full day of pay!})$$

### 1.3 Root Cause Identified
1. **The Flawed Calculation Formula in the Legacy Service:**
   In `lib/services/payroll.service.ts` line 695, the calculation was previously implemented as:
   ```ts
   // Old flawed calculation:
   earnedPay = Math.max(0, monthlyPayBase - attendanceDeduction);
   ```
   Where `attendanceDeduction = 10.5 * 307.6923 = ₹3,230.77`.
   This subtracted $10.5\text{ days}$ of deductions directly from $26\text{ days}$ of base salary:
   $$26\text{ days} - 10.5\text{ days} = \mathbf{15.5\text{ days paid!}}$$
   In October 2026, there are **27 scheduled working days** ($31 - 4\text{ Sundays}$).
   Because the employee worked 16.5 days, deducting 10.5 days from 26 days dropped the 27th calendar day from compensation, underpaying the employee by **₹307.69**.

2. **Why Fixed 26 Days Was Active in the Screenshot:**
   October 2026 had been finalized in an earlier test execution with `divisorMode: 'fixed_26'`. The payroll module correctly loaded the immutable historical snapshot from `scratch/payroll_runs_store.json` and `scratch/payroll_items_store.json`. Because snapshots are frozen upon finalization, opening the modal displayed the historical calculation recorded at the time of finalization.

---

## 2. Authoritative Divisor Policy Architecture

A centralized, authoritative configuration service was implemented in `lib/services/payroll-config.service.ts` to govern divisor policies across all modules.

### 2.1 Supported Policies

```
                    ┌─────────────────────────────────────────┐
                    │      Authoritative Divisor Policy       │
                    └────────────────────┬────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
   ┌───────────────────────────┐                   ┌───────────────────────────┐
   │    actual_mon_sat         │                   │         fixed_26          │
   │  (Company Standard)       │                   │    (Legacy Standard)      │
   ├───────────────────────────┤                   ├───────────────────────────┤
   │ Divisor = Dynamic Mon–Sat │                   │ Divisor = Fixed 26 Days   │
   │ Daily Rate = Salary / Mon │                   │ Daily Rate = Salary / 26  │
   │ Net = Payable * DailyRate │                   │ Net = Payable * DailyRate │
   │ Gross = Salary Base       │                   │ Gross = SchedDays * Rate  │
   │ Reconciliation = Base     │                   │ Reconciliation = Gross    │
   └───────────────────────────┘                   └───────────────────────────┘
```

#### Policy A: Actual Monday–Saturday (`actual_mon_sat` — Default Company Policy)
- **Divisor:** Total calendar days minus Sundays in the `Asia/Kolkata` time zone.
- **Daily Rate:** $\text{Monthly Base Salary} / \text{Mon–Sat Working Days}$.
- **Attendance Deduction:** $\text{Deducted Days} \times \text{Daily Rate}$.
- **Net Payable:** $\text{Payable Days} \times \text{Daily Rate}$.
- **Financial Balance Invariant:**
  $$\text{Net Payable} + \text{Attendance Deduction} \equiv \text{Monthly Base Salary} \quad (\text{within ₹0.01})$$

#### Policy B: Fixed 26 Days (`fixed_26`)
- **Divisor:** Strictly 26 days regardless of month length.
- **Daily Rate:** $\text{Monthly Base Salary} / 26$.
- **Gross Scheduled Pay:** $\text{Scheduled Working Days} \times \text{Daily Rate}$.
- **Attendance Deduction:** $\text{Deducted Days} \times \text{Daily Rate}$.
- **Net Payable:** $\text{Payable Days} \times \text{Daily Rate}$.
- **Financial Balance Invariant:**
  $$\text{Net Payable} + \text{Attendance Deduction} \equiv \text{Gross Scheduled Pay} \quad (\text{within ₹0.01})$$

---

## 3. Dynamic Monthly Divisor Verification (Asia/Kolkata Calendar)

| Month | Calendar Days | Sundays in Month | Scheduled Mon–Sat Working Days | `actual_mon_sat` Divisor | `fixed_26` Divisor | Daily Rate (for ₹8,000 Base) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **October 2026** | 31 | 4 (Oct 4, 11, 18, 25) | **27 days** | **27 days** | 26 days | `actual`: ₹296.30 / `fixed`: ₹307.69 |
| **November 2026** | 30 | 5 (Nov 1, 8, 15, 22, 29) | **25 days** | **25 days** | 26 days | `actual`: ₹320.00 / `fixed`: ₹307.69 |
| **December 2026** | 31 | 4 (Dec 6, 13, 20, 27) | **27 days** | **27 days** | 26 days | `actual`: ₹296.30 / `fixed`: ₹307.69 |

### Omkar Sawant (EMP-003) — Full Policy Comparison (October 2026)

| Parameter | Actual Mon–Sat (27 Days) | Fixed 26 Days (26 Days) | Reconciliation Status |
| :--- | :---: | :---: | :---: |
| **Base Salary** | ₹8,000.00 | ₹8,000.00 | Exact Match |
| **Scheduled Working Days** | 27 days | 27 days | Exact Match |
| **Payable Days** | 16.5 days | 16.5 days | Exact Match |
| **Deducted Days** | 10.5 days | 10.5 days | Exact Match |
| **Scheduled Days Sum** | $16.5 + 10.5 = 27$ | $16.5 + 10.5 = 27$ | **100% Reconciled** |
| **Daily Rate** | ₹296.30/day | ₹307.69/day | Dynamic vs Fixed |
| **Gross Scheduled Pay** | ₹8,000.00 | ₹8,307.69 | $27 \times ₹307.6923$ |
| **Attendance Deduction** | ₹3,111.11 | ₹3,230.77 | $10.5 \times \text{Rate}$ |
| **Net Payable** | **₹4,888.89** | **₹5,076.92** | $16.5 \times \text{Rate}$ |
| **Total Accounted Sum** | **₹8,000.00** | **₹8,307.69** | **100% Reconciled** |

---

## 4. UI & Export Integration

### 4.1 Payroll Client Page (`components/hr/payroll/PayrollClientPage.tsx`)
1. **Interactive Policy Selector:** HR and Admin users can toggle between `Mon–Sat (Dynamic)` and `Fixed 26` in draft preview mode. Switching policy dynamically recalculates the cycle and persists the authoritative company setting.
2. **Locked Historical Badge:** When a payroll cycle is finalized, the selector transforms into an immutable locked badge (e.g., `Locked Policy: Fixed (26d)` or `Locked Policy: Mon–Sat (27d)`).
3. **Summary Card:** Added a dedicated "Divisor Standard" summary metric showing the active policy, month divisor days, and calculation formula.
4. **Enhanced CSV Export:** The exported report now includes:
   - `Divisor Policy`
   - `Divisor Days`
   - `Daily Rate (₹)`
   - `Scheduled Days`
   - `Payable Days`
   - `Deducted Days`

### 4.2 Detail Modal (`components/hr/payroll/PayrollDetailModal.tsx`)
The Automated Reconciliation Audit section displays:
- Scheduled Working Days Baseline: Scheduled Days, Payable Days, Deducted Days, Divisor Policy, and Divisor Days.
- Financial Baseline Reconciliation: Daily Rate, Gross Payable, Attendance Deductions, Other Deductions, Final Net Salary, and Reconciled Sum.

---

## 5. Verification & Test Execution Results

All automated test suites pass with zero regressions:

### Suite 1: `__tests__/payroll-divisor-policy-reconciliation.test.ts`
- ✓ calculates October 2026 Mon–Sat working days: 31 days - 4 Sundays = 27 days
- ✓ calculates November 2026 Mon–Sat working days: 30 days - 5 Sundays = 25 days
- ✓ calculates December 2026 Mon–Sat working days: 31 days - 4 Sundays = 27 days
- ✓ persists and retrieves divisor policy transitions
- ✓ reconciles exactly under actual_mon_sat policy (27 days divisor) for Omkar (₹4,888.89)
- ✓ reconciles accurately under fixed_26 policy (26 days divisor) for Omkar (₹5,076.92)
- ✓ applies selected divisorMode consistently across all employees

### Suite 2: `__tests__/audit-omkar.test.ts`
- ✓ reconciles Omkar Sawant payroll calculation with dynamic actual_mon_sat divisor (27 days)
- ✓ reconciles Omkar Sawant payroll calculation with fixed_26 divisor (26 days)

### Suite 3: `__tests__/payroll-compoff-production-separation.test.ts`
- 16/16 production separation tests passed.

### Production Build Verification
- `npx tsc --noEmit`: 0 errors.
- `npm run build`: 40/40 routes compiled successfully.

---

## 6. Files Created & Modified

1. `lib/services/payroll-config.service.ts`: Central authoritative divisor configuration service with persistent store and Asia/Kolkata calendar computation.
2. `scratch/payroll_config_store.json`: Persistent company divisor configuration store.
3. `types/payroll.ts`: Extended `PayrollReconciliation` interface with `grossScheduledPay`, `divisorDays`, and `attendanceDeduction`.
4. `lib/services/payroll.service.ts`: Updated calculation engine with full-precision daily rates and accurate earned pay formulas.
5. `lib/actions/payroll.ts`: Added `getPayrollConfigAction` and `updatePayrollConfigAction`, enhanced `getMonthlyPayrollAction` and `finalizeMonthlyPayrollAction`.
6. `components/hr/payroll/PayrollClientPage.tsx`: Added interactive divisor policy controls, summary card, and audit columns in CSV export.
7. `components/hr/payroll/PayrollDetailModal.tsx`: Updated Automated Reconciliation Audit card to display comprehensive baseline metrics.
8. `__tests__/payroll-divisor-policy-reconciliation.test.ts`: Added comprehensive test coverage for dynamic days, policy transitions, and financial reconciliation.
9. `__tests__/audit-omkar.test.ts`: Updated expected net payable under Fixed 26 to ₹5,076.92.

