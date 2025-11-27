// src/app/ministry-admin/dashboard/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { AuthGuard } from '@/lib/auth';
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Car, Bell, Route, UserCheck, Wrench, CheckCircle2 } from "lucide-react";
import { apiGet } from '@/lib/apiClient';

type ApiVehicle = {
  id: number;
  plate_number: string;
  make?: string | null;
  model?: string | null;
  status?: 'available' | 'assigned' | 'in_maintenance' | 'inactive';
  odometer?: number | null;
  service_due_at?: string | null;
};

function PageInner() {
  const [vehicles, setVehicles] = useState<ApiVehicle[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await apiGet<ApiVehicle[] | { data: ApiVehicle[] }>('/vehicles');
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        setVehicles(list);
      } catch {
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const kpis = useMemo(() => {
    const total = vehicles.length;
    const byStatus = vehicles.reduce<Record<string, number>>((acc, v) => {
      const s = v.status ?? 'available';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    return {
      total,
      available: byStatus['available'] || 0,
      pendingRequests: 0,
      tripsToday: 0,
      driversOnDuty: 0,
    };
  }, [vehicles]);

  const topFive = vehicles.slice(0, 5);

  const renderStatusBadge = (status?: ApiVehicle['status']) => {
    const value =
      status === 'in_maintenance' ? 'Maintenance'
      : status === 'inactive' ? 'Inactive'
      : status === 'assigned' ? 'Assigned'
      : 'Available';

    const isAvailable = value === 'Available';
    const isMaint = value === 'Maintenance';

    return (
      <Badge
        variant={isAvailable ? 'default' : isMaint ? 'destructive' : 'secondary'}
        className={isAvailable ? 'bg-accent text-accent-foreground' : ''}
      >
        {isAvailable && <CheckCircle2 className="mr-1 h-3 w-3" />}
        {isMaint && <Wrench className="mr-1 h-3 w-3" />}
        {value}
      </Badge>
    );
  };

  const serviceDate = (v: ApiVehicle) => {
    const raw = v.service_due_at ?? null;
    const d = raw ? new Date(raw) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    return d.toLocaleDateString();
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold font-headline">Ministry Admin Dashboard</h1>
        <p className="text-muted-foreground">Configure ministry resources and ensure readiness.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Vehicles by Status" value={String(kpis.total)} icon={Car} change={`${kpis.available} Available`} />
        <KpiCard title="Pending Requests" value={String(kpis.pendingRequests)} icon={Bell} />
        <KpiCard title="Trips Today" value={String(kpis.tripsToday)} icon={Route} />
        <KpiCard title="Drivers on Duty" value={String(kpis.driversOnDuty)} icon={UserCheck} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vehicle Fleet Overview</CardTitle>
          <CardDescription>A summary of all vehicles in your ministry's fleet.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>License Plate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Service Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topFive.map(vehicle => (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-medium">
                    {(vehicle.make ?? '')} {(vehicle.model ?? '')}
                  </TableCell>
                  <TableCell>{vehicle.plate_number}</TableCell>
                  <TableCell>{renderStatusBadge(vehicle.status)}</TableCell>
                  <TableCell>{serviceDate(vehicle)}</TableCell>
                </TableRow>
              ))}
              {!loading && topFive.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No vehicles found for your ministry.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// protect the route
export default function MinistryAdminDashboard() {
  return (
    <AuthGuard roles={['Ministry Admin']}>
      <PageInner />
    </AuthGuard>
  );
}
