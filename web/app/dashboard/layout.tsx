'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Users,
  UserCog,
  ClipboardList,
  Package,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/constants/routes';

interface DashboardLayoutProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { icon: Home, label: 'Dashboard', href: ROUTES.DASHBOARD },
  { icon: Users, label: 'Customers', href: ROUTES.DASHBOARD_CUSTOMERS },
  { icon: UserCog, label: 'Team', href: ROUTES.DASHBOARD_TEAM },
  { icon: ClipboardList, label: 'Subjects', href: ROUTES.DASHBOARD_SUBJECTS },
  { icon: Package, label: 'Inventory', href: ROUTES.DASHBOARD_INVENTORY },
  { icon: DollarSign, label: 'Billing', href: '#' },
  { icon: BarChart3, label: 'Reports', href: '#' },
  { icon: Settings, label: 'Settings', href: '#' },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, isLoading, userRole } = useAuth();

  const handleLogout = async () => {
    const result = await signOut();
    if (result.ok) {
      router.push(ROUTES.LOGIN);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ht-page">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ht-page">
      <header className="sticky top-0 z-40 border-b border-ht-border bg-white/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarExpanded((prev) => !prev)}
              className="rounded-lg border border-ht-border p-2 text-ht-text-700 hover:bg-ht-blue-50"
              aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarExpanded ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div>
              <p className="text-sm font-semibold text-ht-text-900">Hitech Software</p>
              <p className="text-xs text-ht-text-500">Service Management System</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <p className="text-sm font-medium text-ht-text-900">{user.email}</p>
              <p className="text-xs text-ht-text-500 capitalize">{userRole?.replace('_', ' ')}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-ht-border p-2 text-ht-text-700 hover:bg-rose-50 hover:text-rose-700"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className={`min-h-[calc(100vh-4rem)] border-r border-blue-900/40 bg-ht-navy-950 transition-[width] duration-200 ${
            sidebarExpanded ? 'w-72' : 'w-20'
          }`}
        >
          <nav className="space-y-1 p-3">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href !== '#' &&
                (item.href === ROUTES.DASHBOARD
                  ? pathname === ROUTES.DASHBOARD
                  : pathname === item.href || pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  title={!sidebarExpanded ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex rounded-xl border text-sm transition ${
                    sidebarExpanded ? 'items-center gap-3 px-3 py-2.5' : 'justify-center px-0 py-3'
                  } ${
                    isActive
                      ? 'border-white/20 bg-white/15 font-semibold text-white shadow-sm'
                      : 'border-transparent font-medium text-blue-200/70 hover:border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {isActive ? <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-ht-blue-400" /> : null}
                  <item.icon size={18} />
                  {sidebarExpanded ? <span>{item.label}</span> : <span className="sr-only">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
