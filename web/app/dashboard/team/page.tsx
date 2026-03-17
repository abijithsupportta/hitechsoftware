'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Eye, EyeOff, ShieldCheck, UserPlus, X } from 'lucide-react';
import { usePermission } from '@/hooks/auth/usePermission';
import { useTeam } from '@/hooks/team/useTeam';
import { ROUTES } from '@/lib/constants/routes';
import type { CreateTeamMemberInput } from '@/modules/technicians/technician.types';
import type { UserRole } from '@/types/database.types';

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: 'technician', label: 'Technician' },
  { value: 'office_staff', label: 'Office Staff' },
  { value: 'stock_manager', label: 'Stock Manager' },
];

const INITIAL_FORM: CreateTeamMemberInput = {
  email: '',
  password: '',
  display_name: '',
  phone_number: '',
  role: 'technician',
  is_active: true,
  technician: {
    technician_code: '',
    daily_subject_limit: 10,
    digital_bag_capacity: 50,
  },
};

export default function TeamManagementPage() {
  const { can } = usePermission();
  const {
    members,
    isLoading,
    error,
    filters,
    setRoleFilter,
    setSearchFilter,
    createMutation,
  } = useTeam();

  const [form, setForm] = useState<CreateTeamMemberInput>(INITIAL_FORM);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const canManage = can('technician:create');

  if (!can('technician:view')) {
    return <div className="p-6 text-sm text-rose-600">You do not have access to team management.</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <ShieldCheck className="text-blue-600" size={20} />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
          <p className="mt-1 text-sm text-slate-600">Manage technicians, office staff, and stock managers.</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Search</label>
          <input
            value={filters.search ?? ''}
            onChange={(event) => setSearchFilter(event.target.value)}
            placeholder="Name, email, or phone"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Role</label>
          <select
            value={filters.role ?? 'all'}
            onChange={(event) => setRoleFilter(event.target.value as UserRole | 'all')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All roles</option>
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {canManage ? (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="ht-btn ht-btn-primary"
          >
            {showAddForm ? 'Close Add Member' : 'Add Member'}
          </button>
        </div>
      ) : null}

      {canManage && showAddForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <section className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-blue-600" />
                <h2 className="text-base font-semibold text-slate-900">Add Team Member</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close add member popup"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <input
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="Email"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <div className="relative">
                <input
                  value={form.password}
                  type={showPassword ? 'text' : 'password'}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Password"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-2 flex items-center text-slate-500 hover:text-slate-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <input
                value={form.display_name}
                onChange={(event) => setForm((prev) => ({ ...prev, display_name: event.target.value }))}
                placeholder="Display name"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                value={form.phone_number ?? ''}
                onChange={(event) => setForm((prev) => ({ ...prev, phone_number: event.target.value }))}
                placeholder="Phone number"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <select
                value={form.role}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    role: event.target.value as UserRole,
                    technician:
                      event.target.value === 'technician'
                        ? prev.technician ?? { technician_code: '', daily_subject_limit: 10, digital_bag_capacity: 50 }
                        : undefined,
                  }))
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {form.role === 'technician' ? (
                <input
                  value={form.technician?.technician_code ?? ''}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      technician: {
                        technician_code: event.target.value,
                        daily_subject_limit: prev.technician?.daily_subject_limit ?? 10,
                        digital_bag_capacity: prev.technician?.digital_bag_capacity ?? 50,
                      },
                    }))
                  }
                  placeholder="Technician code"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              ) : null}
            </div>

            <p className="mt-3 text-xs text-slate-500">Auth user is created automatically in Supabase Auth during add member.</p>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setShowPassword(false);
                }}
                className="ht-btn ht-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  createMutation.mutate(form, {
                    onSuccess: (result) => {
                      if (result.ok) {
                        setForm(INITIAL_FORM);
                        setShowPassword(false);
                        setShowAddForm(false);
                      }
                    },
                  });
                }}
                disabled={createMutation.isPending}
                className="ht-btn ht-btn-primary"
              >
                {createMutation.isPending ? 'Adding...' : 'Add member'}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Technician code</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={7}>
                  Loading team members...
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={7}>
                  No team members found.
                </td>
              </tr>
            ) : (
              members.map((member) => {
                return (
                  <tr key={member.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{member.display_name}</td>
                    <td className="px-4 py-3 text-slate-700">{member.email}</td>
                    <td className="px-4 py-3 text-slate-700">{ROLE_OPTIONS.find((option) => option.value === member.role)?.label ?? member.role}</td>
                    <td className="px-4 py-3 text-slate-700">{member.phone_number ?? '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{member.technician?.technician_code ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${member.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                        {member.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={ROUTES.DASHBOARD_TEAM_DETAIL(member.id)} className="ht-btn ht-btn-secondary ht-btn-sm">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
            {error ? (
              <tr>
                <td className="px-4 py-4 text-sm text-rose-600" colSpan={7}>
                  {error}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
