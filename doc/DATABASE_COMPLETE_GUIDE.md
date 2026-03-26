# Hi Tech Software - Complete Database Guide

## 🎯 Database Overview

This document provides comprehensive end-to-end understanding of the Hi Tech Software database architecture, design patterns, and operational guidelines.

---

## 📊 Database Architecture

### **Core Database Information**
- **Platform**: Supabase (PostgreSQL 15+)
- **Project**: `otmnfcuuqlbeowphxagf`
- **URL**: `https://otmnfcuuqlbeowphxagf.supabase.co`
- **Total Tables**: 51 (42 Base Tables + 5 Views + 6 Materialized Views)
- **Schema**: `public`
- **Authentication**: Supabase Auth with Row Level Security (RLS)

### **Database Design Principles**
1. **UUID Primary Keys**: All tables use `gen_random_uuid()` for primary keys
2. **Soft Deletes**: `is_deleted` boolean instead of hard deletes
3. **Audit Trail**: `created_at`, `updated_at` timestamps on all tables
4. **Row Level Security**: Role-based access control on all sensitive tables
5. **Generated Columns**: Business logic implemented at database level
6. **Materialized Views**: Performance optimization for reporting

---

## 🏗️ Database Schema Structure

### **1. User Management Layer**

#### **profiles** (Main User Table)
```sql
- id (uuid, PRIMARY KEY)
- email (varchar(255), UNIQUE)
- display_name (varchar(255))
- phone_number (varchar(20))
- role (user_role ENUM)
- is_active (boolean)
- is_deleted (boolean)
- created_at (timestamptz)
- updated_at (timestamptz)
```

**Roles**: `super_admin`, `office_staff`, `stock_manager`, `technician`

#### **technicians** (Extended Profile for Technicians)
```sql
- id (uuid, PRIMARY KEY, REFERENCES profiles(id))
- technician_code (varchar(50), UNIQUE)
- qualification (varchar(255))
- experience_years (integer)
- bank_account_number (varchar(255))
- bank_name (varchar(255))
- ifsc_code (varchar(255))
- daily_subject_limit (integer, DEFAULT 10)
- digital_bag_capacity (integer, DEFAULT 50)
- is_active (boolean)
- total_rejections (integer, DEFAULT 0)
```

### **2. Customer Management Layer**

#### **customers**
```sql
- id (uuid, PRIMARY KEY)
- customer_name (varchar(255))
- phone_number (varchar(20))
- email (varchar(255))
- address (text)
- city (varchar(100))
- postal_code (varchar(20))
- latitude (decimal(10,8))
- longitude (decimal(11,8))
- is_active (boolean)
- is_deleted (boolean)
```

### **3. Service Management Layer**

#### **subjects** (Service Tickets)
```sql
- id (uuid, PRIMARY KEY)
- subject_number (varchar(50), UNIQUE)
- customer_id (uuid, REFERENCES customers(id))
- product_name (varchar(255))
- product_description (text)
- product_model (varchar(100))
- product_serial_number (varchar(100))
- category_name (varchar(100))
- type_of_service (varchar(50))
- priority (varchar(20), DEFAULT 'normal')
- status (subject_status ENUM, DEFAULT 'pending')
- warranty_end_date (date)
- assigned_technician_id (uuid, REFERENCES profiles(id))
- technician_acceptance_status (varchar(20))
- technician_allocated_date (date)
- is_amc_service (boolean)
- amc_id (uuid, REFERENCES amc_contracts(id))
- is_warranty_service (boolean)
- completed_at (timestamptz)
- created_at (timestamptz)
- updated_at (timestamptz)
- is_deleted (boolean)
```

**Status Flow**: `pending → allocated → accepted → arrived → in_progress → completed`
**Alternative Flows**: `incomplete → rescheduled → pending`, `awaiting_parts → pending`, `cancelled`

#### **subject_status_history** (Audit Trail)
```sql
- id (uuid, PRIMARY KEY)
- subject_id (uuid, REFERENCES subjects(id))
- status (subject_status ENUM)
- changed_by (uuid, REFERENCES profiles(id))
- changed_at (timestamptz, DEFAULT now())
- notes (text)
```

### **4. Inventory Management Layer**

#### **inventory_products**
```sql
- id (uuid, PRIMARY KEY)
- material_code (varchar(100), UNIQUE)
- product_name (varchar(255))
- description (text)
- category_id (uuid, REFERENCES product_categories(id))
- product_type_id (uuid, REFERENCES product_types(id))
- brand (varchar(100))
- hsn_sac_code (varchar(20))
- purchase_price (decimal(12,2))
- mrp (decimal(12,2))
- uom (varchar(20), DEFAULT 'Piece')
- is_active (boolean)
```

#### **stock_entries** (Purchase Records)
```sql
- id (uuid, PRIMARY KEY)
- invoice_number (varchar(100), UNIQUE)
- invoice_date (date)
- supplier_id (uuid, REFERENCES suppliers(id))
- product_id (uuid, REFERENCES inventory_products(id))
- quantity_received (integer)
- purchase_price (decimal(12,2))
- mrp (decimal(12,2))
- hsn_sac_code (varchar(20))
- received_date (date, DEFAULT CURRENT_DATE)
- notes (text)
```

#### **suppliers** (NEW - Critical for Stock Entries)
```sql
- id (uuid, PRIMARY KEY)
- supplier_name (varchar(255))
- contact_person (varchar(255))
- phone (varchar(20))
- email (varchar(255))
- address (text)
- gstin (varchar(20))
- is_active (boolean)
```

### **5. Digital Bag System**

#### **digital_bag_sessions** (Daily Technician Bag)
```sql
- id (uuid, PRIMARY KEY)
- technician_id (uuid, REFERENCES profiles(id))
- session_date (date, DEFAULT CURRENT_DATE)
- status (varchar(20), DEFAULT 'active')
- items_issued (integer, DEFAULT 0)
- items_returned (integer, DEFAULT 0)
- items_consumed (integer, DEFAULT 0)
- variance_amount (numeric(12,2), DEFAULT 0)
- notes (text)
- started_at (timestamptz)
- closed_at (timestamptz)
```

#### **digital_bag_items** (Items in Bag)
```sql
- id (uuid, PRIMARY KEY)
- session_id (uuid, REFERENCES digital_bag_sessions(id))
- product_id (uuid, REFERENCES inventory_products(id))
- quantity_issued (integer)
- quantity_returned (integer)
- quantity_consumed (integer)
- notes (text)
```

### **6. Billing and Financial Layer**

#### **subject_bills** (Main Billing Table)
```sql
- id (uuid, PRIMARY KEY)
- bill_number (varchar(50), UNIQUE)
- subject_id (uuid, REFERENCES subjects(id))
- bill_type (varchar(50))
- visit_charge (decimal(12,2), DEFAULT 0)
- service_charge (decimal(12,2), DEFAULT 0)
- accessories_total (decimal(12,2), DEFAULT 0)
- gst_amount (decimal(12,2), DEFAULT 0)
- grand_total (decimal(12,2), DEFAULT 0)
- payment_status (varchar(20), DEFAULT 'due')
- payment_mode (varchar(20))
- payment_collected_at (timestamptz)
- created_by (uuid, REFERENCES profiles(id))
```

#### **subject_accessories** (Bill Line Items)
```sql
- id (uuid, PRIMARY KEY)
- subject_id (uuid, REFERENCES subjects(id))
- bill_id (uuid, REFERENCES subject_bills(id))
- item_name (varchar(255))
- quantity (integer)
- unit_price (decimal(12,2))
- total_price (decimal(12,2))
- extra_price_collected (decimal(12,2), DEFAULT 0)
- added_by (uuid, REFERENCES profiles(id))
```

### **7. AMC (Annual Maintenance Contracts)**

#### **amc_contracts** (NEW AMC System)
```sql
- id (uuid, PRIMARY KEY)
- contract_number (varchar(50), UNIQUE)
- customer_id (uuid, REFERENCES customers(id))
- subject_id (uuid, REFERENCES subjects(id))
- appliance_category_id (uuid)
- appliance_brand (varchar(100))
- appliance_model (varchar(100))
- appliance_serial_number (varchar(100))
- duration_type (varchar(20), DEFAULT '1_year')
- start_date (date)
- end_date (date)
- status (amc_status ENUM, DEFAULT 'active')
- price_paid (numeric(12,2), DEFAULT 0)
- payment_mode (varchar(20), DEFAULT 'cash')
- billed_to_type (varchar(20), DEFAULT 'customer')
- billed_to_id (uuid)
- sold_by (uuid, REFERENCES profiles(id))
- coverage_description (text)
- free_visits_per_year (integer)
- parts_covered (boolean, DEFAULT false)
- parts_coverage_limit (numeric(12,2))
- brands_covered (text)
- exclusions (text)
- special_terms (text)
```

### **8. Technician Commission System**

#### **technician_commission_config**
```sql
- id (uuid, PRIMARY KEY)
- technician_id (uuid, REFERENCES profiles(id))
- subject_id (uuid, REFERENCES subjects(id))
- service_commission (decimal(12,2), DEFAULT 0.00)
- parts_commission (decimal(12,2), DEFAULT 0.00)
- extra_price_commission (decimal(12,2), DEFAULT 0.00)
- commission_notes (text)
- set_by (uuid, REFERENCES profiles(id))
- set_at (timestamptz, DEFAULT now())
```

#### **technician_earnings_summary**
```sql
- id (uuid, PRIMARY KEY)
- technician_id (uuid, REFERENCES profiles(id))
- subject_id (uuid, REFERENCES subjects(id))
- service_commission (decimal(12,2), DEFAULT 0.00)
- parts_commission (decimal(12,2), DEFAULT 0.00)
- extra_price_commission (decimal(12,2), DEFAULT 0.00)
- extra_price_collected (decimal(12,2), DEFAULT 0.00)
- variance_deduction (decimal(12,2), DEFAULT 0.00)
- net_earnings (decimal(12,2), GENERATED ALWAYS AS (...))
- total_bill_value (decimal(12,2), DEFAULT 0.00)
- parts_sold_value (decimal(12,2), DEFAULT 0.00)
- earnings_status (text, DEFAULT 'pending')
- confirmed_by (uuid, REFERENCES profiles(id))
- confirmed_at (timestamptz)
```

#### **technician_service_payouts**
```sql
- id (uuid, PRIMARY KEY)
- technician_id (uuid, REFERENCES profiles(id))
- subject_id (uuid, REFERENCES subjects(id))
- base_amount (numeric(12,2), DEFAULT 0)
- deductions (numeric(12,2), DEFAULT 0)
- variance_deduction (numeric(12,2), DEFAULT 0)
- final_amount (numeric(12,2), DEFAULT 0)
- status (text, DEFAULT 'pending')
- notes (text)
- approved_by (uuid, REFERENCES profiles(id))
- paid_at (timestamptz)
```

---

## 🔗 Database Relationships

### **Primary Foreign Key Relationships**

1. **profiles → technicians** (1:1) - Technician extends profile
2. **customers → subjects** (1:N) - Customer has many service tickets
3. **subjects → subject_bills** (1:1) - Each subject can have one bill
4. **subjects → subject_accessories** (1:N) - Bill line items
5. **profiles → digital_bag_sessions** (1:N) - Technician daily bags
6. **suppliers → stock_entries** (1:N) - Supplier purchase records
7. **inventory_products → stock_entries** (1:N) - Product stock history
8. **amc_contracts → subjects** (1:N) - AMC covers multiple services
9. **profiles → technician_commission_config** (1:N) - Commission settings
10. **subjects → technician_earnings_summary** (1:1) - Earnings per job

### **Business Logic Relationships**

1. **Subject Status Flow**: Controlled by `subject_status_history` audit trail
2. **Commission Calculation**: Auto-synced when bills are generated
3. **Digital Bag Variance**: Calculated from issued vs returned vs consumed
4. **AMC Expiry**: Tracked via `end_date` and notification system
5. **Warranty Validation**: Checked against `warranty_end_date`

---

## 🎯 Database Views and Materialized Views

### **Regular Views (5)**

1. **active_subjects_today** - Today's active service tickets
2. **brand_dealer_due_invoices** - Financial reporting for brands/dealers
3. **current_stock_levels** - Real-time inventory levels
4. **overdue_subjects** - Service tickets past due date
5. **pending_unassigned_subjects** - Unassigned service tickets

### **Materialized Views (6)**

1. **amc_dashboard_summary** - AMC performance metrics
2. **brand_financial_summary** - Brand financial data
3. **daily_service_summary** - Daily service metrics
4. **dealer_financial_summary** - Dealer financial data
5. **technician_leaderboard** - Performance rankings (daily/weekly/monthly)
6. **technician_monthly_performance** - Monthly technician stats

---

## 🔐 Security and Access Control

### **Row Level Security (RLS) Policies**

#### **Role-Based Access Matrix**
| Table | super_admin | office_staff | stock_manager | technician |
|--------|-------------|--------------|----------------|-------------|
| profiles | ALL | READ | READ | OWN |
| customers | ALL | ALL | READ | READ |
| subjects | ALL | ALL | READ | ASSIGNED |
| inventory_products | ALL | READ | ALL | READ |
| stock_entries | ALL | READ | ALL | DENY |
| digital_bag_sessions | ALL | READ | DENY | OWN |
| technician_commission_config | ALL | READ | DENY | OWN |
| subject_bills | ALL | ALL | DENY | ASSIGNED |

### **Security Functions**
```sql
-- Get current user role
get_my_role() RETURNS user_role

-- Check if user can access subject
can_access_subject(subject_uuid uuid) RETURNS boolean

-- Check if user is assigned technician
is_assigned_technician(subject_uuid uuid) RETURNS boolean
```

---

## 📊 Database Operations and Workflows

### **1. Service Ticket Workflow**
```
1. Create Subject (customer_id, product details)
2. Assign Technician (profiles.id → subjects.assigned_technician_id)
3. Technician Accepts (status: allocated → accepted)
4. Technician Arrives (status: accepted → arrived)
5. Work in Progress (status: arrived → in_progress)
6. Complete Job (status: in_progress → completed)
7. Generate Bill (subject_bills + subject_accessories)
8. Calculate Commission (technician_earnings_summary)
9. Process Payout (technician_service_payouts)
```

### **2. Inventory Management Workflow**
```
1. Create Supplier (suppliers table)
2. Receive Stock (stock_entries with supplier_id)
3. Update WAC (Weighted Average Cost)
4. Update MRP (inventory_products.mrp)
5. Issue to Technician (digital_bag_items)
6. Consume on Job (digital_bag_consumptions)
7. Return Variance (digital_bag_sessions.variance_amount)
```

### **3. AMC Management Workflow**
```
1. Create AMC Contract (amc_contracts)
2. Link to Customer (customers.id)
3. Set Coverage Details (parts_covered, visits_per_year)
4. Track Expiry (end_date monitoring)
5. Send Notifications (30/15/7/1 days before)
6. Handle Renewals (renewal workflow)
7. Generate Commission (commission calculation)
```

### **4. Commission Calculation Workflow**
```
1. Generate Bill (subject_bills)
2. Calculate Service Commission (service_charge * rate)
3. Calculate Parts Commission (parts_sold * rate)
4. Add Extra Price Commission (extra_price_collected * rate)
5. Subtract Variance (digital_bag_consumptions.variance)
6. Update Earnings Summary (technician_earnings_summary)
7. Update Leaderboard (technician_leaderboard)
```

---

## 🚀 Performance Optimization

### **Indexes**
```sql
-- Primary Keys (automatically indexed)
-- Foreign Keys (automatically indexed)
-- Unique Constraints
CREATE UNIQUE INDEX idx_subjects_number ON subjects(subject_number);
CREATE UNIQUE INDEX idx_technicians_code ON technicians(technician_code);
CREATE UNIQUE INDEX idx_amc_contracts_number ON amc_contracts(contract_number);

-- Performance Indexes
CREATE INDEX idx_subjects_customer ON subjects(customer_id);
CREATE INDEX idx_subjects_technician ON subjects(assigned_technician_id);
CREATE INDEX idx_subjects_status ON subjects(status);
CREATE INDEX idx_stock_entries_product ON stock_entries(product_id);
CREATE INDEX idx_subject_bills_subject ON subject_bills(subject_id);
```

### **Materialized View Refresh Strategy**
```sql
-- Refresh functions
refresh_all_materialized_views() -- Called hourly by cron
refresh_leaderboard() -- Called after commission updates
refresh_financial_summaries() -- Called after bill payments
```

---

## 🔧 Database Maintenance

### **Regular Maintenance Tasks**
1. **Hourly**: Refresh materialized views
2. **Daily**: Backup database, clean up old logs
3. **Weekly**: Analyze query performance, update statistics
4. **Monthly**: Archive old records, optimize indexes

### **Data Integrity Checks**
```sql
-- Check foreign key consistency
SELECT COUNT(*) FROM subjects WHERE customer_id NOT IN (SELECT id FROM customers);

-- Check data consistency
SELECT COUNT(*) FROM subject_bills WHERE subject_id NOT IN (SELECT id FROM subjects);

-- Check commission calculation accuracy
SELECT SUM(net_earnings) FROM technician_earnings_summary;
```

---

## 📈 Database Analytics and Reporting

### **Key Metrics Available**
1. **Service Metrics**: Daily/weekly/monthly service counts
2. **Financial Metrics**: Revenue, profit, commission payouts
3. **Technician Performance**: Completion rates, earnings, rankings
4. **Inventory Metrics**: Stock levels, WAC, variance
5. **Customer Metrics**: Active customers, AMC coverage
6. **AMC Metrics**: Contract value, expiry tracking, renewals

### **Reporting Tables and Views**
- `daily_service_summary` - Daily service metrics
- `technician_leaderboard` - Performance rankings
- `brand_financial_summary` - Brand performance
- `dealer_financial_summary` - Dealer performance
- `current_stock_levels` - Inventory status

---

## 🛠️ Database Development Guidelines

### **Migration Rules**
1. Always use sequential numbering: `YYYYMMDD_NNN_description.sql`
2. Use `IF NOT EXISTS` for all objects
3. Use `CREATE OR REPLACE` for functions
4. Drop and recreate RLS policies
5. Add comments for complex business logic
6. Test migrations on staging first

### **Code Standards**
1. Use lowercase for all enum values
2. Use UUID for all primary keys
3. Use `timestamptz` for all timestamps
4. Use `decimal(12,2)` for all monetary values
5. Use `gen_random_uuid()` for default UUID values
6. Use `now()` for default timestamps

### **Testing Requirements**
1. Test all foreign key constraints
2. Verify RLS policies work correctly
3. Test materialized view refresh
4. Validate business logic calculations
5. Check performance impact of queries

---

## 🎯 Database Connection and Access

### **Supabase Client Usage**
```typescript
// Browser components
import { createClient } from '@/lib/supabase/client'

// API routes and server
import { createClient } from '@/lib/supabase/server'

// Admin and cron jobs
import { createClient } from '@/lib/supabase/admin'

// Middleware
import { createClient } from '@/lib/supabase/middleware'
```

### **Environment Variables**
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DATABASE_URL=your-database-url
```

### **Connection Patterns**
1. **Client Components**: Use `client.ts` (respects RLS)
2. **API Routes**: Use `server.ts` (cookie-based auth)
3. **Admin Operations**: Use `admin.ts` (bypasses RLS)
4. **Middleware**: Use `middleware.ts` (session refresh)

---

## 📋 Database Quick Reference

### **Table Count Summary**
- **Base Tables**: 42
- **Views**: 5
- **Materialized Views**: 6
- **Total**: 51 tables

### **Most Active Tables**
1. `subject_status_history` - 754 rows
2. `customers` - 254 rows
3. `subjects` - 236 rows
4. `subject_photos` - 49 rows
5. `inventory_products` - 37 rows

### **Critical Business Tables**
1. `subjects` - Core service tickets
2. `subject_bills` - Financial records
3. `technician_earnings_summary` - Commission calculations
4. `amc_contracts` - Annual maintenance contracts
5. `digital_bag_sessions` - Technician inventory

### **Configuration Tables**
1. `profiles` - User management
2. `technicians` - Technician details
3. `inventory_products` - Product catalog
4. `service_categories` - Service types
5. `technician_commission_config` - Commission rates

---

## 🚀 Future Database Enhancements

### **Planned Improvements**
1. **Partitioning**: Large tables by date
2. **Full-text Search**: Product and customer search
3. **Data Archiving**: Automated archival of old records
4. **Advanced Analytics**: Time-series data analysis
5. **Integration APIs**: External system connections

### **Scalability Considerations**
1. **Read Replicas**: For reporting queries
2. **Connection Pooling**: Optimize connection usage
3. **Caching Layer**: Redis for frequently accessed data
4. **Query Optimization**: Continuous performance monitoring
5. **Database Monitoring**: Automated alerting

---

This database guide provides complete understanding of the Hi Tech Software database architecture, relationships, and operational patterns. All development should follow these guidelines for consistency and maintainability.
