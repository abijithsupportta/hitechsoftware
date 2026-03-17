#!/usr/bin/env node

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
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    env[key] = value;
  }

  return env;
}

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

async function main() {
  const targetCount = Number(process.argv[2] || '100');
  if (!Number.isFinite(targetCount) || targetCount <= 0) {
    throw new Error('Usage: node scripts/seed-subjects.js <count> (count must be > 0)');
  }

  const envPath = path.join(__dirname, '..', 'web', '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error(`Missing env file: ${envPath}`);
  }

  const env = loadEnv(envPath);
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in web/.env.local');
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const [{ data: brands, error: brandsError }, { data: dealers, error: dealersError }, { data: categories, error: categoriesError }] =
    await Promise.all([
      supabase.from('brands').select('id,name').eq('is_active', true).order('name'),
      supabase.from('dealers').select('id,name').eq('is_active', true).order('name'),
      supabase.from('service_categories').select('id,name').eq('is_active', true).order('name'),
    ]);

  if (brandsError) throw new Error(`Failed to read brands: ${brandsError.message}`);
  if (dealersError) throw new Error(`Failed to read dealers: ${dealersError.message}`);
  if (categoriesError) throw new Error(`Failed to read service categories: ${categoriesError.message}`);

  if (!brands || brands.length === 0) {
    throw new Error('No active brands found. Add at least one brand before seeding subjects.');
  }
  if (!dealers || dealers.length === 0) {
    throw new Error('No active dealers found. Add at least one dealer before seeding subjects.');
  }
  if (!categories || categories.length === 0) {
    throw new Error('No active service categories found. Add at least one category before seeding subjects.');
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id,role,is_active,is_deleted')
    .eq('is_active', true)
    .eq('is_deleted', false)
    .in('role', ['super_admin', 'office_staff'])
    .order('role');

  if (profilesError) throw new Error(`Failed to read profiles: ${profilesError.message}`);
  if (!profiles || profiles.length === 0) {
    throw new Error('No active super_admin/office_staff profile found for created_by.');
  }

  const createdBy = profiles[0].id;

  const priorities = ['critical', 'high', 'medium', 'low'];
  const serviceTypes = ['service', 'installation'];
  const now = new Date();
  const runToken = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

  let success = 0;
  const failures = [];

  for (let i = 1; i <= targetCount; i++) {
    const sourceType = i % 2 === 0 ? 'brand' : 'dealer';
    const brand = brands[randomInt(brands.length)];
    const dealer = dealers[randomInt(dealers.length)];
    const category = categories[randomInt(categories.length)];
    const priority = priorities[randomInt(priorities.length)];
    const typeOfService = serviceTypes[randomInt(serviceTypes.length)];

    const allocated = new Date(now);
    allocated.setDate(now.getDate() + randomInt(10));

    const purchaseDate = new Date(now);
    purchaseDate.setDate(now.getDate() - randomInt(600));

    const warrantyEndDate = new Date(purchaseDate);
    warrantyEndDate.setDate(purchaseDate.getDate() + 365);

    const amcEndDate = new Date(purchaseDate);
    amcEndDate.setDate(purchaseDate.getDate() + 730);

    const subjectNumber = `DUMMY-SVC-${runToken}-${String(i).padStart(3, '0')}`;

    const payload = {
      p_subject_number: subjectNumber,
      p_source_type: sourceType,
      p_brand_id: sourceType === 'brand' ? brand.id : null,
      p_dealer_id: sourceType === 'dealer' ? dealer.id : null,
      p_priority: priority,
      p_priority_reason: `Auto-seeded ${priority} test subject #${i}`,
      p_allocated_date: allocated.toISOString().slice(0, 10),
      p_type_of_service: typeOfService,
      p_category_id: category.id,
      p_customer_phone: `9${String(700000000 + i).padStart(9, '0')}`,
      p_customer_name: `Dummy Customer ${i}`,
      p_customer_address: `Test address block ${i}, Kochi`,
      p_product_name: `Test Product ${i}`,
      p_serial_number: `SN-${runToken}-${i}`,
      p_product_description: `Auto-generated test product for subject ${subjectNumber}`,
      p_purchase_date: purchaseDate.toISOString().slice(0, 10),
      p_warranty_end_date: i % 3 === 0 ? warrantyEndDate.toISOString().slice(0, 10) : null,
      p_amc_end_date: i % 5 === 0 ? amcEndDate.toISOString().slice(0, 10) : null,
      p_created_by: createdBy,
    };

    const { data, error } = await supabase.rpc('create_subject_with_customer', payload);

    if (error || !data) {
      failures.push({ index: i, subjectNumber, message: error?.message || 'No subject id returned' });
      continue;
    }

    success += 1;
  }

  console.log(`Seeded subjects requested: ${targetCount}`);
  console.log(`Successfully created: ${success}`);
  console.log(`Failed: ${failures.length}`);

  if (failures.length > 0) {
    console.log('Sample failures (up to 10):');
    failures.slice(0, 10).forEach((f) => {
      console.log(`  #${f.index} ${f.subjectNumber}: ${f.message}`);
    });
  }

  const { count, error: countError } = await supabase
    .from('subjects')
    .select('id', { count: 'exact', head: true })
    .ilike('subject_number', `DUMMY-SVC-${runToken}-%`);

  if (countError) {
    console.log(`Count check skipped: ${countError.message}`);
  } else {
    console.log(`Verified inserted in DB for this run token: ${count ?? 0}`);
  }

  if (success === 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Seeding failed:', error.message);
  process.exit(1);
});
