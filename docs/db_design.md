# SocietySync — Database Design

**Companion files:** `schema.sql` (executable PostgreSQL DDL) · `erd.mermaid` (entity-relationship diagram)

This document replaces and extends `database.md`. The original draft correctly identified the four core nouns of the system (Users, Society, Maintenance, Complaints, Finance) but stopped short of the schema needed to actually support the user stories in Milestone 1 — there was no facility booking, no visitor management, no events/polls, no notifications, and the finance model had no way to represent payments, receipts, or staggered late fees. Below is a complete redesign built directly off your 6 epics.

---

## 1. Design Principles

- **3NF normalization** everywhere except a few deliberate denormalizations noted inline (e.g. `whatsapp_number` duplicating `phone_number` by default, per your original spec).
- **Surrogate keys** (`BIGSERIAL` / `UUID`) for every table instead of composite natural keys — the original `Society` table used `(block, flat, floor)` as a composite primary key, which is awkward to reference as a foreign key from five other tables. It's now `flats.flat_id`.
- **Enums over free-text** for every controlled vocabulary (roles, statuses, categories, gateways). This gets you free `CHECK`-level data integrity and smaller storage than `VARCHAR`.
- **Referential integrity enforced by the database**, not the application — every relationship in the epics is a real foreign key.
- **Business rules pushed into constraints where possible** (single admin, no double-booked amenities, one vote per resident) — these are wrong in the app so rarely that it's cheaper to make them structurally impossible than to test for them.
- **Auditability**: every mutable table has `created_at`/`updated_at`; financial and access-control tables never hard-delete.

---

## 2. Module Breakdown

### 2.1 Identity — `flats`, `users`, `roles`, `user_roles`, `support_staff_profiles`

Your draft stored `roles` as a single column on `users`. Real committee structures need a person to hold more than one role (a flat owner who is also a committee member), and the constraint "admin — only one" needs actual enforcement, not a comment. So:

- `roles` is a lookup table; `user_roles` is a join table (many-to-many).
- A **partial unique index** (`uq_single_admin`) makes it *structurally impossible* to have two admins — an `INSERT` violating it fails at the database level, not in application code that someone might forget to write.
- Support staff subtypes (gardener, security, etc.) live in `support_staff_profiles`, kept separate from `users` so the core identity table doesn't accumulate nullable staff-only columns.
- **Domestic helpers** (maids/cooks hired privately by a resident, story 5.31) are *not* `users` — they don't log in. They're a lightweight `domestic_helpers` + `helper_attendance_logs` pair, registered by a resident and clocked in/out by security.

### 2.2 Security & Visitors — `visitors`

Covers story 5.32 (push-notification approval for unannounced visitors) and 5.31. `approval_status` plus `approved_by` gives you the full audit trail of who let a stranger in and when.

### 2.3 Complaints & Maintenance — `complaints`, `complaint_attachments`, `maintenance_tasks`

This is the biggest structural change from your draft. Your original schema had *two* separate, unlinked tables — `Maintenance` and `Complaints` — with overlapping category lists and no way to know that a complaint became a task. The user stories need both:

- **`complaints`** — what a resident *reports*. Includes the categories your draft was missing (`plumbing`, `electrical`) plus `neighbouring_flats` and `security`, which aren't staff-actionable maintenance work.
- **`maintenance_tasks`** — the actual *work order*, assignable to staff with an SLA (`sla_due_at`, story 5.23). Can originate from a complaint (`source_complaint_id`) or be created directly by admin (e.g. scheduled garden upkeep).
- **`complaint_attachments`** stores multiple geo-tagged photos per complaint (story 5.21) — one-to-many, since a `photo_url` column on `complaints` would only allow one image.
- The **"Known Issues" board** (story 5.22, dedupe against society-wide problems) is a query, not a table — see §5.

### 2.4 Finance & Billing — `invoices`, `payments`, `late_fee_rules`, `payment_reminders`

Your draft's `Finance` table conflated "a bill" and "a role" with no way to represent a payment transaction, a receipt, or a late fee calculation. Split into:

- **`invoices`** — what's owed (maintenance, event donation, electricity, water tanker, or other). `UNIQUE (flat_id, purpose, billing_period)` prevents accidentally double-billing a flat for the same month.
- **`payments`** — the transaction record: gateway (UPI/card/net banking, story 5.11), gateway reference, and a generated receipt number/PDF URL.
- **`late_fee_rules`** — a small config table so staggered late fees (story 5.14) are *data*, not hardcoded logic. Change the by-laws, update a row — no deploy needed.
- **`payment_reminders`** — logs the automated 3-days-before-due reminder (story 5.12) so a scheduled job can be idempotent (never send the same reminder twice) and you get an audit trail of what was sent.

### 2.5 Facility Booking — `amenities`, `amenity_bookings`

Story 5.41–5.43. The important detail here is `amenity_bookings.booking_id` is a `UUID`, not a sequential integer — sequential IDs are guessable and unsuitable as a "verifiable booking ticket" (story 5.43) since a resident could enumerate other people's bookings.

Double-booking prevention (the #1 pain point from your president interview) is enforced with a **PostgreSQL exclusion constraint** (`EXCLUDE USING gist`), not application logic — two `CONFIRMED` bookings for the same amenity with overlapping time ranges cannot both exist in the table, full stop, even under concurrent requests. `max_bookings_per_flat_per_week` on `amenities` supports the per-household cap in story 5.42 (enforced by application logic at booking time, since it requires counting existing rows).

### 2.6 Community Engagement — `events`, `event_rsvps`, `event_volunteers`, `polls`, `poll_options`, `poll_votes`, `notifications`, `notification_deliveries`

Entirely absent from your draft, but required by EPIC 5:

- `event_rsvps` gives a live attendee count (story 5.52) via a simple `COUNT(*)`.
- `poll_votes` has a composite primary key `(poll_id, user_id)`, which structurally guarantees one vote per resident per poll (story 5.53).
- `notifications` + `notification_deliveries` are split so a single broadcast (e.g. "Block B water shutoff", story 5.51) fans out to per-user delivery/read receipts without duplicating the notification body per recipient.

### 2.7 Analytics — EPIC 6

No new tables — this epic is entirely served by aggregate queries against the operational tables above (§5). For a growing society, promote the heaviest of these to **materialized views** refreshed nightly rather than computing them live on every dashboard load.

---

## 3. Entity-Relationship Diagram

See `erd.mermaid` for the full interactive diagram. Core relationships:

```
flats 1──* users
users *──* roles (via user_roles)
users 1──* complaints ──1──o maintenance_tasks
flats 1──* invoices 1──* payments
amenities 1──* amenity_bookings *──1 flats
users 1──* events ──* event_rsvps *──1 users
```

---

## 4. Business Rules Enforced by the Schema

| Rule | Mechanism |
|---|---|
| Only one Admin society-wide | Partial unique index `uq_single_admin` on `user_roles` |
| A flat can't be double-billed for the same month/purpose | `UNIQUE (flat_id, purpose, billing_period)` on `invoices` |
| An amenity can't be double-booked for overlapping times | `EXCLUDE USING gist` on `amenity_bookings` |
| A resident can only vote once per poll | Composite PK `(poll_id, user_id)` on `poll_votes` |
| "Others" category/purpose must explain itself | `CHECK` constraints requiring `other_reason_text` / `other_purpose_text` |
| A booking's start must precede its end | `CHECK (slot_end > slot_start)` |
| Late fee tiers don't overlap | `CHECK (max_days_overdue >= min_days_overdue)` per rule (application should also validate tiers don't overlap each other on insert) |

---

## 5. Sample Queries (mapped to the epics)

**Financial dashboard — collected vs. pending (5.13)**
```sql
SELECT date_trunc('month', due_date) AS billing_month,
       SUM(base_amount + late_fee_amount) FILTER (WHERE status = 'paid')             AS collected,
       SUM(base_amount + late_fee_amount) FILTER (WHERE status IN ('pending','overdue')) AS pending
FROM invoices
WHERE purpose = 'maintenance'
GROUP BY 1
ORDER BY 1 DESC;
```

**Defaulter list with applicable staggered late fee (5.13 / 5.14)**
```sql
SELECT f.block, f.flat_number, i.invoice_id, i.due_date,
       CURRENT_DATE - i.due_date AS days_overdue,
       i.base_amount,
       COALESCE(lfr.fee_value, 0) AS applicable_late_fee
FROM invoices i
JOIN flats f ON f.flat_id = i.flat_id
LEFT JOIN late_fee_rules lfr
       ON (CURRENT_DATE - i.due_date) BETWEEN lfr.min_days_overdue AND COALESCE(lfr.max_days_overdue, 999999)
WHERE i.status IN ('pending', 'overdue')
ORDER BY days_overdue DESC;
```

**"Known Issues" board — dedupe complaints before submission (5.22)**
```sql
SELECT category, block, COUNT(*) AS open_reports, MIN(created_at) AS first_reported
FROM complaints
WHERE status IN ('open', 'acknowledged', 'assigned', 'in_progress')
GROUP BY category, block
HAVING COUNT(*) > 1
ORDER BY open_reports DESC;
```

**SLA breach report for the admin dashboard (5.23)**
```sql
SELECT t.task_id, t.category, u.full_name AS assigned_staff, t.sla_due_at, t.status
FROM maintenance_tasks t
JOIN users u ON u.user_id = t.assigned_to
WHERE t.status NOT IN ('done', 'cancelled')
  AND t.sla_due_at < now()
ORDER BY t.sla_due_at;
```

**Facility utilization by hour (5.62)**
```sql
SELECT a.name, EXTRACT(HOUR FROM b.slot_start) AS hour_of_day, COUNT(*) AS bookings
FROM amenity_bookings b
JOIN amenities a ON a.amenity_id = b.amenity_id
WHERE b.status = 'confirmed'
  AND b.slot_start >= now() - INTERVAL '90 days'
GROUP BY a.name, hour_of_day
ORDER BY a.name, hour_of_day;
```

**Recurring complaint categories, monthly (5.61)**
```sql
SELECT date_trunc('month', created_at) AS month, category, COUNT(*) AS complaint_count
FROM complaints
GROUP BY 1, 2
ORDER BY 1 DESC, complaint_count DESC;
```

---

## 6. Indexing Strategy

- **Partial indexes on hot subsets** rather than indexing entire tables: `idx_complaints_known_issues` only indexes *open* complaints, `idx_tasks_sla_open` only indexes tasks not yet done, `idx_visitors_pending` only indexes visitors awaiting approval. These stay small and fast regardless of how large the historical table gets.
- **Composite indexes match query shape**: `(flat_id, status)` on `invoices` because the app almost always filters "this flat's unpaid bills," not one or the other alone.
- **The exclusion constraint on `amenity_bookings` doubles as an index** (GiST), so overlap checks are `O(log n)`, not a table scan.
- Foreign key columns (`assigned_to`, `raised_by`, `host_flat_id`, etc.) are indexed explicitly — Postgres does not auto-index FK columns.

---

## 7. Scalability & Operations Notes

- **Partition high-write, append-only tables** by month once volume grows: `visitors`, `helper_attendance_logs`, `notification_deliveries`. Old partitions can be archived or dropped per your data-retention policy without touching live data.
- **Store binary content (photos, PDF receipts) in object storage** (S3-compatible), not the database — only `photo_url` / `receipt_pdf_url` live in Postgres.
- **Materialize EPIC 6 analytics** as nightly-refreshed materialized views once the society has a few thousand complaints/bookings, so dashboards don't scan raw operational tables on every load.
- **Separate read replica for reporting** if the admin dashboard is queried frequently — keeps analytical load off the transactional path (payments, bookings).
- **Row-Level Security (RLS)** is a natural fit here: a resident's Postgres session could be restricted so `SELECT` on `invoices`/`complaints` is automatically scoped to their own `flat_id`, defense-in-depth beneath the application layer.

---

## 8. Requirements Traceability

| Story | Epic | Primary Tables |
|---|---|---|
| 5.11 Multi-gateway payment + PDF receipt | Financial | `invoices`, `payments` |
| 5.12 Automated due-date reminders | Financial | `payment_reminders`, `invoices` |
| 5.13 Collected vs. pending dashboard | Financial | `invoices` (aggregate query) |
| 5.14 Staggered late fees | Financial | `late_fee_rules`, `invoices` |
| 5.21 Geo-tagged photo complaints | Helpdesk | `complaints`, `complaint_attachments` |
| 5.22 Known Issues board | Helpdesk | `complaints` (indexed aggregate) |
| 5.23 Assign ticket + SLA | Helpdesk | `maintenance_tasks` |
| 5.24 Staff status updates | Helpdesk | `maintenance_tasks` |
| 5.31 Digital helper register | Security | `domestic_helpers`, `helper_attendance_logs` |
| 5.32 Visitor approval notification | Security | `visitors` |
| 5.41 Real-time amenity calendar | Booking | `amenities`, `amenity_bookings` |
| 5.42 Per-household booking cap | Booking | `amenities.max_bookings_per_flat_per_week` |
| 5.43 Verifiable booking ticket | Booking | `amenity_bookings.booking_id` (UUID) |
| 5.51 Targeted push notifications | Engagement | `notifications`, `notification_deliveries` |
| 5.52 Event RSVP + live count | Engagement | `events`, `event_rsvps` |
| 5.53 Multi-choice polls | Engagement | `polls`, `poll_options`, `poll_votes` |
| 5.61 Complaint category analytics | Analytics | `complaints` (aggregate query) |
| 5.62 Facility utilization rates | Analytics | `amenity_bookings` (aggregate query) |

---

## 9. What Changed From Your Draft

1. `Society` → `flats`, with a surrogate `flat_id` replacing the composite `(block, flat, floor)` key.
2. `roles` column on `Users` → `roles` + `user_roles` join table, with a database-enforced single-admin rule.
3. `Maintenance` and `Complaints` are now explicitly linked (`complaints.linked_task_id` ↔ `maintenance_tasks.source_complaint_id`) instead of being parallel, disconnected tables.
4. `Finance` split into `invoices` / `payments` / `late_fee_rules` / `payment_reminders` to actually represent a billing lifecycle, not just a status flag.
5. Added everything the user stories require that had no table at all: visitor management, domestic helper logs, facility booking, events/RSVPs/volunteers, polls, and notifications.
6. `Events` (previously a stub with `event-id`, `event-name`, `...`) is now fully specified with RSVPs and volunteer sign-up.
