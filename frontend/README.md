# SocietySync - Frontend

This is the frontend web client for **SocietySync**, a modern housing society and community management platform. Built with **React 19** and **Vite**, it provides responsive, role-based dashboards and portals for Admins, Residents, Security Personnel, and Staff.

---

## Tech Stack & Technologies Used

- **Framework & Core:** [React 19](https://react.dev/), [React Router v7](https://reactrouter.com/), [Vite](https://vite.dev/)
- **Styling & UI:** [Tailwind CSS v4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/) (`@shadcn/react`, `@base-ui/react`), [Lucide React Icons](https://lucide.dev/), `@fontsource-variable/inter`
- **Theme & Utilities:** `next-themes` (Dark/Light mode), `clsx`, `tailwind-merge`, `class-variance-authority`, `tw-animate-css`
- **Data Validation & Forms:** [Zod](https://zod.dev/), `date-fns`, `react-day-picker`, `input-otp`
- **Charts & Visualizations:** [Recharts](https://recharts.org/)
- **UI Components & Feedback:** `sonner` (Toast notifications), `embla-carousel-react`, `react-resizable-panels`, `cmdk`
- **Linting & Code Quality:** ESLint v10, Prettier

---

## Prerequisites

Before running the frontend, ensure you have the following installed on your system:

- **Node.js**: `v18.0.0` or higher (v20+ recommended)
- **npm**: `v9.0.0` or higher (comes bundled with Node.js) or `yarn` / `pnpm`

---

## Getting Started (Installation & Setup)

### 1. Navigate to the Frontend Directory

From the project root folder:

```bash
cd frontend
```

### 2. Install Dependencies

Install all required npm packages:

```bash
npm install
```

### 3. Start Development Server

Run the Vite development server with Hot Module Replacement (HMR):

```bash
npm run dev
```

Once started, open your browser and navigate to:
```text
http://localhost:5173
```

---

## Available Scripts

In the `frontend` directory, you can run:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite local development server |
| `npm run build` | Compiles and bundles the project for production in `dist/` |
| `npm run preview` | Previews the production build locally |
| `npm run lint` | Runs ESLint to check for syntax and code formatting issues |

---

## Project Structure

```text
frontend/
├── public/                 # Static public assets
├── src/
│   ├── assets/             # Images and local static assets
│   ├── components/         # Reusable UI components & shadcn components
│   │   └── ui/             # Standardized UI primitives
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility modules (e.g., utils.js)
│   ├── pages/              # Application pages & portal modules
│   ├── App.jsx             # Main Application component & route definitions
│   ├── App.css             # Main stylesheet & Tailwind import rules
│   ├── index.css           # Fallback base CSS styles
│   └── main.jsx            # React entry point
├── components.json         # shadcn/ui configuration
├── eslint.config.js        # ESLint configuration
├── jsconfig.json           # JavaScript path aliases (`@/*` mapping)
├── package.json            # Dependencies and scripts
└── vite.config.js          # Vite build & plugin configuration
```

---

## Application Portals & Routing

The frontend defines full role-based routes for SocietySync:

- **Public Routes:**
  - `/` — Landing Page
  - `/signin` — Sign In Page
  - `/signup` — Registration Page

- **Admin Portal (`/admin`):**
  - `/admin` — Main Admin Dashboard
  - `/admin/finance` — Financial Management & Ledger
  - `/admin/helpdesk` — Support Tickets & Issue Resolution
  - `/admin/security` — Gate Logs & Visitor Oversight
  - `/admin/amenities` — Facility Booking Management
  - `/admin/community` — Society Announcements & Discussions
  - `/admin/analytics` — Platform Analytics & Reports

- **Resident Portal (`/resident`):**
  - `/resident` — Resident Dashboard
  - `/resident/finance` — Maintenance Dues & Payment Receipts
  - `/resident/helpdesk` — Raise & Track Helpdesk Complaints
  - `/resident/amenities` — Book Common Facilities
  - `/resident/community` — Resident Forum & Notices
  - `/resident/digital-id` — Digital Resident Pass & Gate Entry QR

- **Security & Staff Portal (`/gate`):**
  - `/gate` — Security Guard Dashboard & Visitor Gate Control
  - `/gate/maintenance` — Work Order & Maintenance Status
  - `/gate/operations` — Daily Operations Checklist
  - `/gate/inventory` — Equipment & Supply Stock Control
  - `/gate/roster` — Staff Attendance & Duty Roster

---

## Related Documentation

- Root Project README: [README.md](../README.md)
