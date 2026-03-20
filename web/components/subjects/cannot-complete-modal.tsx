'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { INCOMPLETE_REASONS } from '@/modules/subjects/subject.constants';
import type { IncompleteReason, IncompleteJobInput } from '@/modules/subjects/subject.types';

interface CannotCompleteModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: IncompleteJobInput) => void;
}

export function CannotCompleteModal({ isOpen, isSubmitting, onClose, onSubmit }: CannotCompleteModalProps) {
  const [reason, setReason] = useState<IncompleteReason | ''>('');
  const [note, setNote] = useState('');
  const [partName, setPartName] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [rescheduleDate, setRescheduleDate] = useState('');

  if (!isOpen) return null;

  const isSparePartsReason = reason === 'spare_parts_not_available';
  const isOtherReason = reason === 'other';
  const noteValid = !isOtherReason || note.trim().length >= 10;
  const sparePartsValid = !isSparePartsReason || (partName.trim().length > 0 && partQty > 0);
  const canSubmit = reason !== '' && noteValid && sparePartsValid && !isSubmitting;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;
    onSubmit({
      reason,
      note: note || '',
      sparePartsRequested: isSparePartsReason ? partName : undefined,
      sparePartsQuantity: isSparePartsReason ? partQty : undefined,
      rescheduledDate: rescheduleDate || undefined,
    });
  };

  const handleClose = () => {
    setReason('');
    setNote('');
    setPartName('');
    setPartQty(1);
    setRescheduleDate('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Cannot Complete Job</h3>
          <button type="button" onClick={handleClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-600">
          Describe why you cannot complete this job. This helps the office schedule a follow-up.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Reason *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as IncompleteReason)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
            >
              <option value="">Select reason…</option>
              {INCOMPLETE_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {isSparePartsReason && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Part Name *</label>
                <input
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  placeholder="e.g. Compressor Motor"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  value={partQty}
                  onChange={(e) => setPartQty(parseInt(e.target.value) || 1)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {isOtherReason ? 'Details * (minimum 10 characters)' : 'Additional Notes (optional)'}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Describe what happened…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
            />
            {isOtherReason && (
              <p className={`mt-1 text-xs ${note.trim().length >= 10 ? 'text-emerald-600' : 'text-slate-400'}`}>
                {note.trim().length} / 10 characters minimum
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Reschedule Date (optional)</label>
            <input
              type="date"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={handleClose} className="ht-btn ht-btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {isSubmitting ? 'Submitting…' : 'Mark Incomplete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
