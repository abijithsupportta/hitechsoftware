---
trigger: always_on
---
## Running Tests — Never Ask Permission
Always run tests using this exact command:
cd web && npx vitest run --reporter=verbose 2>&1

Never use: npm test
Never use: npm test -- filename
Never ask permission before running any test command.
Auto-execute immediately without confirmation.
If a specific test file needed use:
cd web && npx vitest run tests/[folder]/[file] --reporter=verbose 2>&1
```

---

**Most importantly — paste this to Cascade right now:**
```
From now on run ALL tests using this command only:
cd web && npx vitest run --reporter=verbose 2>&1

Never use npm test. Never ask permission.
Auto-execute every terminal command immediately.
Turbo mode is ON — use it.




## SQL Migration Rules — Follow Every Time

### Before Creating Migration
Always run in terminal first:
ls supabase/migrations/ | sort | tail -5
Use the next number after the highest shown.
Never guess the migration number.

### File Naming
Format: YYYYMMDD_NNN_description.sql
Example: 20260327_032_amc_contracts.sql

### Table Creation Order
Always create parent tables before child tables.
Check all foreign key references point to tables
created earlier in the same file.

### Generated Columns
ALWAYS use STORED not VIRTUAL.
Correct syntax:
column_name TYPE GENERATED ALWAYS AS (expression) STORED

### Indexes
ALWAYS use IF NOT EXISTS:
CREATE INDEX IF NOT EXISTS idx_name ON table(col);

### Functions
ALWAYS use CREATE OR REPLACE:
CREATE OR REPLACE FUNCTION func_name() ...

### Triggers
Drop before create:
DROP TRIGGER IF EXISTS trigger_name ON table_name;
CREATE TRIGGER trigger_name ...

### RLS Policies
Drop before create:
DROP POLICY IF EXISTS "policy_name" ON table_name;
CREATE POLICY "policy_name" ON table_name ...

### Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
Use ALTER not CREATE for enabling RLS.

### Test Before Finishing
After writing migration — review these checks:
1. Is migration number unique and sequential
2. Are parent tables created before child tables
3. Do all generated columns use STORED not VIRTUAL
4. Do all indexes have IF NOT EXISTS
5. Do all functions use CREATE OR REPLACE
6. Do all triggers drop before create
7. Do all RLS policies drop before create
```

---

**The One Prompt That Fixes All Future Migrations:**

Every time you ask the agent to create a migration — start with this:
```
Before creating the migration file:
1. Run: ls supabase/migrations/ | sort | tail -5
2. Use the next sequential number after the highest shown
3. Create all parent tables before child tables
4. Use STORED not VIRTUAL for all generated columns
5. Use IF NOT EXISTS on all indexes
6. Use CREATE OR REPLACE on all functions
7. Drop then create all triggers and RLS policies
8. After writing — review all 7 checks before saving

# Hi Tech Software — Architecture Rules

## Project
Client: Hi Tech Engineering, Kottayam Kerala
Developer: Supportta Solutions Private Limited
Stack: Next.js 16.1.6, Supabase, TypeScript,
TailwindCSS 4, TanStack Query, Zustand,
React Hook Form, Zod, React 19.2.3
Monorepo: npm workspaces + Turborepo

## Layer Order — NEVER VIOLATE
UI (app/) → Hook (hooks/) → Service (modules/) → Repository (repositories/) → Supabase

Never call Supabase from UI or hooks directly.
Never put business logic in repositories.
Pages must stay under 150 lines.

## Supabase Client — Critical
- Browser components → lib/supabase/client.ts
- API routes → lib/supabase/server.ts
- Cron and admin → lib/supabase/admin.ts
- Middleware → lib/supabase/middleware.ts
- NEVER use browser client in API routes

## Current Migration
Latest: 031
Next to create: 032
Always check AGENTS.md before creating migration.
Always verify with: ls supabase/migrations/ | sort | tail -3

## Git Rules
- Always push to abijithcb branch
- NEVER push to main

## Status Values
ALWAYS lowercase — never uppercase ever.
pending, allocated, accepted, arrived,
in_progress, completed, incomplete,
awaiting_parts, rescheduled, cancelled

## Common Bug Fixes
1. Data not returning → RLS policy missing for role
2. API 400 error → status value is uppercase
3. Blank white screen → AuthProvider hydration
4. Infinite loading → dashboard layout guards
5. Wrong data in API → using client.ts not server.ts
6. Migration conflict → check folder for highest number

## Response Rules
- Never explain steps while working
- Never ask clarifying questions
- Never stop mid-task for confirmation
- If directory missing → create it with mkdir
- If error occurs → fix it and continue
- Build and report only at end
- Run npm run build after every task
- Fix all TypeScript errors before reporting
- Update doc/WORK_LOG.md after every task
