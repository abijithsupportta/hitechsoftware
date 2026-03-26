// ═════════════════════════════════════════════════════════════════════════════
// AMC New Contract Page
// ──────────────────────────────────────────────────────────────────────────────
// Page for creating new AMC contracts

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProtectedComponent } from '@/components/ui/ProtectedComponent';
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

import { useCreateAMC, useAMCDashboard } from '@/hooks/amc/useAMC';
import type { AMCFormData, CreateAMCInput, AMCDurationType, AMCPaymentMode, AMCBilledToType } from '@/modules/amc/amc.types';
import { AMC_DURATION_OPTIONS, AMC_PAYMENT_MODE_OPTIONS, AMC_BILLED_TO_OPTIONS } from '@/modules/amc/amc.constants';
import { ROUTES } from '@/lib/constants/routes';

// ═════════════════════════════════════════════════════════════════════════════
// FORM COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

export default function CreateAMCPage() {
  const router = useRouter();
  const createAMC = useCreateAMC();
  const { data: dashboard } = useAMCDashboard();
  
  const [formData, setFormData] = useState<AMCFormData>({
    customer_id: '',
    appliance_category_id: '',
    appliance_brand: '',
    appliance_model: '',
    appliance_serial_number: '',
    duration_type: '1_year',
    start_date: '',
    price_paid: 0,
    payment_mode: 'cash',
    billed_to_type: 'brand',
    billed_to_id: '',
    sold_by: '',
    coverage_description: '',
    free_visits_per_year: 2,
    parts_covered: false,
    parts_coverage_limit: 0,
    brands_covered: '',
    exclusions: '',
    special_terms: '',
    subject_id: '',
    confirm_no_overlap: false,
    terms_accepted: false
  });

  const input: any = {
      customer_id: formData.customer_id,
      appliance_category_id: formData.appliance_category_id,
      appliance_brand: formData.appliance_brand,
      appliance_model: formData.appliance_model || undefined,
      appliance_serial_number: formData.appliance_serial_number || undefined,
      duration_type: formData.duration_type as AMCDurationType,
      start_date: formData.start_date,
      end_date: formData.duration_type === 'custom' ? formData.end_date : undefined,
      price_paid: formData.price_paid,
      payment_mode: formData.payment_mode as AMCPaymentMode,
      billed_to_type: formData.billed_to_type as AMCBilledToType,
      billed_to_id: formData.billed_to_id,
      sold_by: formData.sold_by,
      coverage_description: formData.coverage_description,
      free_visits_per_year: formData.free_visits_per_year,
      parts_covered: formData.parts_covered,
      parts_coverage_limit: formData.parts_coverage_limit || undefined,
      brands_covered: formData.brands_covered,
      exclusions: formData.exclusions,
      special_terms: formData.special_terms
    };

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.customer_id) newErrors.customer_id = 'Customer is required';
    if (!formData.appliance_category_id) newErrors.appliance_category_id = 'Category is required';
    if (!formData.appliance_brand) newErrors.appliance_brand = 'Brand is required';
    if (!formData.start_date) newErrors.start_date = 'Start date is required';
    if (!formData.price_paid || parseFloat(formData.price_paid.toString()) <= 0) {
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
        price_paid: formData.price_paid,
        parts_coverage_limit: formData.parts_coverage_limit || undefined,
        free_visits_per_year: formData.free_visits_per_year,
        end_date: formData.duration_type === 'custom' ? formData.end_date : undefined
      };

      // Mock user ID - in real app this would come from auth context
      const userId = 'current-user-id';
      
      const result = await createAMC.mutateAsync({ input, userId });
      
      if (result.success) {
        router.push(ROUTES.DASHBOARD_AMC_DETAIL(result.data.amc.id));
      }
    } catch (error) {
      console.error('Error creating AMC:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof AMCFormData, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <ProtectedComponent>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
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
              <h1 className="text-2xl font-bold text-gray-900">Create New AMC Contract</h1>
              <p className="text-gray-600">Sell Annual Maintenance Contract to customer</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer *
                </label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => handleInputChange('customer_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Customer</option>
                  {/* Mock customer options - would come from API */}
                  <option value="customer-1">John Doe</option>
                  <option value="customer-2">Jane Smith</option>
                </select>
                {errors.customer_id && (
                  <p className="text-red-500 text-sm mt-1">{errors.customer_id}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Appliance Information */}
          <Card>
            <CardHeader>
              <CardTitle>Appliance Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.appliance_category_id}
                    onChange={(e) => handleInputChange('appliance_category_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Category</option>
                    <option value="cat-1">Air Conditioner</option>
                    <option value="cat-2">Refrigerator</option>
                    <option value="cat-3">Washing Machine</option>
                  </select>
                  {errors.appliance_category_id && (
                    <p className="text-red-500 text-sm mt-1">{errors.appliance_category_id}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand *
                  </label>
                  <input
                    type="text"
                    value={formData.appliance_brand}
                    onChange={(e) => handleInputChange('appliance_brand', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Samsung, LG, Whirlpool"
                  />
                  {errors.appliance_brand && (
                    <p className="text-red-500 text-sm mt-1">{errors.appliance_brand}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    value={formData.appliance_model}
                    onChange={(e) => handleInputChange('appliance_model', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., XYZ-1234"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={formData.appliance_serial_number}
                    onChange={(e) => handleInputChange('appliance_serial_number', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., SN123456789"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contract Details */}
          <Card>
            <CardHeader>
              <CardTitle>Contract Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration *
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
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleInputChange('start_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.start_date && (
                    <p className="text-red-500 text-sm mt-1">{errors.start_date}</p>
                  )}
                </div>
                {formData.duration_type === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date *
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
                    Price Paid (₹) *
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
                  placeholder="Describe what services and parts are covered under this AMC..."
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

          {/* Submit Actions */}
          <div className="flex justify-end space-x-4">
            <Link href={ROUTES.DASHBOARD_AMC}>
              <Button variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create AMC Contract'}
              <Save className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </form>
      </div>
    </ProtectedComponent>
  );
}
