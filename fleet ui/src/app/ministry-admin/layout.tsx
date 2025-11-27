import { DashboardLayout } from '@/components/dashboard/layout';

export default function MinistryAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout role="Ministry Admin">{children}</DashboardLayout>;
}
