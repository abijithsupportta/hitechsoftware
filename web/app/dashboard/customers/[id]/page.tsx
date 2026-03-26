'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DeleteConfirmModal } from '@/components/customers/DeleteConfirmModal';
import { ProtectedComponent } from '@/components/ui/ProtectedComponent';
import { CUSTOMER_QUERY_KEYS } from '@/modules/customers/customer.constants';
import { deleteCustomer } from '@/modules/customers/customer.service';
import { CustomerStatusBadge } from '@/components/customers/CustomerStatusBadge';
import { useCustomer } from '@/hooks/customers/useCustomers';
import { usePermission } from '@/hooks/auth/usePermission';
import { useCustomerAMCs } from '@/hooks/amc/useAMC';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Plus,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { AMC_STATUS_OPTIONS, getAMCExpiryColor } from '@/modules/amc/amc.constants';
import { ROUTES } from '@/lib/constants/routes';

export default function CustomerDetailPage() {
  const { can } = usePermission();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const customerId = params?.id;
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { customer, isLoading, error } = useCustomer(customerId);
  const { data: customerAMCs, isLoading: amcsLoading } = useCustomerAMCs(customerId);
  const deleteCustomerMutation = useMutation({
    mutationFn: (id: string) => deleteCustomer(id),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success('Customer deleted successfully');
        queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.all });
        router.push('/dashboard/customers');
      } else {
        toast.error(result.error.message);
      }
    },
    onError: () => {
      toast.error('Failed to delete customer');
    },
  });

  if (!can('customer:view')) {
    return <div className="p-6 text-sm text-rose-600">You do not have access to customer details.</div>;
  }

  if (isLoading) {
    return <div className="p-6 text-sm text-slate-600">Loading customer...</div>;
  }

  if (!customer) {
    return <div className="p-6 text-sm text-rose-600">{error ?? 'Customer not found.'}</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{customer.customer_name}</h1>
          <p className="mt-1 text-sm text-slate-600">Customer detail record</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/customers"
            className="ht-btn ht-btn-secondary"
          >
            Back
          </Link>
          <ProtectedComponent permission="customer:edit">
            <Link
              href={`/dashboard/customers/${customer.id}/edit`}
              className="ht-btn ht-btn-primary"
            >
              Edit
            </Link>
          </ProtectedComponent>
          <ProtectedComponent permission="customer:delete">
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
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Primary details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Phone</dt><dd>{customer.phone_number}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Email</dt><dd>{customer.email ?? '-'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Area</dt><dd>{customer.primary_area}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">City</dt><dd>{customer.primary_city}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Postal code</dt><dd>{customer.primary_postal_code}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Status</dt><dd><CustomerStatusBadge isActive={customer.is_active} /></dd></div>
          </dl>
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            {customer.primary_address_line1}
            {customer.primary_address_line2 ? `, ${customer.primary_address_line2}` : ''}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Secondary details</h2>
          {customer.secondary_address_label ? (
            <>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Label</dt><dd>{customer.secondary_address_label}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Area</dt><dd>{customer.secondary_area}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">City</dt><dd>{customer.secondary_city}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Postal code</dt><dd>{customer.secondary_postal_code}</dd></div>
              </dl>
              <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                {customer.secondary_address_line1}
                {customer.secondary_address_line2 ? `, ${customer.secondary_address_line2}` : ''}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-600">No secondary address saved.</p>
          )}
        </div>
      </div>

      {/* AMC Contracts Tab */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              AMC Contracts
            </div>
            <Link href={ROUTES.DASHBOARD_AMC_NEW}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create AMC
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {amcsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : customerAMCs && customerAMCs.length > 0 ? (
            <div className="space-y-4">
              {customerAMCs.map((amc) => {
                const end = new Date(amc.end_date);
                const now = new Date();
                const daysUntil = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const statusOption = AMC_STATUS_OPTIONS.find(opt => opt.value === amc.status);
                
                return (
                  <div key={amc.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{amc.contract_number}</h3>
                          <Badge variant="secondary">
                            {statusOption?.label || amc.status}
                          </Badge>
                          {amc.status === 'active' && (
                            <div className={`text-sm font-medium ${
                              daysUntil <= 7 ? 'text-red-600' : 
                              daysUntil <= 30 ? 'text-orange-600' : 'text-green-600'
                            }`}>
                              {daysUntil} days left
                            </div>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Appliance:</span>
                            <p className="font-medium">{amc.appliance_brand} {amc.appliance_category_name}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Duration:</span>
                            <p className="font-medium">{amc.duration_type.replace('_', ' ').toUpperCase()}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Price:</span>
                            <p className="font-medium">₹{amc.price_paid.toLocaleString('en-IN')}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Start:</span>
                            <p className="font-medium">{new Date(amc.start_date).toLocaleDateString('en-IN')}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">End:</span>
                            <p className="font-medium">{new Date(amc.end_date).toLocaleDateString('en-IN')}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Payment:</span>
                            <p className="font-medium">{amc.payment_mode.toUpperCase()}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <Link href={ROUTES.DASHBOARD_AMC_DETAIL(amc.id)}>
                          <Button variant="outline" size="sm">
                            View
                            <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                        {amc.status === 'active' && (
                          <Link href={ROUTES.DASHBOARD_AMC_RENEW(amc.id)}>
                            <Button variant="outline" size="sm">
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Renew
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              <div className="pt-4 border-t">
                <Link href={`${ROUTES.DASHBOARD_AMC}?customer_id=${customerId}`}>
                  <Button variant="outline" className="w-full">
                    View All AMCs for {customer.customer_name}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No AMC Contracts</h3>
              <p className="text-gray-600 mb-4">This customer doesn't have any AMC contracts yet.</p>
              <Link href={ROUTES.DASHBOARD_AMC_NEW}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First AMC
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        title="Delete customer"
        description={`Delete ${customer.customer_name}? This action permanently removes the customer.`}
        confirmLabel="Delete permanently"
        isSubmitting={deleteCustomerMutation.isPending}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={() => {
          setShowDeleteModal(false);
          deleteCustomerMutation.mutate(customer.id);
        }}
      />
    </div>
  );
}
