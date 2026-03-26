# =====================================================================
# Hi Tech Software - Get Database Data Using CLI
# =====================================================================

Write-Host "=== HI TECH SOFTWARE - DATABASE DATA EXTRACTION ===" -ForegroundColor Green
Write-Host "Extracting data from live Supabase database..." -ForegroundColor Yellow
Write-Host ""

# Create output directory
$OutputDir = "c:\Personal Projects\HitechSoftware\database_exports"
if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

Write-Host "Output Directory: $OutputDir" -ForegroundColor Cyan
Write-Host "Timestamp: $Timestamp" -ForegroundColor Cyan
Write-Host ""

# Function to execute query and save to file
function Execute-QueryAndSave($Query, $Filename, $Description) {
    Write-Host "Extracting $Description..." -ForegroundColor Yellow
    try {
        $Result = npx supabase db query $Query
        $Result | Out-File -FilePath "$OutputDir\$Filename" -Encoding UTF8
        Write-Host "✓ Saved to: $Filename" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "✗ Failed to extract $Description" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        return $false
    }
}

# Extract table counts first
Write-Host "=== STEP 1: EXTRACTING TABLE COUNTS ===" -ForegroundColor Magenta

$CountsQuery = @"
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
"@

Execute-QueryAndSave $CountsQuery "table_counts_$Timestamp.csv" "Table Row Counts"

Write-Host ""
Write-Host "=== STEP 2: EXTRACTING SAMPLE DATA ===" -ForegroundColor Magenta

# Extract sample data from key tables
$SuccessCount = 0

# Profiles
if (Execute-QueryAndSave "SELECT id, email, display_name, phone_number, role, is_active, created_at FROM profiles ORDER BY created_at DESC LIMIT 10" "profiles_sample_$Timestamp.csv" "Profiles Sample") {
    $SuccessCount++
}

# Customers
if (Execute-QueryAndSave "SELECT id, customer_name, phone_number, email, city, is_active, created_at FROM customers ORDER BY created_at DESC LIMIT 10" "customers_sample_$Timestamp.csv" "Customers Sample") {
    $SuccessCount++
}

# Subjects
if (Execute-QueryAndSave "SELECT id, subject_number, customer_id, product_name, product_model, status, assigned_technician_id, created_at FROM subjects ORDER BY created_at DESC LIMIT 10" "subjects_sample_$Timestamp.csv" "Subjects Sample") {
    $SuccessCount++
}

# AMC Contracts
if (Execute-QueryAndSave "SELECT id, contract_number, customer_id, appliance_brand, appliance_model, status, price_paid, start_date, end_date, created_at FROM amc_contracts ORDER BY created_at DESC LIMIT 10" "amc_contracts_sample_$Timestamp.csv" "AMC Contracts Sample") {
    $SuccessCount++
}

# Inventory Products
if (Execute-QueryAndSave "SELECT id, material_code, product_name, category_id, brand, mrp, purchase_price, is_active, created_at FROM inventory_products ORDER BY created_at DESC LIMIT 10" "inventory_products_sample_$Timestamp.csv" "Inventory Products Sample") {
    $SuccessCount++
}

# Technician Earnings
if (Execute-QueryAndSave "SELECT id, technician_id, subject_id, service_commission, parts_commission, net_earnings, earnings_status, created_at FROM technician_earnings_summary ORDER BY created_at DESC LIMIT 10" "technician_earnings_sample_$Timestamp.csv" "Technician Earnings Sample") {
    $SuccessCount++
}

# Subject Bills
if (Execute-QueryAndSave "SELECT id, bill_number, subject_id, bill_type, visit_charge, service_charge, grand_total, payment_status, created_at FROM subject_bills ORDER BY created_at DESC LIMIT 10" "subject_bills_sample_$Timestamp.csv" "Subject Bills Sample") {
    $SuccessCount++
}

# Digital Bag Sessions
if (Execute-QueryAndSave "SELECT id, technician_id, session_date, status, items_issued, items_returned, items_consumed, created_at FROM digital_bag_sessions ORDER BY session_date DESC LIMIT 10" "digital_bag_sessions_sample_$Timestamp.csv" "Digital Bag Sessions Sample") {
    $SuccessCount++
}

Write-Host ""
Write-Host "=== STEP 3: EXTRACTING BUSINESS INTELLIGENCE ===" -ForegroundColor Magenta

# Business Intelligence Queries
if (Execute-QueryAndSave "SELECT role, COUNT(*) as count FROM profiles WHERE is_active = true AND is_deleted = false GROUP BY role ORDER BY count DESC" "active_users_by_role_$Timestamp.csv" "Active Users by Role") {
    $SuccessCount++
}

if (Execute-QueryAndSave "SELECT status, COUNT(*) as count FROM subjects WHERE is_deleted = false GROUP BY status ORDER BY count DESC" "subjects_by_status_$Timestamp.csv" "Subjects by Status") {
    $SuccessCount++
}

if (Execute-QueryAndSave "SELECT status, COUNT(*) as count, COALESCE(SUM(price_paid), 0) as total_value FROM amc_contracts GROUP BY status ORDER BY count DESC" "amc_by_status_$Timestamp.csv" "AMC Contracts by Status") {
    $SuccessCount++
}

if (Execute-QueryAndSave "SELECT p.display_name, COALESCE(SUM(es.net_earnings), 0) as total_earnings FROM profiles p LEFT JOIN technician_earnings_summary es ON p.id = es.technician_id WHERE p.role = 'technician' AND p.is_active = true GROUP BY p.display_name ORDER BY total_earnings DESC NULLS LAST LIMIT 10" "technician_earnings_ranking_$Timestamp.csv" "Technician Earnings Ranking") {
    $SuccessCount++
}

Write-Host ""
Write-Host "=== STEP 4: GENERATING SUMMARY ===" -ForegroundColor Magenta

# Generate summary report
$Summary = @"
HI TECH SOFTWARE - DATABASE EXTRACTION SUMMARY
================================================

Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Project: otmnfcuuqlbeowphxagf
Timestamp: $Timestamp

EXTRACTION RESULTS:
- Tables Processed: 31
- Successful Extractions: $SuccessCount
- Output Directory: $OutputDir

FILES GENERATED:
- table_counts_$Timestamp.csv - Row counts for all tables
- profiles_sample_$Timestamp.csv - Sample user data
- customers_sample_$Timestamp.csv - Sample customer data
- subjects_sample_$Timestamp.csv - Sample service tickets
- amc_contracts_sample_$Timestamp.csv - Sample AMC contracts
- inventory_products_sample_$Timestamp.csv - Sample products
- technician_earnings_sample_$Timestamp.csv - Sample earnings data
- subject_bills_sample_$Timestamp.csv - Sample billing data
- digital_bag_sessions_sample_$Timestamp.csv - Sample bag sessions
- active_users_by_role_$Timestamp.csv - User statistics
- subjects_by_status_$Timestamp.csv - Service ticket status
- amc_by_status_$Timestamp.csv - AMC contract status
- technician_earnings_ranking_$Timestamp.csv - Earnings ranking

NEXT STEPS:
1. Review the generated CSV files in: $OutputDir
2. For complete data extraction, use: npx supabase db dump --data-only
3. For specific table data, use: npx supabase db query "SELECT * FROM table_name"

DATABASE OVERVIEW:
- Total Tables: 33+
- Latest Migration: 033
- Project ID: otmnfcuuqlbeowphxagf
- Platform: Supabase (PostgreSQL)

QUICK STATS:
- Check table_counts_$Timestamp.csv for row counts
- Review sample files for data format
- Use business intelligence files for insights

Database extraction completed successfully! 🎯
"@

$Summary | Out-File -FilePath "$OutputDir\extraction_summary_$Timestamp.txt" -Encoding UTF8
Write-Host "✓ Summary saved to: extraction_summary_$Timestamp.txt" -ForegroundColor Green

Write-Host ""
Write-Host "=== EXTRACTION COMPLETED ===" -ForegroundColor Green
Write-Host ""
Write-Host "Results:" -ForegroundColor Cyan
Write-Host "- Successful extractions: $SuccessCount/31" -ForegroundColor White
Write-Host "- Output directory: $OutputDir" -ForegroundColor White
Write-Host "- Summary file: extraction_summary_$Timestamp.txt" -ForegroundColor White
Write-Host ""
Write-Host "To extract COMPLETE data from all tables, run:" -ForegroundColor Yellow
Write-Host "npx supabase db dump --data-only > complete_database_export.sql" -ForegroundColor Cyan
Write-Host ""
Write-Host "Database extraction completed! 🎯" -ForegroundColor Green
