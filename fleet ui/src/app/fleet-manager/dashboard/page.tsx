'use client';

import { useEffect, useMemo, useState } from 'react';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { VehicleBoard } from '@/components/fleet-manager/vehicle-board';
import { RequestsBoard } from '@/components/fleet-manager/requests-board';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Car, Bell, AlertTriangle, Route, Clock } from 'lucide-react';
import { ClientFormattedDate } from '@/components/client-formatted-date';
import { useVehiclesStore } from '@/lib/store/vehicles-store';
import { apiGet, apiPost } from '@/lib/apiClient';
import type { FMRequest, TripLite, VehicleLite, RequestStatus } from '@/lib/types';
import { unpackArrayOrData, isFulfilled } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type SupervisorDecision = 'pending' | 'approved' | 'denied';

type FMRequestPlus = FMRequest & {
  supervisorDecision?: SupervisorDecision;
};

type DriverLite = {
  id: string;
  name: string;
  email?: string | null;
  roleName?: string | null;
};

function st(x?: string | null) {
  return String(x ?? '').toLowerCase().trim();
}

/** Fleet "buckets" used by BOTH KPI and RequestsBoard so they match */
function toFleetBucket(r: FMRequestPlus): 'pending' | 'booked' | 'completed' | 'other' {
  const s = st(r.status);
  if (s === 'pending' || s === 'pending_fleet' || s.includes('pending fleet')) return 'pending';
  if (s === 'booked' || s === 'assigned') return 'booked';
  if (s === 'completed' || s === 'done' || s === 'finished') return 'completed';
  return 'other';
}

/** Normalize vehicle status strings coming from API to one of: available/assigned/maintenance */
function normVehicleStatus(x?: string | null): 'available' | 'assigned' | 'maintenance' | 'other' {
  const s = st(x);
  if (['available', 'idle', 'free'].includes(s)) return 'available';
  if (['assigned', 'booked', 'in_use', 'inuse'].includes(s)) return 'assigned';
  if (['maintenance', 'in_maintenance', 'repair', 'service'].includes(s)) return 'maintenance';
  return 'other';
}

export default function FleetManagerDashboard() {
  const { vehicles, setVehicles } = useVehiclesStore() as {
    vehicles: VehicleLite[];
    setVehicles: (v: VehicleLite[]) => void;
  };
  const { toast } = useToast();

  const [requests, setRequests] = useState<FMRequestPlus[]>([]);
  const [trips, setTrips] = useState<TripLite[]>([]);
  const [drivers, setDrivers] = useState<DriverLite[]>([]);

  // --- Approve Modal state ---
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveForId, setApproveForId] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState<string>('');
  const [driverId, setDriverId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const results = await Promise.allSettled([
        apiGet<FMRequest[] | { data: FMRequest[] }>('/dispatch-requests'),
        apiGet<VehicleLite[] | { data: VehicleLite[] }>('/vehicles'),
        apiGet<TripLite[] | { data: TripLite[] }>('/trips'),
        apiGet<any[] | { data: any[] }>('/users'), // We'll filter to Drivers below
      ]);

      const [reqRes, vehRes, tripRes, userRes] = results;

      if (isFulfilled(reqRes)) {
        const raw = unpackArrayOrData<any>(reqRes.value) ?? [];
        const normalized: FMRequestPlus[] = (raw ?? []).map((r: any) => ({
          id: String(r.id),
          status: String(r.status ?? 'pending'),
          purpose: r.purpose ?? '',
          origin: r.origin ?? '',
          destination: r.destination ?? '',
          dateTime: String(r.created_at ?? r.start_at ?? r.dateTime ?? ''),
          requester: r.requested_by_user
            ? {
                id: String(r.requested_by_user.id ?? ''),
                name: String(r.requested_by_user.name ?? '-'),
                email: r.requested_by_user.email ?? '',
              }
            : r.requester ?? null,
          driver: r.driver ?? null,
          vehicle: r.vehicle ?? null,
          department:
            (typeof r.department === 'string'
              ? r.department
              : (r.department?.name as string | undefined)) ?? null,
          supervisorDecision: String(r.supervisor_decision ?? 'pending') as SupervisorDecision,
        }));
        if (mounted) setRequests(normalized);
      }

      if (isFulfilled(vehRes)) {
        const list = unpackArrayOrData<VehicleLite>(vehRes.value) ?? [];
        if (mounted) setVehicles(list);
      }

      if (isFulfilled(tripRes)) {
        const list = unpackArrayOrData<TripLite>(tripRes.value) ?? [];
        if (mounted) setTrips(list);
      }

      if (isFulfilled(userRes)) {
        const raw = unpackArrayOrData<any>(userRes.value) ?? [];
        // Accept both shapes: with embedded role or flat role_name
        const onlyDrivers: DriverLite[] = raw
          .map((u: any) => ({
            id: String(u.id),
            name: String(u.name ?? '-'),
            email: u.email ?? null,
            roleName: (u.role?.name ?? u.role_name ?? '') as string,
          }))
          .filter((u: DriverLite) => st(u.roleName) === 'driver');
        if (mounted) setDrivers(onlyDrivers);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [setVehicles]);


  // in FleetManager dashboard file
const toUiStatus = (s?: string|null) => (String(s ?? '').toLowerCase() === 'in_progress' ? 'active' : String(s ?? '').toLowerCase());



  /** Buckets (shared) */
  const pendingBucket = useMemo(
    () => requests.filter((r) => toFleetBucket(r) === 'pending'),
    [requests]
  );
  const bookedBucket = useMemo(
    () => requests.filter((r) => toFleetBucket(r) === 'booked'),
    [requests]
  );
  const completedBucket = useMemo(
    () => requests.filter((r) => toFleetBucket(r) === 'completed'),
    [requests]
  );

  /** KPI */
  const pendingCount = pendingBucket.length;

  type VehicleWithStatus = VehicleLite & { status?: string | null };
  const vehs = (vehicles ?? []) as VehicleWithStatus[];

  const vehiclesAvailable = useMemo(
    () => vehs.filter((v) => normVehicleStatus(v.status) === 'available').length,
    [vehs]
  );

  const serviceAlerts = useMemo(
    () => vehs.filter((v) => normVehicleStatus(v.status) === 'maintenance').length,
    [vehs]
  );

  const activeTrips = useMemo(
    () => (trips ?? []).filter((t) => st(t.status) === 'active').length,
    [trips]
  );

  async function refreshAll() {
    const [reqRes, vehRes, tripRes, userRes] = await Promise.allSettled([
      apiGet<FMRequest[] | { data: FMRequest[] }>('/dispatch-requests'),
      apiGet<VehicleLite[] | { data: VehicleLite[] }>('/vehicles'),
      apiGet<TripLite[] | { data: TripLite[] }>('/trips'),
      apiGet<any[] | { data: any[] }>('/users'),
    ]);

    if (isFulfilled(reqRes)) {
      const raw = unpackArrayOrData<any>(reqRes.value) ?? [];
      const normalized: FMRequestPlus[] = (raw ?? []).map((r: any) => ({
        id: String(r.id),
        status: String(r.status ?? 'pending'),
        purpose: r.purpose ?? '',
        origin: r.origin ?? '',
        destination: r.destination ?? '',
        dateTime: String(r.created_at ?? r.start_at ?? r.dateTime ?? ''),
        requester: r.requested_by_user
          ? {
              id: String(r.requested_by_user.id ?? ''),
              name: String(r.requested_by_user.name ?? '-'),
              email: r.requested_by_user.email ?? '',
            }
          : r.requester ?? null,
        driver: r.driver ?? null,
        vehicle: r.vehicle ?? null,
        department:
          (typeof r.department === 'string'
            ? r.department
            : (r.department?.name as string | undefined)) ?? null,
        supervisorDecision: String(r.supervisor_decision ?? 'pending') as SupervisorDecision,
      }));
      setRequests(normalized);
    }
    if (isFulfilled(vehRes)) {
      setVehicles(unpackArrayOrData<VehicleLite>(vehRes.value) ?? []);
    }
    if (isFulfilled(tripRes)) {
      setTrips(unpackArrayOrData<TripLite>(tripRes.value) ?? []);
    }
    if (isFulfilled(userRes)) {
      const raw = unpackArrayOrData<any>(userRes.value) ?? [];
      const onlyDrivers: DriverLite[] = raw
        .map((u: any) => ({
          id: String(u.id),
          name: String(u.name ?? '-'),
          email: u.email ?? null,
          roleName: (u.role?.name ?? u.role_name ?? '') as string,
        }))
        .filter((u: DriverLite) => st(u.roleName) === 'driver');
      setDrivers(onlyDrivers);
    }
  }

  // ---------- Approve / Reject actions ----------
  // Opens modal with the chosen request id
  const openApproveModal = (id: string) => {
    setApproveForId(id);
    setVehicleId('');
    setDriverId('');
    setApproveOpen(true);
  };

  const handleApproveSubmit = async () => {
    if (!approveForId || !vehicleId || !driverId) {
      toast({
        variant: 'destructive',
        title: 'Missing selection',
        description: 'Please choose both a vehicle and a driver.',
      });
      return;
    }
    try {
      setSubmitting(true);
      await apiPost(`/fleet/requests/${approveForId}/decide`, {
        decision: 'approve',
        vehicle_id: Number(vehicleId),
        driver_id: Number(driverId),
      });
      toast({ title: 'Approved', description: 'Request approved, trip queued for the driver.' });
      setApproveOpen(false);
      setApproveForId(null);
      await refreshAll();
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Approval failed',
        description: e?.message || 'Server error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onAction = async (id: string, newStatus: RequestStatus, _fmId: string) => {
    if (newStatus === 'Approved') {
      openApproveModal(id);
      return;
    }
    if (newStatus === 'Denied') {
      await apiPost(`/fleet/requests/${id}/decide`, { decision: 'reject' });
      await refreshAll();
      toast({ title: 'Request rejected' });
    }
  };

  // ---------- Helpers for selects ----------
  const availableVehicles = useMemo(
    () =>
      (vehs ?? [])
        .filter((v) => normVehicleStatus(v.status) === 'available')
        .map((v) => ({
          id: String((v as any).id ?? ''),
          label: `${v.make ?? ''} ${v.model ?? ''} — ${v.plate_number ?? ''}`.trim(),
        })),
    [vehs]
  );

  const driverOptions = useMemo(
    () =>
      (drivers ?? []).map((d) => ({
        id: d.id,
        label: `${d.name}${d.email ? ` · ${d.email}` : ''}`,
      })),
    [drivers]
  );

  /** Pass the raw requests; your RequestsBoard already does its own tab bucketing */
  return (
    <div className="grid gap-6">
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold font-headline">Fleet Manager Dashboard</h1>
        <p className="text-muted-foreground">Oversee requests, vehicles, and live operations.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Pending Requests" value={String(pendingCount)} icon={Bell} />
        <KpiCard title="Vehicles Available" value={String(vehiclesAvailable)} icon={Car} />
        <KpiCard title="Active Trips" value={String(activeTrips)} icon={Route} />
        <KpiCard title="Service Alerts" value={String(serviceAlerts)} icon={AlertTriangle} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RequestsBoard
          requests={requests}
          onApprove={(r) => onAction(r.id, 'Approved', '')}
          onReject={(r) => onAction(r.id, 'Denied', '')}
        />

        <div className="space-y-6">
          {/* Send normalized statuses so tabs count correctly */}
          <VehicleBoard
            vehicles={(vehs ?? []).map((v) => ({
              ...v,
              status: normVehicleStatus(v.status),
            })) as any}
          />
          <Card>
            <CardHeader>
              <CardTitle>Today's Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(trips ?? []).slice(0, 3).map((trip) => (
                  <div key={String(trip.id)} className="flex items-center gap-4 text-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">Trip for {trip.driver?.name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        <ClientFormattedDate date={trip.startTime ?? ''} /> — {trip.destination ?? '—'}
                      </p>
                    </div>
                  </div>
                ))}
                {(trips ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No trips scheduled for today.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ---------- Approve Modal ---------- */}
      <Dialog open={approveOpen} onOpenChange={(o) => !submitting && setApproveOpen(o)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Approve Request</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Vehicle</Label>
              <Select
                value={vehicleId || undefined}
                onValueChange={(v) => setVehicleId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={availableVehicles.length ? 'Select an available vehicle' : 'No available vehicles'} />
                </SelectTrigger>
                <SelectContent>
                  {availableVehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Driver</Label>
              <Select
                value={driverId || undefined}
                onValueChange={setDriverId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={driverOptions.length ? 'Select a driver' : 'No drivers found'} />
                </SelectTrigger>
                <SelectContent>
                  {driverOptions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleApproveSubmit} disabled={submitting || !vehicleId || !driverId}>
              {submitting ? 'Assigning…' : 'Assign & Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}