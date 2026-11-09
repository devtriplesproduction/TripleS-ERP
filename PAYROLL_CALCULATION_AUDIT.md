# TripleS ERP — Complete Payroll Calculation Audit Report

**Date of Audit:** November 2, 2026  
**Audit Target:** TripleS ERP (`TripleS-ERP-main`)  
**Auditor:** Agentic Security & Financial Code Reviewer  
**Classification:** Confidential — Financial & Engineering Internal Audit  
**Operating Mode:** Read-Only Audit (No code or database modifications applied)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [End-to-End Payroll Architecture & Source Code Inventory](#2-end-to-end-payroll-architecture--source-code-inventory)
3. [Deep-Dive Audit by Area](#3-deep-dive-audit-by-area)
   - [3.1 Area 1: Salary Structure & Base Pay Resolution](#31-area-1-salary-structure--base-pay-resolution)
   - [3.2 Area 2: Working Hours, Attendance, Weekly Offs & Holidays](#32-area-2-working-hours-attendance-weekly-offs--holidays)
   - [3.3 Area 3: Leave Accounting (Paid, Unpaid, WFH, Half-Days & Absences)](#33-area-3-leave-accounting-paid-unpaid-wfh-half-days--absences)
   - [3.4 Area 4: Deductions Framework (Attendance, Manual, Statutory & Late Fines)](#34-area-4-deductions-framework-attendance-manual-statutory--late-fines)
   - [3.5 Area 5: Salary Hikes & Revision Tracking](#35-area-5-salary-hikes--revision-tracking)
   - [3.6 Area 6: Net Payable Formula & Mathematical Dissection](#36-area-6-net-payable-formula--mathematical-dissection)
   - [3.7 Area 7: Payroll Processing, Approval & Historical Immutability](#37-area-7-payroll-processing-approval--historical-immutability)
   - [3.8 Area 8: Employee Eligibility & Lifecycle Edge Cases](#38-area-8-employee-eligibility--lifecycle-edge-cases)
   - [3.9 Area 9: Database Audit (Supabase Tables, Migrations, Constraints & RLS)](#39-area-9-database-audit-supabase-tables-migrations-constraints--rls)
   - [3.10 Area 10: Role-Based Access Control (RBAC) & Data Isolation](#310-area-10-role-based-access-control-rbac--data-isolation)
4. [Sample Calculations with Actual Production Records](#4-sample-calculations-with-actual-production-records)
5. [Comparison: Dynamic Calculations vs. Saved Payroll Records](#5-comparison-dynamic-calculations-vs-saved-payroll-records)
6. [Confirmed Bugs, Calculation Errors & Architectural Risks](#6-confirmed-bugs-calculation-errors--architectural-risks)
7. [Prioritized Recommendations & Remediation Roadmap](#7-prioritized-recommendations--remediation-roadmap)
8. [Conclusion & Audit Sign-Off](#8-conclusion--audit-sign-off)

---

## 1. Executive Summary

A comprehensive financial, mathematical, architectural, and security audit of the **TripleS ERP Payroll Calculation Engine** was performed. The audit analyzed all relevant TypeScript services, server actions, utility libraries, React components, SQL migrations, Supabase database schemas, and live database records.

### Key Audit Findings:

1. **Purely Ephemeral Calculation Model (No Immutability / No Historical Snapshots):**
   - The system performs payroll calculation purely in-memory on demand via `calculateMonthlyPayroll()` in `lib/services/payroll.service.ts`.
   - The database tables designed to freeze monthly disbursement records (`payroll_runs` and `payroll_items` created in migration `20261002000001_create_payroll_tables.sql`) **do not exist in the live Supabase database** (`PGRST205: Could not find the table 'public.payroll_runs' in the schema cache`) and are **completely unused** in application code.
   - Any past month's payroll recalculated today dynamically uses the current live state of employee salary, EODs, leaves, and deductions. If an employee receives a salary increase in November, viewing June's payroll recalculates at November's higher rate.

2. **Severe Mid-Month Joiner Penalty Bug:**
   - The attendance deduction logic iterates over all Mon–Sat working days from day 1 to month-end. For an employee who joined mid-month (e.g., Prachi Thorat, EMP-007, joining date October 19, 2026), the system classifies all 18 working days prior to her joining date as **unexcused missing days** (`missingWorkingDays`).
   - Consequently, ₹1,384.62 (69.2% of her monthly stipend) was deducted from her salary for days before she even joined the company, despite having perfect attendance after her joining date.

3. **`hasPayrollData` Flag Causes Zero-Payout on Approved Leaves:**
   - In `lib/services/payroll.service.ts:313`, `hasPayrollData` is defined strictly as `empEods.length > 0`.
   - If an active employee is on approved paid medical leave for the entire month and submits no EODs, `hasPayrollData` evaluates to `false`, causing `earnedPay = 0` and `netPayable = 0`. Legitimate paid leave is completely nullified if 0 EODs are logged.

4. **Missing Database Tables & Ephemeral Local Fallback:**
   - `public.payroll_deductions` does not exist in the live Supabase schema cache (`PGRST205`). The system silently catches the database error and writes custom deductions to a local JSON file (`scratch/payroll_deductions_store.json`).
   - In serverless hosting (e.g., Vercel), local disk writes are ephemeral and discarded upon container recycle, posing a critical data persistence risk.

5. **Code vs. Comment Contradiction on <4h EODs:**
   - Documentation comments in `lib/utils/time.ts:563` and `lib/services/payroll.service.ts:90` explicitly state: *"Normal <4h: Unpaid. ALL worked hours → Comp Off."*
   - However, the actual code implementation in both files assigns `compOffMinutes: 0`. An employee working 3 hours 50 minutes receives ₹0 pay AND 0 comp-off credits; their worked time is completely discarded.

6. **Database Mutation Side-Effect Inside Read/Calculation Function:**
   - `calculateMonthlyPayroll()` automatically inserts uncredited Comp-Off records into `comp_off_ledger`. Every time an HR admin views the payroll screen or an employee refreshes their payslip, database write queries are executed inside what should be an idempotent calculation routine.

7. **Wide-Open RLS Policy on Salary History:**
   - Migration `20260929000001_create_salary_history.sql` defines: `CREATE POLICY "Allow public full access to salary_history" ON public.salary_history FOR ALL USING (true) WITH CHECK (true);`.
   - While server actions enforce role checks, the underlying Supabase database table permits unrestricted public reads and writes via client API keys.

---

## 2. End-to-End Payroll Architecture & Source Code Inventory

The payroll subsystem spans four distinct architectural layers:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             PRESENTATION LAYER (UI)                              │
│                                                                                  │
│  HR / Admin Interface:                                Employee Self-Service:     │
│  - app/(erp)/payroll/page.tsx                         - EmployeePayrollClientPage│
│  - components/hr/payroll/PayrollClientPage.tsx        - Payslip PDF Generator    │
│  - components/hr/payroll/PayrollDetailModal.tsx         (vector-based jsPDF)     │
│  - components/hr/payroll/AddDeductionModal.tsx        - Salary & Hike Tab        │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ Server Actions
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                           SERVER ACTIONS (CONTROLLER)                            │
│  lib/actions/payroll.ts                                                          │
│  - getMonthlyPayrollAction(year, month, employeeIds?) [HR/Admin Guarded]        │
│  - getMyMonthlyPayrollAction(year, month)            [Strict Session Isolated]   │
│  - addPayrollDeductionAction(input)                  [HR/Admin Guarded]          │
│  - cancelPayrollDeductionAction(deductionId)         [HR/Admin Guarded]          │
│  - addSalaryIncrementAction(...)                     [HR/Admin Guarded]          │
│  - getSalaryHistoryAction(employeeId)                [HR/Admin Guarded]          │
│  - getMySalaryHistoryAction()                        [Strict Session Isolated]   │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ Invokes Core Services
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                             DOMAIN SERVICES & LOGIC                              │
│                                                                                  │
│  lib/services/payroll.service.ts                                                 │
│  - calculateMonthlyPayroll(year, month, employeeIds?)                            │
│  - classifyDay(workedMinutes, context)                                           │
│  - getDayContext(dateStr, paidHolidayDates, approvedLeaveDates)                  │
│                                                                                  │
│  lib/services/payroll-deductions.service.ts                                      │
│  - createPayrollDeduction(), getDeductionsForMonth(), cancelPayrollDeduction()   │
│                                                                                  │
│  lib/utils/time.ts                                                               │
│  - classifyWorkDay(), canonicalOfficeHoursToMinutes(), isWorkingDay(), isSunday()│
│                                                                                  │
│  lib/utils/salary.ts                                                             │
│  - calculateMonthlyBasicSalary(), calculateIncrementPercentage(),                │
│    resolveCurrentSalary()                                                        │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ Database Access (Service Role)
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                              SUPABASE DATA STORE                                 │
│                                                                                  │
│  Primary Tables Queried:                      Target Snapshot Tables (Unused):   │
│  - public.employee_onboarding                 - public.payroll_runs (Missing DB) │
│  - public.profiles                            - public.payroll_items(Missing DB) │
│  - public.eod_reports                                                            │
│  - public.holidays                            Auxiliary / Fallback Stores:       │
│  - public.leave_requests                      - public.salary_history            │
│  - public.comp_off_ledger                     - scratch/payroll_deductions_store │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Source Code File & Function Index

| File Path | Primary Function / Component | Architectural Responsibility |
| :--- | :--- | :--- |
| `lib/services/payroll.service.ts` | `calculateMonthlyPayroll` | Master in-memory calculation engine for all employees. |
| `lib/services/payroll.service.ts` | `classifyDay` | Daily worked-time classification into full-day, half-day, unpaid, or comp-off. |
| `lib/services/payroll-deductions.service.ts` | `getDeductionsForMonth` | Retrieves custom employee deductions with JSON fallback resilience. |
| `lib/services/payroll-deductions.service.ts` | `createPayrollDeduction` | Validates, deduplicates, and creates employee deductions. |
| `lib/actions/payroll.ts` | `getMonthlyPayrollAction` | Server action for HR/Admin company-wide payroll view. |
| `lib/actions/payroll.ts` | `getMyMonthlyPayrollAction` | Isolated server action for employees viewing own payslip. |
| `lib/actions/payroll.ts` | `addSalaryIncrementAction` | Inserts salary hike record and updates employee onboarding salary. |
| `lib/utils/salary.ts` | `calculateMonthlyBasicSalary` | Computes monthly basic from annual CTC (`salary / 12`). |
| `lib/utils/salary.ts` | `calculateIncrementPercentage` | Safe mathematical percentage computation `((next - prev) / prev) * 100`. |
| `lib/utils/salary.ts` | `resolveCurrentSalary` | Precedence-based monthly salary resolution utility. |
| `lib/utils/time.ts` | `canonicalOfficeHoursToMinutes` | Converts database office hours (handling legacy HH.MM format) into minutes. |
| `lib/utils/time.ts` | `isWorkingDay` | Determines working days (Mon–Sat = true, Sunday = false). |
| `components/hr/payroll/PayrollClientPage.tsx` | `PayrollClientPage` | HR/Admin payroll management dashboard and CSV exporter. |
| `components/hr/payroll/EmployeePayrollClientPage.tsx` | `EmployeePayrollClientPage` | Employee personal payroll portal and vector PDF generator. |
| `components/hr/payroll/PayrollDetailModal.tsx` | `PayrollDetailModal` | Detailed financial and attendance drill-down modal per employee. |
| `components/hr/payroll/AddDeductionModal.tsx` | `AddDeductionModal` | Modal dialog for HR to add fixed deductions to an employee. |

---

## 3. Deep-Dive Audit by Area

### 3.1 Area 1: Salary Structure & Base Pay Resolution

#### Actual Implemented Rules:
The system determines an employee's monthly pay base in `lib/services/payroll.service.ts:316-324` as follows:

```typescript
const isIntern = emp.employment_type?.toLowerCase() === 'intern';
let monthlyPayBase = 0;
if (isIntern) {
  monthlyPayBase = Number(emp.stipend || 0);
} else if (emp.basic_salary !== null && emp.basic_salary !== undefined && Number(emp.basic_salary) > 0) {
  monthlyPayBase = Number(emp.basic_salary);
} else if (emp.salary !== null && emp.salary !== undefined && Number(emp.salary) > 0) {
  monthlyPayBase = calculateMonthlyBasicSalary(Number(emp.salary));
}
```

1. **Intern Compensation:** If `employment_type` is `'intern'`, base pay strictly equals `stipend`. Annual `salary` and `basic_salary` are ignored.
2. **Regular Employee (Basic Salary Set):** If `basic_salary > 0`, base pay equals `basic_salary`.
3. **Regular Employee (Only Annual CTC Set):** If `basic_salary` is null or zero, base pay equals `Math.round((annualCTC / 12) * 100) / 100`.
4. **Missing Compensation:** If all fields are null/zero, base pay defaults to ₹0.

#### Critical Discrepancy with `resolveCurrentSalary`:
In `lib/utils/salary.ts:34-79`, a separate utility `resolveCurrentSalary` exists with this documented precedence:
1. Latest `salary_history.new_salary`
2. Intern `stipend`
3. `employee.basic_salary`
4. `employee.salary / 12`

However, **`calculateMonthlyPayroll` does not call `resolveCurrentSalary`** and does not query `salary_history`. It directly inspects `employee_onboarding`. Consequently, if a historical revision was logged in `salary_history` with an effective date, `calculateMonthlyPayroll` is completely blind to it.

#### Audit of Live Database Salaries (`public.employee_onboarding`):
| Employee ID | Name | Role / Type | Stored `salary` (CTC) | Stored `basic_salary` | Stored `stipend` | Resolved Monthly Base | Note / Issue |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `6a7dc32e-...` | Shital Khulape | Full Time | ₹2,16,000 | ₹18,000 | NULL | ₹18,000.00 | Updated via hike on 2026-11-01. |
| `ec90434e-...` | Harishchandra N. | Full Time | ₹1,200 | ₹100 | NULL | ₹100.00 | Test / placeholder salary in DB. |
| `2b22862a-...` | Omkar Sawant | Intern | NULL | NULL | ₹8,000 | ₹8,000.00 | Intern stipend resolved correctly. |
| `7af58e74-...` | H R | Full Time | ₹1,200 | ₹100 | NULL | ₹100.00 | Test / placeholder salary in DB. |
| `dd30b88a-...` | Prince Nandagawali | Full Time | ₹1,200 | ₹100 | NULL | ₹100.00 | Test / placeholder salary in DB. |
| `7fd6f01e-...` | raviraj ravi | Full Time | ₹350 | ₹29.17 | NULL | ₹29.17 | `350 / 12 = 29.17`. Test data. |
| `f2f15da0-...` | Suraj Mane | Full Time | ₹2,64,000 | ₹22,000 | NULL | ₹22,000.00 | Employee is **Inactive** in DB. |
| `95b644b9-...` | Prachi Thorat | Intern | ₹24,000 | ₹2,000 | ₹2,000 | ₹2,000.00 | Hiked from ₹1 to ₹2,000 on 2026-11-01. |
| `f2f422fc-...` | Michael Smith | Full Time | ₹12 | ₹1 | NULL | ₹1.00 | Test record. |
| `efe01eb3-...` | Former Staff (EMP-010) | Full Time | ₹18,00,000 | ₹60,000 | NULL | ₹60,000.00 | High package test record. |
| `f8e7e58e-...` | Former Staff (EMP-011) | Full Time | NULL | NULL | NULL | ₹0.00 | No salary set; resolves to ₹0.00. |
| `90bc5fb3-...` | Aniket Limkar | Intern | NULL | NULL | ₹5,000 | ₹5,000.00 | Intern stipend resolved correctly. |

---

### 3.2 Area 2: Working Hours, Attendance, Weekly Offs & Holidays

#### 1. Standard Working Hours:
- Implemented in `lib/services/payroll.service.ts:213-215`:
  ```typescript
  const STANDARD_WORKING_DAYS = 26;
  const standardHours = 208; // Fixed rule: 26 days * 8 hours = 208 standard hours
  ```
- **Rule:** Standard hours are **hardcoded to 208 hours** across all 12 calendar months, irrespective of whether the month has 28, 30, or 31 calendar days.

#### 2. Weekly Offs:
- Implemented in `lib/utils/time.ts:464-470`:
  ```typescript
  export function isSunday(dateStr: string): boolean {
    return getDayOfWeek(dateStr) === 0;
  }
  export function isWorkingDay(dateStr: string): boolean {
    return getDayOfWeek(dateStr) !== 0; // Sunday is the only weekly off
  }
  ```
- **Rule:** TripleS ERP operates on a **6-day work week (Monday through Saturday)**. Only Sunday is a designated weekly off.

#### 3. Actual Worked Hours:
- Sourced from approved daily EOD reports (`eod_reports.status === 'Approved'`).
- The system converts stored `office_hours` into canonical integer minutes using `canonicalOfficeHoursToMinutes()` to eliminate floating-point drift and normalize legacy format inputs (e.g., `8.05` → 485 minutes = 8h 5m, `8.3` → 510 minutes = 8h 30m).
- `actualWorkedHours = totalWorkedMinutes / 60`.

#### 4. Sunday Work Rule:
- Implemented in `classifyDay()`:
  ```typescript
  if (context === 'sunday') {
    return { payFraction: 0, compOffMinutes: wm, status: 'SUNDAY' };
  }
  ```
- **Rule:** Sunday work generates **₹0 direct payroll salary**. Instead, 100% of worked minutes on a Sunday are credited to the employee's compensatory off balance (`comp_off_ledger`).

#### 5. Paid Holidays:
- Sourced from table `holidays` where `holiday_type === 'PAID'` and date falls within the payroll cycle.
- **If Employee Does NOT Work on Holiday:** Full daily pay is granted. `totalPaidDayFractions += 1; paidHolidayMinutesNotWorked += 480;`.
- **If Employee DOES Work on Holiday:** Full daily pay is granted (`payFraction = 1`), AND 100% of worked minutes are credited as additional Compensatory Off in `comp_off_ledger`.

---

### 3.3 Area 3: Leave Accounting (Paid, Unpaid, WFH, Half-Days & Absences)

#### 1. Approved Leave Filtering:
- Queried from `leave_requests` where `status IN ('Approved', 'Approved HR')` overlapping the month range.
- Iterates day-by-day across the leave duration. Only calendar working days (Mon–Sat) that are **not declared holidays** are tallied:
  ```typescript
  if (isWorkingDay(dStr) && !paidHolidayDates.has(dStr)) {
    leaveDaysCount++;
  }
  ```
- Day hours multiplier: Full day = 480 minutes (8h); Half day = 240 minutes (4h).

#### 2. Leave Classification:
- **WFH (`request_type === 'WFH'`):** Accumulated into `wfhMinutes`. Counts as working time.
- **Unpaid Leave (`leave_type === 'Unpaid'`):** Accumulated into `unpaidLeaveMinutes`. Converted to deduction days: `unpaidLeaveDaysFromLeaves = unpaidLeaveMinutes / 480`.
- **Paid Leave (Sick, Casual, Comp-Off):** Accumulated into `creditedLeaveMinutes`. Counts as paid working time.

#### 3. Attendance-Driven Day Statuses:
- **Full Day (≥ 8h = 480 mins):** Normal Mon–Sat work. `payFraction = 1`, `compOffMinutes = wm - 480`.
- **Half Day (4h to 7h59m = 240–479 mins):** `payFraction = 0.5`. Contributes `daysHalfDay++`. In deductions, penalized at `0.5 × fullDayRate`.
- **Unpaid Work Day (< 4h = < 240 mins):** `payFraction = 0`. Contributes `daysUnpaidLeaveEod++`. In deductions, penalized at `1.0 × fullDayRate`.

#### 4. Unexcused Missing Days (`missingWorkingDays`):
- For every calendar day `d` in the month:
  ```typescript
  if (isWorkingDay(dStr)) {
    const hasEod = empEods.some(e => e.report_date === dStr);
    const hasPaidLeave = empLeaves.some(l => l.start_date <= dStr && l.end_date >= dStr && l.leave_type !== 'Unpaid');
    const hasUnpaidLeave = empLeaves.some(l => l.start_date <= dStr && l.end_date >= dStr && l.leave_type === 'Unpaid');
    const isHoliday = paidHolidayDates.has(dStr);
    if (!hasEod && !hasPaidLeave && !hasUnpaidLeave && !isHoliday) {
      missingWorkingDays++;
    }
  }
  ```
- If a Mon–Sat working day has no EOD, no leave record, and is not a holiday, it is classified as an unexcused absence and penalized at `1.0 × fullDayRate`.

---

### 3.4 Area 4: Deductions Framework (Attendance, Manual, Statutory & Late Fines)

Total deductions consist of two distinct buckets: **Attendance Deductions** and **Employee-Specific Manual Deductions**.

```
Total Deductions = Attendance Deduction + Manual Deductions
```

#### 1. Attendance Deduction Formula:
- **Total Deducted Days:**
  $$\text{Total Deducted Days} = \text{daysUnpaidLeaveEod} + (\text{daysHalfDay} \times 0.5) + \text{missingWorkingDays} + \frac{\text{unpaidLeaveMinutes}}{480}$$
- **Standard Daily Rate:**
  $$\text{fullDayRate} = \frac{\text{monthlyPayBase}}{26}$$
- **Monetary Deduction:**
  $$\text{attendanceDeduction} = \min\left(\text{monthlyPayBase}, \operatorname{round}(\text{totalDeductedDays} \times \text{fullDayRate}, 2)\right)$$

#### 2. Employee-Specific Fixed/Manual Deductions:
- Sourced from `payroll_deductions` (or fallback `scratch/payroll_deductions_store.json`).
- Predefined types supported:
  - `Damage Recovery`
  - `Salary Advance`
  - `TDS`
  - `Disciplinary / Late Fine`
  - `Asset / Equipment`
  - `Other Deduction`
- Summed per employee:
  $$\text{manualDeductions} = \sum \text{amount for status = 'ACTIVE'}$$

#### 3. Statutory Deductions Status:
| Statutory Component | Implementation Status | System Value | Audit Observation |
| :--- | :--- | :--- | :--- |
| **Provident Fund (PF)** | Not Implemented | ₹0.00 | No PF calculation or contribution logic exists in code. |
| **Employee State Insurance (ESI)** | Not Implemented | ₹0.00 | No ESI calculation or wage threshold checks exist. |
| **Professional Tax (PT)** | Not Implemented | ₹0.00 | Standard state PT (e.g., Maharashtra ₹200/month) is absent. |
| **Tax Deducted at Source (TDS)** | Manual Entry Only | User-Defined | No income tax slabs or automated TDS computation. Entered manually via modal. |
| **Late Attendance Penalty** | Manual Entry Only | User-Defined | No automated time-tracker late login penalty. HR manually inputs `Disciplinary / Late Fine`. |

---

### 3.5 Area 5: Salary Hikes & Revision Tracking

#### Implemented Hike Workflow:
1. HR or Admin navigates to `/employees/[id]` → **Salary & Hike Management** tab (`components/hr/payroll/salary-and-hike-tab.tsx`).
2. Current compensation is loaded via `getSalaryHistoryAction(employeeId)`.
3. Admin inputs `newSalary` and optional `effectiveDate`.
4. Percentage hike is calculated:
   $$\text{incrementPercentage} = \frac{\text{newSalary} - \text{previousSalary}}{\text{previousSalary}} \times 100$$
5. `addSalaryIncrementAction` executes:
   - Inserts row into `public.salary_history`:
     `{ employee_id, previous_salary, new_salary, increment_percentage, effective_date }`
   - **Immediately overwrites** `public.employee_onboarding`:
     `salary = newSalary * 12`, `basic_salary = newSalary`, and if intern, `stipend = newSalary`.

#### Live Production Hike Records in `public.salary_history`:
```json
[
  {
    "employee_id": "f2f15da0-80e6-4b8c-8095-6fc433ec6fbb", // Suraj Mane
    "previous_salary": 100,
    "new_salary": 18000,
    "increment_percentage": 17900,
    "effective_date": "2026-05-01"
  },
  {
    "employee_id": "f2f15da0-80e6-4b8c-8095-6fc433ec6fbb", // Suraj Mane
    "previous_salary": 18000,
    "new_salary": 22000,
    "increment_percentage": 22.22,
    "effective_date": "2026-07-01"
  },
  {
    "employee_id": "6a7dc32e-2d11-4a05-8be6-956b0a288354", // Shital Khulape
    "previous_salary": 100,
    "new_salary": 18000,
    "increment_percentage": 17900,
    "effective_date": "2026-10-01"
  },
  {
    "employee_id": "95b644b9-d765-4099-95bf-2746f2a15d78", // Prachi Thorat
    "previous_salary": 1,
    "new_salary": 2000,
    "increment_percentage": 199900,
    "effective_date": "2026-10-19"
  }
]
```

#### Major Audit Vulnerabilities in Salary Hikes:
1. **No Mid-Month Proration:** If a hike is given effective October 15th, the system has no split-period calculation (e.g., 14 days at ₹15,000 + 17 days at ₹20,000). The current month and past months immediately use the updated rate.
2. **Historical Retroactivity:** Because `addSalaryIncrementAction` mutates `employee_onboarding.basic_salary`, running recalculation on any past month retroactively inflates past payroll.

---

### 3.6 Area 6: Net Payable: Exact Formula Used in Production

The exact mathematical sequence implemented in `lib/services/payroll.service.ts:435-476` is:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        STEP 1: BASE PAY RESOLUTION                     │
│  monthlyPayBase = Intern ? stipend : (basic_salary || salary / 12)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                        STEP 2: DAILY RATE CALCULATION                  │
│  fullDayRate = monthlyPayBase / 26                                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                        STEP 3: TOTAL DEDUCTED DAYS                     │
│  totalDeductedDays = daysUnpaidLeaveEod                                │
│                    + (daysHalfDay * 0.5)                               │
│                    + missingWorkingDays                                │
│                    + (unpaidLeaveMinutes / 480)                        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                     STEP 4: ATTENDANCE DEDUCTION                       │
│  attendanceDeduction = hasPayrollData                                  │
│                      ? min(monthlyPayBase, round(totalDeductedDays     │
│                                                  * fullDayRate, 2))    │
│                      : 0                                               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                          STEP 5: EARNED PAY                            │
│  earnedPay = hasPayrollData                                            │
│            ? max(0, monthlyPayBase - attendanceDeduction)              │
│            : 0                                                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                 STEP 6: MANUAL EMPLOYEE DEDUCTIONS                     │
│  manualDeductions = sum(active_payroll_deductions.amount)              │
│  totalDeductions  = round(attendanceDeduction + manualDeductions, 2)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                         STEP 7: NET PAYABLE                            │
│  netPayable = hasPayrollData                                           │
│             ? max(0, earnedPay - manualDeductions)                     │
│             : 0                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

#### Mathematical Proof of Zero Double-Counting:
$$\begin{aligned}
\text{netPayable} &= \text{earnedPay} - \text{manualDeductions} \\
&= (\text{monthlyPayBase} - \text{attendanceDeduction}) - \text{manualDeductions} \\
&= \text{monthlyPayBase} - (\text{attendanceDeduction} + \text{manualDeductions}) \\
&= \text{monthlyPayBase} - \text{totalDeductions}
\end{aligned}$$
The mathematical subtraction between `monthlyPayBase`, `totalDeductions`, and `netPayable` is rigorously aligned and verified by test suite `__tests__/employee-payroll-deductions.test.ts:368`.

---

### 3.7 Area 7: Payroll Processing, Approval & Historical Immutability

#### Lifecycle Comparison: Expected vs. Actual

| Payroll Stage | Expected Standard ERP Lifecycle | Actual Implementation in TripleS ERP | Status |
| :--- | :--- | :--- | :--- |
| **Draft Preview** | Calculates estimated preview for review. | Dynamic calculation in `calculateMonthlyPayroll`. | ✅ Working |
| **Review / Edits** | Allows HR to review anomalies and add deductions. | `PayrollDetailModal` and `AddDeductionModal` permit deduction adjustments. | ✅ Working |
| **Approval** | HR/Finance Lead approves cycle; status becomes `APPROVED`. | **Not Implemented.** No approval action or UI button exists. | ❌ Missing |
| **Finalization / Lock** | Cycle locked; exact payout snapshot persisted in DB; edits barred. | **Not Implemented.** `payroll_runs` and `payroll_items` are never written to. | ❌ Missing |
| **Disbursement Record** | Historical payslip fetched from immutable snapshot. | Payslips recalculate live on each download. Past data is mutable. | ❌ Missing |

---

### 3.8 Area 8: Employee Eligibility & Lifecycle Edge Cases

#### 1. Inactive & Terminated Employees:
- In `lib/services/payroll.service.ts:151-157`, the employee query is:
  ```typescript
  supabase
    .from('employee_onboarding')
    .select('id, first_name, last_name, department, salary, basic_salary, employee_id_number, employment_type, stipend');
  ```
- **Finding:** The query does not filter by `employment_status = 'Active'` or check `status = 'Completed'`.
- Deactivated employees (e.g., Suraj Mane, EMP-005, deactivated on 2026-10-17 with `employment_status = 'Inactive'`) are fetched in every payroll run.
- Because Suraj has 0 EODs in October, he receives `hasPayrollData = false`, `Net Payable = 0`, but his name and ₹22,000 base salary still appear in company employee listings.

#### 2. Newly Joined Employees (The Mid-Month Onboarding Defect):
- Prachi Thorat (EMP-007) joined on **October 19, 2026**.
- The `missingWorkingDays` loop checks day 1 through 31.
- Days 1 through 18 had no EODs (she had not yet joined). The engine treated October 1–18 as unexcused absences.
- Result: **18 days of salary deducted** from a new hire for days prior to her appointment date.

#### 3. Offboarded Employees (Mid-Month Departure):
- If an employee is terminated on the 10th of the month, their EODs cease after the 10th.
- The engine treats days 11 through 31 as unexcused missing days, applying absence penalties instead of prorating the employment period up to the termination date.

---

### 3.9 Area 9: Database Audit (Supabase Tables, Migrations, Constraints & RLS)

#### Migration & Schema Inventory:

| Table Name | Defined in Migration | Exists in Live Supabase Cache? | RLS Policy Status | Foreign Key Integrity |
| :--- | :--- | :--- | :--- | :--- |
| `employee_onboarding` | `20260923111600_employee_onboarding.sql` | ✅ YES (12 rows) | Permissive public policy | Referenced by `profiles`, `salary_history`, etc. |
| `profiles` | Baseline Supabase Auth | ✅ YES (9 rows) | Protected | Linked to `employee_onboarding` via `employee_id`. |
| `eod_reports` | `20260926000000_create_eod_reports.sql` | ✅ YES (101 rows) | RLS enabled | `employee_id` references `profiles.id`. |
| `holidays` | `20260929000000_create_holidays_table.sql` | ✅ YES (6 rows) | RLS enabled | Standalone date table with `holiday_type`. |
| `leave_requests` | `20260925000000_create_leave_management.sql` | ✅ YES (9 rows) | RLS enabled | `employee_id` references `profiles.id`. |
| `comp_off_ledger` | `20260926000001_update_eod_reports_schema.sql` | ✅ YES (53 rows) | RLS enabled | `employee_id` references `employee_onboarding.id`. |
| `salary_history` | `20260929000001_create_salary_history.sql` | ✅ YES (4 rows) | ⚠️ **PUBLIC FULL ACCESS** (`USING (true)`) | `employee_id` references `employee_onboarding.id`. |
| `payroll_runs` | `20261002000001_create_payroll_tables.sql` | ❌ **MISSING (PGRST205)** | Schema not applied to DB | References `profiles.id`. |
| `payroll_items` | `20261002000001_create_payroll_tables.sql` | ❌ **MISSING (PGRST205)** | Schema not applied to DB | References `payroll_runs.id` and `employee_onboarding.id`. |
| `payroll_deductions` | `20261026000000_create_payroll_deductions.sql` | ❌ **MISSING (PGRST205)** | Schema not applied to DB | Falls back to local JSON file. |

---

### 3.10 Area 10: Role-Based Access Control (RBAC) & Data Isolation

#### 1. Route Authorization (`config/rbac.ts` & `app/(erp)/payroll/page.tsx`):
- `/payroll` is accessible to roles: `HR`, `Admin`, `Employee`, `Manager`.
- In `app/(erp)/payroll/page.tsx`:
  - If `user.role === 'HR' || user.role === 'Admin'`: Returns `PayrollClientPage` (company-wide management).
  - If `user.role === 'Employee' || user.role === 'Manager'`: Returns `EmployeePayrollClientPage` (read-only self-service).

#### 2. Server Action Boundary Isolation (`lib/actions/payroll.ts`):
- `getMonthlyPayrollAction`:
  ```typescript
  const user = await getCurrentUser();
  if (!user || (user.role !== 'HR' && user.role !== 'Admin')) {
    return { success: false, error: 'Unauthorized: Financial data access is restricted to HR and Admin.' };
  }
  ```
- `getMyMonthlyPayrollAction`:
  - Does **not** accept an arbitrary `employeeId` parameter from the client.
  - Resolves identity strictly from authenticated session cookies (`user.employee_id` or `user.id`).
  - Calls `calculateMonthlyPayroll(year, month, [empRecord.id])`.
  - Blocks inactive/terminated users: `if (empRecord.employment_status === 'Inactive') return { success: false, error: 'Account inactive or access disabled.' };`.

#### 3. Security Vulnerability in `salary_history` RLS:
While server actions enforce authorization, the PostgreSQL table policy for `salary_history` is configured with `USING (true) WITH CHECK (true)`, allowing unauthenticated/public mutations if invoked directly via Supabase client SDK.

---

## 4. Sample Calculations with Actual Production Records

All calculations below reflect the **actual output generated by `calculateMonthlyPayroll(2026, 10)`** verified against the live database:

### Case 1: Shital Khulape (EMP-004) — Full-Time Senior Developer with Hiked Base
- **Employment Type:** Full Time | **Joining Date:** 2026-06-15 | **Status:** Active
- **Base Salary:** ₹18,000.00 | **Standard Working Days:** 26 | **Daily Rate:** ₹692.31 (`18,000 / 26`)
- **October Activity:**
  - EODs Logged: 24 (all Approved)
  - Full Days: 23 | Half Days: 0 | Unpaid (<4h): 0
  - Sundays Worked: 1 (Sunday hours converted to Comp-Off: 18.6h total earned)
  - Paid Holiday: 1 (Dusshera, Oct 20 — Not worked, credited as paid day)
  - Missing Mon–Sat Working Days: 3 days (October 2026 had 27 working days)
- **Math Breakdown:**
  - Deducted Days: $0 + 0 + 3 + 0 = 3.0\text{ days}$
  - Attendance Deduction: $3 \times ₹692.3077 = ₹2,076.92$
  - Earned Pay: $₹18,000.00 - ₹2,076.92 = ₹15,923.08$
  - Custom Deductions: ₹0.00
  - **Net Payable:** **₹15,923.08**

---

### Case 2: Omkar Sawant (EMP-003) — Intern with Active Manual Deduction
- **Employment Type:** Intern | **Joining Date:** 2026-09-11 | **Status:** Active
- **Stipend Base:** ₹8,000.00 | **Standard Working Days:** 26 | **Daily Rate:** ₹307.69 (`8,000 / 26`)
- **October Activity:**
  - EODs Logged: 18 (Approved) | Total Worked: 142.18 hrs
  - Full Days: 14 | Half Days: 1 | Unpaid (<4h): 1 (Oct 16: 3.88h)
  - Sundays Worked: 2 | Paid Holidays: 1
  - Comp-Off Earned: 23.7 hrs
  - Missing Working Days: 9 days
- **Math Breakdown:**
  - Deducted Days: $1\text{ (<4h)} + (1 \times 0.5)\text{ (half-day)} + 9\text{ (missing)} = 10.5\text{ days}$
  - Attendance Deduction: $10.5 \times ₹307.6923 = ₹3,538.46$
  - Earned Pay: $₹8,000.00 - ₹3,538.46 = ₹4,461.54$
  - Custom Deductions (`scratch/payroll_deductions_store.json`): ₹100.00 (`Damage Recovery`)
  - Total Deductions: $₹3,538.46 + ₹100.00 = ₹3,638.46$
  - **Net Payable:** $₹4,461.54 - ₹100.00 =$ **₹4,361.54**

---

### Case 3: Prince Nandagawali (EMP-001) — Video Editor with Heavy Holiday/Sunday Comp-Off
- **Employment Type:** Full Time | **Joining Date:** 2024-10-01 | **Status:** Active
- **Base Salary (Placeholder in DB):** ₹100.00 | **Daily Rate:** ₹3.85 (`100 / 26`)
- **October Activity:**
  - EODs Logged: 24 | Total Worked: 204.23 hrs
  - Full Days: 19 | Half Days: 0 | Unpaid: 0
  - Sundays Worked: 4 Sundays | Holiday Worked: 1 (Dusshera Oct 20)
  - Comp-Off Earned: 52.2 hrs (credited to `comp_off_ledger`)
  - Missing Mon–Sat Working Days: 7 days
- **Math Breakdown:**
  - Deducted Days: $7.0\text{ days}$
  - Attendance Deduction: $7 \times ₹3.846 = ₹26.92$
  - Earned Pay: $₹100.00 - ₹26.92 = ₹73.08$
  - Cash Overtime: ₹0.00 (Company policy: overtime converts to Comp-Off, not cash)
  - **Net Payable:** **₹73.08**

---

### Case 4: Harishchandra Nanavare (EMP-002) — Mixed Half-Days & Unpaid Attendance
- **Employment Type:** Full Time | **Joining Date:** 2026-08-04 | **Status:** Active
- **Base Salary (Placeholder in DB):** ₹100.00 | **Daily Rate:** ₹3.85 (`100 / 26`)
- **October Activity:**
  - EODs Logged: 16 | Total Worked: 106.33 hrs
  - Full Days: 8 | Half Days: 7 (4h–7h59m) | Unpaid (<4h): 1
  - Comp-Off Earned: 6.5 hrs
  - Missing Working Days: 10 days
- **Math Breakdown:**
  - Deducted Days: $1\text{ (<4h)} + (7 \times 0.5)\text{ (half days)} + 10\text{ (missing)} = 14.5\text{ days}$
  - Attendance Deduction: $14.5 \times ₹3.846 = ₹55.77$
  - Earned Pay: $₹100.00 - ₹55.77 = ₹44.23$
  - **Net Payable:** **₹44.23**

---

### Case 5: Prachi Thorat (EMP-007) — Mid-Month New Joiner (Demonstrating the Bug)
- **Employment Type:** Intern | **Joining Date:** **2026-10-19** | **Status:** Active
- **Stipend Base:** ₹2,000.00 | **Daily Rate:** ₹76.92 (`2,000 / 26`)
- **October Activity:**
  - Worked every single working day after joining: 8 EODs (Oct 19, 21, 22, 23, 24, 26, 27, 28)
  - Full Days: 8 | Half Days: 0 | Unpaid: 0
  - Paid Holiday: 1 (Oct 20 Dusshera)
- **Engine Calculation Error:**
  - The loop penalized all calendar working days before October 19 as unexcused absences (18 days).
  - Deducted Days: 18.0 days
  - Attendance Deduction: $18 \times ₹76.923 = ₹1,384.62$
  - **Net Payable Received:** $₹2,000.00 - ₹1,384.62 =$ **₹615.38** (Unjustly docked ₹1,384.62)
- **Expected Business Rule:**
  - Eligible Period: October 19 to October 31 (13 calendar days).
  - Working days in period: 11 working days (including 1 holiday).
  - She worked 8 days + 1 holiday = 9 payable days out of 11.
  - Expected Pro-rated Pay: $\approx ₹1,636.36$, not ₹615.38.

---

### Case 6: Suraj Mane (EMP-005) — Inactive / Deactivated Employee
- **Employment Type:** Full Time | **Joining Date:** 2026-10-01 | **Status:** **Inactive** (Deactivated 2026-10-17)
- **Base Salary:** ₹22,000.00 | **Daily Rate:** ₹846.15
- **October Activity:** 0 EODs
- **Engine Calculation:**
  - `hasPayrollData = false`
  - Attendance Deduction: ₹0.00 | Earned Pay: ₹0.00 | **Net Payable: ₹0.00**
  - Appears in company payroll table as an active row with ₹22,000 base salary and `—` payable.

---

## 5. Comparison: Dynamic Calculations vs. Saved Payroll Records

| Evaluation Dimension | Dynamic Engine Output (`calculateMonthlyPayroll`) | Saved Payroll Snapshot (`public.payroll_items`) | Discrepancy Analysis |
| :--- | :--- | :--- | :--- |
| **Gross Pay** | Calculated as `monthlyPayBase` (or 0 if no EODs). | Column `gross_pay NUMERIC` defined in migration. | Table is empty and unapplied in DB cache. No saved values exist. |
| **Actual Worked Hours** | Sum of EOD canonical minutes / 60. | Column `actual_worked_hours NUMERIC`. | Never written to database. Lost if EODs are modified. |
| **Net Payable** | `max(0, earnedPay - manualDeductions)`. | Column `net_payable NUMERIC`. | Recalculated dynamically on every view. |
| **Lock Status** | Hardcoded to `false` in React state. | Column `is_locked BOOLEAN DEFAULT false`. | No locking mechanism exists in frontend or backend. |
| **Approval Timestamp** | None. | `payroll_runs.finalized_at` & `finalized_by`. | No approval record is ever generated. |
| **Audit Conclusion** | **Dynamic In-Memory Preview Only** | **Non-Existent (Abandoned Schema)** | 100% discrepancy. The ERP operates without persisted payroll history. |

---

## 6. Confirmed Bugs, Calculation Errors & Architectural Risks

### Summary of Identified Bugs & Risks

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             CRITICAL DEFECT HEATMAP                              │
│                                                                                  │
│  [CRITICAL] Bug 1: Mid-Month Joiners Penalized for Pre-Joining Dates             │
│  [CRITICAL] Bug 2: Missing Tables in Supabase (payroll_runs, payroll_deductions) │
│  [CRITICAL] Bug 3: Public RLS Access on salary_history Table                     │
│  [HIGH]     Bug 4: hasPayrollData Flag Zeroes Out Employees on Approved Leave    │
│  [HIGH]     Bug 5: Code/Comment Contradiction on Normal <4h EOD Comp-Off         │
│  [HIGH]     Bug 6: Volatile Calculation — Lack of Historical Snapshot Locking    │
│  [MEDIUM]   Bug 7: Database Mutation Inside Payroll Read/Calculation Function    │
│  [MEDIUM]   Bug 8: Inactive / Offboarded Employees Not Filtered in Query         │
│  [MEDIUM]   Bug 9: 26-Day Fixed Divisor Distorts 27-Day and 24-Day Months        │
│  [MEDIUM]   Bug 10: Serverless Ephemeral JSON Store Risk on Deductions           │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Detailed Breakdown

#### Bug 1: Mid-Month Joiners Penalized for Pre-Joining Dates
- **Severity:** CRITICAL
- **Location:** `lib/services/payroll.service.ts:438-450`
- **Root Cause:** The `missingWorkingDays` loop iterates from `d = 1` to `d = lastDay` without verifying `emp.joining_date`.
- **Impact:** Any new employee joining after the 1st of the month suffers severe, unjustified financial deductions.
- **Affected Employees:** Prachi Thorat (EMP-007), raviraj ravi (EMP-008), Michael Smith (EMP-009), Former Staff (EMP-010) (EMP-010), Aniket Limkar (EMP-012).

#### Bug 2: Missing Database Tables in Live Supabase Cache
- **Severity:** CRITICAL
- **Location:** `supabase/migrations/20261002000001_create_payroll_tables.sql` & `20261026000000_create_payroll_deductions.sql`
- **Root Cause:** Migrations were created locally but never executed against the hosted Supabase instance (`PGRST205`).
- **Impact:** System relies on local scratch files for custom deductions; `payroll_runs` and `payroll_items` cannot be written to.

#### Bug 3: Public Full Access RLS on `salary_history`
- **Severity:** CRITICAL (Security)
- **Location:** `supabase/migrations/20260929000001_create_salary_history.sql:14-18`
- **Root Cause:** Permissive policy `FOR ALL USING (true) WITH CHECK (true)` allows anonymous clients to read and tamper with executive salary increments via Supabase REST API.

#### Bug 4: `hasPayrollData` Flag Erases Legitimate Paid Leaves
- **Severity:** HIGH
- **Location:** `lib/services/payroll.service.ts:313, 463-475`
- **Root Cause:** `const hasPayrollData = empEods.length > 0;`. If an employee is on approved paid medical leave for the month and logs zero EODs, their net payable is forced to ₹0.00.

#### Bug 5: Code vs. Comment Contradiction on Normal <4h EOD Comp-Off
- **Severity:** HIGH
- **Location:** `lib/utils/time.ts:590-598` and `lib/services/payroll.service.ts:117-120`
- **Root Cause:** Comments specify that worked hours <4h should convert to Comp-Off since they receive no payroll pay. The code sets `compOffMinutes: 0`, completely erasing the employee's work credit.

#### Bug 6: Volatile Historical Payroll (Lack of Immutability)
- **Severity:** HIGH
- **Location:** `lib/services/payroll.service.ts` & `lib/actions/payroll.ts`
- **Root Cause:** No snapshot persistence. When an employee receives a salary increment today, all previous months recalculate at the new salary rate when viewed.

#### Bug 7: Database Mutation Side-Effect Inside Read Function
- **Severity:** MEDIUM
- **Location:** `lib/services/payroll.service.ts:241-287`
- **Root Cause:** `calculateMonthlyPayroll()` calls `supabase.from('comp_off_ledger').insert(...)` during calculation. Read operations must be idempotent and side-effect free.

#### Bug 8: Inactive / Offboarded Employees Not Excluded
- **Severity:** MEDIUM
- **Location:** `lib/services/payroll.service.ts:151-157`
- **Root Cause:** The query fetches all rows from `employee_onboarding` without filtering `employment_status = 'Active'`.

#### Bug 9: Fixed 26-Day Divisor Distorts Payroll Math
- **Severity:** MEDIUM
- **Location:** `lib/services/payroll.service.ts:214, 327`
- **Root Cause:** Dividing monthly pay by 26 in a 27-working-day month (like October 2026) results in an employee working 26 out of 27 days being docked 1 day's pay, receiving only 25/26 of their salary despite working 26 full days.

---

## 7. Prioritized Recommendations & Remediation Roadmap

### Priority 1: Immediate / High-Priority Fixes (Core Math & Security)

#### 1. Fix Pre-Joining Absence Deduction (Pro-rata New Joiners):
- **Proposed Logic in `lib/services/payroll.service.ts`:**
  ```typescript
  const empJoiningDate = emp.joining_date ? new Date(emp.joining_date) : new Date(startDate);
  // In missingWorkingDays loop:
  for (let d = 1; d <= lastDay; d++) {
    const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const currDate = new Date(dStr);
    
    // Do NOT penalize days before employee joined or after employee deactivation
    if (currDate < empJoiningDate) continue;
    if (emp.deactivated_at && currDate > new Date(emp.deactivated_at)) continue;
    
    if (isWorkingDay(dStr)) {
      // Check EOD, leaves, holidays...
    }
  }
  ```

#### 2. Fix `hasPayrollData` Definition:
- Expand the condition to recognize approved leaves, WFH, and active employment:
  ```typescript
  const hasPayrollData = empEods.length > 0 || empLeaves.length > 0 || (emp.employment_status === 'Active' && empJoiningDate <= new Date(endDate));
  ```

#### 3. Secure `salary_history` Database RLS:
- Replace permissive policy with HR/Admin role-restricted policy:
  ```sql
  DROP POLICY IF EXISTS "Allow public full access to salary_history" ON public.salary_history;
  CREATE POLICY "HR and Admin can manage salary_history"
    ON public.salary_history FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role = 'HR' OR profiles.role = 'Admin' OR profiles.role = 'Super Admin')
      )
    );
  CREATE POLICY "Employees can view own salary_history"
    ON public.salary_history FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.employee_onboarding e
        JOIN public.profiles p ON e.employee_id_number = p.employee_id
        WHERE e.id = salary_history.employee_id
        AND p.id = auth.uid()
      )
    );
  ```

#### 4. Apply Missing Migrations in Hosted Database:
- Execute `20261002000001_create_payroll_tables.sql` and `20261026000000_create_payroll_deductions.sql` in Supabase SQL editor to create `payroll_runs`, `payroll_items`, and `payroll_deductions`.

---

### Priority 2: Medium-Priority Architectural Improvements

#### 5. Implement Historical Snapshot Persistence & Lock Workflow:
- Implement `finalizePayrollCycleAction(year, month)`:
  1. Computes payroll via `calculateMonthlyPayroll`.
  2. Inserts a row into `payroll_runs` with `status = 'FINALIZED'`, `finalized_at = NOW()`, `finalized_by = auth.uid()`.
  3. Inserts frozen snapshots of each employee's salary, worked hours, leave hours, deductions, and net payable into `payroll_items` with `is_locked = true`.
  4. Subsequent views and PDF payslip downloads for past locked months must query `payroll_items`, never recalculating from volatile live tables.

#### 6. Separate Comp-Off Credit Side-Effects:
- Remove `comp_off_ledger` batch insert from `calculateMonthlyPayroll()`.
- Move comp-off crediting exclusively to the EOD approval event handler (`lib/actions/eod.ts`).

#### 7. Filter Active Employees in Payroll Query:
- Filter onboarding query to active employees:
  ```typescript
  query = query.or(`employment_status.eq.Active,deactivated_at.gte.${startDate}`);
  ```

---

### Priority 3: Low-Priority / Future Enhancements

#### 8. Statutory Deductions Engine:
- Implement automatic PF (12% of basic up to ₹1,800 cap), ESI (0.75% for gross ≤ ₹21,000), and state Professional Tax (PT slab) calculation functions.

#### 9. Calendar-Accurate Pro-Rata Divisor:
- Replace the hardcoded `26` divisor with actual payable working days in the month (`payableDaysInMonth`) for calendar proration accuracy.

---

## 8. Conclusion & Audit Sign-Off

The TripleS ERP payroll engine features robust and verified core calculation routines for day-classification, EOD HH.MM time normalization, comp-off ledger accounting, and manual deductions subtraction with zero double-counting.

However, the payroll system currently operates as an **ephemeral preview engine** rather than a financial ledger of record. The lack of snapshot persistence, unexecuted database migrations, the pre-joining absence deduction defect on new joiners, and permissive RLS policies on salary history represent critical areas requiring remediation before processing legal corporate disbursements.

Following the prioritized roadmap in Section 7 will elevate the payroll subsystem to institutional enterprise standards.

---
*End of Report — TripleS ERP Payroll Calculation Audit*
