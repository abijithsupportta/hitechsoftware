import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function unauthorized() {
  return NextResponse.json({ ok: false, error: { message: 'Unauthorized cron request' } }, { status: 401 });
}

function getTargetDate() {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  return now.toISOString().split('T')[0];
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return unauthorized();
  }

  const admin = createAdminClient();
  const targetDate = getTargetDate();
  const nowIso = new Date().toISOString();

  const [techniciansResult, logsResult] = await Promise.all([
    admin
      .from('profiles')
      .select('id')
      .eq('role', 'technician')
      .eq('is_active', true)
      .eq('is_deleted', false),
    admin
      .from('attendance_logs')
      .select('id,technician_id,toggled_on_at,toggled_off_at,is_present')
      .eq('date', targetDate),
  ]);

  if (techniciansResult.error) {
    return NextResponse.json({ ok: false, error: { message: techniciansResult.error.message } }, { status: 500 });
  }

  if (logsResult.error) {
    return NextResponse.json({ ok: false, error: { message: logsResult.error.message } }, { status: 500 });
  }

  const logs = logsResult.data ?? [];
  const logsByTechnician = new Map(logs.map((log) => [log.technician_id, log]));

  const toInsert = (techniciansResult.data ?? [])
    .filter((technician) => {
      const log = logsByTechnician.get(technician.id);
      return !log || !log.toggled_on_at;
    })
    .map((technician) => ({
      technician_id: technician.id,
      date: targetDate,
      is_present: false,
      auto_offed_at: nowIso,
    }));

  if (toInsert.length > 0) {
    const insertResult = await admin
      .from('attendance_logs')
      .insert(toInsert)
      .select('id');

    if (insertResult.error) {
      return NextResponse.json({ ok: false, error: { message: insertResult.error.message } }, { status: 500 });
    }
  }

  const openLogs = logs
    .filter((log) => Boolean(log.toggled_on_at) && !log.toggled_off_at)
    .map((log) => log.id);

  if (openLogs.length > 0) {
    const autoOffResult = await admin
      .from('attendance_logs')
      .update({ toggled_off_at: nowIso, auto_offed_at: nowIso })
      .in('id', openLogs);

    if (autoOffResult.error) {
      return NextResponse.json({ ok: false, error: { message: autoOffResult.error.message } }, { status: 500 });
    }
  }

  const onlineResetResult = await admin
    .from('profiles')
    .update({ is_online: false })
    .eq('role', 'technician')
    .eq('is_deleted', false);

  if (onlineResetResult.error) {
    return NextResponse.json({ ok: false, error: { message: onlineResetResult.error.message } }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    data: {
      target_date: targetDate,
      absent_inserted: toInsert.length,
      auto_offed: openLogs.length,
      online_reset: true,
    },
  });
}
