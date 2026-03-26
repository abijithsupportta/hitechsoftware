@echo off
echo === HI TECH SOFTWARE - DATABASE EXTRACTION ===
echo Starting data extraction from live Supabase database...
echo.

cd /d "c:\Personal Projects\HitechSoftware"

echo Checking Supabase CLI...
npx supabase --version
if %errorlevel% neq 0 (
    echo ERROR: Supabase CLI not found
    pause
    exit /b 1
)

echo.
echo Extracting table counts...
npx supabase db query "SELECT 'table_name','row_count' UNION ALL SELECT 'profiles', COUNT(*)::text FROM profiles UNION ALL SELECT 'technicians', COUNT(*)::text FROM technicians UNION ALL SELECT 'customers', COUNT(*)::text FROM customers UNION ALL SELECT 'subjects', COUNT(*)::text FROM subjects UNION ALL SELECT 'amc_contracts', COUNT(*)::text FROM amc_contracts UNION ALL SELECT 'inventory_products', COUNT(*)::text FROM inventory_products ORDER BY table_name" > database_exports\table_counts.csv

echo Extracting sample data...
npx supabase db query "SELECT id, email, display_name, role, is_active, created_at FROM profiles ORDER BY created_at DESC LIMIT 5" > database_exports\profiles_sample.csv

npx supabase db query "SELECT id, customer_name, phone_number, city, is_active, created_at FROM customers ORDER BY created_at DESC LIMIT 5" > database_exports\customers_sample.csv

npx supabase db query "SELECT id, subject_number, customer_id, product_name, status, created_at FROM subjects ORDER BY created_at DESC LIMIT 5" > database_exports\subjects_sample.csv

npx supabase db query "SELECT id, contract_number, customer_id, appliance_brand, status, price_paid, created_at FROM amc_contracts ORDER BY created_at DESC LIMIT 5" > database_exports\amc_sample.csv

npx supabase db query "SELECT id, material_code, product_name, brand, mrp, is_active, created_at FROM inventory_products ORDER BY created_at DESC LIMIT 5" > database_exports\products_sample.csv

echo.
echo Extraction completed!
echo.
echo Files created in database_exports folder:
dir database_exports\*.csv
echo.
echo To extract COMPLETE database, run:
echo npx supabase db dump --data-only > complete_database.sql
echo.
pause
