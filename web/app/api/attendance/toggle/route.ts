import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

function toDateString(date: Date) {
  return date.toISOString().split('T')[0];
}

export async function POST() {
  const supabase = await createServerClient();
  const authState = await supabase.auth.getUser();

  if (authState.error || !authState.data.user) {
    return NextResponse.json({ ok: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const userId = authState.data.user.id;
  const profileResult = await supabase
    .from('profiles')
    .select('id,role')
    .eq('id', userId)
    .maybeSingle<{ id: string; role: string }>();

  if (profileResult.error || !profileResult.data || profileResult.data.role !== 'technician') {
    return NextResponse.json({ ok: false, error: { message: 'Only technicians can toggle attendance' } }, { status: 403 });
  }

  const admin = createAdminClient();
  const nowDate = new Date();
  const nowIso = nowDate.toISOString();
  const today = toDateString(nowDate);

  const todayLogResult = await admin
    .from('attendance_logs')
    .select('id,technician_id,date,toggled_on_at,toggled_off_at,is_present,auto_offed_at,created_at,updated_at')
    .eq('technician_id', userId)
    .eq('date', today)
    .maybeSingle();

  if (todayLogResult.error) {
    return NextResponse.json({ ok: false, error: { message: todayLogResult.error.message } }, { status: 500 });
  }

  const todayLog = todayLogResult.data;

  if (!todayLog || !todayLog.toggled_on_at) {
    const onlineResult = await admin
      .from('profiles')
      .update({ is_online: true })
      .eq('id', userId)
      .eq('role', 'technician')
      .select('id')
      .single();

    if (onlineResult.error) {
      return NextResponse.json({ ok: false, error: { message: onlineResult.error.message } }, { status: 500 });
    }

    if (!todayLog) {
      const createResult = await admin
        .from('attendance_logs')
        .insert({
          technician_id: userId,
          date: today,
          toggled_on_at: nowIso,
          toggled_off_at: null,
          is_present: true,
        })
        .select('id,technician_id,date,toggled_on_at,toggled_off_at,is_present,auto_offed_at,created_at,updated_at')
        .single();

      if (createResult.error || !createResult.data) {
        return NextResponse.json(
          { ok: false, error: { message: createResult.error?.message ?? 'Failed to create attendance log' } },
          { status: 500 },
        );
      }

      return NextResponse.json({
        ok: true,
        data: {
          status: 'online',
          attendance: createResult.data,
        },
      });
    }

    const updateResult = await admin
      .from('attendance_logs')
      .update({
        toggled_on_at: nowIso,
        toggled_off_at: null,
        is_present: true,
      })
      .eq('id', todayLog.id)
      .select('id,technician_id,date,toggled_on_at,toggled_off_at,is_present,auto_offed_at,created_at,updated_at')
      .single();

    if (updateResult.error || !updateResult.data) {
      return NextResponse.json(
        { ok: false, error: { message: updateResult.error?.message ?? 'Failed to update attendance log' } },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        status: 'online',
        attendance: updateResult.data,
      },
    });
  }

  if (!todayLog.toggled_off_at) {
    const sixPm = new Date(nowDate);
    sixPm.setHours(18, 0, 0, 0);

    if (nowDate < sixPm) {
      return NextResponse.json(
        { ok: false, error: { message: 'You can only mark attendance off after 6:00 PM.' } },
        { status: 400 },
      );
    }

    const profileUpdateResult = await admin
      .from('profiles')
      .update({ is_online: false })
      .eq('id', userId)
      .eq('role', 'technician')
      .select('id')
      .single();

    if (profileUpdateResult.error) {
      return NextResponse.json({ ok: false, error: { message: profileUpdateResult.error.message } }, { status: 500 });
    }

    const logUpdateResult = await admin
      .from('attendance_logs')
      .update({ toggled_off_at: nowIso, is_present: true })
      .eq('id', todayLog.id)
      .select('id,technician_id,date,toggled_on_at,toggled_off_at,is_present,auto_offed_at,created_at,updated_at')
      .single();

    if (logUpdateResult.error || !logUpdateResult.data) {
      return NextResponse.json(
        { ok: false, error: { message: logUpdateResult.error?.message ?? 'Failed to update attendance log' } },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        status: 'offline',
        attendance: logUpdateResult.data,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    data: {
      status: 'offline',
      attendance: todayLog,
      message: 'Attendance is already marked OFF for today.',
    },
  });
}
