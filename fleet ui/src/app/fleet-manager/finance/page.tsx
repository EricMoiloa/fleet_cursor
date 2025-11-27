'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ClientFormattedDate } from '@/components/client-formatted-date';
import { apiGet } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { isFulfilled, unpackArrayOrData } from '@/lib/utils';

interface VehicleMeta {
  id: string;
  make?: string;
  model?: string;
  plate_number?: string;
  insurance_expires_at?: string | null;
  contract_end_date?: string | null;
}

interface InvoiceRow {
  id: string;
  vehicleId: string;
  vehicleLabel: string;
  type?: string | null;
  amount?: number | null;
  currency?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
}

interface FleetAlerts {
  maintenance_due?: any[];
  contracts_expiring?: any[];
}

function isOverdue(date?: string | null) {
  if (!date) return false;
  return new Date(date).getTime() < Date.now();
}

function isExpiringSoon(date?: string | null, days = 30) {
  if (!date) return false;
  const diffDays = (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return diffDays <= days;
}

export default function FinancePage() {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<VehicleMeta[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [alerts, setAlerts] = useState<FleetAlerts>({ maintenance_due: [], contracts_expiring: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const vehiclesRes = await apiGet<any>('/vehicles');
        const vehicleList: VehicleMeta[] = (vehiclesRes?.data ?? vehiclesRes ?? []).map((v: any) => ({
          id: String(v.id),
          make: v.make ?? '',
          model: v.model ?? '',
          plate_number: v.plate_number ?? '',
          insurance_expires_at: v.insurance_expires_at ?? null,
          contract_end_date: v.contract_end_date ?? null,
        }));
        if (mounted) setVehicles(vehicleList);

        const invoiceResults = await Promise.allSettled(
          vehicleList.map((v) => apiGet<any>(`/vehicles/${v.id}/invoices`))
        );

        if (mounted) {
          const flattened: InvoiceRow[] = invoiceResults.flatMap((res, idx) => {
            if (!isFulfilled(res)) return [];
            const vehicle = vehicleList[idx];
            const rows = unpackArrayOrData<any>(res.value);
            return rows.map((inv: any) => ({
              id: String(inv.id ?? `${vehicle.id}-${idx}`),
              vehicleId: vehicle.id,
              vehicleLabel: `${vehicle.make ?? ''} ${vehicle.model ?? ''}${vehicle.plate_number ? ` · ${vehicle.plate_number}` : ''}`.trim(),
              type: inv.type ?? null,
              amount: inv.amount ?? null,
              currency: inv.currency ?? 'USD',
              invoice_date: inv.invoice_date ?? null,
              due_date: inv.due_date ?? null,
            }));
          });
          setInvoices(flattened);
        }

        const alertsRes = await apiGet<any>('/fleet/alerts');
        if (mounted) {
          setAlerts({
            maintenance_due: alertsRes?.maintenance_due ?? [],
            contracts_expiring: alertsRes?.contracts_expiring ?? [],
          });
        }
      } catch (e: any) {
        toast({ variant: 'destructive', title: 'Failed to load finance data', description: e?.message || 'Server error' });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [toast]);

  const overdueInvoices = invoices.filter((i) => isOverdue(i.due_date));
  const expiringInsurance = vehicles.filter((v) => isExpiringSoon(v.insurance_expires_at));
  const expiringContracts = alerts.contracts_expiring ?? [];

  const totalOutstanding = useMemo(
    () => invoices.reduce((sum, inv) => sum + (isOverdue(inv.due_date) && inv.amount ? Number(inv.amount) : 0), 0),
    [invoices]
  );

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Finance & Compliance</h1>
        <p className="text-muted-foreground">Track vehicle invoices, payment deadlines, and expiring contracts or insurance.</p>
      </div>

      {overdueInvoices.length > 0 && (
        <Alert variant="destructive" className="border-red-500/60 bg-red-50 text-red-800">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Overdue invoices</AlertTitle>
          <AlertDescription>
            {overdueInvoices.length} invoice{overdueInvoices.length === 1 ? '' : 's'} require attention. Total due: {totalOutstanding.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
          </AlertDescription>
        </Alert>
      )}

      {expiringContracts.length > 0 && (
        <Alert className="border-amber-500 bg-amber-50 text-amber-900">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Contracts & insurance expiring</AlertTitle>
          <AlertDescription>
            Review upcoming renewals to avoid service interruptions.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
          <CardDescription>Billing for rentals, maintenance, repairs, and parts.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Invoice Date</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.vehicleLabel || 'Vehicle'}</TableCell>
                  <TableCell className="capitalize">{inv.type || '—'}</TableCell>
                  <TableCell>
                    {inv.amount != null ? (
                      <span>
                        {(inv.currency || 'USD').toUpperCase()} {Number(inv.amount).toLocaleString()}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>{inv.invoice_date ? <ClientFormattedDate date={inv.invoice_date} /> : '—'}</TableCell>
                  <TableCell>{inv.due_date ? <ClientFormattedDate date={inv.due_date} /> : '—'}</TableCell>
                  <TableCell className="text-right">
                    {isOverdue(inv.due_date) ? (
                      <Badge variant="destructive">Overdue</Badge>
                    ) : inv.due_date ? (
                      <Badge variant="outline">Due soon</Badge>
                    ) : (
                      <Badge variant="secondary">Logged</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!invoices.length && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    {loading ? 'Loading…' : 'No invoices recorded for your fleet.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expiring Coverage</CardTitle>
          <CardDescription>Insurance and contracts approaching their end date.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Insurance Expiry</TableHead>
                <TableHead>Contract End</TableHead>
                <TableHead className="text-right">Alerts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(expiringInsurance.length || expiringContracts.length)
                ? vehicles
                    .filter((v) => isExpiringSoon(v.insurance_expires_at) || expiringContracts.find((c: any) => String(c.id) === v.id))
                    .map((v) => {
                      const contract = expiringContracts.find((c: any) => String(c.id) === v.id);
                      return (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">
                            {v.make} {v.model}
                            {v.plate_number ? <span className="text-muted-foreground"> · {v.plate_number}</span> : null}
                          </TableCell>
                          <TableCell>{v.insurance_expires_at ? <ClientFormattedDate date={v.insurance_expires_at} /> : '—'}</TableCell>
                          <TableCell>{contract?.contract_end_date ? <ClientFormattedDate date={contract.contract_end_date} /> : '—'}</TableCell>
                          <TableCell className="text-right space-x-2">
                            {isExpiringSoon(v.insurance_expires_at) && <Badge variant="destructive">Insurance</Badge>}
                            {contract && <Badge variant="outline" className="border-amber-500 text-amber-700">Contract</Badge>}
                          </TableCell>
                        </TableRow>
                      );
                    })
                : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      {loading ? 'Loading…' : 'No expiring coverage within 30 days.'}
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
