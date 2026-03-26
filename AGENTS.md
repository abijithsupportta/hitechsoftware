# Hi Tech Software — Agent Guide

- If write_to_file fails — check directory exists 
  first using terminal, create with mkdir if needed,
  then retry the file write
- Never ask the user to choose between options
- Always self-diagnose and self-fix errors

## Project Overview
Service Management System for Hi Tech Engineering, Kottayam Kerala.
Client: Hi Tech Engineering
Developer: Supportta Solutions Private Limited
Phone: +91 85903 77418
Address: 3rd Floor CSI Complex, Kottayam, Kerala

## What This System Does
Home appliance repair management — connects office staff,
field technicians, inventory, billing, and reporting into
one platform. Replaces WhatsApp-based job dispatch entirely.
Handles warranty, AMC, digital bag, payouts, and reporting.

## Tech Stack
- Monorepo: npm workspaces + Turborepo
- Frontend: Next.js 16.1.6 (App Router, Turbopack, React Compiler)
- React: 19.2.3
- State: Zustand + TanStack React Query
- Forms: React Hook Form + Zod
- Styling: Tailwind CSS 4
- Icons: Lucide React
- Toasts: Sonner
- PDF: @react-pdf/renderer
- Backend: Supabase (PostgreSQL + Auth + Storage + RLS)
- Testing: Vitest + Testing Library + MSW
- Deployment: Vercel
- Node: >= 22

## Current Build Status

### Complete — Do Not Rebuild These
- Authentication and role management
- Customer module — CRUD, primary and secondary addresses
- Team management — profiles, technicians, performance stats
- Attendance module — toggle on/off, daily logs, cron jobs
- Service module — subjects, brands, dealers, categories
- Warranty and AMC — contracts, chaining, expiry tracking
- Technician assignment — accept/reject, reschedule, daily limits
- Job workflow — arrived, in progress, completion, photos, incomplete reasons
- Billing and PDF generation — visit charge, service charge, accessories, payment modes
- Inventory — products, categories, product types, 
  stock entries, WAC, MRP change log, refurbished support
- Digital bag — sessions, items, capacity 50 items, 
  consumption per job, variance calculation
- Payout system — pending/approved/paid workflow, 
  variance auto-deduction
- Stock pricing — purchase price, MRP inclusive GST, 
  mrp_change_log, auto-update from latest stock entry
- GST and discount billing — MRP/1.18 split, 
  percentage and flat discounts, generated columns
- Stock balance dashboard — current_stock_levels view, 
  summary cards, status badges, category/type filters
- Scale architecture — indexes, materialized views, role helper functions
- Auth hardening — middleware, session expiry, hydration safety
- Deployment on Vercel
- Technician Commission and Performance tracking system
  - technician_commission_config table
  - technician_earnings_summary table with generated net_earnings column
  - extra_price_collected auto-calculation trigger on subject_accessories
  - sync_technician_earnings function
  - technician_leaderboard materialized view (daily/weekly/monthly)
  - Commission section in subject detail page
  - Leaderboard page with gold/silver/bronze ranking
  - Payout details page with monthly chart
  - Technician earnings tab with summary cards and table
  - API routes for commission CRUD
  - Billing integration — auto-syncs earnings on bill generation

### In Progress
- None

### Pending — Build These Next In Order
1. WhatsApp notifications — Fast2SMS — lib/whatsapp/ already scaffolded
2. Reports and analytics module
3. Flutter technician app — hitech_technician/ already scaffolded
4. Flutter admin app — hitech_admin/ already scaffolded

## Database — Critical Numbers
Latest migration number: 030
Next migration to create: 031
Always verify by checking supabase/migrations/ folder for highest number.
Update this number here after every new migration is created.

## Database Tables
subjects, profiles, customers, brands, dealers, service_categories,
inventory_products, stock_entries, stock_entry_items,
digital_bag_sessions, digital_bag_items, digital_bag_consumptions,
subject_accessories, subject_photos, subject_contracts,
attendance_logs, mrp_change_log, technician_service_payouts,
subject_bills, subject_history, auth_logs,
technician_commission_config, technician_earnings_summary,
current_stock_levels (view)

## Materialized Views
daily_service_summary — daily job and revenue totals
technician_monthly_performance — monthly stats per technician
brand_financial_summary — brand invoices and dues
dealer_financial_summary — dealer invoices and dues
refresh_all_materialized_views() — called by hourly cron
refresh_financial_summaries() — call after every bill payment update
technician_leaderboard — daily/weekly/monthly technician rankings
refresh_leaderboard() — refreshes technician_leaderboard view

## RLS Policy Rule
Migrations 017 and above — use get_my_role() function
Migrations before 017 — use current_user_role()
Never change old migrations — only add new ones

## Module Map
| Module | Repository | Hooks Dir | Dashboard Path |
|---|---|---|---|
| Auth | auth.repository.ts | hooks/auth/ | /login |
| Subjects | subject.repository.ts | hooks/subjects/ | /dashboard/subjects |
| Customers | customer.repository.ts | hooks/customers/ | /dashboard/customers |
| Team | technician.repository.ts | hooks/team/ | /dashboard/team |
| Attendance | attendance.repository.ts | hooks/attendance/ | /dashboard/attendance |
| Brands | brands.repository.ts | hooks/brands/ | /dashboard/service/brands |
| Dealers | dealers.repository.ts | hooks/dealers/ | /dashboard/service/dealers |
| Service Categories | service-categories.repository.ts | hooks/service-categories/ | /dashboard/service/categories |
| Products | products.repository.ts | hooks/products/ | /dashboard/inventory/products |
| Product Categories | product-categories.repository.ts | hooks/product-categories/ | /dashboard/inventory/categories |
| Product Types | product-types.repository.ts | hooks/product-types/ | /dashboard/inventory/product-types |
| Stock Entries | stock-entries.repository.ts | hooks/stock-entries/ | /dashboard/inventory/stock |
| Stock Balance | products.repository.ts | hooks/products/ | /dashboard/inventory/stock-balance |
| Digital Bag | digital-bag.repository.ts | hooks/digital-bag/ | /dashboard/digital-bag |
| My Bag | digital-bag.repository.ts | hooks/digital-bag/ | /dashboard/my-bag |
| Payouts | payout.repository.ts | — | /dashboard/payouts |
| Billing | billing.repository.ts, bill.repository.ts | — | via subjects detail |
| Photos | photo.repository.ts | — | via subjects detail |
| Contracts/AMC | contract.repository.ts, amc.repository.ts | hooks/contracts/ | via subjects detail |
| Accessories | accessory.repository.ts | — | via subjects detail |
| Commission | commission.repository.ts | hooks/commission/ | via subjects detail, /dashboard/leaderboard, /dashboard/payouts/[id] |

## API Routes
- /api/subjects/[id]/workflow — job status transitions
- /api/subjects/[id]/billing — billing operations
- /api/subjects/[id]/photos — photo CRUD
- /api/subjects/[id]/photos/upload — photo upload
- /api/subjects/[id]/respond — technician accept/reject
- /api/team/members — team member CRUD
- /api/team/members/[id] — individual team member
- /api/team/members/[id]/performance — performance stats
- /api/team/members/completed-counts — completion counts
- /api/bills/[id]/download — PDF bill download
- /api/attendance/toggle — attendance toggle
- /api/dashboard/technician/completed-summary — technician dashboard
- /api/commission/[subjectId] — commission GET/POST for a subject

## Supabase Client — Which to Use Where
| Context | File | Notes |
|---|---|---|
| Browser components | lib/supabase/client.ts | Respects RLS, has build-time fallbacks |
| API routes and server | lib/supabase/server.ts | Cookie-based auth, respects RLS |
| Admin and cron | lib/supabase/admin.ts | Service role key, bypasses RLS |
| Middleware | lib/supabase/middleware.ts | Auth session refresh |

## Critical Files — Read Before Editing
- web/modules/ — all business logic
- web/repositories/ — all database queries — 20 repository files
- web/hooks/ — all TanStack Query hooks
- web/app/dashboard/ — all UI pages
- web/app/api/ — API routes
- web/stores/ — auth.store.ts, notification.store.ts, ui.store.ts
- web/lib/supabase/ — client.ts, server.ts, admin.ts, middleware.ts
- web/lib/constants/ — roles.ts and routes.ts
- web/types/ — TypeScript type definitions
- web/config/ — navigation.ts and permissions.ts

## Architecture Pattern — MUST FOLLOW ALWAYS
UI (app/) → Hook (hooks/) → Service (modules/) → Repository (repositories/) → Supabase
Never skip a layer. Never combine layers.

## New Module Template — Always Follow This Order
1. supabase/migrations/[next_number]_[name].sql
2. modules/[name]/[name].types.ts
3. modules/[name]/[name].constants.ts
4. modules/[name]/[name].validation.ts
5. modules/[name]/[name].service.ts
6. repositories/[name].repository.ts
7. hooks/[name]/use[Name].ts
8. components/[name]/
9. app/dashboard/[name]/page.tsx

## Response Format
Success: { success: true, data: T }
Error: { success: false, error: string, code: string }

## Common Bugs and Exact Fixes
1. Data not returning → RLS policy missing for that role
2. Workflow API 400 error → Status value is uppercase — must be lowercase
3. Blank white screen → AuthProvider hydration not completing
4. Infinite loading → Dashboard layout guards incorrect
5. Wrong Supabase client → API route using client.ts instead of server.ts
6. Build fails on deploy → Module-level createClient() fails without env vars — client.ts has build-time fallbacks, do not change
7. TypeScript implicit any → Add explicit type annotations to filter/reduce callbacks
8. Migration conflict → New migration number already exists — check folder
9. WAC wrong → Stock quantity was zero — edge case not handled
10. Bill calculation wrong → MRP entered as exclusive not inclusive

## Pricing Reference
MRP = inclusive of 18% GST always
Base price = MRP / 1.18
GST = MRP - base price
Discounted MRP = MRP - discount amount
Final line total = discounted MRP × quantity
Bill grand total = all line totals + visit charge + service charge
Generated columns in subject_accessories handle all calculations automatically

## Subject Status Flow
pending → allocated → accepted → arrived → in_progress → completed
or → incomplete → rescheduled → back to pending
or → awaiting_parts → back to pending when parts arrive
or → cancelled
All values lowercase always

## Business Rules Quick Reference
- Bag: 50 items max per technician per day
- Attendance: ON before 10:30 AM, auto OFF midnight
- Subject number: unique per brand or per dealer — not global
- AMC: new starts after current ends — no overlap
- Payout: set manually after completion, cannot pay without amount
- Variance: auto deducted from payout when bag closed with missing parts
- MRP: latest invoice MRP always auto-updates product MRP
- Selling price: never below MRP

## Git Rules
- Always push to abijithcb branch
- Never push to main
- Conventional commit messages: feat, fix, chore, docs

## Agent Rules
- Never ask clarifying questions — make best decision and note it
- Never explain steps — build and report only
- Never rebuild complete modules — check this file first
- Always check migration number before creating migration
- Always run npm run build and fix all errors before reporting
- Always update doc/WORK_LOG.md after every completed task
- Always push to abijithcb — never main
- Update migration number in this file after creating new migration
```

---

**`.cursorignore`** — replace entire file:
```
doc/
supabase/migrations/
web/docs/
web/.next/
web/node_modules/
hitech_admin/build/
hitech_admin/.dart_tool/
hitech_technician/build/
hitech_technician/.dart_tool/
node_modules/
*.log
*.sql
.git