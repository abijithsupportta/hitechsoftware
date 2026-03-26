/**
 * Test the EXACT queries used by the app for the technician subject detail flow
 */
const { createClient } = require('@supabase/supabase-js');

const admin = createClient(
  'https://otmnfcuuqlbeowphxagf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90bW5mY3V1cWxiZW93cGh4YWdmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzEzMzkzNiwiZXhwIjoyMDg4NzA5OTM2fQ.mvNJvFj6Gd5f2MDHURuxrFeCycv1fzHoDuFCGz-W02o'
);

const TECHNICIAN_USER_ID = '39aa4371-25a5-43fa-a2b5-bd699dd0c378';

const SUBJECT_DETAIL_SELECT = `
  id,
  subject_number,
  source_type,
  brand_id,
  dealer_id,
  assigned_technician_id,
  priority,
  priority_reason,
  status,
  allocated_date,
  technician_allocated_date,
  technician_allocated_notes,
  technician_acceptance_status,
  technician_rejection_reason,
  rejected_by_technician_id,
  is_rejected_pending_reschedule,
  en_route_at,
  arrived_at,
  work_started_at,
  completed_at,
  incomplete_at,
  incomplete_reason,
  incomplete_note,
  spare_parts_requested,
  spare_parts_quantity,
  completion_proof_uploaded,
  completion_notes,
  rescheduled_date,
  type_of_service,
  category_id,
  customer_phone,
  customer_name,
  customer_address,
  product_name,
  serial_number,
  product_description,
  purchase_date,
  warranty_period_months,
  warranty_end_date,
  warranty_status,
  amc_start_date,
  amc_end_date,
  service_charge_type,
  is_amc_service,
  is_warranty_service,
  billing_status,
  visit_charge,
  service_charge,
  accessories_total,
  grand_total,
  payment_mode,
  payment_collected,
  payment_collected_at,
  bill_generated,
  bill_generated_at,
  bill_number,
  created_by,
  assigned_by,
  created_at,
  brands:brand_id(name),
  dealers:dealer_id(name),
  rejected_by_profile:rejected_by_technician_id(display_name),
  service_categories:category_id(name),
  subject_photos(id,photo_type,storage_path,public_url,uploaded_by,uploaded_at,file_size_bytes,mime_type)
`;

let passed = 0;
let failed = 0;
const issues = [];

function pass(label) {
  console.log('  ✅ ' + label);
  passed++;
}

function fail(label, detail) {
  console.log('  ❌ ' + label);
  if (detail) console.log('     → ' + detail);
  failed++;
  issues.push({ label, detail });
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  TECHNICIAN SUBJECT DETAIL END-TO-END DB TEST');
  console.log('═══════════════════════════════════════════════════════');

  // ─── 1. getSubjectById (exact app query) ────────────────────────────────
  console.log('\n━━━ 1. getSubjectById (exact SUBJECT_DETAIL_SELECT query) ━━━');

  const r = await admin
    .from('subjects')
    .select(SUBJECT_DETAIL_SELECT)
    .eq('assigned_technician_id', TECHNICIAN_USER_ID)
    .limit(1)
    .maybeSingle();

  if (r.error) {
    fail('getSubjectById query', r.error.message);
    console.log('\n⛔ Cannot continue without a subject. Aborting main test.');
  } else if (!r.data) {
    console.log('  ℹ️  No subject assigned to this technician — skipping subject detail tests');
  } else {
    const s = r.data;
    pass('getSubjectById query succeeds');
    pass('subject_number: ' + s.subject_number + ', status: ' + s.status);
    console.log('     photos: ' + (s.subject_photos || []).length);
    console.log('     rejected_by_profile: ' + JSON.stringify(s.rejected_by_profile));

    // ─── 2. subject_status_history (timeline) ────────────────────────────
    console.log('\n━━━ 2. Subject Timeline (subject_status_history) ━━━');
    const timeline = await admin
      .from('subject_status_history')
      .select('id,event_type,status,changed_at,note,old_value,new_value,changed_by,changed_by_profile:changed_by(display_name)')
      .eq('subject_id', s.id)
      .order('changed_at', { ascending: false });

    if (timeline.error) fail('subject_status_history query', timeline.error.message);
    else pass('Timeline query OK — ' + timeline.data.length + ' entries');

    // ─── 3. subject_accessories ──────────────────────────────────────────
    console.log('\n━━━ 3. Subject Accessories ━━━');
    const acc = await admin
      .from('subject_accessories')
      .select('id,subject_id,item_name,quantity,unit_price,total_price,added_by,created_at')
      .eq('subject_id', s.id);

    if (acc.error) fail('subject_accessories query', acc.error.message);
    else pass('Accessories query OK — ' + acc.data.length + ' items');

    // ─── 4. subject_contracts ────────────────────────────────────────────
    console.log('\n━━━ 4. Subject Contracts ━━━');
    const contracts = await admin
      .from('subject_contracts')
      .select('id,subject_id,contract_name,start_date,duration_months,end_date,is_custom_duration,status,created_by,created_at,updated_at')
      .eq('subject_id', s.id);

    if (contracts.error) fail('subject_contracts query', contracts.error.message);
    else pass('Contracts query OK — ' + contracts.data.length + ' contracts');

    // ─── 5. subject_bills ────────────────────────────────────────────────
    console.log('\n━━━ 5. Subject Bills ━━━');
    const bills = await admin
      .from('subject_bills')
      .select('id,bill_number,bill_type,issued_to,issued_to_type,brand_id,dealer_id,visit_charge,service_charge,accessories_total,grand_total,payment_mode,payment_status,payment_collected_at,generated_by,generated_at')
      .eq('subject_id', s.id)
      .maybeSingle();

    if (bills.error) fail('subject_bills query', bills.error.message);
    else if (!bills.data) pass('No bill yet for this subject (expected if not completed)');
    else pass('Bill found: ' + bills.data.bill_number + ', payment_status: ' + bills.data.payment_status);

    // ─── 6. subject_photos (with is_deleted, as used in workflow API) ────
    console.log('\n━━━ 6. Subject Photos (workflow API query) ━━━');
    const photos = await admin
      .from('subject_photos')
      .select('id,subject_id,photo_type,storage_path,public_url,uploaded_by,uploaded_at,file_size_bytes,mime_type,is_deleted')
      .eq('subject_id', s.id);

    if (photos.error) fail('subject_photos query (with is_deleted)', photos.error.message);
    else pass('subject_photos query OK — ' + photos.data.length + ' photos');

    // ─── 7. workflow GET checkCompletionRequirements ─────────────────────
    console.log('\n━━━ 7. Workflow data checks ━━━');
    
    // Count photos (as done in generate_bill to require >= 1)
    const photosCount = await admin
      .from('subject_photos')
      .select('id', { count: 'exact', head: true })
      .eq('subject_id', s.id)
      .eq('is_deleted', false);

    if (photosCount.error) fail('subject_photos count query', photosCount.error.message);
    else pass('subject_photos count OK — ' + photosCount.count + ' non-deleted photos');

    // accessories total_price for bill calculation
    const accForBill = await admin
      .from('subject_accessories')
      .select('total_price')
      .eq('subject_id', s.id);

    if (accForBill.error) fail('subject_accessories total_price for billing', accForBill.error.message);
    else pass('subject_accessories.total_price query OK');
  }

  // ─── 8. RPC generate_bill_number ────────────────────────────────────────
  console.log('\n━━━ 8. RPC generate_bill_number ━━━');
  const billNum = await admin.rpc('generate_bill_number');
  if (billNum.error) fail('generate_bill_number RPC', billNum.error.message);
  else pass('generate_bill_number RPC OK — would generate: ' + billNum.data);

  // ─── 9. Attendance toggle DB operations ─────────────────────────────────
  console.log('\n━━━ 9. Attendance toggle DB ops ━━━');
  const today = new Date().toISOString().split('T')[0];

  const attLog = await admin
    .from('attendance_logs')
    .select('id,technician_id,date,toggled_on_at,toggled_off_at,is_present,auto_offed_at,created_at,updated_at')
    .eq('technician_id', TECHNICIAN_USER_ID)
    .eq('date', today)
    .maybeSingle();

  if (attLog.error) fail('attendance_logs query for toggle', attLog.error.message);
  else pass('attendance_logs query OK — today\'s log: ' + (attLog.data ? 'exists' : 'none yet'));

  const profileOnline = await admin
    .from('profiles')
    .select('id,is_online')
    .eq('id', TECHNICIAN_USER_ID)
    .single();

  if (profileOnline.error) fail('profiles.is_online query', profileOnline.error.message);
  else pass('profiles.is_online OK — currently: ' + profileOnline.data.is_online);

  // ─── 10. Respond to subject (check fields required) ─────────────────────
  console.log('\n━━━ 10. subject respond fields (accept/reject) ━━━');
  const respondFields = await admin
    .from('subjects')
    .select('id,status,assigned_technician_id,technician_acceptance_status,technician_allocated_notes')
    .eq('assigned_technician_id', TECHNICIAN_USER_ID)
    .limit(1)
    .maybeSingle();

  if (respondFields.error) fail('respond fields query', respondFields.error.message);
  else if (!respondFields.data) pass('No subject to respond to (expected)');
  else pass('Respond fields query OK — subject: ' + respondFields.data.id + ', acceptance: ' + respondFields.data.technician_acceptance_status);

  // ─── 11. Completed summary DB ops ───────────────────────────────────────
  console.log('\n━━━ 11. Completed summary DB ops ━━━');
  const completedSubjects = await admin
    .from('subjects')
    .select('id')
    .eq('is_deleted', false)
    .eq('assigned_technician_id', TECHNICIAN_USER_ID)
    .eq('status', 'COMPLETED');

  if (completedSubjects.error) fail('completed subjects query', completedSubjects.error.message);
  else pass('Completed subjects query OK — ' + completedSubjects.data.length + ' completed');

  const completedBills = await admin
    .from('subject_bills')
    .select('accessories_total,grand_total');

  if (completedBills.error) fail('subject_bills select for summary', completedBills.error.message);
  else pass('subject_bills.accessories_total and grand_total query OK');

  // ─── SUMMARY ─────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  RESULTS  —  ✅ ' + passed + ' passed   ❌ ' + failed + ' failed');
  console.log('═══════════════════════════════════════════════════════');

  if (issues.length > 0) {
    console.log('\n  Issues found:');
    for (const issue of issues) {
      console.log('  • ' + issue.label);
      if (issue.detail) console.log('    ' + issue.detail);
    }
  } else {
    console.log('\n  All checks passed — no issues found.');
  }
}

main().catch((err) => {
  console.error('\n💥 Test crashed:', err.message);
  process.exit(1);
});
