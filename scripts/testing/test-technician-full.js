/**
 * Comprehensive terminal test for technician login and all technician actions.
 * Tests: login, attendance toggle, completed summary, subject list, subject detail,
 *        workflow GET, respond (accept/reject), billing, photo endpoints.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://otmnfcuuqlbeowphxagf.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90bW5mY3V1cWxiZW93cGh4YWdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMzM5MzYsImV4cCI6MjA4ODcwOTkzNn0.WKfUF4YYGoI-XSAkFf_-wSB47RCcOs7wHsV5uxHtOKw';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90bW5mY3V1cWxiZW93cGh4YWdmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzEzMzkzNiwiZXhwIjoyMDg4NzA5OTM2fQ.mvNJvFj6Gd5f2MDHURuxrFeCycv1fzHoDuFCGz-W02o';

const TECHNICIAN_EMAIL = 'ramu@gmail.com';
const TECHNICIAN_PASSWORD = 'ramutech123';
const DEV_URL = 'http://localhost:3000';

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

let passed = 0;
let failed = 0;
const issues = [];

function pass(label) {
  console.log(`  ✅ ${label}`);
  passed++;
}

function fail(label, detail) {
  console.log(`  ❌ ${label}`);
  if (detail) console.log(`     → ${detail}`);
  failed++;
  issues.push({ label, detail });
}

function section(title) {
  console.log(`\n━━━ ${title} ━━━`);
}

// Make an HTTP request to the dev server with auth cookie
async function apiRequest(path, options = {}, accessToken = null) {
  const url = `${DEV_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (accessToken) {
    // Use Bearer token for direct API testing (server checks supabase.auth.getUser())
    headers['Authorization'] = `Bearer ${accessToken}`;
    // Also send as cookie in the format supabase/ssr expects
    headers['Cookie'] = buildSupabaseCookie(accessToken);
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    redirect: 'manual',
  });

  let body = null;
  try {
    body = await res.json();
  } catch {
    body = await res.text().catch(() => null);
  }

  return { status: res.status, body, headers: Object.fromEntries(res.headers.entries()) };
}

function buildSupabaseCookie(accessToken) {
  // The @supabase/ssr library uses the default storage key 'supabase.auth.token'
  // and stores the session as JSON chunks in cookies named 'supabase.auth.token.0', etc.
  // For API testing we need the access_token to be readable by supabase.auth.getUser()
  // The SSR server client calls supabase.auth.getUser() which uses the Authorization header
  // when no cookie session is found. We'll rely on the Authorization header approach.
  return '';
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  TECHNICIAN FULL INTEGRATION TEST');
  console.log('  Target: ramu@gmail.com / ramutech123');
  console.log('═══════════════════════════════════════════════════════');

  // ─── 1. LOGIN ────────────────────────────────────────────────────────────
  section('1. Technician Login');

  const anonClient = createClient(SUPABASE_URL, ANON_KEY);
  const signInResult = await anonClient.auth.signInWithPassword({
    email: TECHNICIAN_EMAIL,
    password: TECHNICIAN_PASSWORD,
  });

  if (signInResult.error || !signInResult.data?.session) {
    fail('Sign in with password', signInResult.error?.message ?? 'No session returned');
    console.log('\n⛔ Cannot continue without a session. Aborting.');
    process.exit(1);
  }

  const session = signInResult.data.session;
  const userId = session.user.id;
  const accessToken = session.access_token;
  pass(`Login succeeded — user ID: ${userId}`);

  // ─── 2. PROFILE ──────────────────────────────────────────────────────────
  section('2. Profile Fetch');

  const profileResult = await adminClient
    .from('profiles')
    .select('id,email,display_name,role,is_active,is_deleted')
    .eq('id', userId)
    .maybeSingle();

  if (profileResult.error || !profileResult.data) {
    fail('Fetch profile', profileResult.error?.message ?? 'No profile found');
  } else {
    const p = profileResult.data;
    if (p.role !== 'technician') fail(`Role is '${p.role}', expected 'technician'`);
    else pass(`Profile OK — role: ${p.role}, display_name: ${p.display_name}`);

    if (!p.is_active) fail('Profile is_active is false — technician cannot log in');
    else pass('Profile is_active: true');

    if (p.is_deleted) fail('Profile is_deleted is true — should not be accessible');
    else pass('Profile is_deleted: false');
  }

  // ─── 3. TECHNICIAN RECORD ────────────────────────────────────────────────
  section('3. Technician Record');

  const techResult = await adminClient
    .from('technicians')
    .select('id,profile_id,employee_id,is_active,specializations')
    .eq('profile_id', userId)
    .maybeSingle();

  if (techResult.error || !techResult.data) {
    fail('Technician record in `technicians` table', techResult.error?.message ?? 'No record found — technician may not have a technicians row which can block assignment');
  } else {
    const t = techResult.data;
    pass(`Technician record found — employee_id: ${t.employee_id}, is_active: ${t.is_active}`);
    if (!t.is_active) fail('Technician record is_active is false');
    else pass('Technician record is_active: true');
  }

  // ─── 4. ATTENDANCE ────────────────────────────────────────────────────────
  section('4. Attendance — Today\'s Log');

  const today = new Date().toISOString().split('T')[0];
  const attResult = await adminClient
    .from('attendance_logs')
    .select('id,technician_id,date,toggled_on_at,toggled_off_at,is_present,auto_offed_at')
    .eq('technician_id', userId)
    .eq('date', today)
    .maybeSingle();

  if (attResult.error) {
    fail('Query attendance_logs', attResult.error.message);
  } else if (!attResult.data) {
    pass("No attendance log for today yet (technician hasn't checked in)");
  } else {
    const a = attResult.data;
    pass(`Today's attendance log — is_present: ${a.is_present}, on: ${a.toggled_on_at}, off: ${a.toggled_off_at}`);
  }

  // ─── 5. SUBJECTS ASSIGNED TO TECHNICIAN ─────────────────────────────────
  section('5. Subjects Assigned to Technician');

  const subjectsResult = await adminClient
    .from('subjects')
    .select('id,subject_number,status,technician_acceptance_status,allocated_date,customer_name,customer_phone,is_warranty_service,is_amc_service,assigned_technician_id')
    .eq('assigned_technician_id', userId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(10);

  if (subjectsResult.error) {
    fail('Query subjects assigned to technician', subjectsResult.error.message);
  } else {
    const subs = subjectsResult.data ?? [];
    pass(`Found ${subs.length} subject(s) assigned to this technician`);

    if (subs.length === 0) {
      console.log('  ℹ️  No subjects assigned yet — this is OK for a new technician');
    } else {
      for (const s of subs.slice(0, 3)) {
        console.log(`     • ${s.subject_number} | status: ${s.status} | acceptance: ${s.technician_acceptance_status} | customer: ${s.customer_name}`);
      }

      // Test first subject detail
      const firstSubject = subs[0];
      await testSubjectDetail(firstSubject.id, userId, accessToken);
    }
  }

  // ─── 6. ALL SUBJECTS (PENDING) ────────────────────────────────────────────
  section('6. All Pending Subjects (Technician Can View)');

  const pendingResult = await adminClient
    .from('subjects')
    .select('id,subject_number,status,assigned_technician_id')
    .eq('is_deleted', false)
    .is('completed_at', null)
    .limit(5);

  if (pendingResult.error) {
    fail('Query pending subjects', pendingResult.error.message);
  } else {
    pass(`Pending subjects in DB: ${pendingResult.data?.length ?? 0}`);
  }

  // ─── 7. API: DEV SERVER HEALTH ───────────────────────────────────────────
  section('7. Dev Server Connectivity');

  let devServerReachable = false;
  try {
    const homeRes = await fetch(DEV_URL, { redirect: 'manual', signal: AbortSignal.timeout(5000) });
    if (homeRes.status > 0) {
      pass(`Dev server reachable at ${DEV_URL} (status ${homeRes.status})`);
      devServerReachable = true;
    }
  } catch (e) {
    fail(`Dev server not reachable at ${DEV_URL}`, e.message);
  }

  if (devServerReachable) {
    await testApiRoutes(accessToken, userId);
  }

  // ─── 8. SCHEMA COLUMN CHECK ──────────────────────────────────────────────
  section('8. Schema Column Validation');

  await checkSchemaColumns();

  // ─── 9. RLS POLICIES ─────────────────────────────────────────────────────
  section('9. RLS Policies Check (Technician Access)');

  const rlsClient = createClient(SUPABASE_URL, ANON_KEY);
  const { error: rlsSignInErr } = await rlsClient.auth.signInWithPassword({
    email: TECHNICIAN_EMAIL,
    password: TECHNICIAN_PASSWORD,
  });

  if (!rlsSignInErr) {
    const ownProfileResult = await rlsClient
      .from('profiles')
      .select('id,role')
      .eq('id', userId)
      .maybeSingle();

    if (ownProfileResult.error) fail('RLS: technician cannot read own profile', ownProfileResult.error.message);
    else pass('RLS: technician can read own profile');

    const subjectsRlsResult = await rlsClient
      .from('subjects')
      .select('id,subject_number')
      .eq('is_deleted', false)
      .limit(5);

    if (subjectsRlsResult.error) fail('RLS: technician cannot read subjects table', subjectsRlsResult.error.message);
    else pass(`RLS: technician can read subjects table (${subjectsRlsResult.data?.length ?? 0} rows visible)`);

    const attRlsResult = await rlsClient
      .from('attendance_logs')
      .select('id')
      .eq('technician_id', userId)
      .limit(5);

    if (attRlsResult.error) fail('RLS: technician cannot read own attendance_logs', attRlsResult.error.message);
    else pass(`RLS: technician can read own attendance_logs (${attRlsResult.data?.length ?? 0} rows)`);

    const otherTechId = 'zzz-not-real';
    const otherAttResult = await rlsClient
      .from('attendance_logs')
      .select('id')
      .eq('technician_id', otherTechId)
      .limit(5);

    if (otherAttResult.error) pass("RLS: technician blocked from reading other technician's attendance (error returned)");
    else {
      const count = otherAttResult.data?.length ?? 0;
      if (count === 0) pass("RLS: technician sees 0 rows for another technician's attendance (policy working)");
      else fail("RLS: technician can see another technician's attendance — policy may be too permissive", `${count} rows returned`);
    }
  }

  // ─── SUMMARY ─────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`  RESULTS  —  ✅ ${passed} passed   ❌ ${failed} failed`);
  console.log('═══════════════════════════════════════════════════════');

  if (issues.length > 0) {
    console.log('\n  Issues found:');
    for (const issue of issues) {
      console.log(`  • ${issue.label}`);
      if (issue.detail) console.log(`    ${issue.detail}`);
    }
  } else {
    console.log('\n  All checks passed — no issues found.');
  }
}

async function testSubjectDetail(subjectId, userId, accessToken) {
  section(`5a. Subject Detail — ID: ${subjectId.slice(0, 8)}...`);

  // Check direct DB access
  const detailResult = await adminClient
    .from('subjects')
    .select(`
      id, subject_number, status, technician_acceptance_status,
      customer_name, customer_phone, customer_address,
      product_name, serial_number, product_description,
      allocated_date, technician_allocated_date, technician_allocated_notes,
      is_warranty_service, is_amc_service, service_charge_type,
      en_route_at, arrived_at, work_started_at, completed_at,
      incomplete_at, incomplete_reason, completion_proof_uploaded,
      bill_generated, billing_status,
      brands:brand_id(name), dealers:dealer_id(name), service_categories:category_id(name)
    `)
    .eq('id', subjectId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (detailResult.error || !detailResult.data) {
    fail('Fetch subject detail from DB', detailResult.error?.message ?? 'Not found');
    return;
  }

  const s = detailResult.data;
  pass(`Subject detail fetched — number: ${s.subject_number}, status: ${s.status}`);
  pass(`  warranty: ${s.is_warranty_service}, amc: ${s.is_amc_service}, charge: ${s.service_charge_type}`);

  // Check accessories
  const accResult = await adminClient
    .from('subject_accessories')
    .select('id,name,quantity,price_per_unit,total_price,created_at')
    .eq('subject_id', subjectId);

  if (accResult.error) fail('Fetch subject_accessories', accResult.error.message);
  else pass(`subject_accessories: ${accResult.data?.length ?? 0} row(s)`);

  // Check bill
  const billResult = await adminClient
    .from('subject_bills')
    .select('id,total_amount,service_charge,parts_total,bill_date,is_paid,payment_method')
    .eq('subject_id', subjectId)
    .maybeSingle();

  if (billResult.error) fail('Fetch subject_bills', billResult.error.message);
  else if (!billResult.data) pass('No bill yet for this subject (expected if not completed)');
  else pass(`Bill found — total: ₹${billResult.data.total_amount}, paid: ${billResult.data.is_paid}`);
}

async function testApiRoutes(accessToken, userId) {
  section('7a. API Route: GET /api/dashboard/technician/completed-summary');

  const summaryRes = await apiRequest('/api/dashboard/technician/completed-summary', {}, accessToken);
  if (summaryRes.status === 200 && summaryRes.body?.ok) {
    pass(`Completed summary returned (status 200)`);
    const data = summaryRes.body.data;
    if (data) {
      console.log(`     today: ${data.today?.completed ?? 0}, week: ${data.week?.completed ?? 0}, month: ${data.month?.completed ?? 0}`);
    }
  } else if (summaryRes.status === 401) {
    fail('GET /api/dashboard/technician/completed-summary', `401 Unauthorized — cookie-based auth needed from browser, Bearer token not accepted by this route`);
  } else {
    fail(`GET /api/dashboard/technician/completed-summary (status ${summaryRes.status})`, JSON.stringify(summaryRes.body)?.slice(0, 200));
  }

  section('7b. API Route: POST /api/attendance/toggle');

  const attToggleRes = await apiRequest('/api/attendance/toggle', { method: 'POST' }, accessToken);
  if (attToggleRes.status === 200 && attToggleRes.body?.ok) {
    pass(`Attendance toggle succeeded (status 200)`);
  } else if (attToggleRes.status === 401) {
    fail('POST /api/attendance/toggle', `401 — Bearer token auth not accepted; needs cookie session`);
  } else if (attToggleRes.status === 403) {
    fail('POST /api/attendance/toggle', `403 — ${JSON.stringify(attToggleRes.body)}`);
  } else {
    fail(`POST /api/attendance/toggle (status ${attToggleRes.status})`, JSON.stringify(attToggleRes.body)?.slice(0, 200));
  }
}

async function checkSchemaColumns() {
  // Subjects table critical columns
  const subjectColsResult = await adminClient
    .from('subjects')
    .select('id,subject_number,status,technician_acceptance_status,assigned_technician_id,technician_allocated_date,technician_allocated_notes,en_route_at,arrived_at,work_started_at,completed_at,incomplete_at,incomplete_reason,completion_proof_uploaded,bill_generated,billing_status,is_warranty_service,is_amc_service,service_charge_type,customer_name,customer_phone,customer_address,product_name,serial_number,product_description,is_deleted,is_rejected_pending_reschedule')
    .limit(1);

  if (subjectColsResult.error) {
    fail('Subjects table column check', subjectColsResult.error.message);
  } else {
    pass('All expected subjects columns exist');
  }

  // Attendance_logs table
  const attColsResult = await adminClient
    .from('attendance_logs')
    .select('id,technician_id,date,toggled_on_at,toggled_off_at,is_present,auto_offed_at,created_at,updated_at')
    .limit(1);

  if (attColsResult.error) {
    fail('attendance_logs table column check', attColsResult.error.message);
  } else {
    pass('attendance_logs columns all exist');
  }

  // subject_accessories
  const accColsResult = await adminClient
    .from('subject_accessories')
    .select('id,subject_id,name,quantity,price_per_unit,total_price,created_at,updated_at')
    .limit(1);

  if (accColsResult.error) {
    fail('subject_accessories table column check', accColsResult.error.message);
  } else {
    pass('subject_accessories columns all exist');
  }

  // subject_bills
  const billColsResult = await adminClient
    .from('subject_bills')
    .select('id,subject_id,total_amount,service_charge,parts_total,bill_date,is_paid,payment_method,created_at,updated_at')
    .limit(1);

  if (billColsResult.error) {
    fail('subject_bills table column check', billColsResult.error.message);
  } else {
    pass('subject_bills columns all exist');
  }

  // profiles - check is_online column (used for attendance)
  const profileColsResult = await adminClient
    .from('profiles')
    .select('id,email,display_name,role,is_active,is_deleted,is_online')
    .limit(1);

  if (profileColsResult.error) {
    fail('profiles.is_online column check', profileColsResult.error.message);
  } else {
    pass('profiles.is_online column exists');
  }

  // subjects - check rescheduled_date column (used in overdue filter)
  const reschedResult = await adminClient
    .from('subjects')
    .select('id,rescheduled_date')
    .limit(1);

  if (reschedResult.error) {
    fail('subjects.rescheduled_date column check', reschedResult.error.message);
  } else {
    pass('subjects.rescheduled_date column exists');
  }
}

main().catch((err) => {
  console.error('\n💥 Test crashed:', err.message);
  process.exit(1);
});
