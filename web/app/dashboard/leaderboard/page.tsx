'use client';

import { useState, useMemo } from 'react';
import { Trophy, Medal, Award, Star } from 'lucide-react';
import { useAuth } from '@/hooks/auth/useAuth';
import { useLeaderboard } from '@/hooks/commission/useCommission';
import type { LeaderboardPeriod, LeaderboardEntry } from '@/modules/commission/commission.types';

function formatMoney(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const PERIOD_TABS: { value: LeaderboardPeriod; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

function getPeriodDescription(period: LeaderboardPeriod): string {
  const now = new Date();
  if (period === 'daily') {
    return now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  if (period === 'weekly') {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return `${weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${weekEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  return now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-lg shadow-yellow-200">
        <Trophy className="h-5 w-5 text-yellow-900" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-300 to-slate-400 shadow-lg shadow-slate-200">
        <Medal className="h-5 w-5 text-slate-700" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-700 shadow-lg shadow-amber-200">
        <Award className="h-5 w-5 text-amber-100" />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-sm font-bold text-slate-600">
      {rank}
    </div>
  );
}

function getRankCardStyle(rank: number): string {
  if (rank === 1) return 'border-yellow-300 bg-gradient-to-r from-yellow-50 to-yellow-100/50';
  if (rank === 2) return 'border-slate-300 bg-gradient-to-r from-slate-50 to-slate-100/50';
  if (rank === 3) return 'border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100/50';
  return 'border-slate-200 bg-white';
}

function LeaderboardCard({ entry }: { entry: LeaderboardEntry }) {
  const rank = entry.rank ?? 0;
  return (
    <div className={`flex items-center gap-4 rounded-xl border p-4 transition hover:shadow-md ${getRankCardStyle(rank)}`}>
      <RankBadge rank={rank} />
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-700 text-sm font-bold text-white">
        {(entry.technician_name ?? '??').slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-900">{entry.technician_name}</p>
            <p className="text-xs text-slate-500">
              {entry.services_completed} service{entry.services_completed !== 1 ? 's' : ''} completed
              {entry.amc_sold_count > 0 && ` • ${entry.amc_sold_count} AMC${entry.amc_sold_count !== 1 ? 's' : ''} sold`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-purple-500">AMC Revenue</p>
            <p className="text-xs font-semibold text-purple-700">₹{formatMoney(entry.amc_revenue)}</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 text-right mt-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Bill</p>
            <p className="text-xs font-semibold text-slate-700">₹{formatMoney(entry.total_bill_generated)}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Parts</p>
            <p className="text-xs font-semibold text-slate-700">₹{formatMoney(entry.parts_sold_value)}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-purple-500">AMC</p>
            <p className="text-xs font-semibold text-purple-700">₹{formatMoney(entry.amc_commission)}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-500">Earnings</p>
            <p className="text-sm font-bold text-emerald-700">₹{formatMoney(entry.net_earnings)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>('monthly');
  const { user, userRole } = useAuth();
  const leaderboardQuery = useLeaderboard(period);

  const entries = leaderboardQuery.data ?? [];
  const periodDesc = getPeriodDescription(period);

  const myEntry = useMemo(() => {
    if (!user?.id || userRole !== 'technician') return null;
    return entries.find((e) => e.technician_id === user.id) ?? null;
  }, [entries, user?.id, userRole]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Star className="h-6 w-6 text-yellow-500" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Team Leaderboard</h1>
          <p className="text-sm text-slate-500">{periodDesc}</p>
        </div>
      </div>

      {/* Period Tabs */}
      <div className="flex gap-2">
        {PERIOD_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setPeriod(tab.value)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              period === tab.value
                ? 'bg-blue-600 text-white shadow-sm'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {leaderboardQuery.isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-slate-200" />
                <div className="h-10 w-10 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-slate-200" />
                  <div className="h-3 w-20 rounded bg-slate-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!leaderboardQuery.isLoading && entries.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-10 text-center">
          <Trophy className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">No leaderboard data for this period yet.</p>
        </div>
      )}

      {/* Leaderboard Cards */}
      {!leaderboardQuery.isLoading && entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((entry) => (
            <LeaderboardCard key={entry.technician_id} entry={entry} />
          ))}
        </div>
      )}

      {/* Your Ranking (for technicians) */}
      {myEntry && (
        <div className="rounded-xl border-2 border-blue-400 bg-blue-50 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-600">Your Ranking</p>
          <LeaderboardCard entry={myEntry} />
        </div>
      )}
    </div>
  );
}
