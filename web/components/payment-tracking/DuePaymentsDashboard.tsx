'use client';

import React, { useState } from 'react';
import { 
  useDuePaymentsDashboard, 
  usePaymentCollectionWorkflow,
  DuePaymentsFilter,
  DuePaymentsSort,
  PRIORITY_LEVELS,
  PAYMENT_COLLECTION_METHODS
} from '@/hooks/payment-tracking/usePaymentTracking';
import { DuePayment } from '@/modules/payment-tracking/payment-tracking.types';

// ============================================================================
// SIMPLE DUE PAYMENTS DASHBOARD (without UI library dependencies)
// ============================================================================

export default function DuePaymentsDashboard() {
  const [filter, setFilter] = useState<DuePaymentsFilter>({});
  const [selectedPayment, setSelectedPayment] = useState<DuePayment | null>(null);

  const { summary, payments, isLoading, isError } = useDuePaymentsDashboard(filter);
  const { recordPayment, isLoading: isRecording } = usePaymentCollectionWorkflow();

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handlePriorityFilter = (level: string) => {
    setFilter((prev: DuePaymentsFilter) => ({ ...prev, priority_level: parseInt(level) }));
  };

  const handleFilterChange = (prev: DuePaymentsFilter) => {
    setFilter(prev);
  };

  const handleCollectPayment = async (payment: DuePayment) => {
    try {
      recordPayment.mutate({
        bill_id: payment.bill_id,
        payment_collected: true,
        collection_method: 'cash',
        collection_notes: 'Collected via dashboard',
      });

      setSelectedPayment(null);
    } catch (error) {
      console.error('Error collecting payment:', error);
    }
  };

  const handleCallCustomer = (phone: string) => {
    window.open(`tel:${phone}`, '_blank');
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading due payments...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">Error loading due payments</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Due Payments</h1>
        <p className="text-gray-600">Track and collect payments from customers</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-600">Total Due Amount</div>
            <div className="text-2xl font-bold">₹{summary.data?.total_due_amount?.toFixed(2) || '0.00'}</div>
            <div className="text-xs text-gray-500">{summary.data?.total_due_count || 0} bills</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-600">Overdue Amount</div>
            <div className="text-2xl font-bold text-red-600">₹{summary.data?.overdue_amount?.toFixed(2) || '0.00'}</div>
            <div className="text-xs text-gray-500">{summary.data?.overdue_count || 0} overdue bills</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-600">Critical Overdue</div>
            <div className="text-2xl font-bold text-red-800">₹{summary.data?.critical_count || 0}</div>
            <div className="text-xs text-gray-500">critical bills</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-600">Recent Due</div>
            <div className="text-2xl font-bold text-orange-600">₹{summary.data?.high_count || 0}</div>
            <div className="text-xs text-gray-500">high priority</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Customer Search</label>
            <input
              type="text"
              placeholder="Search by name or phone..."
              className="w-full p-2 border rounded"
              value={filter.customer_search || ''}
              onChange={(e: any) => setFilter(prev => ({ ...prev, customer_search: e.target.value }))}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Priority Level</label>
            <select
              className="w-full p-2 border rounded"
              value={filter.priority_level?.toString() || ''}
              onChange={(e: any) => setFilter(prev => ({ 
                ...prev, 
                priority_level: e.target.value ? parseInt(e.target.value) : undefined 
              }))}
            >
              <option value="">All priorities</option>
              {PRIORITY_LEVELS.map(level => (
                <option key={level.value} value={level.value.toString()}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Overdue Only</label>
            <select
              className="w-full p-2 border rounded"
              value={filter.overdue_only ? 'true' : 'false'}
              onChange={(e: any) => setFilter(prev => ({ 
                ...prev, 
                overdue_only: e.target.value === 'true' 
              }))}
            >
              <option value="false">All due payments</option>
              <option value="true">Overdue only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Due Payments Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">
            Due Payments List ({payments.data?.pagination?.total || 0} total)
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Technician</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Service Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payments.data?.data?.map((payment: DuePayment) => (
                <tr key={payment.bill_id}>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium">{payment.customer_name}</div>
                      <div className="text-sm text-gray-500">{payment.customer_phone}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium">{payment.subject_number}</div>
                      <div className="text-sm text-gray-500">
                        {payment.service_completed_at ? 
                          new Date(payment.service_completed_at).toLocaleDateString() : 
                          'Not completed'
                        }
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium">{payment.technician_name || 'Unassigned'}</div>
                      <div className="text-sm text-gray-500">{payment.technician_phone}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">₹{payment.total_amount.toFixed(2)}</div>
                    {payment.is_overdue && (
                      <div className="text-xs text-red-600">
                        {payment.days_since_service} days overdue
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-500">
                      {payment.days_since_service || 0} days
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {payment.priority_level !== 5 && (
                      <span className={`px-2 py-1 text-xs rounded ${
                        payment.priority_level <= 2 ? 'bg-red-100 text-red-800' :
                        payment.priority_level === 3 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {PRIORITY_LEVELS.find((p: any) => p.value === payment.priority_level)?.label}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        onClick={() => handleCollectPayment(payment)}
                        disabled={isRecording}
                      >
                        {isRecording ? 'Recording...' : 'Collect Payment'}
                      </button>
                      
                      <button
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                        onClick={() => handleCallCustomer(payment.customer_phone)}
                      >
                        Call
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
