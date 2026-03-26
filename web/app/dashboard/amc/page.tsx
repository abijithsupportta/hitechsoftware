'use client';

// ═════════════════════════════════════════════════════════════════════════════
// AMC Dashboard Page
// ──────────────────────────────────────────────────────────────────────────────
// Main dashboard for AMC (Annual Maintenance Contract) management

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  DollarSign,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import Link from 'next/link';

import { useAMCDashboard, useExpiringAMCs } from '@/hooks/amc/useAMC';
import { AMC_STATUS_OPTIONS, getAMCExpiryColor } from '@/modules/amc/amc.constants';
import { ProtectedComponent } from '@/components/ui/ProtectedComponent';

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD CARD COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const DashboardCard: React.FC<DashboardCardProps> = ({ 
  title, 
  value, 
  icon, 
  description, 
  trend 
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {description && (
              <p className="text-xs text-gray-500 mt-1">{description}</p>
            )}
            {trend && (
              <div className="flex items-center mt-2">
                <TrendingUp 
                  className={`h-4 w-4 mr-1 ${
                    trend.isPositive ? 'text-green-500' : 'text-red-500'
                  }`} 
                />
                <span className={`text-sm ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
              </div>
            )}
          </div>
          <div className="p-3 bg-blue-50 rounded-full">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// EXPIRING AMCS COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

const ExpiringAMCs: React.FC = () => {
  const { data: expiringAMCs, isLoading } = useExpiringAMCs(30);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Expiring AMCs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Expiring AMCs (30 days)
          </div>
          <Badge variant="outline">
            {expiringAMCs?.length || 0}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {expiringAMCs && expiringAMCs.length > 0 ? (
          <div className="space-y-3">
            {expiringAMCs.slice(0, 5).map((amc) => {
              const expiryDate = new Date(amc.end_date);
              const daysUntil = Math.ceil(
                (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              );
              const color = getAMCExpiryColor(daysUntil);

              return (
                <div key={amc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{amc.contract_number}</div>
                    <div className="text-xs text-gray-500">
                      {amc.customer_name} • {amc.appliance_brand} {amc.appliance_category_name}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={color === 'red' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {daysUntil} days
                    </Badge>
                    <Link href={`/dashboard/amc/${amc.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
            {expiringAMCs.length > 5 && (
              <div className="text-center pt-2">
                <Link href="/dashboard/amc?expiring_within_days=30">
                  <Button variant="outline" size="sm">
                    View All ({expiringAMCs.length})
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p>No AMCs expiring in the next 30 days</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function AMCDashboardPage() {
  const { data: dashboardData, isLoading } = useAMCDashboard();

  return (
    <ProtectedComponent>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AMC Management</h1>
            <p className="text-gray-600">Annual Maintenance Contract Dashboard</p>
          </div>
          <div className="flex space-x-3">
            <Link href="/dashboard/amc/new">
              <Button>
                Sell New AMC
              </Button>
            </Link>
            <Link href="/dashboard/amc?status=active">
              <Button variant="outline">
                View All AMCs
              </Button>
            </Link>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardCard
            title="Active AMCs"
            value={dashboardData?.total_active_amcs || 0}
            icon={<CheckCircle className="h-6 w-6 text-green-600" />}
            description="Currently active contracts"
          />
          
          <DashboardCard
            title="Expiring Soon"
            value={dashboardData?.expiring_in_30_days || 0}
            icon={<AlertTriangle className="h-6 w-6 text-orange-600" />}
            description="Within 30 days"
          />
          
          <DashboardCard
            title="Expired This Month"
            value={dashboardData?.expired_this_month || 0}
            icon={<XCircle className="h-6 w-6 text-red-600" />}
            description="Contracts expired this month"
          />
          
          <DashboardCard
            title="Revenue This Month"
            value={`₹${(dashboardData?.revenue_this_month || 0).toLocaleString()}`}
            icon={<DollarSign className="h-6 w-6 text-blue-600" />}
            description="AMC sales revenue"
          />
        </div>

        {/* Top Performer */}
        {dashboardData?.top_seller_this_month && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Top Performer This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-lg">{dashboardData.top_seller_this_month}</p>
                  <p className="text-sm text-gray-500">Most AMC sales this month</p>
                </div>
                <div className="p-2 bg-yellow-50 rounded-full">
                  <TrendingUp className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Expiring AMCs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ExpiringAMCs />
          
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Link href="/dashboard/amc/new">
                  <Button className="w-full justify-start" variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    Create New AMC Contract
                  </Button>
                </Link>
                
                <Link href="/dashboard/amc?expiring_within_days=7">
                  <Button className="w-full justify-start" variant="outline">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    View Urgent Renewals
                  </Button>
                </Link>
                
                <Link href="/dashboard/leaderboard">
                  <Button className="w-full justify-start" variant="outline">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Sales Leaderboard
                  </Button>
                </Link>
                
                <Link href="/dashboard/customers">
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Browse Customers
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AMC Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {AMC_STATUS_OPTIONS.map((status) => (
                <div key={status.value} className="text-center p-4 border rounded-lg">
                  <div className={`w-3 h-3 rounded-full mx-auto mb-2 bg-${status.color}-500`} />
                  <p className="font-medium">{status.label}</p>
                  <p className="text-2xl font-bold">
                    {status.value === 'active' ? dashboardData?.total_active_amcs || 0 :
                     status.value === 'expired' ? dashboardData?.expired_this_month || 0 : 0}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedComponent>
  );
}
