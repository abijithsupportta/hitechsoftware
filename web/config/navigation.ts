export interface NavItem {
  label: string;
  href: string;
  permission: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', permission: 'customers:read' },
  { label: 'Customers', href: '/dashboard/customers', permission: 'customers:read' },
  { label: 'Subjects', href: '/dashboard/subjects', permission: 'subjects:read' },
  { label: 'AMC Management', href: '/dashboard/amc', permission: 'subjects:read' },
  { label: 'Inventory', href: '/dashboard/inventory', permission: 'inventory:read' },
  { label: 'Billing', href: '/dashboard/billing', permission: 'billing:read' },
  { label: 'Due Payments', href: '/dashboard/due-payments', permission: 'billing:view' },
  { label: 'Coupons', href: '/dashboard/coupons', permission: 'billing:view' },
];
