# Project Management Module — Future Backlog

This document records the architectural roadmap and backlog items for Advanced Resource Planning in the TripleS ERP Project Management module.

> [!NOTE]
> These features are intentionally deferred from Phase 1 to prioritize core Client, Project, Task, and Kanban workflows with server-side RBAC and strict financial isolation. The current database architecture (`projects`, `tasks`, `task_assignees`, `project_activity`, `worked_hours`) has been designed to support these features seamlessly without database restructuring.

---

## 1. Interactive Gantt Charts
- **Objective:** Provide a visual timeline with milestone drag-and-drop, dependency links (Finish-to-Start, Start-to-Start), and critical path analysis.
- **Architectural Readiness:**
  - Tasks already have `start_date`, `due_date`, `dependencies: TEXT[]`, and `order_index`.
  - Projects have `start_date` and `deadline`.
  - Can be integrated into `/projects/[projectId]` under the Timeline tab using SVG/Canvas rendering.

---

## 2. Workload Distribution Heatmaps
- **Objective:** Display real-time employee workload across projects, identifying over-allocated and under-allocated team members.
- **Architectural Readiness:**
  - Tasks track `estimated_hours`, `worked_hours`, and `task_assignees`.
  - Multi-assignee support ensures distributed hour tracking.
  - Strict security boundary: Operational hours will continue to be isolated from salary, CTC, stipend, or any financial compensation data.

---

## 3. Project Time-Budget Burn-Down Charts
- **Objective:** Compare estimated vs. logged operational hours across project phases, providing projected completion dates and burn-down velocity.
- **Architectural Readiness:**
  - `tasks.estimated_hours` and `tasks.worked_hours` provide the baseline metrics.
  - `project_activity` records timestamped completions and state changes for historical velocity calculations.
