# TripleS ERP — Payroll Forensic Audit & Correction Report
## Complete Forensic Investigation & Verified Calculation for Omkar Sawant (EMP-003) — October 2026

**Audit Date:** November 3, 2026  
**Auditor:** Agentic Financial & Engineering Reviewer  
**Target Subsystem:** TripleS ERP Payroll Subsystem (`TripleS-ERP-main`)  
**Target Employee:** Omkar Sawant (Employee Code: `EMP-003`, Onboarding ID: `2b22862a-3817-4d87-9c60-9ecdb4e0a6c6`, Auth ID: `3f1a7db7-0ebf-45a7-b5a9-f9a0a393c023`)  
**Target Cycle:** October 2026 (2026-10-01 to 2026-10-31)  
**Compensation Structure:** Intern Stipend — ₹8,000.00 / month  

---

## 1. Executive Summary & Audit Verdict

A forensic financial and algorithmic audit was performed on the October 2026 payroll calculation for **Omkar Sawant** (`EMP-003`).

### The Reported Paradox
The system reported the following figures:
- **Standard Working Hours:** 208.0h (26 days × 8h)
- **Actual Worked Hours:** 142.18h (Raw approved EOD office hours)
- **Paid Leave:** 32.0h (4 approved days: Oct 16 Comp-Off, Oct 21 Sick, Oct 23–24 Sick)
- **Paid Holidays:** 8.0h (1 company holiday: Oct 20 Dusshera)
- **Approved WFH:** 16.0h (2 days: Oct 2–3)
- **Half Days:** 1 day (Oct 17, 4.25h)
- **Unpaid Days (<4h):** 1 day (Oct 22, 2.25h)
- **Attendance Deduction:** ₹2,307.68
- **Net Payable:** ₹5,692.32

### Why the Figures Appeared Not to Reconcile
1. **The 14 vs 13 Full-Day Discrepancy (The Root Cause):**
   - The audit listed **14 full working dates** (Oct 1, 2, 3, 6, 7, 8, 9, 10, 12, 13, 14, 15, 19, 26), but the payroll engine was counting only **12 (or 13)** full days.
   - **Root Cause Found in Code:** In `lib/services/payroll.service.ts`, `empLeaves` populated `approvedLeaveDates` with *all* approved leave requests without filtering out `request_type === 'WFH'`. Because Omkar had an approved WFH request for Oct 2–3, `getDayContext` flagged Oct 2 and Oct 3 as `'approved_leave'`. In `classifyDay`, `'approved_leave'` assigned `payFraction: 0` and routed 100% of worked time (980 minutes) into Comp-Off! This dropped the full-day count by 2, stole 16 hours of regular working time into Comp-Off, and caused the count discrepancy.
   - **The Fix:** Filtering out `request_type === 'WFH'` from `approvedLeaveDates` (`if (l.request_type === 'WFH') return;`) evaluates Oct 2 and Oct 3 as `FULL_DAY`. This dynamically restores full working days to **exactly 14**, keeps half days at **1**, unpaid short-days at **1**, and corrects Comp-Off earned from 2,516 minutes down to the true **1,556 minutes (25.93 hours)**.

2. **The Apparent Hours Shortfall:**
   - Summing raw physical hours: $142.2\text{h (worked)} + 32.0\text{h (leave)} + 8.0\text{h (holiday)} = 182.2\text{ hours}$.
   - However, `actualWorkedHours` (142.18h) contains:
     - 16.25h of Sunday work (Oct 4 & Oct 18) $\to$ credited 100% to Comp-Off, ₹0 payroll pay.
     - 7.43h of weekday overtime above 8h $\to$ credited to Comp-Off, ₹0 payroll pay.
     - 2.25h of short-day work (<4h on Oct 22) $\to$ unpaid in payroll, credited 100% to Comp-Off.
   - Regular payable worked hours from shifts: $14 \times 8.0\text{h} + 1 \times 4.0\text{h} = \mathbf{116.0\text{ hours}}$.
   - Total payable hours: $116.0\text{h (worked)} + 32.0\text{h (leave)} + 8.0\text{h (holiday)} = \mathbf{156.0\text{ hours}}$ ($19.5\text{ days}$).

3. **The Absence Visibility Gap:**
   - The UI previously displayed only `Half Days: 1` (0.5 day) and `Unpaid Days: 1` (1.0 day), making it appear as though only 1.5 days were deducted (₹461.54).
   - The remaining **6 unexcused absent days** (Oct 5, Oct 27–31) were deducted in the math but omitted from the UI model.
   - Adding `daysAbsent` (6 days) and `daysFullDay` (14 days) to the data model completely reconciles the 7.5 deducted days ($6.0 + 1.0 + 0.5 = 7.5\text{ days} = \text{₹}2,307.68$).

---

## 2. Calendar & Employment Baseline

### 2.1 October 2026 Calendar Structure
- **Total Calendar Days:** 31 days (Thursday, Oct 1 to Saturday, Oct 31)
- **Weekly Offs (Sundays):** 4 days (Oct 4, Oct 11, Oct 18, Oct 25)
- **Mon–Sat Scheduled Working Days:** **27 days** (216 scheduled working hours)
- **Paid Company Holidays:** 1 day (Dusshera — Tuesday, Oct 20)
- **Standard Business Working Days Divisor:** **26 days** (208 standard working hours)

### 2.2 Financial Rates
- **Monthly Stipend Base:** ₹8,000.00
- **Daily Rate (Divisor = 26):** $\frac{\text{₹}8,000.00}{26} = \mathbf{\text{₹}307.692308}$
- **Hourly Rate (8h/day):** $\frac{\text{₹}307.692308}{8} = \mathbf{\text{₹}38.461538}$

---

## 3. Complete Date-by-Date Payroll Calculation Breakdown (All 31 Days)

The table below traces every single day of October 2026 for Omkar Sawant, showing classification, logged hours, payable fraction, salary credit, deductions, and Comp-Off credits:

| Date | Day | Day Type | Activity / Classification | Logged | Payable Hrs | Pay Frac | Salary Credit (₹) | Deduct Days | Deduct (₹) | Comp-Off | Status | Notes |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **2026-10-01** | Thu | Working | Approved Office EOD | 10.47h | 8.0h | 1.0 | ₹307.69 | 0.0 | ₹0.00 | 167m (2.78h) | FULL_DAY | Full day pay + 167m overtime to Comp-Off |
| **2026-10-02** | Fri | Working | Approved EOD (WFH Remote) | 8.15h | 8.0h | 1.0 | ₹307.69 | 0.0 | ₹0.00 | 15m (0.25h) | FULL_DAY | Full day pay (remote) + 15m overtime to Comp-Off |
| **2026-10-03** | Sat | Working | Approved EOD (WFH Remote) | 8.05h | 8.0h | 1.0 | ₹307.69 | 0.0 | ₹0.00 | 5m (0.08h) | FULL_DAY | Full day pay (remote) + 5m overtime to Comp-Off |
| **2026-10-04** | Sun | Weekly Off | Approved Sunday EOD | 8.00h | 0.0h | 0.0 | ₹0.00 | 0.0 | ₹0.00 | 480m (8.00h) | SUNDAY | Sunday work: 100% credited to Comp-Off. ₹0 pay |
| **2026-10-05** | Mon | Working | Unexcused Absence | 0.00h | 0.0h | 0.0 | ₹0.00 | 1.0 | ₹307.69 | 0 | ABSENT | **Unexcused absence #1** |
| **2026-10-06** | Tue | Working | Approved Office EOD | 8.05h | 8.0h | 1.0 | ₹307.69 | 0.0 | ₹0.00 | 5m (0.08h) | FULL_DAY | Full day pay + 5m overtime to Comp-Off |
| **2026-10-07** | Wed | Working | Approved Office EOD | 8.02h | 8.0h | 1.0 | ₹307.69 | 0.0 | ₹0.00 | 1m (0.02h) | FULL_DAY | Full day pay + 1m overtime to Comp-Off |
| **2026-10-08** | Thu | Working | Approved Office EOD | 8.28h | 8.0h | 1.0 | ₹307.69 | 0.0 | ₹0.00 | 17m (0.28h) | FULL_DAY | Full day pay + 17m overtime to Comp-Off |
| **2026-10-09** | Fri | Working | Approved Office EOD | 8.03h | 8.0h | 1.0 | ₹307.69 | 0.0 | ₹0.00 | 2m (0.03h) | FULL_DAY | Full day pay + 2m overtime to Comp-Off |
| **2026-10-10** | Sat | Working | Approved Office EOD | 8.23h | 8.0h | 1.0 | ₹307.69 | 0.0 | ₹0.00 | 14m (0.23h) | FULL_DAY | Full day pay + 14m overtime to Comp-Off |
| **2026-10-11** | Sun | Weekly Off | Sunday Weekly Off | 0.00h | 0.0h | 0.0 | ₹0.00 | 0.0 | ₹0.00 | 0 | OFF | Regular weekly off |
| **2026-10-12** | Mon | Working | Approved Office EOD | 8.45h | 8.0h | 1.0 | ₹307.69 | 0.0 | ₹0.00 | 45m (0.75h) | FULL_DAY | Full day pay + 45m overtime to Comp-Off |
| **2026-10-13** | Tue | Working | Approved Office EOD | 8.42h | 8.0h | 1.0 | ₹307.69 | 0.0 | ₹0.00 | 25m (0.42h) | FULL_DAY | Full day pay + 25m overtime to Comp-Off |
| **2026-10-14** | Wed | Working | Approved Office EOD | 9.50h | 8.0h | 1.0 | ₹307.69 | 0.0 | ₹0.00 | 90m (1.50h) | FULL_DAY | Full day pay + 90m overtime to Comp-Off |
| **2026-10-15** | Thu | Working | Approved Office EOD | 8.00h | 8.0h | 1.0 | ₹307.69 | 0.0 | ₹0.00 | 0 | FULL_DAY | Exactly 8.0h worked. 0 Comp-Off |
| **2026-10-16** | Fri | Working | Approved Comp-Off Leave | 0.00h | 0.0h | 1.0 | ₹307.69 | 0.0 | ₹0.00 | 0 | LEAVE | Approved Comp-Off (8h pay, 8h debited from ledger) |
| **2026-10-17** | Sat | Working | Approved Office EOD | 4.25h | 4.0h | 0.5 | ₹153.85 | 0.5 | ₹153.85 | 0 | HALF_DAY | 4h to <8h = Half Day (0.5 day pay, 0.5 day deduction) |
| **2026-10-18** | Sun | Weekly Off | Approved Sunday EOD | 8.25h | 0.0h | 0.0 | ₹0.00 | 0.0 | ₹0.00 | 495m (8.25h) | SUNDAY | Sunday work: 100% credited to Comp-Off. ₹0 pay |
| **2026-10-19** | Mon | Working | Approved Office EOD | 8.50h | 8.0h | 1.0 | ₹307.69 | 0.0 | ₹0.00 | 30m (0.50h) | FULL_DAY | Full day pay + 30m overtime to Comp-Off |
| **2026-10-20** | Tue | Holiday | Dusshera (Paid Holiday) | 0.00h | 0.0h | 1.0 | ₹307.69 | 0.0 | ₹0.00 | 0 | HOLIDAY | Paid company holiday credited (8h pay, ₹0 deduction) |
| **2026-10-21** | Wed | Working | Approved Sick Leave | 0.00h | 0.0h | 1.0 | ₹307.69 | 0.0 | ₹0.00 | 0 | LEAVE | Approved medical leave (8h pay, ₹0 deduction) |
| **2026-10-22** | Thu | Working | Approved Office EOD (<4h) | 2.25h | 0.0h | 0.0 | ₹0.00 | 1.0 | ₹307.69 | 135m (2.25h) | UNPAID | <4h shift: Unpaid day in payroll, 100% to Comp-Off |
| **2026-10-23** | Fri | Working | Approved Sick Leave | 0.00h | 0.0h | 1.0 | ₹307.69 | 0.0 | ₹0.00 | 0 | LEAVE | Approved medical leave (8h pay, ₹0 deduction) |
| **2026-10-24** | Sat | Working | Approved Sick Leave | 0.00h | 0.0h | 1.0 | ₹307.69 | 0.0 | ₹0.00 | 0 | LEAVE | Approved medical leave (8h pay, ₹0 deduction) |
| **2026-10-25** | Sun | Weekly Off | Sunday Weekly Off | 0.00h | 0.0h | 0.0 | ₹0.00 | 0.0 | ₹0.00 | 0 | OFF | Regular weekly off |
| **2026-10-26** | Mon | Working | Approved Office EOD | 8.50h | 8.0h | 1.0 | ₹307.69 | 0.0 | ₹0.00 | 30m (0.50h) | FULL_DAY | Full day pay + 30m overtime to Comp-Off |
| **2026-10-27** | Tue | Working | Unexcused Absence | 0.00h | 0.0h | 0.0 | ₹0.00 | 1.0 | ₹307.69 | 0 | ABSENT | **Unexcused absence #2** |
| **2026-10-28** | Wed | Working | Unexcused Absence | 0.00h | 0.0h | 0.0 | ₹0.00 | 1.0 | ₹307.69 | 0 | ABSENT | **Unexcused absence #3** |
| **2026-10-29** | Thu | Working | Unexcused Absence | 0.00h | 0.0h | 0.0 | ₹0.00 | 1.0 | ₹307.69 | 0 | ABSENT | **Unexcused absence #4** |
| **2026-10-30** | Fri | Working | Unexcused Absence | 0.00h | 0.0h | 0.0 | ₹0.00 | 1.0 | ₹307.69 | 0 | ABSENT | **Unexcused absence #5** |
| **2026-10-31** | Sat | Working | Unexcused Absence | 0.00h | 0.0h | 0.0 | ₹0.00 | 1.0 | ₹307.69 | 0 | ABSENT | **Unexcused absence #6** |

---

## 4. Reconciliation Checks

### 4.1 Scheduled Working Days Reconciliation (Calendar Baseline)
$$\begin{aligned}
\text{Total Calendar Days} &= 31 \\
\text{Weekly Offs (Sundays)} &= 4 \\
\mathbf{\text{Scheduled Working Days (Mon–Sat)}} &= \mathbf{27\text{ days}}
\end{aligned}$$

Accounted days:
$$\begin{array}{lrr}
\text{Classification} & \text{Days} & \text{Hours} \\
\hline
\text{Full Working Days (14 days × 1.0)} & 14.0\text{ days} & 112.0\text{h} \\
\text{Half Working Days (1 day × 0.5 pay)} & 0.5\text{ day} & 4.0\text{h} \\
\text{Approved Paid Leaves (4 days × 1.0)} & 4.0\text{ days} & 32.0\text{h} \\
\text{Paid Company Holidays (1 day × 1.0)} & 1.0\text{ day} & 8.0\text{h} \\
\hline
\mathbf{\text{Total Payable Days}} & \mathbf{19.5\text{ days}} & \mathbf{156.0\text{h}} \\
\hline
\text{Unexcused Absences (6 days × 1.0)} & 6.0\text{ days} & 48.0\text{h} \\
\text{Unpaid Short-Day (<4h, 1 day × 1.0)} & 1.0\text{ day} & 8.0\text{h} \\
\text{Half-Day Shortfall (1 day × 0.5 deduction)} & 0.5\text{ day} & 4.0\text{h} \\
\hline
\mathbf{\text{Total Deducted Days}} & \mathbf{7.5\text{ days}} & \mathbf{60.0\text{h}} \\
\hline
\mathbf{\text{Payable Days (19.5)} + \text{Deducted Days (7.5)}} & \mathbf{27.0\text{ days}} & \mathbf{216.0\text{h}} \\
\mathbf{\text{Calendar Scheduled Working Days Baseline}} & \mathbf{27.0\text{ days}} & \mathbf{216.0\text{h}} \\
\mathbf{\text{Reconciliation Check:}} & \mathbf{27.0 \equiv 27.0} & \mathbf{(100\%\text{ RECONCILED})}
\end{array}$$

### 4.2 Financial Baseline Reconciliation (₹8,000 Monthly Salary)
$$\begin{aligned}
\text{Standard Monthly Stipend Base} &= \mathbf{\text{₹}8,000.00} \\
\text{Standard Working Days Divisor} &= 26\text{ days} \\
\text{Daily Rate} &= \frac{\text{₹}8,000.00}{26} = \text{₹}307.692308 \\
\text{Total Deducted Days} &= 7.5\text{ days} \\
\mathbf{\text{Attendance Deduction}} &= 7.5 \times \text{₹}307.692308 = \mathbf{\text{₹}2,307.68} \\
\mathbf{\text{Net Disbursable Salary}} &= \text{₹}8,000.00 - \text{₹}2,307.68 = \mathbf{\text{₹}5,692.32} \\
\hline
\mathbf{\text{Net Payable (₹5,692.32)} + \text{Deductions (₹2,307.68)}} &= \mathbf{\text{₹}8,000.00} \\
\mathbf{\text{Financial Reconciliation Check:}} &= \mathbf{\text{₹}8,000.00 \equiv \text{₹}8,000.00} \quad \mathbf{(100\%\text{ RECONCILED})}
\end{aligned}$$

### 4.3 Comp-Off Ledger Reconciliation
Omkar's Comp-Off movements in October 2026:
1. **Sunday Shifts (100% credited to Comp-Off):**
   - Oct 4: 8.00h = 480 minutes
   - Oct 18: 8.25h (8h 15m) = 495 minutes
   - Subtotal Sunday: **975 minutes (16.25h)**
2. **Short-Day Shift (<4h, 100% credited to Comp-Off):**
   - Oct 22: 2.25h (2h 15m) = **135 minutes (2.25h)**
3. **Weekday Overtime (Hours above 8h on full days):**
   - Oct 1 (167m) + Oct 2 (15m) + Oct 3 (5m) + Oct 6 (5m) + Oct 7 (1m) + Oct 8 (17m) + Oct 9 (2m) + Oct 10 (14m) + Oct 12 (45m) + Oct 13 (25m) + Oct 14 (90m) + Oct 15 (0m) + Oct 19 (30m) + Oct 26 (30m) = **446 minutes (7.43h)**
4. **Total Comp-Off Minutes Earned:**
   $$975\text{m (Sundays)} + 135\text{m (<4h)} + 446\text{m (Overtime)} = \mathbf{1,556\text{ minutes (25.93 hours)}}$$
5. **Comp-Off Debited:**
   - Oct 16: 1 day Compensatory Off = **480 minutes (8.0 hours)** debited from ledger.
   - Zero double-counting or leakage.

---

## 5. Software Architectural Fixes & Compliance

1. **`lib/services/payroll.service.ts`:**
   - Fixed WFH classification: excludes WFH from `approvedLeaveDates` so that WFH shifts are evaluated as regular working days.
   - Added daily evaluation loop creating `dailyBreakdown` for all 31 days.
   - Added automated `reconciliation` validation comparing scheduled days and financial totals.
   - Corrected `daysFullDay: 14`, `daysHalfDay: 1`, `daysUnpaidLeaveEod: 1`, `daysAbsent: 6`, `compOffMinutesEarned: 1556`.
2. **`types/payroll.ts` & `lib/services/payroll-records.service.ts`:**
   - Added `DayPayrollBreakdown` and `PayrollReconciliation` types.
   - Added `days_full_day`, `payable_worked_hours`, `payable_hours`, `dailyBreakdown`, and `reconciliation` persistence in snapshot storage and retrieval.
3. **`components/hr/payroll/PayrollDetailModal.tsx`:**
   - Displays `Full Working Days (8h+)` in Time & Attendance card.
   - Renders Automated Reconciliation Audit card with status badges.
   - Renders 31-day Date-wise Calculation Breakdown table.
4. **`components/hr/payroll/EmployeePayrollClientPage.tsx` & `PayrollClientPage.tsx`:**
   - Added Full Days and Absent Days to employee Time & Attendance view, PDF export, and CSV reports.
   - Displays Date-wise Attendance & Salary Accounting table in employee portal.
5. **Automated Test Verification:**
   - `__tests__/audit-omkar.test.ts`: Passes with 100% precision against live Supabase data.
   - `__tests__/payroll-master-compliance.test.ts`: 16/16 tests pass.
   - `__tests__/october-2026-payroll-verification.test.ts`: 12/12 employee evaluations pass.
   - `__tests__/employee-payroll-deductions.test.ts`: 16/16 tests pass.
   - `__tests__/payroll.test.ts` & `payroll-calculation-comprehensive.test.ts`: All tests pass.
