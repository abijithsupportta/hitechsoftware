# Hi Tech Software - Database CLI Commands Reference

**Project**: otmnfcuuqlbeowphxagf  
**Platform**: Supabase (PostgreSQL)  
**CLI**: npx supabase  

---

## 🚀 Quick Start Commands

### 1. Login to Supabase
```bash
npx supabase login
```

### 2. Link to Project
```bash
npx supabase link --project-ref otmnfcuuqlbeowphxagf
```

### 3. Check Status
```bash
npx supabase status
```

---

## 📊 Database Structure Commands

### Get All Tables
```bash
npx supabase db query "SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
```

### Get Table Structure
```bash
npx supabase db query "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'profiles' ORDER BY ordinal_position"
```

### Get Foreign Keys
```bash
npx supabase db query "SELECT tc.table_name, tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name FROM information_schema.table_constraints AS tc JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' ORDER BY tc.table_name"
```

### Get Indexes
```bash
npx supabase db query "SELECT schemaname, tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname"
```

### Get RLS Policies
```bash
npx supabase db query "SELECT schemaname, tablename, policyname, permissive, roles, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname"
```

---

## 🔢 Data Count Commands

### Count All Tables
```bash
npx supabase db query "SELECT 'profiles' as table_name, COUNT(*) as row_count FROM profiles UNION ALL SELECT 'technicians', COUNT(*) FROM technicians UNION ALL SELECT 'customers', COUNT(*) FROM customers UNION ALL SELECT 'subjects', COUNT(*) FROM subjects UNION ALL SELECT 'amc_contracts', COUNT(*) FROM amc_contracts UNION ALL SELECT 'inventory_products', COUNT(*) FROM inventory_products ORDER BY table_name"
```

### Specific Table Counts
```bash
# Profiles
npx supabase db query "SELECT COUNT(*) as profiles_count FROM profiles"

# Subjects
npx supabase db query "SELECT COUNT(*) as subjects_count FROM subjects"

# AMC Contracts
npx supabase db query "SELECT COUNT(*) as amc_contracts_count FROM amc_contracts"

# Products
npx supabase db query "SELECT COUNT(*) as products_count FROM inventory_products"
```

### Active Users by Role
```bash
npx supabase db query "SELECT role, COUNT(*) as count FROM profiles WHERE is_active = true AND is_deleted = false GROUP BY role ORDER BY count DESC"
```

---

## 📋 Data Export Commands

### Sample Data (First 5 rows)
```bash
# Profiles
npx supabase db query "SELECT id, email, display_name, role, is_active, created_at FROM profiles ORDER BY created_at DESC LIMIT 5"

# Customers
npx supabase db query "SELECT id, customer_name, phone_number, city, is_active, created_at FROM customers ORDER BY created_at DESC LIMIT 5"

# Subjects
npx supabase db query "SELECT id, subject_number, customer_id, product_name, status, created_at FROM subjects ORDER BY created_at DESC LIMIT 5"

# AMC Contracts
npx supabase db query "SELECT id, contract_number, customer_id, appliance_brand, status, price_paid, created_at FROM amc_contracts ORDER BY created_at DESC LIMIT 5"
```

### Full Table Data Export
```bash
# Export all data from a specific table
npx supabase db query "SELECT * FROM profiles ORDER BY created_at" > profiles_export.csv

# Export with specific columns
npx supabase db query "SELECT id, email, display_name, role, created_at FROM profiles WHERE is_active = true" > active_users.csv
```

### Complete Database Dump
```bash
# Schema only
npx supabase db dump --schema-only > database_schema.sql

# Data only
npx supabase db dump --data-only > database_data.sql

# Complete database
npx supabase db dump > complete_database.sql
```

---

## 🏗️ Schema Analysis Commands

### Table Sizes
```bash
npx supabase db query "SELECT schemaname, tablename, attname, n_distinct, correlation FROM pg_stats WHERE schemaname = 'public' ORDER BY tablename, attname"
```

### Index Usage
```bash
npx supabase db query "SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch FROM pg_stat_user_indexes ORDER BY idx_scan DESC"
```

### Table Statistics
```bash
npx supabase db query "SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del, n_live_tup, n_dead_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC"
```

---

## 🔍 Specific Table Queries

### User Management
```bash
# Active users by role
npx supabase db query "SELECT role, COUNT(*) as count FROM profiles WHERE is_active = true AND is_deleted = false GROUP BY role"

# Technician details
npx supabase db query "SELECT p.display_name, p.email, t.technician_code, t.qualification, t.experience_years FROM profiles p JOIN technicians t ON p.id = t.profile_id WHERE p.is_active = true"
```

### Service Management
```bash
# Subjects by status
npx supabase db query "SELECT status, COUNT(*) as count FROM subjects WHERE is_deleted = false GROUP BY status ORDER BY count DESC"

# Recent subjects
npx supabase db query "SELECT subject_number, customer_id, product_name, status, created_at FROM subjects WHERE created_at >= NOW() - INTERVAL '7 days' ORDER BY created_at DESC"
```

### AMC System
```bash
# AMC contracts by status
npx supabase db query "SELECT status, COUNT(*) as count FROM amc_contracts GROUP BY status"

# Expiring AMCs
npx supabase db query "SELECT contract_number, customer_id, end_date FROM amc_contracts WHERE end_date <= NOW() + INTERVAL '30 days' AND status = 'active' ORDER BY end_date"
```

### Inventory
```bash
# Low stock products
npx supabase db query "SELECT material_code, product_name, current_stock FROM current_stock_levels WHERE stock_status = 'low_stock' ORDER BY current_stock"

# Product categories
npx supabase db query "SELECT category_name, COUNT(*) as product_count FROM inventory_products WHERE is_active = true GROUP BY category_name ORDER BY product_count DESC"
```

### Financial
```bash
# Total earnings by technician
npx supabase db query "SELECT t.display_name, SUM(es.net_earnings) as total_earnings FROM profiles t JOIN technician_earnings_summary es ON t.id = es.technician_id WHERE t.role = 'technician' GROUP BY t.display_name ORDER BY total_earnings DESC"

# Bills by status
npx supabase db query "SELECT payment_status, COUNT(*) as count, SUM(grand_total) as total_amount FROM subject_bills GROUP BY payment_status"
```

---

## 🛠️ Maintenance Commands

### Refresh Materialized Views
```bash
npx supabase db query "REFRESH MATERIALIZED VIEW technician_leaderboard"
npx supabase db query "REFRESH MATERIALIZED VIEW current_stock_levels"
```

### Vacuum Analyze
```bash
npx supabase db query "VACUUM ANALYZE"
```

### Check Database Size
```bash
npx supabase db query "SELECT pg_size_pretty(pg_database_size('postgres')) as database_size"
```

---

## 📤 Export Automation

### Complete Export Script
```bash
#!/bin/bash
# Full database export script

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_DIR="database_exports"

mkdir -p $OUTPUT_DIR

# Export structure
npx supabase db query "SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'public'" > $OUTPUT_DIR/tables_$TIMESTAMP.csv

# Export data counts
npx supabase db query "SELECT 'profiles', COUNT(*) FROM profiles UNION ALL SELECT 'technicians', COUNT(*) FROM technicians UNION ALL SELECT 'customers', COUNT(*) FROM customers UNION ALL SELECT 'subjects', COUNT(*) FROM subjects" > $OUTPUT_DIR/counts_$TIMESTAMP.csv

# Export sample data
npx supabase db query "SELECT * FROM profiles LIMIT 10" > $OUTPUT_DIR/profiles_sample_$TIMESTAMP.csv
npx supabase db query "SELECT * FROM subjects LIMIT 10" > $OUTPUT_DIR/subjects_sample_$TIMESTAMP.csv

echo "Export completed: $OUTPUT_DIR"
```

### JSON Export
```bash
# Export as JSON format
npx supabase db query "SELECT json_agg(json_build_object('id', id, 'email', email, 'display_name', display_name, 'role', role)) FROM profiles" > profiles.json
```

---

## 🔧 Troubleshooting Commands

### Check Connection
```bash
npx supabase db query "SELECT version()"
```

### Check Current User
```bash
npx supabase db query "SELECT current_user, session_user"
```

### Check Database Size
```bash
npx supabase db query "SELECT pg_database_size('postgres'), pg_size_pretty(pg_database_size('postgres'))"
```

### List All Schemas
```bash
npx supabase db query "SELECT schema_name FROM information_schema.schemata ORDER BY schema_name"
```

---

## 📱 Quick Reference

### Essential Commands
```bash
# Login
npx supabase login

# Link project
npx supabase link --project-ref otmnfcuuqlbeowphxagf

# Quick table count
npx supabase db query "SELECT COUNT(*) FROM profiles"

# Quick sample data
npx supabase db query "SELECT * FROM profiles LIMIT 5"

# Full export
npx supabase db dump > complete_backup.sql
```

### Common Queries
```bash
# Active users
npx supabase db query "SELECT COUNT(*) FROM profiles WHERE is_active = true"

# Today's subjects
npx supabase db query "SELECT COUNT(*) FROM subjects WHERE DATE(created_at) = CURRENT_DATE"

# Total earnings
npx supabase db query "SELECT SUM(net_earnings) FROM technician_earnings_summary"
```

---

## 🎯 Best Practices

1. **Always use LIMIT** for large tables when exploring
2. **Export to files** for large datasets
3. **Use specific columns** instead of SELECT *
4. **Check row counts** before full exports
5. **Use transactions** for multi-table operations
6. **Backup before** making changes
7. **Monitor query performance** with EXPLAIN

---

## 📞 Support

For issues:
- **CLI Help**: `npx supabase --help`
- **Database Help**: `npx supabase db --help`
- **Project Dashboard**: https://supabase.com/dashboard/project/otmnfcuuqlbeowphxagf
- **Documentation**: https://supabase.com/docs

---

**Happy database exploring! 🚀**
