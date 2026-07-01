Create me a better database design, I have already tried to have it done partially, now create a complete one based on user stories and and also common known features of an application like this. Make sure it professional, and in best case scenario to use with context to storage, queries, etc as an experienced software engineer.

Attached Files:
- database.md
```
# Users
- id (primary key)
- name (not null)
- roles (not null)
    - admin (only one)
    - committee member
    - flat owners (residing or given to rentals)
    - resident (rental)
    - support staff (includes gardeners, house-help, security personnel, maintenance workers, event volunteers)
- e-mail (not null)
- contact (not null) (phone Number with country code)
- whatsapp contact (not null) (same as contact or different)
- block (foreign key from society)
- flat (foreign key from society)
- floor (foreign key from society)
# Society
- block (composite primary key)
- flat (composite primary key)
- floor (composite primary key)
- residential-status
    - occupied
    - empty
# Maintenance
- maintenance-id (primary key)
- block (foreign key from society)
- floor (foreign key from society)
- flat (foreign key from society)
- maintenance
    - lift 
    - garden
    - cleaning
    - club house
- maintenance note (paragraph)
- assigned
    - True
    - False
- status
    - pending
    - undergoing
    - done
# Complaints
- id  (foreign key from users)
- reason
    - lift
    - garden
    - cleaning
    - club house
    - neighbouring flats
    - security
    - others (mention in one-three words)
- complaint (paragraph)
# Finance
- id (foreign key from users)
- roles (foreign key from users)
- purpose
    - maintenance
    - event donation
    - society electricity
    - water tanker
    - others (mention it)
- status
    - pending
    - paid
- 
# Events
- event-id (primary key)
- event-name
- ...
```
- milestone-1 pdf

Response:
```Thought for 3m 19s

I'll design a complete, normalized schema covering every epic in your user stories (billing, complaints/maintenance, visitor management, facility booking, events/polls, notifications) plus the parts your draft already had. Let me build this out as a proper design doc + executable schema.


Synthesized schema documentation with entity relationships for professional implementation
Three deliverables, all built directly off your 6 epics:

- database_design.md — the full design doc: rationale for every module, business rules enforced structurally (single admin, no double-bookings, one vote per poll), indexing strategy, sample queries per epic, scalability notes, and a requirements traceability table mapping every user story to its tables.
- schema.sql — complete executable PostgreSQL DDL (enums, tables, constraints, indexes, triggers, seed data).
- erd.mermaid — the entity-relationship diagram.
The biggest structural fixes over your draft: Society's composite key became a proper flats.flat_id surrogate key; Maintenance and Complaints are now actually linked instead of being two disconnected tables with overlapping categories; Finance is split into invoices/payments/late_fee_rules so it can represent a real billing lifecycle (multi-gateway payments, receipts, staggered late fees); and I added everything your epics need that had no table at all — visitor management, facility booking with a real double-booking-proof constraint, events/RSVPs/volunteers, polls, and notifications.```

Files Generated:
- database_design.md
- schema.sql
- erd.mermaid