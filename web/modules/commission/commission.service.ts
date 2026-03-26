// ─────────────────────────────────────────────────────────────────────────────
// commission.service.ts
//
// Business logic layer for Technician Commission and Performance tracking.
//
// ARCHITECTURE
// Hook → THIS FILE → Repository → Supabase
// ─────────────────────────────────────────────────────────────────────────────
import type {
  SetCommissionInput,
  TechnicianEarningsSummary,
  TechnicianCommissionConfig,
  EarningsFilters,
  EarningsListResponse,
  LeaderboardEntry,
  LeaderboardPeriod,
  CommissionSummary,
  MonthlyEarningsData,
} from '@/modules/commission/commission.types';
import {
  upsertCommissionConfig,
  getCommissionBySubject,
  getEarningsBySubject,
  getEarningsByTechnician,
  getEarningsSummary,
  getLeaderboard,
  syncEarningsForSubject,
  confirmEarnings as repoConfirmEarnings,
  confirmAllEarnings as repoConfirmAllEarnings,
  getMonthlyEarningsChart,
} from '@/repositories/commission.repository';

interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export async function setCommissionForSubject(
  input: SetCommissionInput,
  userId: string
): Promise<ServiceResult<TechnicianEarningsSummary>> {
  try {
    const config = await upsertCommissionConfig({
      technician_id: input.technician_id,
      subject_id: input.subject_id,
      service_commission: input.service_commission,
      parts_commission: input.parts_commission,
      extra_price_commission: input.extra_price_commission,
      commission_notes: input.commission_notes,
      set_by: userId,
    });

    if (!config) {
      return { success: false, error: 'Failed to save commission config', code: 'UPSERT_FAILED' };
    }

    await syncEarningsForSubject(input.subject_id);

    const earnings = await getEarningsBySubject(input.subject_id);

    return { success: true, data: earnings ?? undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error setting commission';
    return { success: false, error: message, code: 'SET_COMMISSION_ERROR' };
  }
}

export async function getSubjectCommission(
  subjectId: string
): Promise<ServiceResult<{ commission: TechnicianCommissionConfig | null; earnings: TechnicianEarningsSummary | null }>> {
  try {
    const [commission, earnings] = await Promise.all([
      getCommissionBySubject(subjectId),
      getEarningsBySubject(subjectId),
    ]);

    return { success: true, data: { commission, earnings } };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error getting commission';
    return { success: false, error: message, code: 'GET_COMMISSION_ERROR' };
  }
}

export async function getTechnicianEarnings(
  filters: EarningsFilters
): Promise<ServiceResult<EarningsListResponse>> {
  try {
    const techId = filters.technician_id;
    if (!techId) {
      return { success: false, error: 'technician_id is required', code: 'MISSING_TECHNICIAN_ID' };
    }

    const [earningsResult, summary] = await Promise.all([
      getEarningsByTechnician(filters),
      getEarningsSummary(techId, filters.month, filters.year),
    ]);

    return {
      success: true,
      data: {
        items: earningsResult.items,
        total: earningsResult.total,
        summary,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error getting earnings';
    return { success: false, error: message, code: 'GET_EARNINGS_ERROR' };
  }
}

export async function fetchLeaderboard(
  period: LeaderboardPeriod
): Promise<ServiceResult<LeaderboardEntry[]>> {
  try {
    const data = await getLeaderboard(period);
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error getting leaderboard';
    return { success: false, error: message, code: 'GET_LEADERBOARD_ERROR' };
  }
}

export async function confirmSubjectEarnings(
  subjectId: string,
  userId: string
): Promise<ServiceResult<TechnicianEarningsSummary>> {
  try {
    const data = await repoConfirmEarnings(subjectId, userId);
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error confirming earnings';
    return { success: false, error: message, code: 'CONFIRM_EARNINGS_ERROR' };
  }
}

export async function confirmAllTechnicianEarnings(
  technicianId: string,
  userId: string,
  month?: string,
  year?: string
): Promise<ServiceResult<{ confirmed_count: number }>> {
  try {
    const data = await repoConfirmAllEarnings(technicianId, userId, month, year);
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error confirming all earnings';
    return { success: false, error: message, code: 'CONFIRM_ALL_ERROR' };
  }
}

export async function fetchTechnicianEarningsSummary(
  technicianId: string,
  month?: string,
  year?: string
): Promise<ServiceResult<CommissionSummary>> {
  try {
    const data = await getEarningsSummary(technicianId, month, year);
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error getting summary';
    return { success: false, error: message, code: 'GET_SUMMARY_ERROR' };
  }
}

export async function fetchMonthlyChart(
  technicianId: string,
  months: number = 6
): Promise<ServiceResult<MonthlyEarningsData[]>> {
  try {
    const data = await getMonthlyEarningsChart(technicianId, months);
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error getting chart data';
    return { success: false, error: message, code: 'GET_CHART_ERROR' };
  }
}
