import { DashboardLayout } from '@/components/dashboard/layout';

export default function FleetManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout role="Fleet Manager">{children}</DashboardLayout>;
}
