'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Calendar, 
  Download, 
  RefreshCw, 
  Loader2, 
  AlertCircle,
  Trophy,
  Medal,
  Award,
  Users,
  Wrench,
  DollarSign,
  TrendingUp,
  Eye
} from 'lucide-react';
import { exportTechnicianCSV } from '@/lib/utils/csv-export';
import { createClient } from '@/lib/supabase/client';

type Period = 'week' | 'month' | 'year';

interface TechnicianLeaderboard {
  rank: number;
  technician_id: string;
  technician_name: string;
  total_services: number;
  total_revenue: number;
  parts_revenue: number;
  extra_price_collected: number;
  amc_sold: number;
  total_earnings: number;
  attendance_days: number;
}

interface TechnicianDetail {
  date: string;
  subject_number: string;
  customer_name: string;
  service_type: string;
  bill_amount: number;
  earnings: number;
  completion_time: number;
}

export default function TechnicianReportPage() {
  const searchParams = useSearchParams();
  const urlPeriod = (searchParams.get('period') as Period) || 'month';
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(urlPeriod);
  const [selectedTechnician, setSelectedTechnician] = useState<string | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<TechnicianLeaderboard[]>([]);
  const [technicianDetails, setTechnicianDetails] = useState<TechnicianDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const supabase = createClient();

  // Update URL when period changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set('period', selectedPeriod);
    window.history.replaceState(null, '', `/dashboard/reports/technicians?${params.toString()}`);
  }, [selectedPeriod, searchParams]);

  // Fetch leaderboard data
  useEffect(() => {
    fetchLeaderboardData();
  }, [selectedPeriod, sortBy, sortOrder]);

  const fetchLeaderboardData = async () => {
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

      // Fetch from technician_leaderboard materialized view
      const { data, error } = await supabase
        .from('technician_leaderboard')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order(sortBy, { ascending: sortOrder === 'asc' });

      if (error) throw error;

      // Format data and add rank
      const formattedData: TechnicianLeaderboard[] = data?.map((tech, index) => ({
        rank: index + 1,
        technician_id: tech.technician_id,
        technician_name: tech.technician_name,
        total_services: tech.total_services || 0,
        total_revenue: tech.total_revenue || 0,
        parts_revenue: tech.parts_revenue || 0,
        extra_price_collected: tech.extra_price_collected || 0,
        amc_sold: 0, // Would need to join with AMC data
        total_earnings: tech.total_earnings || 0,
        attendance_days: 0 // Would need to join with attendance data
      })) || [];

      setLeaderboardData(formattedData);
    } catch (err) {
      console.error('Error fetching leaderboard data:', err);
      setError('Failed to load technician data');
    } finally {
      setLoading(false);
    }
  };

  const handleTechnicianClick = async (technicianId: string) => {
    setSelectedTechnician(technicianId);
    setDetailsLoading(true);
    
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

      // Fetch technician's detailed performance
      const { data, error } = await supabase
        .from('subjects')
        .select(`
          subject_number,
          completed_at,
          allocated_date,
          category,
          grand_total,
          customers!inner(name),
          technician_earnings_summary!inner(net_earnings)
        `)
        .eq('assigned_technician_id', technicianId)
        .eq('status', 'completed')
        .gte('completed_at', startDate.toISOString())
        .lte('completed_at', endDate.toISOString())
        .order('completed_at', { ascending: false });

      if (error) throw error;

      const formattedDetails: TechnicianDetail[] = data?.map(subject => ({
        date: new Date(subject.completed_at).toLocaleDateString(),
        subject_number: subject.subject_number,
        customer_name: subject.customers?.[0]?.name || 'Unknown',
        service_type: subject.category || 'Unknown',
        bill_amount: subject.grand_total || 0,
        earnings: (subject.technician_earnings_summary as any)?.[0]?.net_earnings || 0,
        completion_time: subject.allocated_date && subject.completed_at 
          ? (new Date(subject.completed_at).getTime() - new Date(subject.allocated_date).getTime()) / (1000 * 60 * 60)
          : 0
      })) || [];

      setTechnicianDetails(formattedDetails);
    } catch (err) {
      console.error('Error fetching technician details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
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

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="text-sm font-medium text-gray-600">#{rank}</span>;
  };

  const handleExport = () => {
    const exportData = leaderboardData.map(tech => ({
      Rank: tech.rank,
      'Technician Name': tech.technician_name,
      'Jobs Done': tech.total_services,
      'Revenue Generated': tech.total_revenue,
      'Parts Sold': tech.parts_revenue,
      'Extra Collected': tech.extra_price_collected,
      'AMC Sold': tech.amc_sold,
      'Commission Earned': tech.total_earnings,
      'Attendance Days': tech.attendance_days
    }));
    
    exportTechnicianCSV(exportData, `technician-report-${selectedPeriod}.csv`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Technician Reports</h1>
            <p className="text-gray-600 mt-1">Technician performance and earnings analysis</p>
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
              onClick={fetchLeaderboardData}
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

        {/* Loading State */}
        {loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <p className="text-sm text-blue-800">
                Loading technician data... This may take a few moments.
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

        {/* Leaderboard Table */}
        {!loading && !error && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Technician Leaderboard</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Rank</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Technician Name</th>
                    <th 
                      className="text-left py-3 px-4 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('total_services')}
                    >
                      Jobs Done {sortBy === 'total_services' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="text-left py-3 px-4 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('total_revenue')}
                    >
                      Revenue Generated {sortBy === 'total_revenue' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Parts Sold</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Extra Collected</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">AMC Sold</th>
                    <th 
                      className="text-left py-3 px-4 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('total_earnings')}
                    >
                      Commission Earned {sortBy === 'total_earnings' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Attendance Days</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData.map((technician) => (
                    <tr key={technician.technician_id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getRankIcon(technician.rank)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="font-medium text-gray-900">{technician.technician_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">{technician.total_services}</td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {formatCurrency(technician.total_revenue)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">{formatCurrency(technician.parts_revenue)}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{formatCurrency(technician.extra_price_collected)}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{technician.amc_sold}</td>
                      <td className="py-3 px-4 text-sm font-medium text-green-600">
                        {formatCurrency(technician.total_earnings)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">{technician.attendance_days}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleTechnicianClick(technician.technician_id)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Technician Detail Modal */}
        {selectedTechnician && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Technician Details - {leaderboardData.find(t => t.technician_id === selectedTechnician)?.technician_name}
                  </h3>
                  <button
                    onClick={() => setSelectedTechnician(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {detailsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {technicianDetails.map((detail, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Date</p>
                            <p className="font-medium text-gray-900">{detail.date}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Subject</p>
                            <p className="font-medium text-gray-900">{detail.subject_number}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Customer</p>
                            <p className="font-medium text-gray-900">{detail.customer_name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Service Type</p>
                            <p className="font-medium text-gray-900">{detail.service_type}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Bill Amount</p>
                            <p className="font-medium text-gray-900">{formatCurrency(detail.bill_amount)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Earnings</p>
                            <p className="font-medium text-green-600">{formatCurrency(detail.earnings)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
