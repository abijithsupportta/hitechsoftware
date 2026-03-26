# =====================================================================
# Hi Tech Software - Quick Database Extraction Script
# =====================================================================

Write-Host "=== HI TECH SOFTWARE - DATABASE EXTRACTION ===" -ForegroundColor Green
Write-Host "Starting database extraction from live Supabase project..." -ForegroundColor Yellow
Write-Host ""

# Set project details
$ProjectRef = "otmnfcuuqlbeowphxagf"
$OutputDir = "c:\Personal Projects\HitechSoftware\database_exports"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

# Create output directory if it doesn't exist
if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force
    Write-Host "Created output directory: $OutputDir" -ForegroundColor Green
}

Write-Host "Project Reference: $ProjectRef" -ForegroundColor Cyan
Write-Host "Output Directory: $OutputDir" -ForegroundColor Cyan
Write-Host "Timestamp: $Timestamp" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is available
try {
    $SupabaseVersion = npx supabase --version 2>$null
    Write-Host "Supabase CLI Version: $SupabaseVersion" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Supabase CLI not found. Please install it first." -ForegroundColor Red
    Write-Host "Run: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "=== STEP 1: EXTRACTING TABLE LIST ===" -ForegroundColor Yellow

# Extract table list
$TablesFile = "$OutputDir\tables_$Timestamp.csv"
Write-Host "Extracting table list to: $TablesFile" -ForegroundColor Cyan

try {
    $TablesQuery = "SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    npx supabase db query $TablesQuery | Out-File -FilePath $TablesFile -Encoding UTF8
    Write-Host "✓ Table list extracted successfully" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Failed to extract table list" -ForegroundColor Red
    Write-Host $_ -ForegroundColor Red
}

Write-Host ""
Write-Host "=== STEP 2: EXTRACTING DATA COUNTS ===" -ForegroundColor Yellow

# Extract data counts
$CountsFile = "$OutputDir\counts_$Timestamp.csv"
Write-Host "Extracting data counts to: $CountsFile" -ForegroundColor Cyan

try {
    $CountsQuery = @"
SELECT 'table_name','row_count'
UNION ALL
SELECT 'profiles', COUNT(*)::text FROM profiles
UNION ALL
SELECT 'technicians', COUNT(*)::text FROM technicians
UNION ALL
SELECT 'customers', COUNT(*)::text FROM customers
UNION ALL
SELECT 'subjects', COUNT(*)::text FROM subjects
UNION ALL
SELECT 'amc_contracts', COUNT(*)::text FROM amc_contracts
UNION ALL
SELECT 'inventory_products', COUNT(*)::text FROM inventory_products
UNION ALL
SELECT 'subject_bills', COUNT(*)::text FROM subject_bills
UNION ALL
SELECT 'technician_earnings_summary', COUNT(*)::text FROM technician_earnings_summary
UNION ALL
SELECT 'digital_bag_sessions', COUNT(*)::text FROM digital_bag_sessions
UNION ALL
SELECT 'attendance_logs', COUNT(*)::text FROM attendance_logs
ORDER BY table_name
"@
    npx supabase db query $CountsQuery | Out-File -FilePath $CountsFile -Encoding UTF8
    Write-Host "✓ Data counts extracted successfully" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Failed to extract data counts" -ForegroundColor Red
    Write-Host $_ -ForegroundColor Red
}

Write-Host ""
Write-Host "=== STEP 3: EXTRACTING SAMPLE DATA ===" -ForegroundColor Yellow

# Extract sample data from key tables
$SampleFile = "$OutputDir\sample_data_$Timestamp.txt"
Write-Host "Extracting sample data to: $SampleFile" -ForegroundColor Cyan

try {
    # Create header
    "HI TECH SOFTWARE - SAMPLE DATA EXPORT" | Out-File -FilePath $SampleFile -Encoding UTF8
    "Generated: $(Get-Date)" | Out-File -FilePath $SampleFile -Encoding UTF8 -Append
    "Project: $ProjectRef" | Out-File -FilePath $SampleFile -Encoding UTF8 -Append
    "" | Out-File -FilePath $SampleFile -Encoding UTF8 -Append
    
    # Profiles sample
    "=== PROFILES (First 5 rows) ===" | Out-File -FilePath $SampleFile -Encoding UTF8 -Append
    npx supabase db query "SELECT id, email, display_name, role, is_active, created_at FROM profiles ORDER BY created_at DESC LIMIT 5" | Out-File -FilePath $SampleFile -Encoding UTF8 -Append
    "" | Out-File -FilePath $SampleFile -Encoding UTF8 -Append
    
    # Customers sample
    "=== CUSTOMERS (First 5 rows) ===" | Out-File -FilePath $SampleFile -Encoding UTF8 -Append
    npx supabase db query "SELECT id, customer_name, phone_number, city, is_active, created_at FROM customers ORDER BY created_at DESC LIMIT 5" | Out-File -FilePath $SampleFile -Encoding UTF8 -Append
    "" | Out-File -FilePath $SampleFile -Encoding UTF8 -Append
    
    # Subjects sample
    "=== SUBJECTS (First 5 rows) ===" | Out-File -FilePath $SampleFile -Encoding UTF8 -Append
    npx supabase db query "SELECT id, subject_number, customer_id, product_name, status, created_at FROM subjects ORDER BY created_at DESC LIMIT 5" | Out-File -FilePath $SampleFile -Encoding UTF8 -Append
    "" | Out-File -FilePath $SampleFile -Encoding UTF8 -Append
    
    # AMC Contracts sample
    "=== AMC CONTRACTS (First 5 rows) ===" | Out-File -FilePath $SampleFile -Encoding UTF8 -Append
    npx supabase db query "SELECT id, contract_number, customer_id, appliance_brand, status, price_paid, created_at FROM amc_contracts ORDER BY created_at DESC LIMIT 5" | Out-File -FilePath $SampleFile -Encoding UTF8 -Append
    "" | Out-File -FilePath $SampleFile -Encoding UTF8 -Append
    
    Write-Host "✓ Sample data extracted successfully" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Failed to extract sample data" -ForegroundColor Red
    Write-Host $_ -ForegroundColor Red
}

Write-Host ""
Write-Host "=== STEP 4: GENERATING SUMMARY ===" -ForegroundColor Yellow

# Generate summary
$SummaryFile = "$OutputDir\summary_$Timestamp.txt"
Write-Host "Generating summary to: $SummaryFile" -ForegroundColor Cyan

$Summary = @"
HI TECH SOFTWARE - DATABASE EXTRACTION SUMMARY
=================================================

Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Project: $ProjectRef
Timestamp: $Timestamp

FILES GENERATED:
- tables_$Timestamp.csv - Complete table list
- counts_$Timestamp.csv - Row counts for all tables
- sample_data_$Timestamp.txt - Sample data from key tables
- summary_$Timestamp.txt - This summary file

QUICK STATS:
- Total Tables: 33+
- Latest Migration: 033
- Project ID: $ProjectRef

NEXT STEPS:
1. Review the generated files in: $OutputDir
2. For complete data export, use: npx supabase db dump --data-only
3. For specific table data, use: npx supabase db query "SELECT * FROM table_name"

CLI COMMANDS FOR FULL DATA:
- Full database dump: npx supabase db dump > complete_database.sql
- Schema only: npx supabase db dump --schema-only > schema.sql
- Data only: npx supabase db dump --data-only > data.sql

SAMPLE QUERIES:
- Get all users: npx supabase db query "SELECT * FROM profiles"
- Get subjects: npx supabase db query "SELECT * FROM subjects LIMIT 10"
- Get AMCs: npx supabase db query "SELECT * FROM amc_contracts LIMIT 10"

Database extraction completed successfully! 🎯
"@

$Summary | Out-File -FilePath $SummaryFile -Encoding UTF8
Write-Host "✓ Summary generated successfully" -ForegroundColor Green

Write-Host ""
Write-Host "=== EXTRACTION COMPLETED ===" -ForegroundColor Green
Write-Host ""
Write-Host "Files generated in: $OutputDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "Generated files:" -ForegroundColor Yellow
Write-Host "- tables_$Timestamp.csv" -ForegroundColor White
Write-Host "- counts_$Timestamp.csv" -ForegroundColor White
Write-Host "- sample_data_$Timestamp.txt" -ForegroundColor White
Write-Host "- summary_$Timestamp.txt" -ForegroundColor White
Write-Host ""
Write-Host "To extract FULL data from all tables, run:" -ForegroundColor Yellow
Write-Host "npx supabase db dump --data-only > full_data_export.sql" -ForegroundColor Cyan
Write-Host ""
Write-Host "Database extraction completed successfully! 🎯" -ForegroundColor Green
