'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Calendar, 
  Download, 
  RefreshCw, 
  Loader2, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Users
} from 'lucide-react';
import { useRevenueSummary } from '@/hooks/reports/useReportData';
import { exportRevenueCSV } from '@/lib/utils/csv-export';
import { createClient } from '@/lib/supabase/client';

type Period = 'week' | 'month' | 'year';

interface RevenueData {
  date: string;
  subject_number: string;
  customer_name: string;
  technician_name: string;
  service_type: string;
  bill_amount: number;
  gst_amount: number;
  payment_status: string;
  payment_mode: string;
}

export default function RevenueReportPage() {
  const searchParams = useSearchParams();
  const urlPeriod = (searchParams.get('period') as Period) || 'month';
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(urlPeriod);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageSize = 20;
  const supabase = createClient();

  // Update URL when period changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set('period', selectedPeriod);
    window.history.replaceState(null, '', `/dashboard/reports/revenue?${params.toString()}`);
  }, [selectedPeriod, searchParams]);

  // Fetch revenue data
  useEffect(() => {
    fetchRevenueData();
  }, [selectedPeriod, currentPage, sortBy, sortOrder]);

  const fetchRevenueData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get date range for selected period
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      switch (selectedPeriod) {
        case 'week':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1); // Monday
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 7); // Next Monday
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31);
          break;
      }

      // Fetch revenue data step by step
      const { data: bills, error: billsError } = await supabase
        .from('subject_bills')
        .select('id, grand_total, gst_amount, payment_status, payment_mode, created_at, subject_id')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order(sortBy === 'date' ? 'created_at' : 'grand_total', { ascending: sortOrder === 'asc' })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (billsError) throw billsError;

      // Get subject details
      const subjectIds = bills?.map(bill => bill.subject_id).filter(Boolean) || [];
      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, subject_number, customer_id, assigned_technician_id, category')
        .in('id', subjectIds);

      if (subjectsError) throw subjectsError;

      // Get customer details
      const customerIds = subjects?.map(s => s.customer_id).filter(Boolean) || [];
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id, name')
        .in('id', customerIds);

      if (customersError) throw customersError;

      // Get technician details
      const technicianIds = subjects?.map(s => s.assigned_technician_id).filter(Boolean) || [];
      const { data: technicians, error: techniciansError } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', technicianIds);

      if (techniciansError) throw techniciansError;

      // Combine data
      const formattedData: RevenueData[] = bills?.map(bill => {
        const subject = subjects?.find(s => s.id === bill.subject_id);
        const customer = subject ? customers?.find(c => c.id === subject.customer_id) : null;
        const technician = subject ? technicians?.find(t => t.id === subject.assigned_technician_id) : null;

        return {
          date: new Date(bill.created_at).toLocaleDateString(),
          subject_number: subject?.subject_number || 'Unknown',
          customer_name: customer?.name || 'Unknown',
          technician_name: technician?.display_name || 'Unknown',
          service_type: subject?.category || 'Unknown',
          bill_amount: bill.grand_total - bill.gst_amount,
          gst_amount: bill.gst_amount,
          payment_status: bill.payment_status,
          payment_mode: bill.payment_mode || 'Unknown'
        };
      }) || [];

      setRevenueData(formattedData);
    } catch (err) {
      console.error('Error fetching revenue data:', err);
      setError('Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column: 'date' | 'amount') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
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

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'due': return 'bg-red-100 text-red-700';
      case 'partially_paid': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Prepare chart data
  const chartData = revenueData.reduce((acc, item) => {
    const existing = acc.find(d => d.date === item.date);
    if (existing) {
      existing.revenue += item.bill_amount;
    } else {
      acc.push({
        date: item.date,
        revenue: item.bill_amount
      });
    }
    return acc;
  }, [] as { date: string; revenue: number }[]).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate summary metrics
  const totalCollected = revenueData.filter(d => d.payment_status === 'paid').reduce((sum, d) => sum + d.bill_amount, 0);
  const totalDue = revenueData.filter(d => d.payment_status === 'due').reduce((sum, d) => sum + d.bill_amount, 0);
  const totalBilled = revenueData.reduce((sum, d) => sum + d.bill_amount, 0);
  const averagePerJob = revenueData.length ? totalBilled / revenueData.length : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Revenue Reports</h1>
            <p className="text-gray-600 mt-1">Detailed revenue analysis and billing information</p>
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
              onClick={fetchRevenueData}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            
            <button 
              onClick={() => exportRevenueCSV(revenueData, `revenue-report-${selectedPeriod}.csv`)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <p className="text-sm text-blue-800">
                Loading revenue data... This may take a few moments.
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Collected</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(totalCollected)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg ml-4">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Due</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(totalDue)}
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg ml-4">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Billed</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(totalBilled)}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg ml-4">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Average per Job</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(averagePerJob)}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg ml-4">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Revenue Trend Chart */}
        {!loading && !error && chartData.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => `₹${value}`} />
                <Tooltip 
                  formatter={(value) => [formatCurrency(value as number), 'Revenue']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Bar dataKey="revenue" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Revenue Breakdown Table */}
        {!loading && !error && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Revenue Breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th 
                      className="text-left py-3 px-4 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('date')}
                    >
                      Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Subject Number</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Customer</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Technician</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Service Type</th>
                    <th 
                      className="text-left py-3 px-4 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('amount')}
                    >
                      Bill Amount {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">GST Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Payment Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Payment Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueData.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">{item.date}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{item.subject_number}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{item.customer_name}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{item.technician_name}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{item.service_type}</td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {formatCurrency(item.bill_amount)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">{formatCurrency(item.gst_amount)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(item.payment_status)}`}>
                          {item.payment_status.charAt(0).toUpperCase() + item.payment_status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">{item.payment_mode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, revenueData.length)} of {revenueData.length} results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage}
                </span>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={revenueData.length < pageSize}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
