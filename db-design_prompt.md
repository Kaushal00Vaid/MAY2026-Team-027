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