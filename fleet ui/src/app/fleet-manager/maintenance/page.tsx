'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ClientFormattedDate } from '@/components/client-formatted-date';
import { apiGet } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Bell, ShieldCheck } from 'lucide-react';

interface VehicleMeta {
  id: string;
  make?: string;
  model?: string;
  plate_number?: string;
  odometer?: number | null;
  next_service_odometer?: number | null;
  insurance_expires_at?: string | null;
  contract_end_date?: string | null;
  status?: string | null;
}

interface FleetAlerts {
  maintenance_due?: any[];
  contracts_expiring?: any[];
}

function isExpiringSoon(date?: string | null, days = 30) {
  if (!date) return false;
  const target = new Date(date).getTime();
  const now = Date.now();
  const diffDays = (target - now) / (1000 * 60 * 60 * 24);
  return diffDays <= days;
}

export default function MaintenancePage() {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<VehicleMeta[]>([]);
  const [alerts, setAlerts] = useState<FleetAlerts>({ maintenance_due: [], contracts_expiring: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [vehRes, alertRes] = await Promise.all([apiGet<any>('/vehicles'), apiGet<any>('/fleet/alerts')]);
        const vehList: VehicleMeta[] = (vehRes?.data ?? vehRes ?? []).map((v: any) => ({
          id: String(v.id),
          make: v.make ?? '',
          model: v.model ?? '',
          plate_number: v.plate_number ?? '',
          odometer: v.odometer ?? null,
          next_service_odometer: v.next_service_odometer ?? null,
          insurance_expires_at: v.insurance_expires_at ?? null,
          contract_end_date: v.contract_end_date ?? null,
          status: v.status ?? null,
        }));
        if (mounted) setVehicles(vehList);

        if (mounted)
          setAlerts({
            maintenance_due: alertRes?.maintenance_due ?? [],
            contracts_expiring: alertRes?.contracts_expiring ?? [],
          });
      } catch (e: any) {
        toast({ variant: 'destructive', title: 'Failed to load maintenance data', description: e?.message || 'Server error' });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [toast]);

  const maintenanceDue = alerts.maintenance_due ?? [];

  const upcomingServices = useMemo(() => {
    return vehicles.filter((v) => {
      if (!v.next_service_odometer || v.odometer == null) return false;
      if ((maintenanceDue || []).find((m: any) => String(m.id) === v.id)) return false;
      const diff = v.next_service_odometer - v.odometer;
      return diff <= 1000 && diff >= 0;
    });
  }, [maintenanceDue, vehicles]);

  const expiringInsurance = useMemo(() => vehicles.filter((v) => isExpiringSoon(v.insurance_expires_at)), [vehicles]);
  const expiringContracts = alerts.contracts_expiring ?? [];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Maintenance & Compliance</h1>
        <p className="text-muted-foreground">Track overdue services, upcoming maintenance, and contract/insurance expirations.</p>
      </div>

      {maintenanceDue.length > 0 && (
        <Alert variant="destructive" className="border-amber-500 bg-amber-50 text-amber-900">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Maintenance required</AlertTitle>
          <AlertDescription>
            {maintenanceDue.length} vehicle{maintenanceDue.length === 1 ? ' is' : 's are'} past their service threshold.
          </AlertDescription>
        </Alert>
      )}

      {expiringContracts.length > 0 && (
        <Alert className="border-red-500/60 bg-red-50 text-red-800">
          <Bell className="h-4 w-4" />
          <AlertTitle>Contracts expiring soon</AlertTitle>
          <AlertDescription>
            Review upcoming contract renewals to avoid vehicle downtime.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Overdue Services</CardTitle>
          <CardDescription>Vehicles that have exceeded their next service odometer.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Odometer</TableHead>
                <TableHead>Next Service</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {maintenanceDue.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.make} {item.model}
                    {item.plate_number ? <span className="text-muted-foreground"> · {item.plate_number}</span> : null}
                  </TableCell>
                  <TableCell>{item.odometer?.toLocaleString?.() ?? '—'} km</TableCell>
                  <TableCell>{item.next_service_odometer?.toLocaleString?.() ?? '—'} km</TableCell>
                  <TableCell>
                    <Badge variant="destructive">Due now</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {!maintenanceDue.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    {loading ? 'Loading…' : 'No overdue services.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Services</CardTitle>
          <CardDescription>Vehicles within 1,000 km of their next service.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Odometer</TableHead>
                <TableHead>Next Service</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingServices.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.make} {item.model}
                    {item.plate_number ? <span className="text-muted-foreground"> · {item.plate_number}</span> : null}
                  </TableCell>
                  <TableCell>{item.odometer?.toLocaleString?.() ?? '—'} km</TableCell>
                  <TableCell>{item.next_service_odometer?.toLocaleString?.() ?? '—'} km</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-amber-500 text-amber-600">
                      Due soon
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {!upcomingServices.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    {loading ? 'Loading…' : 'No upcoming services within 1,000 km.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Insurance & Contracts</CardTitle>
          <CardDescription>Monitor expiring insurance and hired vehicle contracts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Insurance expiring</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiringInsurance.map((v) => (
                  <TableRow key={`ins-${v.id}`}>
                    <TableCell className="font-medium">
                      {v.make} {v.model}
                      {v.plate_number ? <span className="text-muted-foreground"> · {v.plate_number}</span> : null}
                    </TableCell>
                    <TableCell>
                      {v.insurance_expires_at ? <ClientFormattedDate date={v.insurance_expires_at} /> : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">Renew soon</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {!expiringInsurance.length && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      {loading ? 'Loading…' : 'No insurance expirations within 30 days.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Contracts expiring</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Contract End</TableHead>
                  <TableHead>Mileage Limit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiringContracts.map((v: any) => (
                  <TableRow key={`ctr-${v.id}`}>
                    <TableCell className="font-medium">
                      {v.make} {v.model}
                      {v.plate_number ? <span className="text-muted-foreground"> · {v.plate_number}</span> : null}
                    </TableCell>
                    <TableCell>{v.contract_end_date ? <ClientFormattedDate date={v.contract_end_date} /> : '—'}</TableCell>
                    <TableCell>{v.monthly_mileage_limit ? `${v.month_to_date_mileage ?? 0}/${v.monthly_mileage_limit} km` : '—'}</TableCell>
                  </TableRow>
                ))}
                {!expiringContracts.length && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      {loading ? 'Loading…' : 'No contracts expiring within 30 days.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
