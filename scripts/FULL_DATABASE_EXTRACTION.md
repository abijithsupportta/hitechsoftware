# 📊 Hi Tech Software - Complete Database Extraction Guide

**Project**: otmnfcuuqlbeowphxagf  
**Platform**: Supabase (PostgreSQL)  
**Status**: Ready for Live Database Extraction  

---

## 🚀 IMMEDIATE ACTIONS TO GET FULL DATABASE

### Step 1: Ensure CLI is Ready
```bash
# Check CLI version
npx supabase --version

# Login if needed
npx supabase login

# Link to project
npx supabase link --project-ref otmnfcuuqlbeowphxagf
```

### Step 2: Extract Complete Database Structure
```bash
# Get all tables
npx supabase db query "SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"

# Get table structures
npx supabase db query "SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position"

# Get foreign keys
npx supabase db query "SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' ORDER BY tc.table_name"

# Get indexes
npx supabase db query "SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname"

# Get RLS policies
npx supabase db query "SELECT tablename, policyname, permissive, roles, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname"
```

### Step 3: Extract All Data Counts
```bash
npx supabase db query "
SELECT 'table_name','row_count'
UNION ALL
SELECT 'profiles', COUNT(*)::text FROM profiles
UNION ALL
SELECT 'technicians', COUNT(*)::text FROM technicians
UNION ALL
SELECT 'customers', COUNT(*)::text FROM customers
UNION ALL
SELECT 'customer_addresses', COUNT(*)::text FROM customer_addresses
UNION ALL
SELECT 'brands', COUNT(*)::text FROM brands
UNION ALL
SELECT 'dealers', COUNT(*)::text FROM dealers
UNION ALL
SELECT 'service_categories', COUNT(*)::text FROM service_categories
UNION ALL
SELECT 'subjects', COUNT(*)::text FROM subjects
UNION ALL
SELECT 'subject_history', COUNT(*)::text FROM subject_history
UNION ALL
SELECT 'subject_status_history', COUNT(*)::text FROM subject_status_history
UNION ALL
SELECT 'amc_contracts', COUNT(*)::text FROM amc_contracts
UNION ALL
SELECT 'subject_contracts', COUNT(*)::text FROM subject_contracts
UNION ALL
SELECT 'attendance_logs', COUNT(*)::text FROM attendance_logs
UNION ALL
SELECT 'product_categories', COUNT(*)::text FROM product_categories
UNION ALL
SELECT 'product_types', COUNT(*)::text FROM product_types
UNION ALL
SELECT 'inventory_products', COUNT(*)::text FROM inventory_products
UNION ALL
SELECT 'stock_entries', COUNT(*)::text FROM stock_entries
UNION ALL
SELECT 'stock_entry_items', COUNT(*)::text FROM stock_entry_items
UNION ALL
SELECT 'mrp_change_log', COUNT(*)::text FROM mrp_change_log
UNION ALL
SELECT 'digital_bag_sessions', COUNT(*)::text FROM digital_bag_sessions
UNION ALL
SELECT 'digital_bag_items', COUNT(*)::text FROM digital_bag_items
UNION ALL
SELECT 'digital_bag_consumptions', COUNT(*)::text FROM digital_bag_consumptions
UNION ALL
SELECT 'subject_bills', COUNT(*)::text FROM subject_bills
UNION ALL
SELECT 'subject_accessories', COUNT(*)::text FROM subject_accessories
UNION ALL
SELECT 'subject_photos', COUNT(*)::text FROM subject_photos
UNION ALL
SELECT 'technician_commission_config', COUNT(*)::text FROM technician_commission_config
UNION ALL
SELECT 'technician_earnings_summary', COUNT(*)::text FROM technician_earnings_summary
UNION ALL
SELECT 'technician_service_payouts', COUNT(*)::text FROM technician_service_payouts
UNION ALL
SELECT 'notifications', COUNT(*)::text FROM notifications
UNION ALL
SELECT 'auth_logs', COUNT(*)::text FROM auth_logs
UNION ALL
SELECT 'brand_dealer_payments', COUNT(*)::text FROM brand_dealer_payments
ORDER BY table_name
"
```

### Step 4: Extract Sample Data from Key Tables
```bash
# Profiles (Users)
npx supabase db query "SELECT id, email, display_name, phone_number, role, is_active, created_at FROM profiles ORDER BY created_at DESC LIMIT 10"

# Customers
npx supabase db query "SELECT id, customer_name, phone_number, email, city, is_active, created_at FROM customers ORDER BY created_at DESC LIMIT 10"

# Subjects (Service Tickets)
npx supabase db query "SELECT id, subject_number, customer_id, product_name, product_model, status, assigned_technician_id, created_at FROM subjects ORDER BY created_at DESC LIMIT 10"

# AMC Contracts
npx supabase db query "SELECT id, contract_number, customer_id, appliance_brand, appliance_model, status, price_paid, start_date, end_date, created_at FROM amc_contracts ORDER BY created_at DESC LIMIT 10"

# Inventory Products
npx supabase db query "SELECT id, material_code, product_name, category_id, brand, mrp, purchase_price, is_active, created_at FROM inventory_products ORDER BY created_at DESC LIMIT 10"

# Technician Earnings
npx supabase db query "SELECT id, technician_id, subject_id, service_commission, parts_commission, net_earnings, earnings_status, created_at FROM technician_earnings_summary ORDER BY created_at DESC LIMIT 10"

# Subject Bills
npx supabase db query "SELECT id, bill_number, subject_id, bill_type, visit_charge, service_charge, grand_total, payment_status, created_at FROM subject_bills ORDER BY created_at DESC LIMIT 10"
```

### Step 5: Extract Complete Data (All Tables)
```bash
# COMPLETE DATABASE DUMP (All tables, all data)
npx supabase db dump > complete_database_export.sql

# SCHEMA ONLY (Structure without data)
npx supabase db dump --schema-only > database_structure.sql

# DATA ONLY (All data without structure)
npx supabase db dump --data-only > database_data.sql

# SPECIFIC TABLE DATA
npx supabase db query "SELECT * FROM profiles" > profiles_full_data.csv
npx supabase db query "SELECT * FROM customers" > customers_full_data.csv
npx supabase db query "SELECT * FROM subjects" > subjects_full_data.csv
npx supabase db query "SELECT * FROM amc_contracts" > amc_contracts_full_data.csv
npx supabase db query "SELECT * FROM inventory_products" > inventory_products_full_data.csv
```

---

## 📋 COMPLETE TABLE LIST FOR EXTRACTION

### User Management Tables
```bash
npx supabase db query "SELECT * FROM profiles"
npx supabase db query "SELECT * FROM technicians"
```

### Customer Management Tables
```bash
npx supabase db query "SELECT * FROM customers"
npx supabase db query "SELECT * FROM customer_addresses"
```

### Service Management Tables
```bash
npx supabase db query "SELECT * FROM subjects"
npx supabase db query "SELECT * FROM subject_history"
npx supabase db query "SELECT * FROM subject_status_history"
```

### Product & Service Tables
```bash
npx supabase db query "SELECT * FROM brands"
npx supabase db query "SELECT * FROM dealers"
npx supabase db query "SELECT * FROM service_categories"
```

### AMC System Tables
```bash
npx supabase db query "SELECT * FROM amc_contracts"
npx supabase db query "SELECT * FROM subject_contracts"
```

### Inventory Tables
```bash
npx supabase db query "SELECT * FROM product_categories"
npx supabase db query "SELECT * FROM product_types"
npx supabase db query "SELECT * FROM inventory_products"
npx supabase db query "SELECT * FROM stock_entries"
npx supabase db query "SELECT * FROM stock_entry_items"
npx supabase db query "SELECT * FROM mrp_change_log"
```

### Digital Bag Tables
```bash
npx supabase db query "SELECT * FROM digital_bag_sessions"
npx supabase db query "SELECT * FROM digital_bag_items"
npx supabase db query "SELECT * FROM digital_bag_consumptions"
```

### Financial Tables
```bash
npx supabase db query "SELECT * FROM subject_bills"
npx supabase db query "SELECT * FROM subject_accessories"
npx supabase db query "SELECT * FROM technician_commission_config"
npx supabase db query "SELECT * FROM technician_earnings_summary"
npx supabase db query "SELECT * FROM technician_service_payouts"
npx supabase db query "SELECT * FROM brand_dealer_payments"
```

### System Tables
```bash
npx supabase db query "SELECT * FROM attendance_logs"
npx supabase db query "SELECT * FROM subject_photos"
npx supabase db query "SELECT * FROM notifications"
npx supabase db query "SELECT * FROM auth_logs"
```

---

## 🎯 AUTOMATED EXTRACTION SCRIPT

### One-Command Complete Extraction
```bash
# Create this script: extract_all.sh
#!/bin/bash
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_DIR="database_exports_$TIMESTAMP"

mkdir -p $OUTPUT_DIR

echo "Starting complete database extraction..."

# Extract structure
npx supabase db query "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position" > $OUTPUT_DIR/structure_$TIMESTAMP.csv

# Extract counts
npx supabase db query "SELECT 'profiles', COUNT(*) FROM profiles UNION ALL SELECT 'technicians', COUNT(*) FROM technicians UNION ALL SELECT 'customers', COUNT(*) FROM customers UNION ALL SELECT 'subjects', COUNT(*) FROM subjects" > $OUTPUT_DIR/counts_$TIMESTAMP.csv

# Extract all data
npx supabase db dump --data-only > $OUTPUT_DIR/all_data_$TIMESTAMP.sql

echo "Extraction completed: $OUTPUT_DIR"
```

### Run the script
```bash
chmod +x extract_all.sh
./extract_all.sh
```

---

## 📊 DATA ANALYSIS QUERIES

### Business Intelligence Queries
```bash
# Active users by role
npx supabase db query "SELECT role, COUNT(*) as count FROM profiles WHERE is_active = true AND is_deleted = false GROUP BY role"

# Subjects by status
npx supabase db query "SELECT status, COUNT(*) as count FROM subjects WHERE is_deleted = false GROUP BY status ORDER BY count DESC"

# AMC contracts by status
npx supabase db query "SELECT status, COUNT(*) as count, SUM(price_paid) as total_value FROM amc_contracts GROUP BY status"

# Top earning technicians
npx supabase db query "SELECT p.display_name, SUM(es.net_earnings) as total_earnings FROM profiles p JOIN technician_earnings_summary es ON p.id = es.technician_id WHERE p.role = 'technician' GROUP BY p.display_name ORDER BY total_earnings DESC LIMIT 10"

# Low stock products
npx supabase db query "SELECT material_code, product_name, current_stock FROM current_stock_levels WHERE stock_status = 'low_stock' ORDER BY current_stock"

# Recent activity
npx supabase db query "SELECT 'subjects' as table_name, COUNT(*) as today_count FROM subjects WHERE DATE(created_at) = CURRENT_DATE UNION ALL SELECT 'customers', COUNT(*) FROM customers WHERE DATE(created_at) = CURRENT_DATE UNION ALL SELECT 'amc_contracts', COUNT(*) FROM amc_contracts WHERE DATE(created_at) = CURRENT_DATE"
```

---

## 🔧 TROUBLESHOOTING

### Common Issues and Solutions

#### 1. Connection Issues
```bash
# Check login status
npx supabase projects list

# Re-login if needed
npx supabase login

# Re-link project
npx supabase link --project-ref otmnfcuuqlbeowphxagf
```

#### 2. Permission Issues
```bash
# Check current user
npx supabase db query "SELECT current_user, session_user"

# Check RLS policies
npx supabase db query "SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public'"
```

#### 3. Large Data Exports
```bash
# Use pagination for large tables
npx supabase db query "SELECT * FROM subjects ORDER BY created_at LIMIT 1000 OFFSET 0"

# Export in chunks
npx supabase db query "SELECT * FROM subjects WHERE created_at >= '2026-01-01' AND created_at < '2026-02-01'"
```

---

## 📱 QUICK REFERENCE

### Essential Commands
```bash
# Login
npx supabase login

# Link project
npx supabase link --project-ref otmnfcuuqlbeowphxagf

# Quick table list
npx supabase db query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"

# Quick counts
npx supabase db query "SELECT 'profiles', COUNT(*) FROM profiles UNION ALL SELECT 'subjects', COUNT(*) FROM subjects"

# Full export
npx supabase db dump > complete_database.sql

# Sample data
npx supabase db query "SELECT * FROM profiles LIMIT 5"
```

---

## 🎯 NEXT STEPS

1. **Run the extraction commands** above to get complete database
2. **Save the results** to files for analysis
3. **Review the structure** using the generated files
4. **Analyze the data** using the sample queries provided
5. **Document findings** for development reference

---

**🚀 Your complete Hi Tech Software database is ready for extraction!**

**Project ID**: otmnfcuuqlbeowphxagf  
**Total Tables**: 33+  
**Latest Migration**: 033  
**Database**: PostgreSQL via Supabase

**Run any of the commands above to get your complete database structure and data!**
