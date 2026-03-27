'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Package, 
  Wrench, 
  DollarSign, 
  FileText, 
  Download, 
  RefreshCw, 
  Loader2, 
  AlertCircle,
  Calendar
} from 'lucide-react';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants/routes';
import { 
  useRevenueSummary, 
  useTechnicianPerformance, 
  useServiceReport, 
  useInventoryReport, 
  useCustomerReport, 
  useFinancialReport 
} from '@/hooks/reports/useReportData';
import { exportRevenueCSV, exportTechnicianCSV, exportServiceCSV } from '@/lib/utils/csv-export';

type Period = 'week' | 'month' | 'year';

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Get period from URL or default to 'month'
  const urlPeriod = (searchParams.get('period') as Period) || 'month';
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(urlPeriod);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update URL when period changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set('period', selectedPeriod);
    router.replace(`/dashboard/reports?${params.toString()}`, { scroll: false });
  }, [selectedPeriod, router, searchParams]);

  // Fetch real data for all report cards
  const { 
    data: revenueData, 
    isLoading: revenueLoading, 
    error: revenueError,
    refetch: refetchRevenue 
  } = useRevenueSummary(selectedPeriod);

  const { 
    data: technicianData, 
    isLoading: technicianLoading,
    error: technicianError,
    refetch: refetchTechnician 
  } = useTechnicianPerformance(selectedPeriod);

  const { 
    data: serviceData, 
    isLoading: serviceLoading,
    error: serviceError,
    refetch: refetchService 
  } = useServiceReport(selectedPeriod);

  const { 
    data: inventoryData, 
    isLoading: inventoryLoading,
    error: inventoryError,
    refetch: refetchInventory 
  } = useInventoryReport(selectedPeriod);

  const { 
    data: customerData, 
    isLoading: customerLoading,
    error: customerError,
    refetch: refetchCustomer 
  } = useCustomerReport(selectedPeriod);

  const { 
    data: financialData, 
    isLoading: financialLoading,
    error: financialError,
    refetch: refetchFinancial 
  } = useFinancialReport(selectedPeriod);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchRevenue(),
        refetchTechnician(),
        refetchService(),
        refetchInventory(),
        refetchCustomer(),
        refetchFinancial()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getChangeColor = (value: number) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const isLoading = revenueLoading || technicianLoading || serviceLoading || 
                   inventoryLoading || customerLoading || financialLoading;

  const hasError = revenueError || technicianError || serviceError || 
                  inventoryError || customerError || financialError;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header with Period Selector */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-600 mt-1">Comprehensive analytics and insights for your business</p>
          </div>
          
          {/* Period Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['week', 'month', 'year'] as Period[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedPeriod === period
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'This Year'}
                </button>
              ))}
            </div>
            
            <button 
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRefreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <p className="text-sm text-blue-800">
                Loading report data... This may take a few moments.
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {hasError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-800">
                Some report data failed to load. Please try refreshing the data.
              </p>
            </div>
          </div>
        )}

        {/* Summary Strip - 4 Key Numbers */}
        {!isLoading && revenueData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue Collected</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(revenueData.total_collected)}
                  </p>
                  <p className={`text-sm mt-1 ${getChangeColor(revenueData.comparison.revenue_change)}`}>
                    {formatPercentage(revenueData.comparison.revenue_change)} from last period
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg ml-4">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Due</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(revenueData.total_due)}
                  </p>
                  <p className={`text-sm mt-1 ${getChangeColor(revenueData.comparison.due_change)}`}>
                    {formatPercentage(revenueData.comparison.due_change)} from last period
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg ml-4">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Jobs Completed</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {technicianData?.total_jobs.toLocaleString() || '0'}
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    {technicianData?.completion_rate.toFixed(1)}% completion rate
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg ml-4">
                  <Wrench className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Customers</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {customerData?.total_active_customers.toLocaleString() || '0'}
                  </p>
                  <p className={`text-sm mt-1 ${getChangeColor(customerData?.comparison.total_change || 0)}`}>
                    {formatPercentage(customerData?.comparison.total_change || 0)} from last period
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg ml-4">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Report Cards - Redesigned */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Card 1 - Revenue and Billing */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-green-500 rounded-lg">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <button 
                onClick={() => revenueData && exportRevenueCSV([], `revenue-report-${selectedPeriod}.csv`)}
                className="text-blue-600 hover:text-blue-700"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Revenue & Billing</h3>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {formatCurrency(revenueData?.total_billed || 0)}
            </p>
            <p className="text-sm text-gray-600 mb-2">
              Collected {formatCurrency(revenueData?.total_collected || 0)} | Due {formatCurrency(revenueData?.total_due || 0)}
            </p>
            <p className={`text-sm mb-2 ${getChangeColor(revenueData?.comparison.revenue_change || 0)}`}>
              {formatPercentage(revenueData?.comparison.revenue_change || 0)} vs last period
            </p>
            <p className="text-xs text-gray-500 mb-3">Highest revenue day: TBD</p>
            <Link 
              href={ROUTES.DASHBOARD_REPORTS_REVENUE}
              className="text-blue-600 text-sm font-medium hover:text-blue-700"
            >
              View Full Report →
            </Link>
          </div>

          {/* Card 2 - Technician Performance */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-500 rounded-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <button 
                onClick={() => technicianData && exportTechnicianCSV([], `technician-report-${selectedPeriod}.csv`)}
                className="text-blue-600 hover:text-blue-700"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Technician Performance</h3>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {technicianData?.total_jobs.toLocaleString() || '0'}
            </p>
            <p className="text-sm text-gray-600 mb-2">
              {formatCurrency(technicianData?.average_per_technician || 0)}
            </p>
            <p className={`text-sm mb-2 ${getChangeColor(technicianData?.comparison.jobs_change || 0)}`}>
              {formatPercentage(technicianData?.comparison.jobs_change || 0)} vs last period
            </p>
            <p className="text-xs text-gray-500 mb-3">
              Top: {technicianData?.top_technician.name} ({technicianData?.top_technician.jobs} jobs)
            </p>
            <Link 
              href={ROUTES.DASHBOARD_REPORTS_TECHNICIANS}
              className="text-blue-600 text-sm font-medium hover:text-blue-700"
            >
              View Full Report →
            </Link>
          </div>

          {/* Card 3 - Service Reports */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-purple-500 rounded-lg">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <button 
                onClick={() => serviceData && exportServiceCSV([], `service-report-${selectedPeriod}.csv`)}
                className="text-blue-600 hover:text-blue-700"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Service Reports</h3>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {serviceData?.completion_rate.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600 mb-2">
              {formatCurrency(serviceData?.average_completion_time || 0)}
            </p>
            <p className={`text-sm mb-2 ${getChangeColor(serviceData?.comparison.completion_rate_change || 0)}`}>
              {formatPercentage(serviceData?.comparison.completion_rate_change || 0)} vs last period
            </p>
            <p className="text-xs text-gray-500 mb-3">
              Most common: {serviceData?.most_common_category}
            </p>
            <Link 
              href={ROUTES.DASHBOARD_REPORTS_SERVICES}
              className="text-blue-600 text-sm font-medium hover:text-blue-700"
            >
              View Full Report →
            </Link>
          </div>

          {/* Card 4 - Inventory Reports */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-orange-500 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <button className="text-blue-600 hover:text-blue-700">
                <Download className="w-4 h-4" />
              </button>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Inventory Reports</h3>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {formatCurrency(inventoryData?.total_parts_value || 0)}
            </p>
            <p className="text-sm text-gray-600 mb-2">
              {inventoryData?.low_stock_count} low stock items
            </p>
            <p className={`text-sm mb-2 ${getChangeColor(inventoryData?.comparison.value_change || 0)}`}>
              {formatPercentage(inventoryData?.comparison.value_change || 0)} vs last period
            </p>
            <p className="text-xs text-gray-500 mb-3">
              Most used: {inventoryData?.most_used_part}
            </p>
            <Link 
              href={ROUTES.DASHBOARD_REPORTS_INVENTORY}
              className="text-blue-600 text-sm font-medium hover:text-blue-700"
            >
              View Full Report →
            </Link>
          </div>

          {/* Card 5 - Customer Reports */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-pink-500 rounded-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <button className="text-blue-600 hover:text-blue-700">
                <Download className="w-4 h-4" />
              </button>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Customer Reports</h3>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {customerData?.total_active_customers.toLocaleString() || '0'}
            </p>
            <p className="text-sm text-gray-600 mb-2">
              {customerData?.new_customers} new | {customerData?.returning_customers} returning
            </p>
            <p className={`text-sm mb-2 ${getChangeColor(customerData?.comparison.total_change || 0)}`}>
              {formatPercentage(customerData?.comparison.total_change || 0)} vs last period
            </p>
            <p className="text-xs text-gray-500 mb-3">
              Top: {customerData?.top_customer.name} ({customerData?.top_customer.service_count} services)
            </p>
            <Link 
              href={ROUTES.DASHBOARD_REPORTS_CUSTOMERS}
              className="text-blue-600 text-sm font-medium hover:text-blue-700"
            >
              View Full Report →
            </Link>
          </div>

          {/* Card 6 - Financial Reports */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-emerald-500 rounded-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <button className="text-blue-600 hover:text-blue-700">
                <Download className="w-4 h-4" />
              </button>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Financial Reports</h3>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {formatCurrency(financialData?.net_profit_estimate || 0)}
            </p>
            <p className="text-sm text-gray-600 mb-2">
              Outstanding: {formatCurrency(financialData?.outstanding_dues || 0)}
            </p>
            <p className={`text-sm mb-2 ${getChangeColor(financialData?.comparison.profit_change || 0)}`}>
              {formatPercentage(financialData?.comparison.profit_change || 0)} vs last period
            </p>
            <p className="text-xs text-gray-500 mb-3">
              Top brand: {financialData?.top_brand.name} ({formatCurrency(financialData?.top_brand.revenue || 0)})
            </p>
            <Link 
              href={ROUTES.DASHBOARD_REPORTS_FINANCIAL}
              className="text-blue-600 text-sm font-medium hover:text-blue-700"
            >
              View Full Report →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
