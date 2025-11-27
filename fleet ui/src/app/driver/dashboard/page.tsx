// src/app/driver/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Car, Clock, MapPin, Play, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ClientFormattedDate } from '@/components/client-formatted-date';
import { apiGet, apiPost } from '@/lib/apiClient';

/* Modal bits */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

type MyVehicle = {
  id: string | number;
  plate_number?: string | null;
  make?: string | null;
  model?: string | null;
  status?: string | null;
};

type MyTrip = {
  id: string | number;
  status: 'pending' | 'upcoming' | 'active' | 'completed' | 'cancelled' | string;
  vehicle_id?: string | number | null;
  purpose?: string | null;
  origin?: string | null;
  destination?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  odometer_out?: number | null;
  odometer_in?: number | null;
};

type AssignmentPayload = {
  vehicle: MyVehicle | null;
  active_trip: MyTrip | null;
  next_trip: MyTrip | null;
};

const POLL_MS = 15000;
const DEV_DEBUG = false; // no visible/debug logs in production UI

function normalizeStatus(s?: string | null): 'pending' | 'active' | 'completed' | 'cancelled' | string {
  if (!s) return 'pending';
  if (s === 'in_progress') return 'active';
  return s;
}

function normalizeTrip(t?: MyTrip | null): MyTrip | null {
  if (!t) return null;
  const start_time = (t as any).started_at ?? t.start_time ?? null;
  const end_time   = (t as any).ended_at   ?? t.end_time   ?? null;
  const status     = normalizeStatus(t.status);
  return { ...t, status, start_time, end_time };
}

function headerTitleFor(trip: MyTrip | null): string {
  if (!trip) return 'Assignments';
  if (trip.status === 'active') return 'Active Trip';
  if (trip.status === 'pending' || trip.status === 'upcoming') return 'Next Assignment';
  if (trip.status === 'completed') return 'Recent Trip';
  return 'Assignment';
}

const inspectionItems = [
  { id: 'tires', label: 'Tires (pressure and tread)' },
  { id: 'lights', label: 'Lights (headlights, taillights, signals)' },
  { id: 'brakes', label: 'Brakes (test response)' },
  { id: 'fluids', label: 'Fluids (oil, coolant, windshield)' },
  { id: 'body', label: 'Body (dents, scratches, mirrors)' },
  { id: 'interior', label: 'Interior (cleanliness, safety equipment)' },
];

export default function DriverDashboard() {
  const { toast } = useToast();
  const [vehicle, setVehicle] = useState<MyVehicle | null>(null);
  const [activeTrip, setActiveTrip] = useState<MyTrip | null>(null);
  const [nextTrip, setNextTrip] = useState<MyTrip | null>(null);
  const timer = useRef<NodeJS.Timeout | null>(null);

  // Modals
  const [showStartModal, setShowStartModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);

  // Pre-trip form state
  const [startOdo, setStartOdo] = useState<string>('');
  const [startFuel, setStartFuel] = useState<string>('full');
  const [preNotes, setPreNotes] = useState<string>('');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const toggleCheck = (id: string) => setChecklist((m) => ({ ...m, [id]: !m[id] }));

  // Post-trip form state
  const [endOdo, setEndOdo] = useState<string>('');
  const [endFuel, setEndFuel] = useState<string>('');
  const [postNotes, setPostNotes] = useState<string>('');

  // Local submission locks (to prevent double-clicks)
  const [submittingStart, setSubmittingStart] = useState(false);
  const [submittingEnd, setSubmittingEnd] = useState(false);

  async function loadAssignments() {
    const res = await apiGet<AssignmentPayload>('/driver/assignments');
    setVehicle(res?.vehicle ?? null);
    setActiveTrip(normalizeTrip(res?.active_trip ?? null));
    setNextTrip(normalizeTrip(res?.next_trip ?? null));
    if (DEV_DEBUG) console.log('[driver] assignments', res);
    return res;
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      try { await loadAssignments(); } catch {}
      timer.current = setInterval(() => { loadAssignments().catch(() => {}); }, POLL_MS);
    })();
    return () => { mounted = false; if (timer.current) clearInterval(timer.current); };
  }, []);

  useEffect(() => {
    if (!DEV_DEBUG) return;
    console.log('[driver] vehicle', vehicle);
    console.log('[driver] activeTrip', activeTrip);
    console.log('[driver] nextTrip', nextTrip);
  }, [vehicle, activeTrip, nextTrip]);

  const tripToShow = activeTrip ?? nextTrip;

  function serverMessage(e: any, fallback: string) {
    const msg = e?.message ?? '';
    try {
      const maybe = typeof msg === 'string' ? JSON.parse(msg) : null;
      if (maybe?.error) return String(maybe.error);
    } catch {}
    return typeof msg === 'string' && msg.trim() ? msg : fallback;
  }

  // ---------- Start Trip ----------
  async function submitStartTrip() {
    if (submittingStart) return;
    try {
      setSubmittingStart(true);
      const od = Math.floor(Number(startOdo));
      if (!Number.isFinite(od) || od < 0) {
        toast({ variant: 'destructive', title: 'Invalid value', description: 'Enter a non-negative odometer.' });
        return;
      }
      const fresh = await loadAssignments().catch(() => null);
      const target = normalizeTrip(fresh?.next_trip ?? nextTrip);
      if (!target?.id) {
        toast({ variant: 'destructive', title: 'No upcoming trip', description: 'This assignment may have changed.' });
        return;
      }
      const url = `/trips/${target.id}/start`;
      const payload = { odometer_out: od };
      if (DEV_DEBUG) console.log('[driver] POST', url, payload);
      await apiPost(url, payload);

      toast({ title: 'Trip Started', description: `Trip #${String(target.id).slice(-4)} is now active.` });
      setShowStartModal(false);
      setStartOdo(''); setPreNotes(''); setChecklist({}); setStartFuel('full');
      await loadAssignments();
    } catch (e: any) {
      const msg = serverMessage(e, 'Server rejected start (422). Check trip state and odometer.');
      if (DEV_DEBUG) console.error('[driver] start error', e);
      toast({ variant: 'destructive', title: 'Could not start trip', description: msg });
    } finally {
      setSubmittingStart(false);
    }
  }

  // ---------- End Trip ----------
  async function submitEndTrip() {
    if (submittingEnd) return;
    try {
      setSubmittingEnd(true);
      const od = Math.floor(Number(endOdo));
      if (!Number.isFinite(od) || od < 0) {
        toast({ variant: 'destructive', title: 'Invalid value', description: 'Enter a non-negative odometer.' });
        return;
      }
      const fresh = await loadAssignments().catch(() => null);
      const targetActive = normalizeTrip(fresh?.active_trip ?? activeTrip);
      const target = targetActive ?? normalizeTrip(tripToShow ?? null);
      if (!target?.id) {
        toast({ variant: 'destructive', title: 'No active trip', description: 'No active assignment to end.' });
        return;
      }
      const url = `/trips/${target.id}/end`;
      const payload = { odometer_in: od };
      if (DEV_DEBUG) console.log('[driver] POST', url, payload, { target });
      await apiPost(url, payload);

      toast({ title: 'Trip Completed', description: `Trip #${String(target.id).slice(-4)} completed.` });
      setShowEndModal(false);
      setEndOdo(''); setEndFuel(''); setPostNotes('');
      await loadAssignments();
    } catch (e: any) {
      const msg = serverMessage(e, 'Server rejected end (422). Ensure the trip is active and the odometer is valid.');
      if (DEV_DEBUG) console.error('[driver] end error', e);
      toast({ variant: 'destructive', title: 'Could not end trip', description: msg });
    } finally {
      setSubmittingEnd(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold font-headline">Driver Dashboard</h1>
        <p className="text-muted-foreground">Your assigned vehicle and live assignments (auto-refreshing).</p>
      </div>

      {/* Assigned vehicle */}
      <Card>
        <CardHeader>
          <CardTitle>Your Assigned Vehicle</CardTitle>
          <CardDescription>Appears immediately after Fleet Manager assigns you.</CardDescription>
        </CardHeader>
        <CardContent>
          {vehicle ? (
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <Car className="h-7 w-7 text-primary" />
              <div>
                <p className="font-semibold">
                  {(vehicle.make ?? '')} {(vehicle.model ?? '')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {vehicle.plate_number ?? '—'} &middot; {String(vehicle.status ?? '').toUpperCase()}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No vehicle assigned yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Current assignment */}
      <Card>
        <CardHeader>
          <CardTitle>{headerTitleFor(tripToShow)}</CardTitle>
        <CardDescription>
            {tripToShow
              ? `Trip #${String(tripToShow.id).slice(-4)}`
              : 'No assignments right now. We’ll refresh automatically.'}
          </CardDescription>
        </CardHeader>

        {tripToShow ? (
          <>
            <CardContent className="grid gap-4">
              <div className="flex items-center gap-4 rounded-lg border p-4">
                <Car className="h-7 w-7 text-primary" />
                <div>
                  <p className="font-semibold">
                    {(vehicle?.make ?? 'Vehicle')} {(vehicle?.model ?? '')}
                  </p>
                  <p className="text-sm text-muted-foreground">{vehicle?.plate_number ?? '—'}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-1 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">Route</p>
                    <p className="text-muted-foreground">
                      {(tripToShow.origin ?? '—')} &rarr; {(tripToShow.destination ?? '—')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="mt-1 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">Scheduled</p>
                    <p className="text-muted-foreground">
                      {tripToShow.start_time ? <ClientFormattedDate date={tripToShow.start_time} /> : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-end gap-2">
              {!activeTrip && nextTrip && (
                <Button
                  type="button"
                  onClick={() => setShowStartModal(true)}
                  className="w-full bg-primary hover:bg-primary/90 md:w-auto"
                  disabled={submittingStart}
                  aria-busy={submittingStart}
                >
                  <Play className="mr-2 h-4 w-4" /> {submittingStart ? 'Starting…' : 'Start Trip'}
                </Button>
              )}

              {activeTrip && (
                <Button
                  type="button"
                  onClick={() => setShowEndModal(true)}
                  className="w-full bg-destructive hover:bg-destructive/90 md:w-auto"
                  disabled={submittingEnd}
                  aria-busy={submittingEnd}
                >
                  <Square className="mr-2 h-4 w-4" /> {submittingEnd ? 'Ending…' : 'End Trip'}
                </Button>
              )}
            </CardFooter>
          </>
        ) : (
          <CardContent>
            <p className="text-sm text-muted-foreground">No assignments right now. We’ll refresh automatically.</p>
          </CardContent>
        )}
      </Card>

      {/* ---------- Start Trip Modal ---------- */}
      <Dialog open={showStartModal} onOpenChange={(o) => !submittingStart && setShowStartModal(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pre-Trip Check & Start</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startOdometer">Starting Odometer (km)</Label>
                <Input
                  id="startOdometer"
                  type="number"
                  value={startOdo}
                  onChange={(e) => setStartOdo(e.target.value)}
                  placeholder="e.g., 25000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startFuel">Starting Fuel Level</Label>
                <Select value={startFuel} onValueChange={setStartFuel}>
                  <SelectTrigger id="startFuel"><SelectValue placeholder="Select fuel level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Tank</SelectItem>
                    <SelectItem value="three-quarters">3/4 Tank</SelectItem>
                    <SelectItem value="half">1/2 Tank</SelectItem>
                    <SelectItem value="quarter">1/4 Tank</SelectItem>
                    <SelectItem value="empty">Nearly Empty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Vehicle Condition Checklist</Label>
              <div className="space-y-2 rounded-md border p-4">
                {inspectionItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`check-${item.id}`}
                      checked={!!checklist[item.id]}
                      onCheckedChange={() => toggleCheck(item.id)}
                    />
                    <label htmlFor={`check-${item.id}`} className="text-sm font-medium leading-none">
                      {item.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preNotes">Pre-Trip Notes</Label>
              <Textarea
                id="preNotes"
                value={preNotes}
                onChange={(e) => setPreNotes(e.target.value)}
                placeholder="Report issues before starting."
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowStartModal(false)} disabled={submittingStart}>Cancel</Button>
            <Button type="button" onClick={submitStartTrip} disabled={submittingStart}>Start Trip</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- End Trip Modal ---------- */}
      <Dialog open={showEndModal} onOpenChange={(o) => !submittingEnd && setShowEndModal(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post-Trip Log & End</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="endOdometer">Ending Odometer (km)</Label>
                <Input
                  id="endOdometer"
                  type="number"
                  value={endOdo}
                  onChange={(e) => setEndOdo(e.target.value)}
                  placeholder="e.g., 25250"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endFuel">Ending Fuel Level (optional)</Label>
                <Select value={endFuel} onValueChange={setEndFuel}>
                  <SelectTrigger id="endFuel"><SelectValue placeholder="Select fuel level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Tank</SelectItem>
                    <SelectItem value="three-quarters">3/4 Tank</SelectItem>
                    <SelectItem value="half">1/2 Tank</SelectItem>
                    <SelectItem value="quarter">1/4 Tank</SelectItem>
                    <SelectItem value="empty">Nearly Empty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="postNotes">Post-Trip Notes (optional)</Label>
              <Textarea
                id="postNotes"
                value={postNotes}
                onChange={(e) => setPostNotes(e.target.value)}
                placeholder="Report any incidents or issues."
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowEndModal(false)} disabled={submittingEnd}>Cancel</Button>
            <Button type="button" onClick={submitEndTrip} disabled={submittingEnd}>End Trip</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
