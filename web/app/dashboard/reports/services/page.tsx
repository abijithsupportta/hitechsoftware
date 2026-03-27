'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  Calendar, 
  Download, 
  RefreshCw, 
  Loader2, 
  AlertCircle,
  Wrench,
  Filter,
  TrendingUp,
  Clock,
  Users,
  DollarSign
} from 'lucide-react';
import { exportServiceCSV } from '@/lib/utils/csv-export';
import { createClient } from '@/lib/supabase/client';

type Period = 'week' | 'month' | 'year';

interface ServiceData {
  subject_number: string;
  customer_name: string;
  category: string;
  technician_name: string;
  status: string;
  created_date: string;
  completed_date?: string;
  duration_hours: number;
  bill_amount: number;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function ServiceReportPage() {
  const searchParams = useSearchParams();
  const urlPeriod = (searchParams.get('period') as Period) || 'month';
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(urlPeriod);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [serviceData, setServiceData] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Update URL when period changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set('period', selectedPeriod);
    window.history.replaceState(null, '', `/dashboard/reports/services?${params.toString()}`);
  }, [selectedPeriod, searchParams]);

  // Fetch service data
  useEffect(() => {
    fetchServiceData();
  }, [selectedPeriod, statusFilter, categoryFilter]);

  const fetchServiceData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get date range for selected period
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      switch (selectedPeriod) {
        case 'week':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 7);
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

      // Build query
      let query = supabase
        .from('subjects')
        .select(`
          subject_number,
          status,
          category,
          created_at,
          completed_at,
          allocated_date,
          grand_total,
          customer_id,
          assigned_technician_id
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Apply filters
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Get related data
      const customerIds = data?.map(s => s.customer_id).filter(Boolean) || [];
      const technicianIds = data?.map(s => s.assigned_technician_id).filter(Boolean) || [];

      const [customers, technicians] = await Promise.all([
        customerIds.length > 0 
          ? supabase.from('customers').select('id, name').in('id', customerIds)
          : Promise.resolve({ data: [], error: null }),
        technicianIds.length > 0
          ? supabase.from('profiles').select('id, display_name').in('id', technicianIds)
          : Promise.resolve({ data: [], error: null })
      ]);

      const formattedData: ServiceData[] = data?.map(subject => {
        const customer = customers.data?.find(c => c.id === subject.customer_id);
        const technician = technicians.data?.find(t => t.id === subject.assigned_technician_id);
        
        const duration = subject.completed_at && subject.allocated_date
          ? (new Date(subject.completed_at).getTime() - new Date(subject.allocated_date).getTime()) / (1000 * 60 * 60)
          : 0;

        return {
          subject_number: subject.subject_number,
          customer_name: customer?.name || 'Unknown',
          category: subject.category || 'Unknown',
          technician_name: technician?.display_name || 'Unassigned',
          status: subject.status,
          created_date: new Date(subject.created_at).toLocaleDateString(),
          completed_date: subject.completed_at ? new Date(subject.completed_at).toLocaleDateString() : undefined,
          duration_hours: duration,
          bill_amount: subject.grand_total || 0
        };
      }) || [];

      setServiceData(formattedData);
    } catch (err) {
      console.error('Error fetching service data:', err);
      setError('Failed to load service data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in_progress': return '#3b82f6';
      case 'allocated': return '#f59e0b';
      case 'accepted': return '#8b5cf6';
      case 'arrived': return '#06b6d4';
      case 'pending': return '#6b7280';
      case 'incomplete': return '#ef4444';
      default: return '#6b7280';
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

  // Prepare chart data
  const statusBreakdown = serviceData.reduce((acc, service) => {
    const existing = acc.find(item => item.status === service.status);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({
        status: service.status.charAt(0).toUpperCase() + service.status.slice(1),
        count: 1,
        color: getStatusColor(service.status)
      });
    }
    return acc;
  }, [] as { status: string; count: number; color: string }[]);

  const categoryBreakdown = serviceData.reduce((acc, service) => {
    const existing = acc.find(item => item.category === service.category);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({
        category: service.category,
        count: 1
      });
    }
    return acc;
  }, [] as { category: string; count: number }[]).slice(0, 8); // Top 8 categories

  // Get unique categories for filter
  const categories = [...new Set(serviceData.map(s => s.category))].sort();

  const handleExport = () => {
    const exportData = serviceData.map(service => ({
      'Subject Number': service.subject_number,
      'Customer': service.customer_name,
      'Category': service.category,
      'Technician': service.technician_name,
      'Status': service.status,
      'Created Date': service.created_date,
      'Completed Date': service.completed_date || '',
      'Duration Hours': service.duration_hours.toFixed(2),
      'Bill Amount': service.bill_amount
    }));
    
    exportServiceCSV(exportData, `service-report-${selectedPeriod}.csv`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Service Reports</h1>
            <p className="text-gray-600 mt-1">Service operations and completion metrics</p>
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
              onClick={fetchServiceData}
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
              onClick={handleExport}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="allocated">Allocated</option>
              <option value="accepted">Accepted</option>
              <option value="arrived">Arrived</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="incomplete">Incomplete</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <p className="text-sm text-blue-800">
                Loading service data... This may take a few moments.
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

        {/* Charts */}
        {!loading && !error && serviceData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Breakdown */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6">
                    {statusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Service Categories Pie */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Categories</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percent }: { category: string; percent: number }) => `${category} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Services Table */}
        {!loading && !error && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Services</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Subject Number</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Customer</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Category</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Technician</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Created Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Completed Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Duration Hours</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Bill Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceData.map((service, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">{service.subject_number}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{service.customer_name}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{service.category}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{service.technician_name}</td>
                      <td className="py-3 px-4">
                        <span 
                          className="px-2 py-1 text-xs font-medium rounded-full text-white"
                          style={{ backgroundColor: getStatusColor(service.status) }}
                        >
                          {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">{service.created_date}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{service.completed_date || '-'}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{service.duration_hours.toFixed(2)}</td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {formatCurrency(service.bill_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
