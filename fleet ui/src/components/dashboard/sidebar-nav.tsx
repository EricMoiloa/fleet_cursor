'use client';

import {
  Users,
  Building,
  Car,
  ClipboardList,
  Settings,
  LayoutDashboard,
  Building2,
  Route as TripIcon,
  Fuel,
  ShieldCheck,
  Wrench,
  DollarSign,
} from 'lucide-react';
import type { UserRole } from '@/lib/types';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

// Reuse the Worker items for Staff too
const workerItems: NavItem[] = [
  { href: '/worker/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/worker/vehicles', label: 'Vehicles', icon: Car },
];

type AnyRole = UserRole | 'Staff'; // <— allow Staff

const navConfig: Record<AnyRole, NavItem[]> = {
  'Ministry Admin': [
    { href: '/ministry-admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/ministry-admin/departments', label: 'Departments', icon: Building2 },
    { href: '/ministry-admin/vehicles', label: 'Vehicles', icon: Car },
    { href: '/ministry-admin/users', label: 'Users', icon: Users },
  ],
  'Fleet Manager': [
    { href: '/fleet-manager/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/fleet-manager/requests', label: 'Requests', icon: ClipboardList },
    { href: '/fleet-manager/trips', label: 'Trips', icon: TripIcon },
    { href: '/fleet-manager/vehicles', label: 'Vehicles', icon: Car },
    { href: '/fleet-manager/trip-logs', label: 'Trip Logs', icon: Fuel },
    { href: '/fleet-manager/maintenance', label: 'Maintenance', icon: Wrench },
    { href: '/fleet-manager/finance', label: 'Finance', icon: DollarSign },
  ],
  'Supervisor': [
    { href: '/supervisor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/supervisor/requests', label: 'Approve Requests', icon: ShieldCheck },
  ],
  'Worker': workerItems,
        
  // in SidebarNav navConfig
'Staff': [
  { href: '/worker/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/worker/vehicles', label: 'Vehicles', icon: Car },
],

  'Driver': [
    { href: '/driver/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/driver/trips', label: 'My Trips', icon: TripIcon },
    { href: '/driver/trip-log', label: 'Trip Log', icon: Fuel },
  ],
};

export function SidebarNav({ role }: { role: AnyRole }) {
  const pathname = usePathname();
  const items = navConfig[role] || [];

  return (
    <SidebarMenu>
      {items.map(item => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} passHref>
            <SidebarMenuButton
              asChild
              className="h-10 justify-start"
              isActive={pathname.startsWith(item.href)}
              tooltip={{ children: item.label, side: 'right' }}
            >
              <div>
                <item.icon className="h-5 w-5 text-sidebar-primary" />
                <span className="text-sidebar-foreground group-data-[active=true]:text-sidebar-accent-foreground">
                  {item.label}
                </span>
              </div>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
