import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function unauthorized() {
  return NextResponse.json({ ok: false, error: { message: 'Unauthorized cron request' } }, { status: 401 });
}

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return unauthorized();
  }

  const admin = createAdminClient();
  const today = todayDate();

  const [techniciansResult, todayLogsResult, recipientsResult] = await Promise.all([
    admin
      .from('profiles')
      .select('id,display_name')
      .eq('role', 'technician')
      .eq('is_active', true)
      .eq('is_deleted', false),
    admin
      .from('attendance_logs')
      .select('id,technician_id,toggled_on_at')
      .eq('date', today),
    admin
      .from('profiles')
      .select('display_name,phone_number')
      .in('role', ['office_staff', 'super_admin'])
      .eq('is_active', true)
      .eq('is_deleted', false),
  ]);

  if (techniciansResult.error) {
    return NextResponse.json({ ok: false, error: { message: techniciansResult.error.message } }, { status: 500 });
  }

  if (todayLogsResult.error) {
    return NextResponse.json({ ok: false, error: { message: todayLogsResult.error.message } }, { status: 500 });
  }

  if (recipientsResult.error) {
    return NextResponse.json({ ok: false, error: { message: recipientsResult.error.message } }, { status: 500 });
  }

  const logByTechnician = new Map((todayLogsResult.data ?? []).map((log) => [log.technician_id, log]));

  const absentTechnicians = (techniciansResult.data ?? []).filter((technician) => {
    const log = logByTechnician.get(technician.id);
    return !log || !log.toggled_on_at;
  });

  const inserts = absentTechnicians
    .filter((technician) => !logByTechnician.has(technician.id))
    .map((technician) => ({
      technician_id: technician.id,
      date: today,
      is_present: false,
    }));

  if (inserts.length > 0) {
    const insertResult = await admin
      .from('attendance_logs')
      .insert(inserts)
      .select('id');

    if (insertResult.error) {
      return NextResponse.json({ ok: false, error: { message: insertResult.error.message } }, { status: 500 });
    }
  }

  const absentNames = absentTechnicians.map((t) => t.display_name).join(', ') || 'None';
  const notificationMessage = `Attendance alert (${today}): Absent technicians at cutoff - ${absentNames}.`;

  const notifications = (recipientsResult.data ?? [])
    .filter((recipient) => Boolean(recipient.phone_number))
    .map((recipient) => ({
      recipient_phone: recipient.phone_number as string,
      recipient_name: recipient.display_name,
      notification_type: 'ATTENDANCE_ABSENT_FLAG',
      message: notificationMessage,
      status: 'PENDING' as const,
      reference_type: 'attendance',
      reference_id: null,
    }));

  if (notifications.length > 0) {
    const notificationResult = await admin
      .from('notifications')
      .insert(notifications);

    if (notificationResult.error) {
      return NextResponse.json({ ok: false, error: { message: notificationResult.error.message } }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    data: {
      date: today,
      absent_count: absentTechnicians.length,
      absent_names: absentTechnicians.map((t) => t.display_name),
      notifications_queued: notifications.length,
    },
  });
}
