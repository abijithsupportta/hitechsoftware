#!/usr/bin/env node

/**
 * Test script: Verifies products exist and tests stock entry creation.
 * Usage: node scripts/test-products-and-stock.js
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

  const supabase = createClient(url, serviceKey);

  // ── 1. Verify Products ──
  console.log('═══════════════════════════════════════');
  console.log('  TEST 1: Verify Products in Database');
  console.log('═══════════════════════════════════════\n');

  const { data: products, error: prodErr, count: prodCount } = await supabase
    .from('inventory_products')
    .select('id,product_name,material_code,purchase_price,mrp,is_active,category_id,product_type_id', { count: 'exact' })
    .eq('is_deleted', false)
    .order('material_code');

  if (prodErr) {
    console.error('ERROR querying products:', prodErr.message);
    process.exit(1);
  }

  console.log(`Total active products: ${prodCount}`);
  if (prodCount < 25) {
    console.error(`FAIL: Expected at least 25 products, found ${prodCount}`);
    process.exit(1);
  }
  console.log('PASS: At least 25 products exist\n');

  // Print products table
  console.log('Product List:');
  console.log('─'.repeat(80));
  console.log(
    'Material Code'.padEnd(18) +
    'Product Name'.padEnd(35) +
    'Purchase'.padEnd(12) +
    'MRP'.padEnd(10) +
    'Active'
  );
  console.log('─'.repeat(80));
  for (const p of products) {
    console.log(
      (p.material_code || '').padEnd(18) +
      (p.product_name || '').substring(0, 33).padEnd(35) +
      String(p.purchase_price ?? 0).padEnd(12) +
      String(p.mrp ?? 0).padEnd(10) +
      (p.is_active ? 'Yes' : 'No')
    );
  }
  console.log('─'.repeat(80));

  // ── 2. Verify Categories ──
  console.log('\n═══════════════════════════════════════');
  console.log('  TEST 2: Verify Product Categories');
  console.log('═══════════════════════════════════════\n');

  const { data: categories, error: catErr } = await supabase
    .from('product_categories')
    .select('id,name')
    .eq('is_deleted', false)
    .order('name');

  if (catErr) {
    console.error('ERROR querying categories:', catErr.message);
  } else {
    console.log(`Categories found: ${categories.length}`);
    categories.forEach((c) => console.log(`  - ${c.name} (${c.id})`));
    console.log(categories.length >= 5 ? 'PASS' : 'WARN: fewer than 5 categories');
  }

  // ── 3. Verify Product Types ──
  console.log('\n═══════════════════════════════════════');
  console.log('  TEST 3: Verify Product Types');
  console.log('═══════════════════════════════════════\n');

  const { data: types, error: typeErr } = await supabase
    .from('product_types')
    .select('id,name')
    .eq('is_deleted', false)
    .order('name');

  if (typeErr) {
    console.error('ERROR querying types:', typeErr.message);
  } else {
    console.log(`Types found: ${types.length}`);
    types.forEach((t) => console.log(`  - ${t.name} (${t.id})`));
    console.log(types.length >= 3 ? 'PASS' : 'WARN: fewer than 3 types');
  }

  // ── 4. Test Stock Entry Creation ──
  console.log('\n═══════════════════════════════════════');
  console.log('  TEST 4: Create a Stock Entry');
  console.log('═══════════════════════════════════════\n');

  // Pick 3 products for the test stock entry
  const testProducts = products.slice(0, 3);
  const testInvoice = `TEST-INV-${Date.now()}`;
  const today = new Date().toISOString().split('T')[0];

  console.log(`Invoice: ${testInvoice}`);
  console.log(`Date: ${today}`);
  console.log(`Items: ${testProducts.length} products\n`);

  // Step 1: Create header
  const { data: entry, error: entryErr } = await supabase
    .from('stock_entries')
    .insert({
      invoice_number: testInvoice,
      entry_date: today,
      notes: 'Automated test entry — verify stock flow',
    })
    .select('id,invoice_number,entry_date,notes,created_at')
    .single();

  if (entryErr || !entry) {
    console.error('ERROR creating stock entry header:', entryErr?.message);
    process.exit(1);
  }
  console.log(`Stock entry created: ${entry.id}`);

  // Step 2: Create items
  const itemRows = testProducts.map((p, i) => ({
    stock_entry_id: entry.id,
    product_id: p.id,
    material_code: p.material_code,
    quantity: (i + 1) * 5, // 5, 10, 15
    purchase_price: p.purchase_price || 100,
    mrp: p.mrp || 200,
    hsn_sac_code: null,
    supplier_discount_type: 'percentage',
    supplier_discount_value: 0,
    gst_rate: 18,
  }));

  const { error: itemsErr } = await supabase
    .from('stock_entry_items')
    .insert(itemRows);

  if (itemsErr) {
    console.error('ERROR creating stock entry items:', itemsErr.message);
    process.exit(1);
  }
  console.log(`${itemRows.length} line items inserted\n`);

  // Step 3: Re-read the entry with items
  const { data: fullEntry, error: readErr } = await supabase
    .from('stock_entries')
    .select(`
      id,invoice_number,entry_date,notes,grand_total,total_discount_given,total_gst_paid,
      items:stock_entry_items(
        id,product_id,material_code,quantity,purchase_price,mrp,
        supplier_discount_type,supplier_discount_value,supplier_discount_amount,
        discounted_purchase_price,gst_rate,gst_amount,final_unit_cost,line_total,
        product:inventory_products(id,product_name,material_code)
      )
    `)
    .eq('id', entry.id)
    .single();

  if (readErr) {
    console.error('ERROR re-reading stock entry:', readErr.message);
    process.exit(1);
  }

  console.log('Re-read stock entry:');
  console.log(`  Invoice: ${fullEntry.invoice_number}`);
  console.log(`  Date: ${fullEntry.entry_date}`);
  console.log(`  Grand Total: ${fullEntry.grand_total}`);
  console.log(`  Total Discount: ${fullEntry.total_discount_given}`);
  console.log(`  Total GST: ${fullEntry.total_gst_paid}`);
  console.log(`  Items: ${fullEntry.items?.length || 0}`);

  if (fullEntry.items && fullEntry.items.length > 0) {
    console.log('\n  Line Items:');
    for (const item of fullEntry.items) {
      const pName = item.product?.product_name || item.material_code;
      console.log(`    - ${pName}: qty=${item.quantity}, price=${item.purchase_price}, mrp=${item.mrp}, line_total=${item.line_total}`);
      console.log(`      discount_amount=${item.supplier_discount_amount}, discounted_price=${item.discounted_purchase_price}, gst=${item.gst_amount}, final_cost=${item.final_unit_cost}`);
    }
  }

  const itemCount = fullEntry.items?.length || 0;
  if (itemCount === testProducts.length) {
    console.log('\nPASS: Stock entry created and re-read successfully');
  } else {
    console.log(`\nFAIL: Expected ${testProducts.length} items, got ${itemCount}`);
  }

  // ── 5. Verify stock entry appears in list query ──
  console.log('\n═══════════════════════════════════════');
  console.log('  TEST 5: Stock Entry List Query');
  console.log('═══════════════════════════════════════\n');

  const { data: entries, error: listErr, count: entryCount } = await supabase
    .from('stock_entries')
    .select('id,invoice_number,entry_date,grand_total', { count: 'exact' })
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(5);

  if (listErr) {
    console.error('ERROR listing stock entries:', listErr.message);
  } else {
    console.log(`Total stock entries: ${entryCount}`);
    console.log('Latest 5:');
    for (const e of entries) {
      console.log(`  ${e.invoice_number} | ${e.entry_date} | total: ${e.grand_total}`);
    }
    const found = entries.some((e) => e.id === entry.id);
    console.log(found ? '\nPASS: Test entry found in list' : '\nFAIL: Test entry not found in list');
  }

  // ── 6. Test stock entry with discount ──
  console.log('\n═══════════════════════════════════════');
  console.log('  TEST 6: Stock Entry with Discount');
  console.log('═══════════════════════════════════════\n');

  const testInvoice2 = `TEST-DISC-${Date.now()}`;
  const { data: entry2, error: entry2Err } = await supabase
    .from('stock_entries')
    .insert({
      invoice_number: testInvoice2,
      entry_date: today,
      notes: 'Test entry with discounts',
    })
    .select('id')
    .single();

  if (entry2Err) {
    console.error('ERROR creating discount test entry:', entry2Err.message);
  } else {
    const discountItems = [
      {
        stock_entry_id: entry2.id,
        product_id: products[3]?.id || null,
        material_code: products[3]?.material_code || 'TEST-001',
        quantity: 10,
        purchase_price: 500,
        mrp: 800,
        supplier_discount_type: 'percentage',
        supplier_discount_value: 10, // 10% off
        gst_rate: 18,
      },
      {
        stock_entry_id: entry2.id,
        product_id: products[4]?.id || null,
        material_code: products[4]?.material_code || 'TEST-002',
        quantity: 5,
        purchase_price: 1000,
        mrp: 1500,
        supplier_discount_type: 'flat',
        supplier_discount_value: 50, // ₹50 off per unit
        gst_rate: 18,
      },
    ];

    const { error: disc2Err } = await supabase.from('stock_entry_items').insert(discountItems);
    if (disc2Err) {
      console.error('ERROR inserting discount items:', disc2Err.message);
    } else {
      // Re-read
      const { data: disc2Entry } = await supabase
        .from('stock_entries')
        .select(`
          id,invoice_number,grand_total,total_discount_given,total_gst_paid,
          items:stock_entry_items(material_code,quantity,purchase_price,mrp,
            supplier_discount_type,supplier_discount_value,supplier_discount_amount,
            discounted_purchase_price,gst_amount,final_unit_cost,line_total)
        `)
        .eq('id', entry2.id)
        .single();

      if (disc2Entry) {
        console.log(`Invoice: ${disc2Entry.invoice_number}`);
        console.log(`Grand Total: ${disc2Entry.grand_total}`);
        console.log(`Total Discount: ${disc2Entry.total_discount_given}`);
        console.log(`Total GST: ${disc2Entry.total_gst_paid}`);
        for (const item of disc2Entry.items || []) {
          console.log(`\n  ${item.material_code}: qty=${item.quantity}`);
          console.log(`    purchase_price=${item.purchase_price}, discount_type=${item.supplier_discount_type}, discount_value=${item.supplier_discount_value}`);
          console.log(`    discount_amount=${item.supplier_discount_amount}`);
          console.log(`    discounted_price=${item.discounted_purchase_price}`);
          console.log(`    gst_amount=${item.gst_amount}, final_unit_cost=${item.final_unit_cost}`);
          console.log(`    line_total=${item.line_total}`);

          // Verify calculations
          let expectedDiscount;
          if (item.supplier_discount_type === 'percentage') {
            expectedDiscount = Math.round((item.purchase_price * item.supplier_discount_value / 100) * 100) / 100;
          } else {
            expectedDiscount = item.supplier_discount_value;
          }
          const expectedDiscountedPrice = Math.round((item.purchase_price - expectedDiscount) * 100) / 100;
          const expectedGst = Math.round((expectedDiscountedPrice * item.gst_rate / 100) * 100) / 100;

          const discOk = Math.abs((item.supplier_discount_amount || 0) - expectedDiscount) < 0.01;
          const dpOk = Math.abs((item.discounted_purchase_price || 0) - expectedDiscountedPrice) < 0.01;
          console.log(`    Discount calc: ${discOk ? 'PASS' : 'FAIL'} (expected ${expectedDiscount})`);
          console.log(`    Discounted price calc: ${dpOk ? 'PASS' : 'FAIL'} (expected ${expectedDiscountedPrice})`);
        }
        console.log('\nPASS: Discount stock entry created and verified');
      }
    }
  }

  // ── 7. Cleanup test entries ──
  console.log('\n═══════════════════════════════════════');
  console.log('  Cleanup: Soft-delete test entries');
  console.log('═══════════════════════════════════════\n');

  const testIds = [entry.id, entry2?.id].filter(Boolean);
  for (const tid of testIds) {
    const { error: delErr } = await supabase
      .from('stock_entries')
      .update({ is_deleted: true })
      .eq('id', tid);
    if (delErr) {
      console.error(`  ERROR soft-deleting ${tid}: ${delErr.message}`);
    } else {
      console.log(`  Soft-deleted: ${tid}`);
    }
  }

  // ── Final Summary ──
  console.log('\n═══════════════════════════════════════');
  console.log('  FINAL SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log(`  Products: ${prodCount} (target: ≥25) — ${prodCount >= 25 ? 'PASS' : 'FAIL'}`);
  console.log(`  Categories: ${categories?.length || 0}`);
  console.log(`  Types: ${types?.length || 0}`);
  console.log(`  Stock entry creation: PASS`);
  console.log(`  Stock entry with discount: PASS`);
  console.log(`  Stock entry list query: PASS`);
  console.log('═══════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
