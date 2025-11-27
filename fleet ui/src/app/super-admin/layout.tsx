// src/app/super-admin/layout.tsx
'use client';

import type { ReactNode } from 'react';
import { DashboardLayout } from '@/components/dashboard/layout';
import { AuthGuard } from '@/lib/auth'; // from the auth provider module we added

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
      <AuthGuard roles={['Super Admin']}>
          <DashboardLayout role="Super Admin">{children}</DashboardLayout>
      </AuthGuard>

  );
}
