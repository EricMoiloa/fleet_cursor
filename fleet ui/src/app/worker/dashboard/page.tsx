'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Clock, CheckCircle, XCircle, Hourglass, BookMarked } from 'lucide-react';

import { RequestVehicleModal } from '@/components/worker/request-vehicle-modal';
import { ClientFormattedDate } from '@/components/client-formatted-date';
import { apiGet, apiPost } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import type { RequestVehicleForm, RequestStatus, Vehicle } from '@/lib/types';
import { useAuth } from '@/lib/auth';

type UiStatus = RequestStatus | 'Pending Supervisor';

type MyRequest = {
  id: string;
  destination?: string;
  purpose?: string;
  dateTime?: string; // ISO
  status: UiStatus;
  eta?: string | null;
  supervisorDecision?: 'pending' | 'approved' | 'denied'; // 👈 NEW
};

const statusIcons: Record<RequestStatus, React.ElementType> = {
  Pending: Hourglass,
  Approved: CheckCircle,
  Queued: Clock,
  Booked: BookMarked,
  Denied: XCircle,
  Completed: CheckCircle,
  Active: Clock,
};

const statusColors: Record<RequestStatus, string> = {
  Pending: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  Approved: 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30',
  Queued: 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30',
  Booked: 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30',
  Denied: 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30',
  Completed: 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30',
  Active: 'bg-accent text-accent-foreground',
};

function toUiStatus(raw?: string | null): UiStatus {
  const s = String(raw ?? '').toLowerCase();
  if (s.includes('pending_supervisor') || s.includes('pending supervisor') || s.includes('supervisor')) return 'Pending Supervisor';
  if (s === 'pending' || s.includes('pending_fleet') || s.includes('pending fleet')) return 'Pending';
  if (s.startsWith('approved')) return 'Approved';
  if (s.startsWith('rejected') || s === 'denied') return 'Denied';
  if (s.startsWith('active')) return 'Active';
  if (s.startsWith('completed')) return 'Completed';
  if (s.startsWith('booked')) return 'Booked';
  if (s.startsWith('queued')) return 'Queued';
  return 'Pending';
}

/** Tiny inline badge for supervisor decision (keeps UI minimal) */
function SupervisorDecisionBadge({ d }: { d?: 'pending' | 'approved' | 'denied' }) {
  if (!d || d === 'pending') {
    return (
      <Badge variant="outline" className="ml-2 border-amber-500/60 text-amber-600">
        Awaiting Supervisor
      </Badge>
    );
  }
  if (d === 'approved') {
    return (
      <Badge variant="outline" className="ml-2 border-green-500/70 text-green-600">
        Approved by Supervisor
      </Badge>
    );
  }
  return <Badge variant="destructive" className="ml-2">Rejected by Supervisor</Badge>;
}

export default function WorkerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rows, setRows] = useState<MyRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Pick<Vehicle, 'id' | 'make' | 'model' | 'plate_number' | 'type'>[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);

  const loadRequests = useCallback(async () => {
    const res = await apiGet<any>('/staff/requests');
    const listSrc: any[] = Array.isArray(res) ? res : res?.data ?? [];
    const list: MyRequest[] = listSrc.map((r) => ({
      id: String(r.id),
      destination: r.destination ?? r.to ?? r.place ?? '',
      purpose: r.purpose ?? r.reason ?? '',
      dateTime: r.date_time ?? r.start_time ?? r.created_at ?? null,
      status: toUiStatus(r.status) as UiStatus,
      eta: r.eta ?? null,
      supervisorDecision: String(r.supervisor_decision ?? 'pending') as 'pending' | 'approved' | 'denied', // 👈 NEW
    }));
    setRows(list);
  }, []);

  // Fetch vehicles when the modal opens
  useEffect(() => {
    (async () => {
      if (!isModalOpen) return;
      try {
        const res = await apiGet<any>('/staff/vehicles');
        const arr: Pick<Vehicle, 'id' | 'make' | 'model' | 'plate_number' | 'type'>[] =
          (res?.data ?? res ?? []).map((v: any) => ({
            id: String(v.id),
            make: v.make ?? '',
            model: v.model ?? '',
            plate_number: v.plate_number ?? '',
            type: v.type ?? '',
          }));
        setVehicles(arr);

        const typesRes = await apiGet<any>('/vehicle-types');
        const types: string[] = (typesRes?.data ?? typesRes ?? [])
          .map((t: any) => String(t))
          .filter(Boolean);
        setVehicleTypes(types);
      } catch {
        setVehicles([]);
        setVehicleTypes([]);
      }
    })();
  }, [isModalOpen]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadRequests();
      } finally {
        setLoading(false);
      }
    })();
  }, [loadRequests]);

  const handleCreate = useCallback(
    async (form: RequestVehicleForm) => {
      const departmentId = (user as any)?.department_id ?? (user as any)?.department?.id ?? null;

      if (!departmentId) {
        toast({ variant: 'destructive', description: 'Your account has no department set.' });
        return;
      }

      const payload = {
        purpose: form?.purpose ?? '',
        origin: form?.origin ?? '',
        destination: form?.destination ?? '',
        start_at: form?.datetime ?? null,
        datetime: form?.datetime ?? null,
        vehicle_id: (form as any)?.vehicle_id ?? undefined,
        requested_vehicle_type: (form as any)?.requested_vehicle_type ?? undefined,
      };

      setLoading(true);
      try {
        await apiPost('/staff/requests', payload);
        toast({ description: 'Request submitted for supervisor approval.' });
        setIsModalOpen(false);
        await loadRequests();
      } catch (e: any) {
        const serverMsg =
          e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Failed to submit request.';
        toast({ variant: 'destructive', description: serverMsg });
      } finally {
        setLoading(false);
      }
    },
    [loadRequests, toast, user]
  );

  const kpis = useMemo(
    () => ({
      total: rows.length,
      pending: rows.filter((r) => r.status === 'Pending' || r.status === 'Pending Supervisor').length,
      approved: rows.filter((r) => r.status === 'Approved').length,
    }),
    [rows]
  );

  return (
    <div className="grid gap-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline">My Dashboard</h1>
          <p className="text-muted-foreground">Submit and track your vehicle requests.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} disabled={loading}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Request Vehicle
        </Button>
      </div>

      <RequestVehicleModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        vehicles={vehicles}
        vehicleTypes={vehicleTypes}
        onSubmit={handleCreate}
        submitting={loading}
      />

      <Card>
        <CardHeader>
          <CardTitle>My Requests</CardTitle>
          <CardDescription>An overview of your recent vehicle requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request ID</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Date &amp; Time</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((request) => {
                const status: RequestStatus =
                  (request.status === 'Pending Supervisor' ? 'Pending' : request.status) as RequestStatus;
                const Icon = statusIcons[status] ?? Hourglass;

                return (
                  <TableRow key={request.id}>
                    <TableCell className="font-mono text-xs">#{request.id.slice(-6)}</TableCell>
                    <TableCell className="font-medium">{request.destination || '—'}</TableCell>
                    <TableCell>
                      {request.dateTime ? <ClientFormattedDate date={request.dateTime} /> : '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant="outline" className={statusColors[status]}>
                        <Icon className="mr-1 h-3 w-3" />
                        {request.status}
                        {status === 'Queued' && request.eta ? ` (ETA: ${request.eta})` : ''}
                      </Badge>

                      {/* 👇 Subtle supervisor decision chip */}
                      <SupervisorDecisionBadge d={request.supervisorDecision} />
                    </TableCell>
                  </TableRow>
                );
              })}
              {!rows.length && !loading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No requests yet. Click “Request Vehicle” to create one.
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
