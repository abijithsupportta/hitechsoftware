'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { DeleteConfirmModal } from '@/components/customers/DeleteConfirmModal';
import { ProtectedComponent } from '@/components/ui/ProtectedComponent';
import { useTeam } from '@/hooks/useTeam';
import { ROUTES } from '@/lib/constants/routes';
import type { UserRole } from '@/types/database.types';

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: 'technician', label: 'Technician' },
  { value: 'office_staff', label: 'Office Staff' },
  { value: 'stock_manager', label: 'Stock Manager' },
];

export default function TeamMemberDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { members, isLoading, error, updateMutation, deleteMutation } = useTeam();

  const member = useMemo(() => members.find((item) => item.id === params.id), [members, params.id]);

  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<UserRole>('technician');
  const [technicianCode, setTechnicianCode] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (!member) {
      return;
    }

    setDisplayName(member.display_name);
    setPhoneNumber(member.phone_number ?? '');
    setRole(member.role);
    setTechnicianCode(member.technician?.technician_code ?? '');
    setIsActive(member.is_active);
  }, [member]);

  if (isLoading) {
    return <div className="p-6 text-sm text-slate-600">Loading team member...</div>;
  }

  if (!member) {
    return <div className="p-6 text-sm text-rose-600">{error ?? 'Team member not found.'}</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{member.display_name}</h1>
          <p className="mt-1 text-sm text-slate-600">Team member detail</p>
        </div>

        <div className="flex items-center gap-2">
          <Link href={ROUTES.DASHBOARD_TEAM} className="ht-btn ht-btn-secondary">
            Back
          </Link>
          <ProtectedComponent permission="technician:edit">
            <button
              type="button"
              onClick={() => {
                updateMutation.mutate({
                  id: member.id,
                  input: {
                    display_name: displayName,
                    phone_number: phoneNumber,
                    role,
                    is_active: isActive,
                    technician:
                      role === 'technician'
                        ? {
                            technician_code: technicianCode,
                            is_active: isActive,
                            is_deleted: false,
                          }
                        : undefined,
                  },
                });
              }}
              disabled={updateMutation.isPending}
              className="ht-btn ht-btn-primary"
            >
              {updateMutation.isPending ? 'Saving...' : 'Edit'}
            </button>
          </ProtectedComponent>
          <ProtectedComponent permission="technician:delete">
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="ht-btn ht-btn-danger"
            >
              Delete
            </button>
          </ProtectedComponent>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Profile</h2>
          <div className="space-y-3 text-sm">
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Display Name</span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Phone Number</span>
              <input
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Role</span>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as UserRole)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="inline-flex items-center gap-2 pt-1 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Active account
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Technician Info</h2>
          {role === 'technician' ? (
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Technician Code</span>
              <input
                value={technicianCode}
                onChange={(event) => setTechnicianCode(event.target.value)}
                placeholder="TECH-001"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
          ) : (
            <p className="text-sm text-slate-600">Technician data is only required when role is Technician.</p>
          )}
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        title="Delete team member"
        description={`Delete ${member.display_name}? This permanently removes login access and linked team records.`}
        confirmLabel="Delete permanently"
        isSubmitting={deleteMutation.isPending}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={() => {
          setShowDeleteModal(false);
          deleteMutation.mutate(member.id, {
            onSuccess: (result) => {
              if (result.ok) {
                router.push(ROUTES.DASHBOARD_TEAM);
              }
            },
          });
        }}
      />
    </div>
  );
}
