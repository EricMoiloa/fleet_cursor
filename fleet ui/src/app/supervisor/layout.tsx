import { DashboardLayout } from '@/components/dashboard/layout';

export default function SupervisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout role="Supervisor">{children}</DashboardLayout>;
}
