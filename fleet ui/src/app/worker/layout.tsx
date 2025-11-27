import { DashboardLayout } from '@/components/dashboard/layout';

export default function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout role="Worker">{children}</DashboardLayout>;
}
