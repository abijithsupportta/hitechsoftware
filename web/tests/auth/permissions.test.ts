import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ProtectedComponent } from '@/components/ui/ProtectedComponent';
import { PERMISSIONS, hasPermission } from '@/config/permissions';
import { resetAuthStore } from '@/tests/utils/test-helpers';

describe('Suite 4 Permission system', () => {
  beforeEach(() => {
    resetAuthStore();
  });

  it('Test 4.1 — Super admin can access all permissions', () => {
    for (const permission of Object.keys(PERMISSIONS) as Array<keyof typeof PERMISSIONS>) {
      expect(hasPermission('super_admin', permission)).toBe(true);
    }
  });

  it('Test 4.2 — Technician cannot access admin permissions', () => {
    expect(hasPermission('technician', 'customer:delete')).toBe(false);
    expect(hasPermission('technician', 'subject:delete')).toBe(false);
    expect(hasPermission('technician', 'payout:view')).toBe(false);
    expect(hasPermission('technician', 'settings:edit')).toBe(false);
  });

  it('Test 4.3 — Office staff cannot access restricted permissions', () => {
    expect(hasPermission('office_staff', 'payout:edit')).toBe(false);
    expect(hasPermission('office_staff', 'settings:edit')).toBe(false);
    expect(hasPermission('office_staff', 'technician:delete')).toBe(false);
  });

  it('Test 4.4 — Stock manager limited to inventory permissions', () => {
    expect(hasPermission('stock_manager', 'inventory:view')).toBe(true);
    expect(hasPermission('stock_manager', 'stock:view')).toBe(true);
    expect(hasPermission('stock_manager', 'customer:delete')).toBe(false);
    expect(hasPermission('stock_manager', 'billing:create')).toBe(false);
  });

  it('Test 4.5 — ProtectedComponent renders children when permission granted', () => {
    resetAuthStore({ role: 'office_staff', isHydrated: true });

    render(
      React.createElement(
        ProtectedComponent,
        { permission: 'customer:view' },
        React.createElement('span', null, 'Allowed child'),
      ),
    );

    expect(screen.getByText('Allowed child')).toBeInTheDocument();
  });

  it('Test 4.6 — ProtectedComponent renders fallback when permission denied', () => {
    resetAuthStore({ role: 'office_staff', isHydrated: true });

    render(
      React.createElement(
        ProtectedComponent,
        {
          permission: 'customer:delete',
          fallback: React.createElement('span', null, 'Fallback content'),
        },
        React.createElement('span', null, 'Denied child'),
      ),
    );

    expect(screen.queryByText('Denied child')).not.toBeInTheDocument();
    expect(screen.getByText('Fallback content')).toBeInTheDocument();
  });

  it('Test 4.7 — ProtectedComponent renders nothing when no fallback and permission denied', () => {
    resetAuthStore({ role: 'office_staff', isHydrated: true });

    const { container } = render(
      React.createElement(
        ProtectedComponent,
        { permission: 'customer:delete' },
        React.createElement('span', null, 'Denied child'),
      ),
    );

    expect(screen.queryByText('Denied child')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });
});