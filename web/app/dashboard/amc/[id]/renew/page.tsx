// ═════════════════════════════════════════════════════════════════════════════
// AMC Renewal Page
// ──────────────────────────────────────────────────────────────────────────────
// Page for renewing existing AMC contracts

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProtectedComponent } from '@/components/ui/ProtectedComponent';
import { 
  ArrowLeft, 
  Save, 
  RefreshCw, 
  AlertTriangle,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';

import { useAMCById, useRenewAMC } from '@/hooks/amc/useAMC';
import { AMC_DURATION_OPTIONS, AMC_PAYMENT_MODE_OPTIONS, AMC_BILLED_TO_OPTIONS } from '@/modules/amc/amc.constants';
import { ROUTES } from '@/lib/constants/routes';

// ═════════════════════════════════════════════════════════════════════════════
// FORM COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

interface RenewalFormData {
  duration_type: string;
  start_date: string;
  end_date: string;
  price_paid: string;
  payment_mode: string;
  billed_to_type: string;
  billed_to_id: string;
  sold_by: string;
  coverage_description: string;
  free_visits_per_year: string;
  parts_covered: boolean;
  parts_coverage_limit: string;
  brands_covered: string;
  exclusions: string;
  special_terms: string;
}

export default function RenewAMCPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: amc, isLoading } = useAMCById(params.id);
  const renewAMC = useRenewAMC();
  
  const [formData, setFormData] = useState<RenewalFormData>({
    duration_type: '1_year',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    price_paid: '',
    payment_mode: 'cash',
    billed_to_type: 'customer',
    billed_to_id: '',
    sold_by: '',
    coverage_description: '',
    free_visits_per_year: '2',
    parts_covered: false,
    parts_coverage_limit: '5000',
    brands_covered: '',
    exclusions: '',
    special_terms: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill form with existing AMC data when it loads
  React.useEffect(() => {
    if (amc) {
      setFormData(prev => ({
        ...prev,
        payment_mode: amc.payment_mode,
        billed_to_type: amc.billed_to_type,
        billed_to_id: amc.billed_to_id || '',
        sold_by: amc.sold_by,
        coverage_description: amc.coverage_description,
        free_visits_per_year: amc.free_visits_per_year?.toString() || '2',
        parts_covered: amc.parts_covered || false,
        parts_coverage_limit: amc.parts_coverage_limit?.toString() || '5000',
        brands_covered: amc.brands_covered || '',
        exclusions: amc.exclusions || '',
        special_terms: amc.special_terms || ''
      }));
    }
  }, [amc]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.duration_type) newErrors.duration_type = 'Duration is required';
    if (!formData.start_date) newErrors.start_date = 'Start date is required';
    if (!formData.price_paid || parseFloat(formData.price_paid) <= 0) {
      newErrors.price_paid = 'Valid price is required';
    }
    if (!formData.payment_mode) newErrors.payment_mode = 'Payment mode is required';
    if (!formData.billed_to_type) newErrors.billed_to_type = 'Billed to is required';
    if (!formData.sold_by) newErrors.sold_by = 'Sold by is required';
    if (!formData.coverage_description || formData.coverage_description.length < 20) {
      newErrors.coverage_description = 'Coverage description must be at least 20 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      const input: any = {
        ...formData,
        price_paid: parseFloat(formData.price_paid),
        parts_coverage_limit: formData.parts_covered ? parseFloat(formData.parts_coverage_limit) : null,
        free_visits_per_year: parseInt(formData.free_visits_per_year),
        end_date: formData.duration_type === 'custom' ? formData.end_date : undefined
      };

      // Mock user ID - in real app this would come from auth context
      const userId = 'current-user-id';
      
      const result = await renewAMC.mutateAsync({
        existingAMCId: params.id,
        input,
        userId
      });
      
      if (result.success) {
        router.push(ROUTES.DASHBOARD_AMC_DETAIL(params.id));
      }
    } catch (error) {
      console.error('Error renewing AMC:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof RenewalFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (isLoading) {
    return (
      <ProtectedComponent>
        <div className="max-w-4xl mx-auto p-6">
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
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">AMC Contract Not Found</h2>
            <p className="text-gray-600 mt-2">The AMC contract you're trying to renew doesn't exist.</p>
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
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href={ROUTES.DASHBOARD_AMC_DETAIL(params.id)}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to AMC Details
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Renew AMC Contract</h1>
              <p className="text-gray-600">Renew {amc.contract_number} for {amc.customer_name}</p>
            </div>
          </div>
        </div>

        {/* Current AMC Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Current Contract Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Contract Number</p>
                <p className="font-medium">{amc.contract_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Current Status</p>
                <Badge variant="secondary">{amc.status}</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">End Date</p>
                <p className="font-medium">{new Date(amc.end_date).toLocaleDateString('en-IN')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Original Price</p>
                <p className="font-medium">₹{amc.price_paid.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Renewal Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contract Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <RefreshCw className="h-5 w-5 mr-2" />
                Renewal Contract Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Duration *
                  </label>
                  <select
                    value={formData.duration_type}
                    onChange={(e) => handleInputChange('duration_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {AMC_DURATION_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.duration_type && (
                    <p className="text-red-500 text-sm mt-1">{errors.duration_type}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleInputChange('start_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={new Date(amc.end_date).toISOString().split('T')[0]}
                  />
                  {errors.start_date && (
                    <p className="text-red-500 text-sm mt-1">{errors.start_date}</p>
                  )}
                </div>
                {formData.duration_type === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New End Date *
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => handleInputChange('end_date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Price (₹) *
                  </label>
                  <input
                    type="number"
                    value={formData.price_paid}
                    onChange={(e) => handleInputChange('price_paid', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    step="0.01"
                  />
                  {errors.price_paid && (
                    <p className="text-red-500 text-sm mt-1">{errors.price_paid}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Mode *
                  </label>
                  <select
                    value={formData.payment_mode}
                    onChange={(e) => handleInputChange('payment_mode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {AMC_PAYMENT_MODE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.payment_mode && (
                    <p className="text-red-500 text-sm mt-1">{errors.payment_mode}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Billed To *
                  </label>
                  <select
                    value={formData.billed_to_type}
                    onChange={(e) => handleInputChange('billed_to_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {AMC_BILLED_TO_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.billed_to_type && (
                    <p className="text-red-500 text-sm mt-1">{errors.billed_to_type}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sold By *
                  </label>
                  <select
                    value={formData.sold_by}
                    onChange={(e) => handleInputChange('sold_by', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Staff</option>
                    <option value="staff-1">John Smith</option>
                    <option value="staff-2">Jane Doe</option>
                  </select>
                  {errors.sold_by && (
                    <p className="text-red-500 text-sm mt-1">{errors.sold_by}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Coverage Details */}
          <Card>
            <CardHeader>
              <CardTitle>Coverage Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Coverage Description *
                </label>
                <textarea
                  value={formData.coverage_description}
                  onChange={(e) => handleInputChange('coverage_description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Describe what services and parts are covered under this renewed AMC..."
                />
                {errors.coverage_description && (
                  <p className="text-red-500 text-sm mt-1">{errors.coverage_description}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Free Visits Per Year
                  </label>
                  <input
                    type="number"
                    value={formData.free_visits_per_year}
                    onChange={(e) => handleInputChange('free_visits_per_year', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="2"
                    min="1"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="parts_covered"
                    checked={formData.parts_covered}
                    onChange={(e) => handleInputChange('parts_covered', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="parts_covered" className="text-sm font-medium text-gray-700">
                    Parts Covered
                  </label>
                </div>
                {formData.parts_covered && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parts Coverage Limit (₹)
                    </label>
                    <input
                      type="number"
                      value={formData.parts_coverage_limit}
                      onChange={(e) => handleInputChange('parts_coverage_limit', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="5000"
                      step="0.01"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Renewal Benefits */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center text-green-800">
                <CheckCircle className="h-5 w-5 mr-2" />
                Renewal Benefits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-green-700">
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Continuous service coverage without interruption</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Potential renewal discount (if applicable)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Priority service for existing customers</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Maintained service history and records</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Submit Actions */}
          <div className="flex justify-end space-x-4">
            <Link href={ROUTES.DASHBOARD_AMC_DETAIL(params.id)}>
              <Button variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Renewing...' : 'Renew AMC Contract'}
              <RefreshCw className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </form>
      </div>
    </ProtectedComponent>
  );
}
