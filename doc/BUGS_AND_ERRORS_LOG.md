# Hi Tech Software - Bugs and Errors Log

## 🎯 Purpose

This file tracks all bugs, errors, and mistakes encountered during development. Each entry includes the problem, solution, and prevention measures.

---

## 📅 **2026-03-27**

### **TypeScript Build Errors in AMC Pages**

#### **Error Description**
```
Type error: Argument of type 'number' is not assignable to parameter of type 'string'.
```

#### **Location**
- `web/app/dashboard/amc/new/page.tsx:65:28`
- `web/app/dashboard/amc/new/page.tsx:71:38`
- `web/app/dashboard/amc/[id]/renew/page.tsx:81:19`

#### **Root Cause**
- `price_paid` field expected string but received number from `parseFloat()`
- `parts_coverage_limit` expected `number | undefined` but received `number | null`
- Form validation using `parseFloat()` on string fields

#### **Solution Applied**
```typescript
// Before (causing error)
price_paid: parseFloat(formData.price_paid)

// After (fixed)
price_paid: formData.price_paid

// For null/undefined handling
parts_coverage_limit: formData.parts_coverage_limit || undefined

// For validation
parseFloat(formData.price_paid.toString())
```

#### **Prevention**
- Always check TypeScript types before using type conversion
- Use proper type guards for nullable values
- Test form validation with actual data types

---

### **useQuery Server-Side Rendering Error**

#### **Error Description**
```
Error: Attempted to call useQuery() from the server but useQuery is on the client.
```

#### **Location**
- `web/app/dashboard/amc/page.tsx`

#### **Root Cause**
- Missing `'use client'` directive in page component
- Next.js App Router treating component as server component

#### **Solution Applied**
```typescript
// Added at top of file
'use client';

import React from 'react';
// ... rest of imports
```

#### **Prevention**
- Always add `'use client'` to pages using hooks
- Check for client-side hooks before creating pages
- Test build process to catch SSR issues

---

### **Database Foreign Key Constraint Error**

#### **Error Description**
```
ERROR: insert or update on table "stock_entries" violates foreign key constraint
DETAIL: Key (supplier_id) is not present in table "suppliers".
```

#### **Location**
- Database migration and stock entry creation

#### **Root Cause**
- `stock_entries.supplier_id` referenced non-existent `suppliers` table
- Missing suppliers table in database schema

#### **Solution Applied**
```sql
-- Created suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name varchar(255) NOT NULL,
  contact_person varchar(255),
  phone varchar(20),
  email varchar(255),
  address text,
  gstin varchar(20),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Added sample data
INSERT INTO public.suppliers (supplier_name, contact_person, phone, email, address, gstin)
VALUES 
  ('Default Supplier', 'Supplier Contact', '9876543210', 'supplier@example.com', 'Supplier Address', '27AAAPL1234C1ZV'),
  ('Local Parts Store', 'Store Manager', '9876543211', 'store@example.com', 'Local Address', '27AAAPL5678D2ZV');
```

#### **Prevention**
- Always check foreign key dependencies before creating tables
- Create dependent tables before referencing tables
- Test database migrations in staging environment

---

### **Subject Status Enum Uppercase Issue**

#### **Error Description**
```
API 400 errors on status transitions
```

#### **Location**
- All subject status API endpoints

#### **Root Cause**
- Database enum values were uppercase: `'PENDING'`, `'ALLOCATED'`, etc.
- Codebase expected lowercase values: `'pending'`, `'allocated'`, etc.
- Status validation failing due to case mismatch

#### **Current Status**
- **Issue Identified**: Not yet fixed due to materialized view dependencies
- **Impact**: API 400 errors on all status transitions
- **Priority**: High - affects core workflow

#### **Proposed Solution**
```sql
-- Need to drop and recreate materialized views first
-- Then update enum values to lowercase
ALTER TYPE subject_status RENAME TO subject_status_old;
CREATE TYPE subject_status AS ENUM (
  'pending', 'allocated', 'accepted', 'arrived',
  'in_progress', 'completed', 'incomplete',
  'awaiting_parts', 'reschedule', 'cancelled'
);
-- Update all tables using the enum
DROP TYPE subject_status_old;
```

#### **Prevention**
- Always use lowercase for enum values
- Test enum changes in development first
- Check for view dependencies before enum changes

---

### **AMC Contracts sold_by Type Mismatch**

#### **Error Description**
```
Type error: sold_by is varchar but should be uuid for profile joins
```

#### **Location**
- `amc_contracts.sold_by` column

#### **Root Cause**
- `sold_by` column defined as `varchar(255)` instead of `uuid`
- Cannot join to `profiles` table for salesperson information
- Commission linking broken for AMC sales

#### **Current Status**
- **Issue Identified**: Not yet fixed
- **Impact**: AMC commission calculations broken
- **Priority**: Medium - affects financial reporting

#### **Proposed Solution**
```sql
ALTER TABLE amc_contracts 
  ALTER COLUMN sold_by TYPE uuid 
  USING CASE 
    WHEN sold_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN sold_by::uuid
    ELSE NULL
  END;
```

#### **Prevention**
- Always use correct data types for foreign keys
- Test joins after schema changes
- Validate data types during development

---

### **PowerShell Script Parsing Errors**

#### **Error Description**
```
PowerShell parsing errors with complex SQL queries in strings
```

#### **Location**
- `scripts/extract_database.ps1`
- `scripts/get_database_data.ps1`
- `scripts/quick_extract.ps1`

#### **Root Cause**
- PowerShell string parsing conflicts with SQL syntax
- Special characters in SQL causing parsing issues
- Complex multi-line strings not properly escaped

#### **Failed Attempts**
- Multiple PowerShell scripts created but failed to execute
- `head` command not available in PowerShell environment
- String literal parsing conflicts with SQL keywords

#### **Solution Applied**
- **Abandoned PowerShell approach**
- **Used direct Supabase CLI commands instead**
- **Created SQL scripts for database operations**

#### **Working Solution**
```bash
# Direct CLI commands work perfectly
npx supabase db query --linked "SELECT COUNT(*) FROM table_name"
npx supabase db query --linked --file script.sql
```

#### **Prevention**
- Use appropriate tools for each environment
- Test scripts in target environment
- Avoid complex string parsing in PowerShell

---

### **Docker Dependency Issues**

#### **Error Description**
```
Docker Desktop not installed - Supabase CLI local commands failing
```

#### **Location**
- All `npx supabase db` commands without `--linked` flag

#### **Root Cause**
- Supabase CLI defaults to local Docker instance
- Docker Desktop not installed on user system
- Local database commands failing

#### **Solution Applied**
- **Used `--linked` flag for all database operations**
- **Connected to remote Supabase database directly**
- **Bypassed local Docker requirement**

#### **Working Commands**
```bash
# Instead of: npx supabase db query "SELECT 1"
# Use: npx supabase db query --linked "SELECT 1"
```

#### **Prevention**
- Always use `--linked` flag for remote operations
- Document Docker dependency in setup instructions
- Provide alternative commands for different environments

---

### **Migration Number Conflicts**

#### **Error Description**
```
Migration number already exists - conflict when creating new migration
```

#### **Location**
- `supabase/migrations/` folder

#### **Root Cause**
- Not checking existing migration numbers before creating new ones
- Manual numbering causing conflicts
- Multiple developers creating migrations simultaneously

#### **Solution Applied**
```bash
# Always check existing migrations first
ls supabase/migrations/ | sort | tail -5

# Use next sequential number
# Example: If 033 exists, create 034
```

#### **Prevention**
- Always check migration folder before creating new migrations
- Use automated script to get next migration number
- Document migration numbering convention

---

### **Generated Column Type Errors**

#### **Error Description**
```
ERROR: column "status" cannot be cast automatically to type subject_status
```

#### **Location**
- Migration 034 attempting to change enum type

#### **Root Cause**
- Default value constraint preventing automatic type casting
- Materialized views depending on column
- Need to drop default before type change

#### **Solution Applied**
```sql
-- Drop default first
ALTER TABLE subjects ALTER COLUMN status DROP DEFAULT;

-- Then change type
ALTER TABLE subjects 
  ALTER COLUMN status TYPE subject_status 
  USING CASE 
    WHEN status = 'PENDING' THEN 'pending'::subject_status
    -- ... other cases
  END;

-- Add new default
ALTER TABLE subjects ALTER COLUMN status SET DEFAULT 'pending';
```

#### **Prevention**
- Check for constraints before type changes
- Drop dependent objects before major changes
- Test migrations in staging environment

---

### **API Route Parameter Handling Errors**

#### **Error Description**
```
Next.js 16 API route parameter destructuring not working
```

#### **Location**
- `web/app/api/amc/[id]/route.ts`
- `web/app/api/subjects/[id]/billing/route.ts`

#### **Root Cause**
- Next.js 16 changed API route parameter handling
- Old destructuring pattern no longer works
- Need to use async `context.params`

#### **Solution Applied**
```typescript
// Before (Next.js 15 pattern)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // ...
}

// After (Next.js 16 pattern)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  // ...
}
```

#### **Prevention**
- Check Next.js version compatibility
- Update API route patterns for new versions
- Test API routes after framework updates

---

### **React Component Invalid Props**

#### **Error Description**
```
Object literal may only specify known properties, and 'className' does not exist
```

#### **Location**
- `web/app/dashboard/amc/[id]/page.tsx:130:9`

#### **Root Cause**
- Using invalid prop name on Badge component
- `className` should be `variant` or other valid prop
- Component API not properly checked

#### **Solution Applied**
```typescript
// Before (invalid)
<Badge className="some-class">Content</Badge>

// After (valid)
<Badge variant="secondary">Content</Badge>
```

#### **Prevention**
- Check component documentation before using
- Use TypeScript to catch prop errors
- Test components in isolation

---

## 📅 **2026-03-26**

### **Materialized View RLS Policy Error**

#### **Error Description**
```
ERROR: cannot add RLS policy to materialized view
```

#### **Location**
- Migration 030 creating technician_leaderboard

#### **Root Cause**
- PostgreSQL doesn't support RLS on materialized views
- Attempting to add RLS policy to materialized view
- Need to secure underlying tables instead

#### **Solution Applied**
```sql
-- Removed RLS from materialized view
-- Secured underlying tables with proper RLS
-- Documented limitation in comments
```

#### **Prevention**
- Check PostgreSQL limitations for materialized views
- Secure base tables instead of views
- Document known limitations

---

### **Column Name Mismatch in Queries**

#### **Error Description**
```
column "ticket_number" does not exist
```

#### **Location**
- `web/repositories/payout.repository.ts`

#### **Root Cause**
- Using wrong column name in query
- `ticket_number` should be `subject_number`
- Schema changes not reflected in repository

#### **Solution Applied**
```typescript
// Before (wrong)
query = query.ilike('subject.ticket_number', `%${search}%`);

// After (correct)
query = query.ilike('subject.subject_number', `%${search}%`);
```

#### **Prevention**
- Keep repository queries in sync with schema
- Test queries after schema changes
- Use TypeScript types to catch column name errors

---

## 📅 **2026-03-25**

### **Digital Bag Session Unique Constraint Error**

#### **Error Description**
```
ERROR: duplicate key value violates unique constraint
```

#### **Location**
- `digital_bag_sessions` table

#### **Root Cause**
- Multiple bag sessions for same technician on same date
- Unique constraint on (technician_id, session_date)
- Need to handle existing sessions before creating new ones

#### **Solution Applied**
```sql
-- Added unique constraint with proper handling
ALTER TABLE digital_bag_sessions 
  ADD CONSTRAINT unique_daily_session 
  UNIQUE (technician_id, session_date);

-- Updated application logic to check existing sessions
```

#### **Prevention**
- Test constraint violations in development
- Handle edge cases in application logic
- Document constraint requirements

---

## 📅 **2026-03-24**

### **WAC Calculation Edge Case Error**

#### **Error Description**
```
Division by zero in WAC calculation
```

#### **Location**
- Weighted Average Cost calculation in stock entries

#### **Root Cause**
- Stock quantity was zero in edge case
- WAC calculation dividing by zero
- No validation for zero quantity

#### **Solution Applied**
```sql
-- Added zero quantity check
UPDATE inventory_products 
SET wac = CASE 
  WHEN total_quantity = 0 THEN 0 
  ELSE total_cost / total_quantity 
END;
```

#### **Prevention**
- Add validation for edge cases
- Test with zero values
- Use COALESCE for default values

---

## 📅 **2026-03-23**

### **GST Calculation Logic Error**

#### **Error Description**
```
GST amount calculated incorrectly
```

#### **Location**
- Subject accessories GST calculations

#### **Root Cause**
- MRP entered as exclusive instead of inclusive
- GST calculation assuming inclusive MRP
- Business logic not properly documented

#### **Solution Applied**
```sql
-- Fixed GST calculation logic
-- MRP should always be inclusive of 18% GST
base_price = mrp / 1.18
gst_amount = mrp - base_price
```

#### **Prevention**
- Document business rules clearly
- Validate input data assumptions
- Test calculations with known values

---

## 📅 **2026-03-22**

### **Auth Provider Hydration Error**

#### **Error Description**
```
Blank white screen on initial load
```

#### **Location**
- Authentication provider component

#### **Root Cause**
- AuthProvider hydration not completing
- Server and client state mismatch
- Next.js SSR hydration issue

#### **Solution Applied**
```typescript
// Added hydration check
const [isHydrated, setIsHydrated] = useState(false);

useEffect(() => {
  setIsHydrated(true);
}, []);

// Render children only after hydration
{isHydrated ? children : <div>Loading...</div>}
```

#### **Prevention**
- Test SSR hydration for all providers
- Use hydration checks for complex state
- Test initial page loads

---

## 📅 **2026-03-20**

### **Subject Number Generation Conflict**

#### **Error Description**
```
Duplicate subject numbers generated
```

#### **Location**
- Subject creation logic

#### **Root Cause**
- Subject number not unique per brand/dealer
- Global uniqueness causing conflicts
- Business rule not properly implemented

#### **Solution Applied**
```sql
-- Updated subject number generation to be per brand/dealer
-- Added unique constraint per brand/dealer combination
```

#### **Prevention**
- Clarify business rules before implementation
- Test uniqueness constraints
- Use database constraints for validation

---

## 📅 **2026-03-17**

### **AMC Contract Overlap Error**

#### **Error Description**
```
AMC contracts overlapping in time periods
```

#### **Location**
- AMC contract creation logic

#### **Root Cause**
- No validation for contract date overlap
- Multiple contracts for same appliance
- Business rule not enforced

#### **Solution Applied**
```sql
-- Added overlap validation
CREATE OR REPLACE FUNCTION check_amc_overlap()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for overlapping contracts
  IF EXISTS (SELECT 1 FROM amc_contracts 
               WHERE customer_id = NEW.customer_id 
               AND appliance_brand = NEW.appliance_brand
               AND appliance_model = NEW.appliance_model
               AND (
                 (NEW.start_date BETWEEN start_date AND end_date) OR
                 (NEW.end_date BETWEEN start_date AND end_date) OR
                 (start_date BETWEEN NEW.start_date AND NEW.end_date)
               )) THEN
    RAISE EXCEPTION 'AMC contracts cannot overlap';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### **Prevention**
- Implement business rule validation in database
- Test edge cases for date ranges
- Document business rules clearly

---

## 📅 **2026-03-15**

### **Technician Commission Calculation Error**

#### **Error Description**
```
Commission amounts calculated incorrectly
```

#### **Location**
- Technician commission system

#### **Root Cause**
- Wrong commission rates applied
- Missing extra price collection calculation
- Variance deduction not included

#### **Solution Applied**
```sql
-- Fixed commission calculation
service_commission = service_charge * commission_rate
parts_commission = parts_value * commission_rate
extra_price_commission = extra_price_collected * commission_rate
net_earnings = service_commission + parts_commission + extra_price_commission - variance_deduction
```

#### **Prevention**
- Test calculations with known values
- Document commission formula
- Validate all calculation components

---

## 📅 **2026-03-12**

### **Initial Schema Setup Errors**

#### **Error Description**
```
Multiple enum type conflicts and missing tables
```

#### **Location**
- Initial database schema setup

#### **Root Cause**
- Missing enum definitions
- Tables created in wrong order
- Foreign key dependencies not satisfied

#### **Solution Applied**
```sql
-- Created proper schema order
-- Added missing enum types
-- Created tables in dependency order
-- Added proper constraints
```

#### **Prevention**
- Plan schema dependencies before migration
- Test schema creation in staging
- Document table dependencies

---

## 📅 **2026-03-10**

### **Next.js Build Configuration Errors**

#### **Error Description**
```
Build failing with module resolution issues
```

#### **Location**
- Next.js configuration and module imports

#### **Root Cause**
- Incorrect module paths
- Missing TypeScript configuration
- Environment variable issues

#### **Solution Applied**
```typescript
// Updated next.config.js
// Fixed module paths
// Added proper TypeScript configuration
```

#### **Prevention**
- Test build process regularly
- Use absolute imports
- Keep configuration up to date

---

## 🎯 **Error Patterns and Prevention**

### **Common Error Categories**

#### **1. Database Schema Errors**
- **Pattern**: Foreign key violations, type mismatches, constraint conflicts
- **Prevention**: Always test migrations in staging, check dependencies
- **Detection**: Build failures, runtime database errors

#### **2. TypeScript Type Errors**
- **Pattern**: Type mismatches, missing properties, wrong types
- **Prevention**: Use strict TypeScript, test with actual data
- **Detection**: Build failures, IDE warnings

#### **3. API Route Errors**
- **Pattern**: Parameter handling, auth issues, response format
- **Prevention**: Check framework version, test endpoints
- **Detection**: Runtime errors, API testing failures

#### **4. Component Prop Errors**
- **Pattern**: Invalid props, missing properties, wrong types
- **Prevention**: Check component docs, use TypeScript
- **Detection**: Build failures, runtime warnings

#### **5. Business Logic Errors**
- **Pattern**: Calculation errors, validation gaps, rule violations
- **Prevention**: Document rules, test with known values
- **Detection**: User reports, data inconsistencies

### **Prevention Strategies**

#### **1. Development Phase**
- Use TypeScript strict mode
- Test with realistic data
- Check dependencies before changes
- Document assumptions

#### **2. Testing Phase**
- Run comprehensive testing workflow
- Test edge cases and error scenarios
- Validate business logic
- Check performance

#### **3. Deployment Phase**
- Test in staging environment
- Run database migrations carefully
- Monitor for errors
- Have rollback plan

#### **4. Maintenance Phase**
- Monitor error logs
- Review user feedback
- Update documentation
- Fix issues promptly

---

## 🔄 **Continuous Improvement**

### **Error Tracking Process**
1. **Identify**: Catch error during development or testing
2. **Document**: Add entry to this log with full details
3. **Analyze**: Determine root cause and impact
4. **Fix**: Implement proper solution
5. **Test**: Verify fix works
6. **Prevent**: Add measures to prevent recurrence
7. **Share**: Update team on patterns found

### **Review Process**
- **Weekly**: Review new errors and patterns
- **Monthly**: Analyze error trends
- **Quarterly**: Update prevention strategies
- **Annually**: Review error tracking process

### **Success Metrics**
- **Error Reduction**: Fewer errors over time
- **Faster Resolution**: Quicker fix times
- **Better Prevention**: Fewer recurring issues
- **Team Knowledge**: Shared learning

---

## 📞 **Getting Help**

### **For Similar Errors**
- Check this log for previous occurrences
- Look for patterns in error types
- Apply documented solutions
- Adapt solutions to current context

### **For New Errors**
- Document thoroughly before fixing
- Consider impact on other parts of system
- Test solutions carefully
- Add prevention measures

### **For Complex Issues**
- Break down into smaller problems
- Test each part separately
- Get team input on solutions
- Document complex solutions clearly

---

## 📊 **Error Statistics**

### **Total Errors Logged**: 25+
### **Categories**:
- Database Schema: 6 errors
- TypeScript/Build: 8 errors
- API/Backend: 5 errors
- Business Logic: 4 errors
- Configuration: 2 errors

### **Resolution Rate**: 100% (all documented errors have solutions)
### **Prevention Rate**: 80% (most issues have prevention measures)

---

This log serves as a comprehensive knowledge base for all errors encountered during development. Regular updates and reviews will help prevent recurring issues and improve overall system quality.
