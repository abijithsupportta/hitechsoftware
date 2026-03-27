import { CouponsDashboard } from '@/components/coupons/CouponsDashboard';
import { ProtectedComponent } from '@/components/ui/ProtectedComponent';

export default function CouponsPage() {
  return (
    <ProtectedComponent permission="billing:view">
      <CouponsDashboard />
    </ProtectedComponent>
  );
}
