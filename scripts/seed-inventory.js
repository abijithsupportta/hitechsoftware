#!/usr/bin/env node

/**
 * Seed script: Inserts product categories, product types, and 35 inventory products.
 * Usage: node scripts/seed-inventory.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv(envPath) {
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return env;
}

async function main() {
  const envPath = path.join(__dirname, '..', 'web', '.env.local');
  const env = loadEnv(envPath);
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in web/.env.local');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── 1. Seed Product Categories ──
  const categoryNames = [
    'Spare Parts',
    'Consumables',
    'Accessories',
    'Tools',
    'Electrical Components',
    'Mechanical Parts',
    'Cleaning Supplies',
  ];

  console.log('Seeding product categories...');
  const categoryMap = {};

  for (const name of categoryNames) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('product_categories')
      .select('id, name')
      .ilike('name', name)
      .eq('is_deleted', false)
      .maybeSingle();

    if (existing) {
      categoryMap[name] = existing.id;
      console.log(`  [exists] ${name} → ${existing.id}`);
    } else {
      const { data, error } = await supabase
        .from('product_categories')
        .insert({ name, is_active: true, is_deleted: false })
        .select('id')
        .single();
      if (error) {
        console.error(`  [error] ${name}: ${error.message}`);
        continue;
      }
      categoryMap[name] = data.id;
      console.log(`  [created] ${name} → ${data.id}`);
    }
  }

  // ── 2. Seed Product Types ──
  const typeNames = [
    'OEM',
    'Aftermarket',
    'Generic',
    'Premium',
    'Refurbished',
  ];

  console.log('\nSeeding product types...');
  const typeMap = {};

  for (const name of typeNames) {
    const { data: existing } = await supabase
      .from('product_types')
      .select('id, name')
      .ilike('name', name)
      .eq('is_deleted', false)
      .maybeSingle();

    if (existing) {
      typeMap[name] = existing.id;
      console.log(`  [exists] ${name} → ${existing.id}`);
    } else {
      const { data, error } = await supabase
        .from('product_types')
        .insert({ name, is_active: true, is_deleted: false })
        .select('id')
        .single();
      if (error) {
        console.error(`  [error] ${name}: ${error.message}`);
        continue;
      }
      typeMap[name] = data.id;
      console.log(`  [created] ${name} → ${data.id}`);
    }
  }

  // ── 3. Seed 35 Products ──
  const products = [
    // Spare Parts
    { product_name: 'Compressor Motor 1HP', material_code: 'SP-COMP-001', category: 'Spare Parts', type: 'OEM', hsn: '8414', purchase_price: 4500, mrp: 6500, min_stock: 3 },
    { product_name: 'Evaporator Coil - Split AC', material_code: 'SP-EVAP-002', category: 'Spare Parts', type: 'OEM', hsn: '8418', purchase_price: 2800, mrp: 4200, min_stock: 5 },
    { product_name: 'Thermostat Sensor', material_code: 'SP-THERM-003', category: 'Spare Parts', type: 'Aftermarket', hsn: '9032', purchase_price: 350, mrp: 600, min_stock: 10 },
    { product_name: 'Fan Blade Assembly 16 inch', material_code: 'SP-FAN-004', category: 'Spare Parts', type: 'Generic', hsn: '8414', purchase_price: 280, mrp: 450, min_stock: 8 },
    { product_name: 'Capacitor 35MFD', material_code: 'SP-CAP-005', category: 'Spare Parts', type: 'OEM', hsn: '8532', purchase_price: 180, mrp: 320, min_stock: 15 },

    // Electrical Components
    { product_name: 'PCB Control Board - Washing Machine', material_code: 'EC-PCB-001', category: 'Electrical Components', type: 'OEM', hsn: '8534', purchase_price: 2200, mrp: 3500, min_stock: 3 },
    { product_name: 'Relay Switch 30A', material_code: 'EC-RELAY-002', category: 'Electrical Components', type: 'Generic', hsn: '8536', purchase_price: 120, mrp: 250, min_stock: 20 },
    { product_name: 'Transformer 12V 2A', material_code: 'EC-TRANS-003', category: 'Electrical Components', type: 'Aftermarket', hsn: '8504', purchase_price: 350, mrp: 550, min_stock: 10 },
    { product_name: 'LED Display Module', material_code: 'EC-LED-004', category: 'Electrical Components', type: 'OEM', hsn: '8541', purchase_price: 450, mrp: 750, min_stock: 5 },
    { product_name: 'Power Cord 3-Pin 1.5M', material_code: 'EC-CORD-005', category: 'Electrical Components', type: 'Generic', hsn: '8544', purchase_price: 80, mrp: 150, min_stock: 25 },

    // Consumables
    { product_name: 'Refrigerant Gas R32 - 1kg', material_code: 'CON-GAS-001', category: 'Consumables', type: 'Premium', hsn: '2903', purchase_price: 650, mrp: 950, min_stock: 10 },
    { product_name: 'Copper Tube 1/4 inch - 15M', material_code: 'CON-TUBE-002', category: 'Consumables', type: 'Generic', hsn: '7411', purchase_price: 1800, mrp: 2500, min_stock: 5 },
    { product_name: 'Brazing Rod Silver 15%', material_code: 'CON-BROD-003', category: 'Consumables', type: 'Premium', hsn: '8311', purchase_price: 220, mrp: 380, min_stock: 20 },
    { product_name: 'Insulation Tape Roll', material_code: 'CON-TAPE-004', category: 'Consumables', type: 'Generic', hsn: '3919', purchase_price: 45, mrp: 80, min_stock: 30 },
    { product_name: 'Cable Tie Pack - 100pcs', material_code: 'CON-CTIE-005', category: 'Consumables', type: 'Generic', hsn: '3926', purchase_price: 60, mrp: 120, min_stock: 20 },

    // Accessories
    { product_name: 'Remote Control - Universal AC', material_code: 'ACC-REM-001', category: 'Accessories', type: 'Aftermarket', hsn: '8543', purchase_price: 250, mrp: 450, min_stock: 10 },
    { product_name: 'Wall Mount Bracket - Split AC', material_code: 'ACC-BRK-002', category: 'Accessories', type: 'OEM', hsn: '7616', purchase_price: 350, mrp: 600, min_stock: 8 },
    { product_name: 'Drain Pipe 5M - Split AC', material_code: 'ACC-PIPE-003', category: 'Accessories', type: 'Generic', hsn: '3917', purchase_price: 120, mrp: 220, min_stock: 15 },
    { product_name: 'Filter Mesh - Washing Machine', material_code: 'ACC-FILT-004', category: 'Accessories', type: 'OEM', hsn: '8421', purchase_price: 180, mrp: 300, min_stock: 10 },
    { product_name: 'Door Gasket - Refrigerator', material_code: 'ACC-GASK-005', category: 'Accessories', type: 'Aftermarket', hsn: '4016', purchase_price: 400, mrp: 650, min_stock: 5 },

    // Tools
    { product_name: 'Manifold Gauge Set - R410A', material_code: 'TL-GAUGE-001', category: 'Tools', type: 'Premium', hsn: '9026', purchase_price: 3200, mrp: 4800, min_stock: 2 },
    { product_name: 'Pipe Cutter 1/8-1 1/8', material_code: 'TL-CUT-002', category: 'Tools', type: 'Premium', hsn: '8203', purchase_price: 850, mrp: 1400, min_stock: 3 },
    { product_name: 'Flaring Tool Kit', material_code: 'TL-FLAR-003', category: 'Tools', type: 'Premium', hsn: '8205', purchase_price: 1800, mrp: 2800, min_stock: 2 },
    { product_name: 'Digital Multimeter', material_code: 'TL-DMM-004', category: 'Tools', type: 'Generic', hsn: '9030', purchase_price: 750, mrp: 1200, min_stock: 4 },
    { product_name: 'Vacuum Pump - 2 Stage', material_code: 'TL-VPUMP-005', category: 'Tools', type: 'Premium', hsn: '8414', purchase_price: 5500, mrp: 8200, min_stock: 1 },

    // Mechanical Parts
    { product_name: 'Bearing 6203-2RS', material_code: 'MP-BEAR-001', category: 'Mechanical Parts', type: 'OEM', hsn: '8482', purchase_price: 120, mrp: 220, min_stock: 15 },
    { product_name: 'Pulley V-Belt 3 inch', material_code: 'MP-PULL-002', category: 'Mechanical Parts', type: 'Aftermarket', hsn: '8483', purchase_price: 280, mrp: 450, min_stock: 8 },
    { product_name: 'Shaft Seal - Compressor', material_code: 'MP-SEAL-003', category: 'Mechanical Parts', type: 'OEM', hsn: '8484', purchase_price: 350, mrp: 550, min_stock: 5 },
    { product_name: 'Spring Set - Door Hinge', material_code: 'MP-SPRG-004', category: 'Mechanical Parts', type: 'Generic', hsn: '7320', purchase_price: 90, mrp: 180, min_stock: 10 },
    { product_name: 'Rubber Mounting Pad', material_code: 'MP-RPAD-005', category: 'Mechanical Parts', type: 'Generic', hsn: '4016', purchase_price: 60, mrp: 120, min_stock: 20 },

    // Cleaning Supplies
    { product_name: 'AC Coil Cleaner Spray 500ml', material_code: 'CL-COIL-001', category: 'Cleaning Supplies', type: 'Premium', hsn: '3402', purchase_price: 280, mrp: 450, min_stock: 15 },
    { product_name: 'Descaler Solution 1L', material_code: 'CL-DESC-002', category: 'Cleaning Supplies', type: 'Generic', hsn: '3402', purchase_price: 180, mrp: 320, min_stock: 10 },
    { product_name: 'Anti-Bacterial Filter Spray', material_code: 'CL-ABFS-003', category: 'Cleaning Supplies', type: 'Premium', hsn: '3808', purchase_price: 350, mrp: 550, min_stock: 8 },
    { product_name: 'Microfiber Cloth Pack - 5pcs', material_code: 'CL-CLTH-004', category: 'Cleaning Supplies', type: 'Generic', hsn: '6307', purchase_price: 150, mrp: 280, min_stock: 10 },
    { product_name: 'Drain Pan Cleaning Tablet', material_code: 'CL-DPAN-005', category: 'Cleaning Supplies', type: 'Generic', hsn: '3402', purchase_price: 120, mrp: 220, min_stock: 15 },
  ];

  console.log(`\nSeeding ${products.length} products...\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const p of products) {
    // Check if material_code already exists
    const { data: existing } = await supabase
      .from('inventory_products')
      .select('id')
      .ilike('material_code', p.material_code)
      .eq('is_deleted', false)
      .maybeSingle();

    if (existing) {
      console.log(`  [skip] ${p.material_code} — ${p.product_name} (already exists)`);
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from('inventory_products')
      .insert({
        product_name: p.product_name,
        material_code: p.material_code.toUpperCase(),
        category_id: categoryMap[p.category] || null,
        product_type_id: typeMap[p.type] || null,
        hsn_sac_code: p.hsn,
        purchase_price: p.purchase_price,
        mrp: p.mrp,
        minimum_stock_level: p.min_stock,
        is_refurbished: false,
        is_active: true,
        is_deleted: false,
        stock_classification: 'unclassified',
      });

    if (error) {
      console.error(`  [error] ${p.material_code}: ${error.message}`);
      errors++;
    } else {
      console.log(`  [ok] ${p.material_code} — ${p.product_name}`);
      created++;
    }
  }

  console.log(`\n── Summary ──`);
  console.log(`Categories: ${Object.keys(categoryMap).length}`);
  console.log(`Types:      ${Object.keys(typeMap).length}`);
  console.log(`Products:   ${created} created, ${skipped} skipped, ${errors} errors`);
  console.log(`Total:      ${created + skipped} / ${products.length}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
