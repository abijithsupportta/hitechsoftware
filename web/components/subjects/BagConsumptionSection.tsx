'use client';

import { useState } from 'react';
import { Briefcase, Package } from 'lucide-react';
import type { SubjectDetail } from '@/modules/subjects/subject.types';
import { useTechnicianBag, useConsumeItem } from '@/hooks/digital-bag/useDigitalBag';

interface Props {
  subject: SubjectDetail;
  userRole: string | null;
  userId: string | null;
}

export function BagConsumptionSection({ subject, userRole, userId }: Props) {
  const bagQuery = useTechnicianBag(
    userRole === 'technician' && userId ? userId : null,
  );
  const consumeMutation = useConsumeItem();

  const [selectedItemId, setSelectedItemId] = useState('');
  const [consumeQty, setConsumeQty] = useState(1);

  const canConsume =
    userRole === 'technician' &&
    userId === subject.assigned_technician_id &&
    subject.status === 'IN_PROGRESS' &&
    !subject.bill_generated;

  if (!canConsume) return null;

  const bagResult = bagQuery.data;
  const sessions = bagResult?.ok ? bagResult.data : [];
  const allItems = sessions.flatMap((s) =>
    s.items
      .filter((i) => i.quantity_issued - i.quantity_returned - i.quantity_consumed > 0)
      .map((i) => ({
        ...i,
        held: i.quantity_issued - i.quantity_returned - i.quantity_consumed,
      })),
  );

  const handleConsume = () => {
    if (!selectedItemId || consumeQty <= 0 || !userId) return;
    consumeMutation.mutate(
      {
        input: {
          bag_item_id: selectedItemId,
          subject_id: subject.id,
          quantity: consumeQty,
        },
        technicianId: userId,
      },
      {
        onSuccess: (result) => {
          if (result.ok) {
            setSelectedItemId('');
            setConsumeQty(1);
          }
        },
      },
    );
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <Briefcase size={16} className="text-blue-600" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Consume From Bag
        </h3>
      </div>

      {bagQuery.isLoading ? (
        <p className="text-sm text-slate-500">Loading bag items…</p>
      ) : allItems.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Package size={16} className="opacity-50" />
          <span>No items available in your bag.</span>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleConsume();
          }}
          className="grid grid-cols-1 gap-2 md:grid-cols-4"
        >
          <select
            value={selectedItemId}
            onChange={(e) => {
              setSelectedItemId(e.target.value);
              setConsumeQty(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            required
          >
            <option value="">Select item from bag…</option>
            {allItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.product_name ?? item.material_code} (held: {item.held})
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            max={allItems.find((i) => i.id === selectedItemId)?.held ?? 1}
            value={consumeQty}
            onChange={(e) => setConsumeQty(Math.max(1, Number(e.target.value || 1)))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
          <button
            type="submit"
            disabled={consumeMutation.isPending || !selectedItemId}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {consumeMutation.isPending ? 'Consuming…' : 'Consume'}
          </button>
        </form>
      )}
    </div>
  );
}
