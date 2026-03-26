// ═════════════════════════════════════════════════════════════════════════════
// AMC Detail Page
// ──────────────────────────────────────────────────────────────────────────────
// Page for viewing and managing individual AMC contracts

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProtectedComponent } from '@/components/ui/ProtectedComponent';
import { 
  ArrowLeft, 
  Edit, 
  RefreshCw, 
  X, 
  Download, 
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  Wrench,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react';
import Link from 'next/link';

import { useAMCById, useUpdateAMC, useCancelAMC } from '@/hooks/amc/useAMC';
import { AMC_STATUS_OPTIONS, getAMCExpiryColor } from '@/modules/amc/amc.constants';
import { ROUTES } from '@/lib/constants/routes';

// ═════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const statusOption = AMC_STATUS_OPTIONS.find(opt => opt.value === status);
  
  return (
    <Badge 
      variant={status === 'cancelled' ? 'destructive' : 'secondary'}
    >
      {statusOption?.label || status}
    </Badge>
  );
};

interface ExpiryInfoProps {
  endDate: string;
  status: string;
}

const ExpiryInfo: React.FC<ExpiryInfoProps> = ({ endDate, status }) => {
  const end = new Date(endDate);
  const now = new Date();
  const daysUntil = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (status === 'cancelled') {
    return (
      <div className="flex items-center space-x-2 text-red-600">
        <X className="h-4 w-4" />
        <span>Cancelled</span>
      </div>
    );
  }
  
  if (status === 'expired') {
    return (
      <div className="flex items-center space-x-2 text-red-600">
        <AlertTriangle className="h-4 w-4" />
        <span>Expired on {end.toLocaleDateString('en-IN')}</span>
      </div>
    );
  }
  
  if (daysUntil <= 30) {
    const color = getAMCExpiryColor(daysUntil);
    return (
      <div className={`flex items-center space-x-2 ${color === 'red' ? 'text-red-600' : color === 'orange' ? 'text-orange-600' : 'text-yellow-600'}`}>
        <AlertTriangle className="h-4 w-4" />
        <span>{daysUntil} days remaining</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center space-x-2 text-green-600">
      <CheckCircle className="h-4 w-4" />
      <span>{daysUntil} days remaining</span>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function AMCDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: amc, isLoading } = useAMCById(params.id);
  const updateAMC = useUpdateAMC();
  const cancelAMC = useCancelAMC();
  
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');

  const handleCancel = async () => {
    if (!cancellationReason.trim()) {
      alert('Please provide a cancellation reason');
      return;
    }

    setIsCancelling(true);
    
    try {
      // Mock user ID - in real app this would come from auth context
      const userId = 'current-user-id';
      
      const result = await cancelAMC.mutateAsync({
        id: params.id,
        input: { cancellation_reason: cancellationReason },
        userId
      });
      
      if (result.success) {
        router.push(ROUTES.DASHBOARD_AMC);
      }
    } catch (error) {
      console.error('Error cancelling AMC:', error);
    } finally {
      setIsCancelling(false);
      setCancellationReason('');
    }
  };

  if (isLoading) {
    return (
      <ProtectedComponent>
        <div className="max-w-6xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </ProtectedComponent>
    );
  }

  if (!amc) {
    return (
      <ProtectedComponent>
        <div className="max-w-6xl mx-auto p-6">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">AMC Contract Not Found</h2>
            <p className="text-gray-600 mt-2">The AMC contract you're looking for doesn't exist.</p>
            <Link href={ROUTES.DASHBOARD_AMC}>
              <Button className="mt-4">Back to AMC Management</Button>
            </Link>
          </div>
        </div>
      </ProtectedComponent>
    );
  }

  return (
    <ProtectedComponent>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href={ROUTES.DASHBOARD_AMC}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to AMC Management
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{amc.contract_number}</h1>
              <div className="flex items-center space-x-4 mt-1">
                <StatusBadge status={amc.status} />
                <ExpiryInfo endDate={amc.end_date} status={amc.status} />
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3">
            {amc.status === 'active' && (
              <>
                <Link href={ROUTES.DASHBOARD_AMC_RENEW(amc.id)}>
                  <Button variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Renew
                  </Button>
                </Link>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </>
            )}
            {amc.status === 'active' && (
              <Button 
                variant="destructive" 
                onClick={() => setIsCancelling(true)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{amc.customer_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-gray-400" />
                  <p className="font-medium">{amc.customer_phone}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-gray-400" />
                  <p className="font-medium">Not provided</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <div className="flex items-start">
                  <MapPin className="h-4 w-4 mr-2 text-gray-400 mt-1" />
                  <p className="font-medium text-sm">Not provided</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appliance Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wrench className="h-5 w-5 mr-2" />
                Appliance Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Category</p>
                <p className="font-medium">{amc.appliance_category_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Brand</p>
                <p className="font-medium">{amc.appliance_brand}</p>
              </div>
              {amc.appliance_model && (
                <div>
                  <p className="text-sm text-gray-500">Model</p>
                  <p className="font-medium">{amc.appliance_model}</p>
                </div>
              )}
              {amc.appliance_serial_number && (
                <div>
                  <p className="text-sm text-gray-500">Serial Number</p>
                  <p className="font-medium">{amc.appliance_serial_number}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contract Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Contract Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="font-medium">{amc.duration_type.replace('_', ' ').toUpperCase()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Start Date</p>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  <p className="font-medium">{new Date(amc.start_date).toLocaleDateString('en-IN')}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">End Date</p>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  <p className="font-medium">{new Date(amc.end_date).toLocaleDateString('en-IN')}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Price Paid</p>
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-2 text-gray-400" />
                  <p className="font-medium">₹{amc.price_paid.toLocaleString('en-IN')}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Payment Mode</p>
                <p className="font-medium">{amc.payment_mode.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Billed To</p>
                <p className="font-medium">{amc.billed_to_type.replace('_', ' ').toUpperCase()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coverage Details */}
        <Card>
          <CardHeader>
            <CardTitle>Coverage Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">{amc.coverage_description}</p>
            </div>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Service Details</h4>
                <ul className="space-y-2">
                  <li className="flex justify-between">
                    <span className="text-gray-600">Free Visits Per Year:</span>
                    <span className="font-medium">{amc.free_visits_per_year || 'Not specified'}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-600">Parts Covered:</span>
                    <span className="font-medium">{amc.parts_covered ? 'Yes' : 'No'}</span>
                  </li>
                  {amc.parts_covered && amc.parts_coverage_limit && (
                    <li className="flex justify-between">
                      <span className="text-gray-600">Parts Coverage Limit:</span>
                      <span className="font-medium">₹{amc.parts_coverage_limit.toLocaleString('en-IN')}</span>
                    </li>
                  )}
                </ul>
              </div>
              
              {amc.exclusions && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Exclusions</h4>
                  <p className="text-gray-600 whitespace-pre-wrap">{amc.exclusions}</p>
                </div>
              )}
            </div>
            
            {amc.special_terms && (
              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 mb-3">Special Terms</h4>
                <p className="text-gray-600 whitespace-pre-wrap">{amc.special_terms}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales Information */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500">Sold By</p>
                <p className="font-medium">{amc.sold_by_name || 'Not assigned'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Commission Amount</p>
                <p className="font-medium">
                  {amc.commission_amount ? `₹${amc.commission_amount.toLocaleString('en-IN')}` : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Created On</p>
                <p className="font-medium">{new Date(amc.created_at).toLocaleDateString('en-IN')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cancellation Modal */}
        {isCancelling && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle className="text-red-600">Cancel AMC Contract</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  Are you sure you want to cancel this AMC contract? This action cannot be undone.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cancellation Reason *
                  </label>
                  <textarea
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    rows={3}
                    placeholder="Please provide a reason for cancellation..."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCancelling(false)}
                    disabled={isCancelling}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleCancel}
                    disabled={isCancelling || !cancellationReason.trim()}
                  >
                    {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ProtectedComponent>
  );
}
