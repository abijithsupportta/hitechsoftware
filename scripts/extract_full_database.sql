-- =====================================================================
-- Hi Tech Software - Complete Database Extraction Script
-- =====================================================================
-- This script extracts all tables, structures, and data from the live database
-- Usage: Run this script via Supabase CLI or SQL Editor
-- =====================================================================

-- Set up output format for better readability
\pset tuples_only off
\pset expanded on
\pset footer off

-- Create a comprehensive report
SELECT 'HI TECH SOFTWARE - COMPLETE DATABASE EXTRACTION' as report_title;
SELECT 'Generated: ' || NOW() as generation_time;
SELECT 'Project: otmnfcuuqlbeowphxagf' as project_reference;

-- =====================================================================
-- 1. DATABASE OVERVIEW
-- =====================================================================

SELECT '=== DATABASE OVERVIEW ===' as section_title;

SELECT 
    current_database() as database_name,
    version() as postgresql_version,
    current_schema() as current_schema,
    session_user() as current_user;

-- Count all tables
SELECT 
    COUNT(*) as total_tables,
    COUNT(*) FILTER (WHERE table_type = 'BASE TABLE') as base_tables,
    COUNT(*) FILTER (WHERE table_type = 'VIEW') as views,
    COUNT(*) FILTER (WHERE table_type = 'MATERIALIZED VIEW') as materialized_views
FROM information_schema.tables 
WHERE table_schema = 'public';

-- =====================================================================
-- 2. ENUM TYPES
-- =====================================================================

SELECT '=== ENUM TYPES ===' as section_title;

SELECT 
    typname as enum_name,
    enumlabel as enum_value,
    enumsort as sort_order
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typtype = 'e'
ORDER BY typname, enumsort;

-- =====================================================================
-- 3. TABLE STRUCTURES
-- =====================================================================

SELECT '=== TABLE STRUCTURES ===' as section_title;

-- Get all table definitions
DO $$
DECLARE
    table_record RECORD;
    sql_text TEXT;
BEGIN
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    LOOP
        sql_text := format('-- Table: %s', table_record.table_name);
        RAISE NOTICE '%', sql_text;
        
        -- Get table structure
        EXECUTE format($$
            SELECT 
                column_name,
                data_type,
                character_maximum_length,
                is_nullable,
                column_default,
                ordinal_position
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = '%s'
            ORDER BY ordinal_position
        $$, table_record.table_name);
        
        -- Get indexes
        EXECUTE format($$
            SELECT 
                indexname,
                indexdef
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = '%s'
            ORDER BY indexname
        $$, table_record.table_name);
        
        -- Get foreign keys
        EXECUTE format($$
            SELECT
                tc.constraint_name,
                tc.constraint_type,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_schema = 'public'
                AND tc.table_name = '%s'
        $$, table_record.table_name);
    END LOOP;
END $$;

-- =====================================================================
-- 4. TABLE DATA COUNTS
-- =====================================================================

SELECT '=== TABLE DATA COUNTS ===' as section_title;

DO $$
DECLARE
    table_record RECORD;
    sql_text TEXT;
    row_count BIGINT;
BEGIN
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', table_record.table_name) INTO row_count;
        RAISE NOTICE 'Table: %s, Rows: %s', table_record.table_name, row_count;
    END LOOP;
END $$;

-- =====================================================================
-- 5. SAMPLE DATA FROM EACH TABLE
-- =====================================================================

SELECT '=== SAMPLE DATA (First 5 rows from each table) ===' as section_title;

DO $$
DECLARE
    table_record RECORD;
    sql_text TEXT;
BEGIN
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    LOOP
        sql_text := format('-- Sample data from: %s', table_record.table_name);
        RAISE NOTICE '%', sql_text;
        
        EXECUTE format($$
            SELECT *
            FROM %I
            LIMIT 5
        $$, table_record.table_name);
    END LOOP;
END $$;

-- =====================================================================
-- 6. RLS POLICIES
-- =====================================================================

SELECT '=== ROW LEVEL SECURITY POLICIES ===' as section_title;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================================
-- 7. FUNCTIONS
-- =====================================================================

SELECT '=== CUSTOM FUNCTIONS ===' as section_title;

SELECT 
    proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND NOT proname LIKE 'pg_%'
ORDER BY proname;

-- =====================================================================
-- 8. TRIGGERS
-- =====================================================================

SELECT '=== TRIGGERS ===' as section_title;

SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_condition,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- =====================================================================
-- 9. VIEWS
-- =====================================================================

SELECT '=== VIEWS ===' as section_title;

SELECT 
    table_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- =====================================================================
-- 10. MATERIALIZED VIEWS
-- =====================================================================

SELECT '=== MATERIALIZED VIEWS ===' as section_title;

SELECT 
    matviewname as materialized_view_name,
    pg_get_viewdef(oid) as view_definition
FROM pg_matviews
WHERE schemaname = 'public'
ORDER BY matviewname;

-- =====================================================================
-- COMPLETION
-- =====================================================================

SELECT '=== EXTRACTION COMPLETED ===' as section_title;
SELECT 'Full database structure and sample data extracted successfully' as status;
SELECT 'Check the output above for complete database documentation' as note;
