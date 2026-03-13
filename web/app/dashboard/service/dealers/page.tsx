'use client';

import { useState } from 'react';
import { useDealers } from '@/hooks/useDealers';
import { usePermission } from '@/hooks/usePermission';

export default function ServiceDealersPage() {
  const { can } = usePermission();
  const { data, isLoading, error, createMutation, toggleMutation, deleteMutation } = useDealers();
  const [name, setName] = useState('');

  if (!can('service-settings:view')) {
    return <div className="p-6 text-sm text-rose-700">You do not have access to Service Settings.</div>;
  }

  const onCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await createMutation.mutateAsync({ name });
    if (result.ok) {
      setName('');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dealers</h1>
        <p className="mt-1 text-sm text-slate-600">Manage active dealer sources for subject creation.</p>
      </div>

      <form onSubmit={onCreate} className="rounded-xl border border-slate-200 bg-white p-4">
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Dealer name</label>
        <div className="flex gap-2">
          <input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          <button type="submit" className="ht-btn ht-btn-primary" disabled={createMutation.isPending}>Add</button>
        </div>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50"><tr><th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Name</th><th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Active</th><th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-500">Loading...</td></tr> : null}
            {!isLoading && error ? <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-rose-600">{error}</td></tr> : null}
            {!isLoading && !error && data.length === 0 ? <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-500">No dealers yet.</td></tr> : null}
            {!isLoading && !error ? data.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-sm text-slate-800">{item.name}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{item.is_active ? 'Yes' : 'No'}</td>
                <td className="px-4 py-3 text-sm space-x-2">
                  <button type="button" className="ht-btn ht-btn-secondary ht-btn-sm" onClick={() => toggleMutation.mutate({ id: item.id, isActive: !item.is_active })}>{item.is_active ? 'Disable' : 'Enable'}</button>
                  <button type="button" className="ht-btn ht-btn-danger ht-btn-sm" onClick={() => deleteMutation.mutate(item.id)}>Delete</button>
                </td>
              </tr>
            )) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
