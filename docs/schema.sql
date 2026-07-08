-- =============================================================================
-- SocietySync — Apartment & Society Management System
-- Database Schema (PostgreSQL 14+)
-- =============================================================================
-- This file is the executable companion to database_design.md.
-- Load order matters: extensions -> enums -> lookup tables -> core tables ->
-- dependent tables -> cross-module FKs -> indexes -> triggers -> seed data.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. EXTENSIONS
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid() for booking IDs
CREATE EXTENSION IF NOT EXISTS citext;     -- case-insensitive email storage
CREATE EXTENSION IF NOT EXISTS btree_gist; -- exclusion constraint for booking overlap

-- -----------------------------------------------------------------------------
-- 1. ENUM TYPES (controlled vocabularies — cheaper & safer than free-text)
-- -----------------------------------------------------------------------------
CREATE TYPE role_name AS ENUM
    ('admin', 'committee_member', 'flat_owner', 'resident_rental', 'support_staff');

CREATE TYPE staff_type AS ENUM
    ('gardener', 'house_help', 'security', 'maintenance_worker', 'event_volunteer');

CREATE TYPE residential_status AS ENUM ('occupied', 'empty');

CREATE TYPE service_category AS ENUM
    ('lift', 'garden', 'cleaning', 'club_house', 'plumbing', 'electrical',
     'common_area', 'neighbouring_flats', 'security', 'others');

CREATE TYPE complaint_status AS ENUM
    ('open', 'acknowledged', 'assigned', 'in_progress', 'resolved', 'closed');

CREATE TYPE task_status AS ENUM
    ('pending', 'assigned', 'in_progress', 'done', 'cancelled');

CREATE TYPE billing_purpose AS ENUM
    ('maintenance', 'event_donation', 'society_electricity', 'water_tanker', 'others');

CREATE TYPE invoice_status AS ENUM
    ('pending', 'paid', 'overdue', 'waived', 'cancelled');

CREATE TYPE payment_gateway AS ENUM ('upi', 'credit_card', 'debit_card', 'net_banking');

CREATE TYPE payment_status AS ENUM ('initiated', 'success', 'failed', 'refunded');

CREATE TYPE booking_status AS ENUM ('confirmed', 'cancelled', 'completed');

CREATE TYPE visitor_approval_status AS ENUM ('pending', 'approved', 'denied', 'expired');

CREATE TYPE rsvp_status AS ENUM ('going', 'maybe', 'not_going');

CREATE TYPE volunteer_status AS ENUM ('applied', 'confirmed', 'declined');

CREATE TYPE notification_scope AS ENUM ('society', 'block', 'floor', 'flat', 'role');

-- -----------------------------------------------------------------------------
-- 2. SOCIETY STRUCTURE  (replaces the original "Society" table)
-- -----------------------------------------------------------------------------
CREATE TABLE flats (
    flat_id             BIGSERIAL PRIMARY KEY,
    block               VARCHAR(10)  NOT NULL,
    floor               SMALLINT     NOT NULL,
    flat_number         VARCHAR(10)  NOT NULL,
    residential_status  residential_status NOT NULL DEFAULT 'empty',
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_flats_location UNIQUE (block, floor, flat_number)
);
COMMENT ON TABLE flats IS 'Physical housing units. flat_id is the single surrogate key referenced everywhere instead of a composite (block, floor, flat) key.';

-- -----------------------------------------------------------------------------
-- 3. USERS, ROLES & STAFF
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    user_id          BIGSERIAL PRIMARY KEY,
    full_name        VARCHAR(150) NOT NULL,
    email            CITEXT       NOT NULL UNIQUE,
    phone_number     VARCHAR(20)  NOT NULL UNIQUE,   -- E.164 e.g. +919876543210
    whatsapp_number  VARCHAR(20)  NOT NULL,          -- app layer defaults this to phone_number
    password_hash    TEXT         NOT NULL,
    flat_id          BIGINT       REFERENCES flats(flat_id) ON DELETE SET NULL,
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON COLUMN users.flat_id IS 'NULL for support staff / security not tied to a specific unit.';

-- Static lookup, seeded once — role_id is used directly by the single-admin rule below
CREATE TABLE roles (
    role_id    SMALLINT PRIMARY KEY,
    role_name  role_name NOT NULL UNIQUE
);

CREATE TABLE user_roles (
    user_id     BIGINT   NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role_id     SMALLINT NOT NULL REFERENCES roles(role_id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role_id)
);
COMMENT ON TABLE user_roles IS 'Many-to-many: a person can be e.g. both flat_owner and committee_member.';

-- Business rule: at most one Admin society-wide (role_id 1 = admin, seeded below)
CREATE UNIQUE INDEX uq_single_admin ON user_roles (role_id) WHERE role_id = 1;

CREATE TABLE support_staff_profiles (
    user_id        BIGINT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    staff_type     staff_type NOT NULL,
    employed_by    VARCHAR(20) NOT NULL DEFAULT 'society', -- society | contracted
    assigned_block VARCHAR(10)
);

-- Domestic help (maids/cooks) hired privately by a resident — not app users themselves
CREATE TABLE domestic_helpers (
    helper_id     BIGSERIAL PRIMARY KEY,
    full_name     VARCHAR(150) NOT NULL,
    photo_url     TEXT,
    phone_number  VARCHAR(20),
    helper_type   VARCHAR(30) NOT NULL,   -- maid, cook, driver, other
    flat_id       BIGINT NOT NULL REFERENCES flats(flat_id) ON DELETE CASCADE,
    registered_by BIGINT NOT NULL REFERENCES users(user_id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE helper_attendance_logs (
    log_id      BIGSERIAL PRIMARY KEY,
    helper_id   BIGINT NOT NULL REFERENCES domestic_helpers(helper_id) ON DELETE CASCADE,
    log_date    DATE   NOT NULL DEFAULT CURRENT_DATE,
    entry_time  TIMESTAMPTZ,
    exit_time   TIMESTAMPTZ,
    logged_by   BIGINT NOT NULL REFERENCES users(user_id), -- security guard on duty
    CONSTRAINT uq_helper_day UNIQUE (helper_id, log_date)
);

-- -----------------------------------------------------------------------------
-- 4. SECURITY & VISITOR MANAGEMENT  (EPIC 3)
-- -----------------------------------------------------------------------------
CREATE TABLE visitors (
    visitor_id      BIGSERIAL PRIMARY KEY,
    full_name       VARCHAR(150) NOT NULL,
    phone_number    VARCHAR(20),
    photo_url       TEXT,
    purpose         VARCHAR(100),
    host_flat_id    BIGINT NOT NULL REFERENCES flats(flat_id),
    approved_by     BIGINT REFERENCES users(user_id),         -- resident who approved
    approval_status visitor_approval_status NOT NULL DEFAULT 'pending',
    logged_by       BIGINT NOT NULL REFERENCES users(user_id), -- security guard
    entry_time      TIMESTAMPTZ,
    exit_time       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 5. COMPLAINTS & MAINTENANCE  (EPIC 2)
-- -----------------------------------------------------------------------------
-- Complaints = what a resident reports. Maintenance tasks = the work order that
-- staff actually execute. A complaint can spawn a task (linked_task_id); admin
-- can also create tasks directly (e.g. scheduled garden upkeep) with no complaint.
CREATE TABLE complaints (
    complaint_id      BIGSERIAL PRIMARY KEY,
    raised_by         BIGINT NOT NULL REFERENCES users(user_id),
    category          service_category NOT NULL,
    other_reason_text VARCHAR(60),          -- required only when category = 'others'
    description       TEXT NOT NULL,
    flat_id           BIGINT REFERENCES flats(flat_id),  -- NULL for common-area issues
    block             VARCHAR(10),
    status            complaint_status NOT NULL DEFAULT 'open',
    linked_task_id    BIGINT,               -- FK added after maintenance_tasks exists
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_complaint_other CHECK (category <> 'others' OR other_reason_text IS NOT NULL)
);

CREATE TABLE complaint_attachments (
    attachment_id BIGSERIAL PRIMARY KEY,
    complaint_id  BIGINT NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    photo_url     TEXT NOT NULL,
    latitude      NUMERIC(9,6),
    longitude     NUMERIC(9,6),
    uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE maintenance_tasks (
    task_id             BIGSERIAL PRIMARY KEY,
    category            service_category NOT NULL,
    description         TEXT,
    flat_id             BIGINT REFERENCES flats(flat_id),
    block               VARCHAR(10),
    source_complaint_id BIGINT REFERENCES complaints(complaint_id) ON DELETE SET NULL,
    assigned_to         BIGINT REFERENCES users(user_id),  -- support staff
    assigned_by         BIGINT REFERENCES users(user_id),  -- admin / committee member
    sla_due_at          TIMESTAMPTZ,
    status              task_status NOT NULL DEFAULT 'pending',
    resolved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE complaints
    ADD CONSTRAINT fk_complaints_task
    FOREIGN KEY (linked_task_id) REFERENCES maintenance_tasks(task_id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- 6. FINANCE & BILLING  (EPIC 1)
-- -----------------------------------------------------------------------------
CREATE TABLE late_fee_rules (
    rule_id          SMALLSERIAL PRIMARY KEY,
    min_days_overdue INT NOT NULL,
    max_days_overdue INT,                       -- NULL = open-ended (final tier)
    fee_type         VARCHAR(10) NOT NULL CHECK (fee_type IN ('flat', 'percentage')),
    fee_value        NUMERIC(10,2) NOT NULL,
    CONSTRAINT chk_fee_range CHECK (max_days_overdue IS NULL OR max_days_overdue >= min_days_overdue)
);

CREATE TABLE invoices (
    invoice_id         BIGSERIAL PRIMARY KEY,
    flat_id            BIGINT NOT NULL REFERENCES flats(flat_id),
    purpose            billing_purpose NOT NULL,
    other_purpose_text VARCHAR(60),
    billing_period     DATE,          -- 1st of the billing month; NULL for one-off charges
    base_amount        NUMERIC(10,2) NOT NULL,
    late_fee_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
    due_date           DATE NOT NULL,
    status             invoice_status NOT NULL DEFAULT 'pending',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_invoice_other CHECK (purpose <> 'others' OR other_purpose_text IS NOT NULL),
    CONSTRAINT uq_recurring_invoice UNIQUE (flat_id, purpose, billing_period)
);

CREATE TABLE payments (
    payment_id      BIGSERIAL PRIMARY KEY,
    invoice_id      BIGINT NOT NULL REFERENCES invoices(invoice_id),
    paid_by         BIGINT NOT NULL REFERENCES users(user_id),
    amount_paid     NUMERIC(10,2) NOT NULL,
    gateway         payment_gateway NOT NULL,
    gateway_txn_ref VARCHAR(100) NOT NULL,
    status          payment_status NOT NULL DEFAULT 'initiated',
    receipt_number  VARCHAR(30) UNIQUE,
    receipt_pdf_url TEXT,
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_gateway_txn UNIQUE (gateway, gateway_txn_ref)
);

CREATE TABLE payment_reminders (
    reminder_id   BIGSERIAL PRIMARY KEY,
    invoice_id    BIGINT NOT NULL REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at       TIMESTAMPTZ,
    channel       VARCHAR(20) NOT NULL DEFAULT 'push',  -- push | whatsapp | email
    CONSTRAINT uq_invoice_reminder UNIQUE (invoice_id, scheduled_for)
);

-- -----------------------------------------------------------------------------
-- 7. FACILITY & AMENITY BOOKING  (EPIC 4)
-- -----------------------------------------------------------------------------
CREATE TABLE amenities (
    amenity_id                     SMALLSERIAL PRIMARY KEY,
    name                            VARCHAR(60) NOT NULL UNIQUE,
    description                     TEXT,
    capacity                        INT,
    operating_hours_start           TIME NOT NULL DEFAULT '06:00',
    operating_hours_end             TIME NOT NULL DEFAULT '22:00',
    slot_duration_minutes           INT NOT NULL DEFAULT 60,
    max_bookings_per_flat_per_week  INT NOT NULL DEFAULT 2
);

CREATE TABLE amenity_bookings (
    booking_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- verifiable booking ID / ticket
    amenity_id  SMALLINT NOT NULL REFERENCES amenities(amenity_id),
    flat_id     BIGINT NOT NULL REFERENCES flats(flat_id),
    booked_by   BIGINT NOT NULL REFERENCES users(user_id),
    slot_start  TIMESTAMPTZ NOT NULL,
    slot_end    TIMESTAMPTZ NOT NULL,
    status      booking_status NOT NULL DEFAULT 'confirmed',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_slot_order CHECK (slot_end > slot_start)
);

-- True double-booking prevention at the database level (not just app logic)
ALTER TABLE amenity_bookings
    ADD CONSTRAINT excl_no_overlapping_bookings EXCLUDE USING gist (
        amenity_id WITH =,
        tstzrange(slot_start, slot_end) WITH &&
    ) WHERE (status = 'confirmed');

-- -----------------------------------------------------------------------------
-- 8. COMMUNITY ENGAGEMENT  (EPIC 5)
-- -----------------------------------------------------------------------------
CREATE TABLE events (
    event_id      BIGSERIAL PRIMARY KEY,
    event_name    VARCHAR(150) NOT NULL,
    description   TEXT,
    location      VARCHAR(150),
    event_datetime TIMESTAMPTZ NOT NULL,
    max_capacity  INT,
    created_by    BIGINT NOT NULL REFERENCES users(user_id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE event_rsvps (
    event_id     BIGINT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    user_id      BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    rsvp_status  rsvp_status NOT NULL DEFAULT 'going',
    responded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (event_id, user_id)
);

CREATE TABLE event_volunteers (
    event_id         BIGINT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    user_id          BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role_description VARCHAR(100),
    status           volunteer_status NOT NULL DEFAULT 'applied',
    PRIMARY KEY (event_id, user_id)
);

CREATE TABLE polls (
    poll_id    BIGSERIAL PRIMARY KEY,
    question   VARCHAR(255) NOT NULL,
    created_by BIGINT NOT NULL REFERENCES users(user_id),
    starts_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    ends_at    TIMESTAMPTZ NOT NULL
);

CREATE TABLE poll_options (
    option_id   BIGSERIAL PRIMARY KEY,
    poll_id     BIGINT NOT NULL REFERENCES polls(poll_id) ON DELETE CASCADE,
    option_text VARCHAR(150) NOT NULL
);

CREATE TABLE poll_votes (
    poll_id   BIGINT NOT NULL REFERENCES polls(poll_id) ON DELETE CASCADE,
    option_id BIGINT NOT NULL REFERENCES poll_options(option_id) ON DELETE CASCADE,
    user_id   BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    voted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (poll_id, user_id)   -- guarantees one vote per resident
);

CREATE TABLE notifications (
    notification_id BIGSERIAL PRIMARY KEY,
    title           VARCHAR(150) NOT NULL,
    body            TEXT NOT NULL,
    scope           notification_scope NOT NULL,
    scope_value     VARCHAR(20),   -- e.g. block='B'; NULL when scope='society'
    created_by      BIGINT NOT NULL REFERENCES users(user_id),
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notification_deliveries (
    notification_id BIGINT NOT NULL REFERENCES notifications(notification_id) ON DELETE CASCADE,
    user_id         BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    delivered_at    TIMESTAMPTZ,
    read_at         TIMESTAMPTZ,
    PRIMARY KEY (notification_id, user_id)
);

-- -----------------------------------------------------------------------------
-- 9. INDEXES
-- -----------------------------------------------------------------------------
CREATE INDEX idx_users_flat                 ON users(flat_id);
CREATE INDEX idx_domestic_helpers_flat      ON domestic_helpers(flat_id);
CREATE INDEX idx_helper_logs_date           ON helper_attendance_logs(log_date);

CREATE INDEX idx_visitors_host_flat         ON visitors(host_flat_id);
CREATE INDEX idx_visitors_pending           ON visitors(approval_status) WHERE approval_status = 'pending';

-- "Known Issues" board: open complaints grouped by category + block (story 5.22)
CREATE INDEX idx_complaints_known_issues    ON complaints(category, block, status)
    WHERE status IN ('open', 'acknowledged', 'assigned', 'in_progress');
CREATE INDEX idx_complaints_raised_by       ON complaints(raised_by);

CREATE INDEX idx_tasks_status               ON maintenance_tasks(status);
CREATE INDEX idx_tasks_assigned_to          ON maintenance_tasks(assigned_to);
CREATE INDEX idx_tasks_sla_open             ON maintenance_tasks(sla_due_at)
    WHERE status NOT IN ('done', 'cancelled');

CREATE INDEX idx_invoices_flat_status       ON invoices(flat_id, status);
CREATE INDEX idx_invoices_overdue           ON invoices(due_date) WHERE status IN ('pending', 'overdue');
CREATE INDEX idx_payments_invoice           ON payments(invoice_id);

CREATE INDEX idx_bookings_flat_week         ON amenity_bookings(flat_id, amenity_id, slot_start);

CREATE INDEX idx_event_datetime             ON events(event_datetime);
CREATE INDEX idx_notification_deliveries_user ON notification_deliveries(user_id) WHERE read_at IS NULL;

-- -----------------------------------------------------------------------------
-- 10. updated_at AUTO-MAINTENANCE
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_flats_updated       BEFORE UPDATE ON flats             FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated       BEFORE UPDATE ON users             FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_complaints_updated  BEFORE UPDATE ON complaints        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tasks_updated       BEFORE UPDATE ON maintenance_tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_invoices_updated    BEFORE UPDATE ON invoices          FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- 11. SEED / REFERENCE DATA
-- -----------------------------------------------------------------------------
INSERT INTO roles (role_id, role_name) VALUES
    (1, 'admin'),
    (2, 'committee_member'),
    (3, 'flat_owner'),
    (4, 'resident_rental'),
    (5, 'support_staff');

-- Staggered late fee example (story 5.14): flat fee first two weeks, then a
-- percentage escalator — tune values to the society's actual by-laws.
INSERT INTO late_fee_rules (min_days_overdue, max_days_overdue, fee_type, fee_value) VALUES
    (1,  7,   'flat',       100.00),
    (8,  15,  'flat',       250.00),
    (16, NULL,'percentage', 2.00);

INSERT INTO amenities (name, capacity, slot_duration_minutes, max_bookings_per_flat_per_week) VALUES
    ('Clubhouse',    80, 120, 1),
    ('Tennis Court',  4,  60, 2),
    ('Gym',          20,  60, 5);
