import DuePaymentsDashboard from '@/components/payment-tracking/DuePaymentsDashboard';
import { ProtectedComponent } from '@/components/ui/ProtectedComponent';

// ============================================================================
// DUE PAYMENTS DASHBOARD PAGE
// ============================================================================

export default function DuePaymentsPage() {
  return (
    <ProtectedComponent permission="billing:view">
      <DuePaymentsDashboard />
    </ProtectedComponent>
  );
}

// ============================================================================
// PAGE METADATA
// ============================================================================

export const metadata = {
  title: 'Due Payments - Hi Tech Software',
  description: 'Track and collect payments from customers',
};
