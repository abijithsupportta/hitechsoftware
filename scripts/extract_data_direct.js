// =====================================================================
// Hi Tech Software - Direct Database Extraction Script
// =====================================================================
// This script uses the Supabase client to extract data directly
// Usage: node extract_data_direct.js
// =====================================================================

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://otmnfcuuqlbeowphxagf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90bW5mY3V1cWxiZXdwaHhhZ2YiLCJpYXQiOjE3NDY1MjU2NzYsImV4cCI6MjA2MjEwMjY3Nn0.5B3qQZwJqK3vNQjJhXq2Y7x8w9z0A1bC2dE3fG4hI5k';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Table list to extract
const tables = [
    'profiles',
    'technicians', 
    'customers',
    'customer_addresses',
    'brands',
    'dealers',
    'service_categories',
    'subjects',
    'subject_history',
    'subject_status_history',
    'amc_contracts',
    'subject_contracts',
    'attendance_logs',
    'product_categories',
    'product_types',
    'inventory_products',
    'stock_entries',
    'stock_entry_items',
    'mrp_change_log',
    'digital_bag_sessions',
    'digital_bag_items',
    'digital_bag_consumptions',
    'subject_bills',
    'subject_accessories',
    'subject_photos',
    'technician_commission_config',
    'technician_earnings_summary',
    'technician_service_payouts',
    'notifications',
    'auth_logs',
    'brand_dealer_payments'
];

async function extractAllData() {
    console.log('=== HI TECH SOFTWARE - DATABASE EXTRACTION ===');
    console.log('Starting data extraction from live Supabase database...');
    console.log('');

    const results = {
        timestamp: new Date().toISOString(),
        project: 'otmnfcuuqlbeowphxagf',
        tables: {},
        summary: {
            totalTables: 0,
            totalRows: 0,
            errors: 0
        }
    };

    // Extract data from each table
    for (const tableName of tables) {
        try {
            console.log(`Extracting ${tableName}...`);
            
            const { data, error, count } = await supabase
                .from(tableName)
                .select('*', { count: 'exact' });
            
            if (error) {
                console.error(`Error in ${tableName}:`, error.message);
                results.tables[tableName] = {
                    error: error.message,
                    count: 0,
                    data: []
                };
                results.summary.errors++;
            } else {
                console.log(`✓ ${tableName}: ${count} rows`);
                results.tables[tableName] = {
                    count: count || 0,
                    data: data || []
                };
                results.summary.totalRows += (count || 0);
                results.summary.totalTables++;
            }
        } catch (err) {
            console.error(`Failed to extract ${tableName}:`, err.message);
            results.tables[tableName] = {
                error: err.message,
                count: 0,
                data: []
            };
            results.summary.errors++;
        }
    }

    // Generate output
    console.log('');
    console.log('=== EXTRACTION SUMMARY ===');
    console.log(`Total Tables: ${results.summary.totalTables}`);
    console.log(`Total Rows: ${results.summary.totalRows}`);
    console.log(`Errors: ${results.summary.errors}`);
    console.log('');

    // Save to file
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `database_extraction_${timestamp}.json`;
    
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`Data saved to: ${filename}`);

    // Print sample data
    console.log('');
    console.log('=== SAMPLE DATA ===');
    
    // Show profiles sample
    if (results.tables.profiles && results.tables.profiles.data.length > 0) {
        console.log('\n--- PROFILES (First 3) ---');
        results.tables.profiles.data.slice(0, 3).forEach((profile, index) => {
            console.log(`${index + 1}. ${profile.display_name} (${profile.email}) - ${profile.role}`);
        });
    }

    // Show customers sample
    if (results.tables.customers && results.tables.customers.data.length > 0) {
        console.log('\n--- CUSTOMERS (First 3) ---');
        results.tables.customers.data.slice(0, 3).forEach((customer, index) => {
            console.log(`${index + 1}. ${customer.customer_name} - ${customer.phone_number} - ${customer.city}`);
        });
    }

    // Show subjects sample
    if (results.tables.subjects && results.tables.subjects.data.length > 0) {
        console.log('\n--- SUBJECTS (First 3) ---');
        results.tables.subjects.data.slice(0, 3).forEach((subject, index) => {
            console.log(`${index + 1}. ${subject.subject_number} - ${subject.product_name} - ${subject.status}`);
        });
    }

    // Show AMC contracts sample
    if (results.tables.amc_contracts && results.tables.amc_contracts.data.length > 0) {
        console.log('\n--- AMC CONTRACTS (First 3) ---');
        results.tables.amc_contracts.data.slice(0, 3).forEach((contract, index) => {
            console.log(`${index + 1}. ${contract.contract_number} - ${contract.appliance_brand} - ${contract.status}`);
        });
    }

    // Show inventory products sample
    if (results.tables.inventory_products && results.tables.inventory_products.data.length > 0) {
        console.log('\n--- INVENTORY PRODUCTS (First 3) ---');
        results.tables.inventory_products.data.slice(0, 3).forEach((product, index) => {
            console.log(`${index + 1}. ${product.material_code} - ${product.product_name} - ₹${product.mrp}`);
        });
    }

    // Show earnings summary
    if (results.tables.technician_earnings_summary && results.tables.technician_earnings_summary.data.length > 0) {
        console.log('\n--- EARNINGS SUMMARY ---');
        const totalEarnings = results.tables.technician_earnings_summary.data.reduce((sum, item) => sum + (item.net_earnings || 0), 0);
        console.log(`Total Technician Earnings: ₹${totalEarnings.toFixed(2)}`);
        console.log(`Earnings Records: ${results.tables.technician_earnings_summary.data.length}`);
    }

    console.log('');
    console.log('=== EXTRACTION COMPLETED ===');
    console.log(`Full data saved to: ${filename}`);
    console.log('🎯 Database extraction completed successfully!');
    
    return results;
}

// Run the extraction
extractAllData().catch(console.error);
