# Payroll Rule Mapping

This document reflects the **CURRENT** implementation of the ConstroTrait payroll system. It traces each rule from its source through draft calculation, final server calculation (RPC), persistence, and UI display.

## 1. Core Salary Components
| Component | Source | Calculation / Rule | Persistence | UI Display |
| :--- | :--- | :--- | :--- | :--- |
| **Base Salary** | `salary_hikes` (fallback `profiles`) | Latest active hike on or before month-end. | `payroll_snapshots.base_salary` | Earnings Section |
| **Net Payable** | Attendance + Leaves | `prorationFactor = earned_days / 26`. `net_payable = round(base_salary * prorationFactor)`. Cannot be negative. | `payroll_snapshots.net_payable` | Not directly displayed |
| **Basic Salary** | `net_payable` | `round(net_payable * 0.5)` | `payroll_snapshots.basic_salary` | Earnings Section |
| **HRA** | `net_payable` | `round(net_payable * 0.2)` | `payroll_snapshots.hra` | Earnings Section |
| **Allowance** | `net_payable` | `net_payable - (Basic + HRA)` | `payroll_snapshots.allowance` | Earnings Section |

## 2. Working Days & Attendance
| Component | Source | Calculation / Rule | Persistence | UI Display |
| :--- | :--- | :--- | :--- | :--- |
| **Working Days** | Hardcoded | Fixed limit of `26` days. Weekends (Sat/Sun) and Holidays are non-working. | N/A | Implicitly in Absent |
| **Days Present/Field**| `attendance` | Incremented (0.5 or 1.0) based on `Present` or `Field Assignment` logs. | `payroll_snapshots.days_present` / `.days_field` | Employee row |
| **Leave Days** | `leave_requests` | Approved leaves map to `paid` or `unpaid` (0.5 or 1.0). | `payroll_snapshots.days_paid_leave` / `.days_unpaid_leave` | Employee row |
| **Holidays** | `holidays` table | `standard_holidays` count. Only applied as `effective_holidays` if employee has > 0 earned days. | Derived in `accounted_days` | N/A |
| **Absent** | Derived | `absent = max(0, 26 - accounted_days)` | `payroll_snapshots.days_absent` | Employee row |

## 3. Earnings Adjustments (Ledger)
Ledger entries matching these keywords (case-insensitive) are summed up.
| Component | Source | Calculation / Rule | Persistence | UI Display |
| :--- | :--- | :--- | :--- | :--- |
| **Bonus** | `employee_financial_ledger` | Keyword `bonus` | `payroll_snapshots.bonus` | Earnings Section |
| **Medical** | `employee_financial_ledger` | Keyword `medical allowance` | `payroll_snapshots.medical_allowance` | Earnings Section |
| **Travel** | `employee_financial_ledger` | Keyword `travel expense` | `payroll_snapshots.travel_expense` | Earnings Section |
| **Incentive** | `employee_financial_ledger` | Keyword `performance incentive` | `payroll_snapshots.performance_incentive` | Earnings Section |
| **Food** | `employee_financial_ledger` | Keyword `food allowance` | `payroll_snapshots.food_allowance` | Earnings Section |
| **Overtime Pay** | Hardcoded | Always `0`. (Overtime handled via Comp-Off). | `payroll_snapshots.overtime_pay` | N/A |
| **Gross Salary** | Derived | Sum of Basic, HRA, Allowance + all active earning adjustments. | `payroll_snapshots.gross_salary` | Earnings Section |

## 4. Deductions (Ledger & Statutory)
| Component | Source | Calculation / Rule | Persistence | UI Display |
| :--- | :--- | :--- | :--- | :--- |
| **PF, ESI, Taxes**| Hardcoded | Always `0`. | `payroll_snapshots.pf`, `.esi`, etc. | Deductions Section |
| **TDS** | `employee_financial_ledger` | UNKNOWN: Formula undocumented. Uses manual ledger `amount` directly. | `payroll_snapshots.tds` | Deductions Section |
| **Salary Advance**| `employee_financial_ledger` | Keyword `advance` | `payroll_snapshots.salary_advance_recovery`| Deductions Section |
| **Damage** | `employee_financial_ledger` | Keyword `damage` | `payroll_snapshots.damage_recovery` | Deductions Section |
| **Other Deds** | `employee_financial_ledger` | Catch-all for unrecognized deduction keywords. | `payroll_snapshots.other_deductions` | Deductions Section |
| **Total Ded.** | Derived | Sum of all deductions. | `payroll_snapshots.total_deductions` | Deductions Section |
| **Net Salary** | Derived | `Gross Salary - Total Deductions` | `payroll_snapshots.net_salary` | Net Salary Summary |

## 5. Architectural Discrepancies (Draft vs Locked)
The frontend `calculateMonthlyPayroll` generates a **draft preview** (`PayrollSnapshot`). 
However, the `lock_payroll_cycle` **RPC completely discards the frontend's financial calculations** (like Gross, Net, HRA, Deductions) and securely recalculates them from scratch using the database ledger and attendance tables. 
- *Current State:* As of the latest fixes (including TDS amount preservation), the JS draft calculation formula perfectly matches the authoritative RPC SQL calculation. There are no known mathematical discrepancies.
