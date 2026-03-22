'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Tags, Package, ClipboardList } from 'lucide-react';
import { ROUTES } from '@/lib/constants/routes';

interface InventoryLayoutProps {
  children: ReactNode;
}

const INVENTORY_NAV = [
  { label: 'Products', href: ROUTES.DASHBOARD_INVENTORY_PRODUCTS, icon: Package },
  { label: 'Categories', href: ROUTES.DASHBOARD_INVENTORY_CATEGORIES, icon: LayoutGrid },
  { label: 'Product Types', href: ROUTES.DASHBOARD_INVENTORY_PRODUCT_TYPES, icon: Tags },
  { label: 'Stock Entries', href: ROUTES.DASHBOARD_INVENTORY_STOCK, icon: ClipboardList },
];

export default function InventoryLayout({ children }: InventoryLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      {/* Sub-navigation */}
      <div className="border-b border-slate-200 bg-white px-6">
        <nav className="flex gap-1 overflow-x-auto" aria-label="Inventory sections">
          {INVENTORY_NAV.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Page content */}
      <div className="flex-1 bg-ht-page">{children}</div>
    </div>
  );
}
