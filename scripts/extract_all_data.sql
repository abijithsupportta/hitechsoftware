-- =====================================================================
-- Hi Tech Software - Complete Data Extraction Script
-- =====================================================================
-- This script extracts ALL data from ALL tables in the live database
-- Usage: Run via Supabase CLI to get complete data dump
-- =====================================================================

-- Set up for better data export
\pset tuples_only off
\pset expanded on
\pset footer off
\o database_export.txt

-- Header information
SELECT 'HI TECH SOFTWARE - COMPLETE DATABASE DATA EXPORT' as export_title;
SELECT 'Generated: ' || NOW() as export_timestamp;
SELECT 'Project: otmnfcuuqlbeowphxagf' as project_reference;
SELECT '' as separator;

-- =====================================================================
-- TABLE 1: profiles (User Management)
-- =====================================================================
SELECT '=== PROFILES TABLE ===' as section_header;
SELECT '' as separator;
SELECT * FROM profiles ORDER BY created_at;
SELECT '' as separator;
SELECT COUNT(*) as total_profiles FROM profiles;
SELECT '' as separator;

-- =====================================================================
-- TABLE 2: technicians
-- =====================================================================
SELECT '=== TECHNICIANS TABLE ===' as section_header;
SELECT '' as separator;
SELECT * FROM technicians ORDER BY created_at;
SELECT '' as separator;
SELECT COUNT(*) as total_technicians FROM technicians;
SELECT '' as separator;

-- =====================================================================
-- TABLE 3: customers
-- =====================================================================
SELECT '=== CUSTOMERS TABLE ===' as section_header;
SELECT '' as separator;
SELECT * FROM customers ORDER BY created_at;
SELECT '' as separator;
SELECT COUNT(*) as total_customers FROM customers;
SELECT '' as separator;

-- =====================================================================
-- TABLE 4: customer_addresses
-- =====================================================================
SELECT '=== CUSTOMER_ADDRESSES TABLE ===' as section_header;
SELECT '' as separator;
SELECT * FROM customer_addresses ORDER BY created_at;
SELECT '' as separator;
SELECT COUNT(*) as total_customer_addresses FROM customer_addresses;
SELECT '' as separator;

-- =====================================================================
-- TABLE 5: brands
-- =====================================================================
SELECT '=== BRANDS TABLE ===' as section_header;
SELECT '' as separator;
SELECT * FROM brands ORDER BY created_at;
SELECT '' as separator;
SELECT COUNT(*) as total_brands FROM brands;
SELECT '' as separator;

-- =====================================================================
-- TABLE 6: dealers
-- =====================================================================
SELECT '=== DEALERS TABLE ===' as section_header;
SELECT '' as separator;
SELECT * FROM dealers ORDER BY created_at;
SELECT '' as separator;
SELECT COUNT(*) as total_dealers FROM dealers;
SELECT '' as separator;

-- =====================================================================
-- TABLE 7: service_categories
-- =====================================================================
SELECT '=== SERVICE_CATEGORIES TABLE ===' as section_header;
SELECT '' as separator;
SELECT * FROM service_categories ORDER BY created_at;
SELECT '' as separator;
SELECT COUNT(*) as total_service_categories FROM service_categories;
SELECT '' as separator;

-- =====================================================================
-- TABLE 8: subjects (Service Tickets)
-- =====================================================================
SELECT '=== SUBJECTS TABLE ===' as section_header;
SELECT '' as separator;
SELECT 
    id, subject_number, customer_id, product_name, product_description,
    product_model, product_serial_number, category_name, type_of_service,
    priority, status, warranty_end_date, assigned_technician_id,
    technician_acceptance_status, technician_allocated_date,
    technician_allocation_notes, rejected_by_technician_id,
    is_rejected_pending_reschedule, reschedule_reason, is_amc_service,
    amc_id, is_warranty_service, amc_override_reason, completed_at,
    created_at, updated_at, is_deleted, deleted_at
FROM subjects 
ORDER BY created_at DESC;
SELECT '' as separator;
SELECT COUNT(*) as total_subjects FROM subjects;
SELECT '' as separator;

-- =====================================================================
-- TABLE 9: subject_history
-- =====================================================================
SELECT '=== SUBJECT_HISTORY TABLE ===' as section_header;
SELECT '' as separator;
SELECT * FROM subject_history ORDER BY created_at DESC;
SELECT '' as separator;
SELECT COUNT(*) as total_subject_history FROM subject_history;
SELECT '' as separator;

-- =====================================================================
-- TABLE 10: subject_status_history
-- =====================================================================
SELECT '=== SUBJECT_STATUS_HISTORY TABLE ===' as section_header;
SELECT '' as separator;
SELECT * FROM subject_status_history ORDER BY created_at DESC;
SELECT '' as separator;
SELECT COUNT(*) as total_subject_status_history FROM subject_status_history;
SELECT '' as separator;

-- =====================================================================
-- TABLE 11: amc_contracts
-- =====================================================================
SELECT '=== AMC_CONTRACTS TABLE ===' as section_header;
SELECT '' as separator;
SELECT * FROM amc_contracts ORDER BY created_at DESC;
SELECT '' as separator;
SELECT COUNT(*) as total_amc_contracts FROM amc_contracts;
SELECT '' as separator;

-- =====================================================================
-- TABLE 12: subject_contracts
-- =====================================================================
SELECT '=== SUBJECT_CONTRACTS TABLE ===' as section_header;
SELECT '' as separator;
SELECT * FROM subject_contracts ORDER BY created_at DESC;
SELECT '' as separator;
SELECT COUNT(*) as total_subject_contracts FROM subject_contracts;
SELECT '' as separator;

-- =====================================================================
-- TABLE 13: attendance_logs
-- =====================================================================
SELECT '=== ATTENDANCE_LOGS TABLE ===' as section_header;
SELECT '' as separator;
SELECT * FROM attendance_logs ORDER BY attendance_date DESC;
SELECT '' as separator;
SELECT COUNT(*) as total_attendance_logs FROM attendance_logs;
SELECT '' as separator;

-- =====================================================================
-- TABLE 14: product_categories
-- =====================================================================
SELECT '=== PRODUCT_CATEGORIES TABLE ===' as section_header;
SELECT '' as separator;
SELECT * FROM product_categories ORDER BY created_at;
SELECT '' as separator;
SELECT COUNT(*) as total_product_categories FROM product_categories;
SELECT '' as separator;

-- =====================================================================
-- TABLE 15: product_types
-- =====================================================================
SELECT '=== PRODUCT_TYPES TABLE ===' as section_header;
SELECT '' as separator;
SELECT * FROM product_types ORDER BY created_at;
SELECT '' as separator;
SELECT COUNT(*) as total_product_types FROM product_types;
SELECT '' as separator;

-- =====================================================================
-- TABLE 16: inventory_products
-- =====================================================================
SELECT '=== INVENTORY_PRODUCTS TABLE ===' as section_header;
SELECT '' as separator;
SELECT * FROM inventory_products ORDER BY created_at;
SELECT '' as separator;
SELECT COUNT(*) as total_inventory_products FROM inventory_products;
SELECT '' as separator;

-- =====================================================================
-- TABLE 17: stock_entries
-- =====================================================================
SELECT '=== STOCK_ENTRIES TABLE ===' as section_header;
SELECT '' as separator;
SELECT * FROM stock_entries ORDER BY created_at DESC;
SELECT '' as separator;
SELECT COUNT(*) as total_stock_entries FROM stock_entries;
SELECT '' as separator;

-- =====================================================================
-- TABLE 18: stock_entry_items
-- =====================================================================
SELECT '=== STOCK_ENTRY_ITEMS TABLE ===' as section_header;
SELECT '' as separator;
SELECT * FROM stock_entry_items ORDER BY created_at DESC;
SELECT '' as separator;
SELECT COUNT(*) as total_stock_entry_items FROM stock_entry_items;
SELECT '' as separator;

-- =====================================================================
-- TABLE 19: mrp_change_log
-- =====================================================================
SELECT '=== MRP_CHANGE_LOG TABLE ===' as section_header;
SELECT '' as separator;
SELECT * FROM mrp_change_log ORDER BY changed_at DESC;
SELECT '' as separator;
SELECT COUNT(*) as total_mrp_change_log FROM mrp_change_log;
SELECT '' as separator;

-- =====================================================================
-- TABLE 20: digital_bag_sessions
-- =====================================================================
SELECT '=== DIGITAL_BAG_SESSIONS TABLE ===' as section_header;
SELECT '' as separator;
SELECT * FROM digital_bag_sessions ORDER BY session_date DESC;
SELECT '' as separator;
SELECT COUNT(*) as total_digital_bag_sessions FROM digital_bag_sessions;
SELECT '' as separator;

-- =====================================================================
-- TABLE 21: digital_bag_items
-- =====================================================================
SELECT '=== DIGITAL_BAG_ITEMS TABLE ===' as section_header;
SELECT '' as separator;
SELECT * FROM digital_bag_items ORDER BY created_at DESC;
SELECT '' as separator;
SELECT COUNT(*) as total_digital_bag_items FROM digital_bag_items;
SELECT '' as separator;

-- =====================================================================
-- TABLE 22: digital_bag_consumptions
-- =====================================================================
SELECT '=== DIGITAL_BAG_CONSUMPTIONS TABLE ===' as section_header;
SELECT '' as separator;
SELECT * FROM digital_bag_consumptions ORDER BY created_at DESC;
SELECT '' as separator;
SELECT COUNT(*) as total_digital_bag_consumptions FROM digital_bag_consumptions;
SELECT '' as separator;

-- =====================================================================
-- TABLE 23: subject_bills
-- =====================================================================
SELECT '=== SUBJECT_BILLS TABLE ===' as section_header;
SELECT '' as separator;
SELECT * FROM subject_bills ORDER BY created_at DESC;
SELECT '' as separator;
SELECT COUNT(*) as total_subject_bills FROM subject_bills;
SELECT '' as separator;

-- =====================================================================
-- TABLE 24: subject_accessories
-- =====================================================================
SELECT '=== SUBJECT_ACCESSORIES TABLE ===' as section_header;
SELECT '' as separator;
SELECT * FROM subject_accessories ORDER BY created_at DESC;
SELECT '' as separator;
SELECT COUNT(*) as total_subject_accessories FROM subject_accessories;
SELECT '' as separator;

-- =====================================================================
-- TABLE 25: subject_photos
-- =====================================================================
SELECT '=== SUBJECT_PHOTOS TABLE ===' as section_header;
SELECT '' as separator;
SELECT * FROM subject_photos ORDER BY uploaded_at DESC;
SELECT '' as separator;
SELECT COUNT(*) as total_subject_photos FROM subject_photos;
SELECT '' as separator;

-- =====================================================================
-- TABLE 26: technician_commission_config
-- =====================================================================
SELECT '=== TECHNICIAN_COMMISSION_CONFIG TABLE ===' as section_header;
SELECT '' as separator;
SELECT * FROM technician_commission_config ORDER BY created_at DESC;
SELECT '' as separator;
SELECT COUNT(*) as total_technician_commission_config FROM technician_commission_config;
SELECT '' as separator;

-- =====================================================================
-- TABLE 27: technician_earnings_summary
-- =====================================================================
SELECT '=== TECHNICIAN_EARNINGS_SUMMARY TABLE ===' as section_header;
SELECT '' as separator;
SELECT * FROM technician_earnings_summary ORDER BY created_at DESC;
SELECT '' as separator;
SELECT COUNT(*) as total_technician_earnings_summary FROM technician_earnings_summary;
SELECT '' as separator;

-- =====================================================================
-- TABLE 28: technician_service_payouts
-- =====================================================================
SELECT '=== TECHNICIAN_SERVICE_PAYOUTS TABLE ===' as section_header;
SELECT '' as separator;
SELECT * FROM technician_service_payouts ORDER BY created_at DESC;
SELECT '' as separator;
SELECT COUNT(*) as total_technician_service_payouts FROM technician_service_payouts;
SELECT '' as separator;

-- =====================================================================
-- TABLE 29: notifications
-- =====================================================================
SELECT '=== NOTIFICATIONS TABLE ===' as section_header;
SELECT '' as separator;
SELECT * FROM notifications ORDER BY created_at DESC;
SELECT '' as separator;
SELECT COUNT(*) as total_notifications FROM notifications;
SELECT '' as separator;

-- =====================================================================
-- TABLE 30: auth_logs
-- =====================================================================
SELECT '=== AUTH_LOGS TABLE ===' as section_header;
SELECT '' as separator;
SELECT * FROM auth_logs ORDER BY created_at DESC;
SELECT '' as separator;
SELECT COUNT(*) as total_auth_logs FROM auth_logs;
SELECT '' as separator;

-- =====================================================================
-- TABLE 31: brand_dealer_payments
-- =====================================================================
SELECT '=== BRAND_DEALER_PAYMENTS TABLE ===' as section_header;
SELECT '' as separator;
SELECT * FROM brand_dealer_payments ORDER BY created_at DESC;
SELECT '' as separator;
SELECT COUNT(*) as total_brand_dealer_payments FROM brand_dealer_payments;
SELECT '' as separator;

-- =====================================================================
-- SUMMARY STATISTICS
-- =====================================================================
SELECT '=== SUMMARY STATISTICS ===' as section_header;
SELECT '' as separator;

SELECT 'SUMMARY OF ALL TABLES' as summary_title;
SELECT '' as separator;

SELECT 
    (SELECT COUNT(*) FROM profiles) as profiles_count,
    (SELECT COUNT(*) FROM technicians) as technicians_count,
    (SELECT COUNT(*) FROM customers) as customers_count,
    (SELECT COUNT(*) FROM subjects) as subjects_count,
    (SELECT COUNT(*) FROM amc_contracts) as amc_contracts_count,
    (SELECT COUNT(*) FROM inventory_products) as products_count,
    (SELECT COUNT(*) FROM subject_bills) as bills_count,
    (SELECT COUNT(*) FROM technician_earnings_summary) as earnings_count;

SELECT '' as separator;
SELECT 'DATA EXPORT COMPLETED SUCCESSFULLY' as completion_status;
SELECT 'Export file: database_export.txt' as export_file;
SELECT 'Timestamp: ' || NOW() as completion_time;
