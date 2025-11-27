'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ClientFormattedDate } from '@/components/client-formatted-date';
import { apiGet, apiPost } from '@/lib/apiClient';
import { useAuth } from '@/lib/auth';
import { Clock, Car, Calendar, CheckCircle, Gauge, MapPin } from 'lucide-react';
import { PostTripReviewModal } from '@/components/driver/post-trip-review-modal';

type ApiTrip = {
  id: number | string;
  status: string; // pending | in_progress | completed | cancelled | approved | …
  request_id?: number | string | null;
  purpose?: string | null;
  origin?: string | null;
  destination?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  odometer_out?: number | null;
  odometer_in?: number | null;
  vehicle?: {
    id: number | string;
    make?: string | null;
    model?: string | null;
    plate_number?: string | null;
  } | null;
  driver?: {
    id: number | string;
    name?: string | null;
  } | null;
};

type TripRow = {
  id: string;
  status: 'Pending' | 'Upcoming' | 'Active' | 'Completed' | 'Cancelled';
  requestId?: string;
  purpose?: string;
  origin?: string;
  destination?: string;
  startTime?: string;
  endTime?: string;
  startOdometer?: number | null;
  endOdometer?: number | null;
  vehicle: { id: string; make?: string; model?: string; plate_number?: string };
  driver: { id: string; name?: string };
};

function apiToUiStatus(s?: string | null): TripRow['status'] {
  const v = String(s ?? '').toLowerCase();
  if (v === 'in_progress' || v === 'active') return 'Active';
  if (v === 'completed') return 'Completed';
  if (v === 'cancelled') return 'Cancelled';
  // treat approved/pending/booked/queued/etc as Upcoming
  if (['approved', 'booked', 'queued', 'scheduled', 'pending_fleet'].includes(v)) return 'Upcoming';
  if (v === 'pending') return 'Upcoming';
  return 'Pending';
}

const inspectionItems = [
  { id: 'tires', label: 'Tires (pressure and tread)' },
  { id: 'lights', label: 'Lights (headlights, taillights, signals)' },
  { id: 'brakes', label: 'Brakes (test response)' },
  { id: 'fluids', label: 'Fluids (oil, coolant, windshield)' },
  { id: 'body', label: 'Body (dents, scratches, mirrors)' },
  { id: 'interior', label: 'Interior (cleanliness, safety equipment)' },
];

export default function DriverTripsPage() {
  const { toast } = useToast();
  const { user } = useAuth() as any;
  const driverId = String(user?.id ?? '');

  const [allTrips, setAllTrips] = useState<TripRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewTripId, setReviewTripId] = useState<string | null>(null);

  // Dialog state (start/end)
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<TripRow | null>(null);

  // Start form
  const [startOdo, setStartOdo] = useState<number | undefined>();
  const [startFuel, setStartFuel] = useState<string | undefined>('full');
  const [preTripNotes, setPreTripNotes] = useState('');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  // End form
  const [endOdo, setEndOdo] = useState<number | undefined>();
  const [endFuel, setEndFuel] = useState<string | undefined>();
  const [postTripNotes, setPostTripNotes] = useState('');

  const toggleCheck = (id: string) =>
    setChecklist((m) => ({ ...m, [id]: !m[id] }));

  // Fetch trips for this driver
  async function loadTrips() {
    setLoading(true);
    try {
      // If your API supports filtering, you could call `/trips?scope=mine`
      const list = await apiGet<ApiTrip[]>('/trips');
      const mine = (list || []).filter((t) => String(t?.driver?.id ?? '') === driverId);
      const mapped: TripRow[] = mine.map((t) => ({
        id: String(t.id),
        requestId: t.request_id ? String(t.request_id) : undefined,
        status: apiToUiStatus(t.status),
        purpose: t.purpose ?? undefined,
        origin: t.origin ?? undefined,
        destination: t.destination ?? undefined,
        startTime: t.started_at ?? undefined,
        endTime: t.ended_at ?? undefined,
        startOdometer: t.odometer_out ?? null,
        endOdometer: t.odometer_in ?? null,
        vehicle: {
          id: String(t?.vehicle?.id ?? ''),
          make: t?.vehicle?.make ?? '',
          model: t?.vehicle?.model ?? '',
          plate_number: t?.vehicle?.plate_number ?? '',
        },
        driver: {
          id: driverId,
          name: t?.driver?.name ?? '',
        },
      }));
      setAllTrips(mapped);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to load trips',
        description: e?.message || 'Server error',
      });
      setAllTrips([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!driverId) return;
    loadTrips();
    // optionally: add polling
    // const id = setInterval(loadTrips, 15000);
    // return () => clearInterval(id);
  }, [driverId]);

  // Derived groupings
  const activeTrips = useMemo(
    () => allTrips.filter((t) => t.status === 'Active'),
    [allTrips]
  );
  const upcomingTrips = useMemo(
    () => allTrips.filter((t) => t.status === 'Upcoming' || t.status === 'Pending'),
    [allTrips]
  );
  const completedTrips = useMemo(
    () => allTrips.filter((t) => t.status === 'Completed'),
    [allTrips]
  );

  // Handlers
  function openStartDialog(trip: TripRow) {
    setSelectedTrip(trip);
    // Prefill if we already have an odometer_out
    setStartOdo(trip.startOdometer ?? undefined);
    setStartFuel('full');
    setPreTripNotes('');
    setChecklist({});
    setStartOpen(true);
  }

  function openEndDialog(trip: TripRow) {
    setSelectedTrip(trip);
    setEndOdo(trip.endOdometer ?? undefined);
    setEndFuel(undefined);
    setPostTripNotes('');
    setEndOpen(true);
  }

  function openReview(trip: TripRow) {
    setReviewTripId(trip.id);
    setReviewOpen(true);
  }

  async function submitStart() {
    if (!selectedTrip) return;
    const odo = Number(startOdo ?? NaN);
    if (!Number.isFinite(odo) || odo < 0) {
      toast({ variant: 'destructive', title: 'Invalid value', description: 'Please enter a valid non-negative odometer.' });
      return;
    }
    try {
      // primary start endpoint (your controller expects odometer_out)
      await apiPost(`/trips/${encodeURIComponent(selectedTrip.id)}/start`, {
        odometer_out: odo,
        // optional: attach extra payloads if you expose them server-side
        pre: {
          fuel: startFuel ?? null,
          checklist,
          notes: preTripNotes,
        },
      });
      toast({ title: 'Trip Started', description: `Trip #${selectedTrip.id.slice(-4)} is now active.` });
      setStartOpen(false);
      setSelectedTrip(null);
      await loadTrips();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could not start trip', description: e?.message || 'Server error' });
    }
  }

  async function submitEnd() {
    if (!selectedTrip) return;
    const odo = Number(endOdo ?? NaN);
    if (!Number.isFinite(odo) || odo < 0) {
      toast({ variant: 'destructive', title: 'Invalid value', description: 'Please enter a valid non-negative odometer.' });
      return;
    }
    try {
      await apiPost(`/trips/${encodeURIComponent(selectedTrip.id)}/end`, {
        odometer_in: odo,
        post: {
          fuel: endFuel ?? null,
          notes: postTripNotes,
        },
      });
      toast({ title: 'Trip Completed', description: `Trip #${selectedTrip.id.slice(-4)} completed.` });
      setEndOpen(false);
      setSelectedTrip(null);
      await loadTrips();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could not end trip', description: e?.message || 'Server error' });
    }
  }

  // UI bits
  function StatusBadge({ s }: { s: TripRow['status'] }) {
    const base = 'text-xs';
    if (s === 'Active') return <Badge className={`${base} bg-accent text-accent-foreground`}><Clock className="mr-1 h-3 w-3 animate-pulse" />Active</Badge>;
    if (s === 'Completed') return <Badge variant="secondary" className={base}>Completed</Badge>;
    if (s === 'Cancelled') return <Badge variant="destructive" className={base}>Cancelled</Badge>;
    return <Badge variant="outline" className={base}>Upcoming</Badge>;
  }

  function TripCard({ trip }: { trip: TripRow }) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Trip to {trip.destination ?? '—'}
            </CardTitle>
            <StatusBadge s={trip.status} />
          </div>
          <CardDescription>Trip ID: #{trip.id.slice(-4)}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-sm">
          <div className="flex items-start gap-3">
            <Car className="mt-1 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-semibold">{trip.vehicle.make} {trip.vehicle.model}</p>
              <p className="text-muted-foreground">{trip.vehicle.plate_number}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="mt-1 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-semibold">Departure</p>
              <p className="text-muted-foreground">
                <ClientFormattedDate date={trip.startTime ?? ''} />
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="mt-1 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-semibold">Route</p>
              <p className="text-muted-foreground">
                {(trip.origin ?? '—')} &rarr; {(trip.destination ?? '—')}
              </p>
            </div>
          </div>

          {trip.status === 'Completed' && trip.endTime && (
            <div className="flex items-start gap-3 text-green-600">
              <CheckCircle className="mt-1 h-4 w-4" />
              <div>
                <p className="font-semibold">Completed</p>
                <p><ClientFormattedDate date={trip.endTime} /></p>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-2">
          {trip.status === 'Upcoming' && (
            <Dialog open={startOpen && selectedTrip?.id === trip.id} onOpenChange={(o) => { setStartOpen(o); if (!o) setSelectedTrip(null); }}>
              <DialogTrigger asChild>
                <Button onClick={() => openStartDialog(trip)}>Start Trip</Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Start Trip #{trip.id.slice(-4)}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="startOdo">Starting Odometer (km)</Label>
                      <Input
                        id="startOdo"
                        type="number"
                        value={startOdo ?? ''}
                        onChange={(e) => setStartOdo(e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="e.g., 178300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="startFuel">Starting Fuel Level</Label>
                      <Select value={startFuel ?? undefined} onValueChange={setStartFuel}>
                        <SelectTrigger id="startFuel">
                          <SelectValue placeholder="Select fuel level" />
                        </SelectTrigger>
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
                            id={`pre-${item.id}`}
                            checked={!!checklist[item.id]}
                            onCheckedChange={() => toggleCheck(item.id)}
                          />
                          <label htmlFor={`pre-${item.id}`} className="text-sm font-medium leading-none">
                            {item.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preTripNotes">Pre-Trip Notes</Label>
                    <Input
                      id="preTripNotes"
                      value={preTripNotes}
                      onChange={(e) => setPreTripNotes(e.target.value)}
                      placeholder="Report issues before starting."
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => { setStartOpen(false); setSelectedTrip(null); }}>
                      Cancel
                    </Button>
                    <Button onClick={submitStart}>Confirm & Start</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {trip.status === 'Active' && (
            <Dialog open={endOpen && selectedTrip?.id === trip.id} onOpenChange={(o) => { setEndOpen(o); if (!o) setSelectedTrip(null); }}>
              <DialogTrigger asChild>
                <Button variant="destructive" onClick={() => openEndDialog(trip)}>
                  End Trip
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>End Trip #{trip.id.slice(-4)}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="endOdo">Ending Odometer (km)</Label>
                      <Input
                        id="endOdo"
                        type="number"
                        value={endOdo ?? ''}
                        onChange={(e) => setEndOdo(e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="e.g., 178520"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endFuel">Ending Fuel Level</Label>
                      <Select value={endFuel ?? undefined} onValueChange={setEndFuel}>
                        <SelectTrigger id="endFuel">
                          <SelectValue placeholder="Select fuel level" />
                        </SelectTrigger>
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
                    <Label htmlFor="postTripNotes">Post-Trip Notes</Label>
                    <Input
                      id="postTripNotes"
                      value={postTripNotes}
                      onChange={(e) => setPostTripNotes(e.target.value)}
                      placeholder="Report any incidents or issues."
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => { setEndOpen(false); setSelectedTrip(null); }}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={submitEnd}>
                      Confirm & End
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {trip.status === 'Completed' && (
            <Button variant="outline" onClick={() => openReview(trip)}>
              Leave Review
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }

  function TripList({ trips }: { trips: TripRow[] }) {
    return (
      <div className="space-y-4">
        {trips.length > 0 ? (
          trips.map((t) => <TripCard key={t.id} trip={t} />)
        ) : (
          <p className="py-8 text-center text-muted-foreground">
            {loading ? 'Loading…' : 'No trips in this category.'}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold font-headline">My Trips</h1>
        <p className="text-muted-foreground">View your active, upcoming, and completed trips.</p>
      </div>

      <Tabs defaultValue="active">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Active ({activeTrips.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcomingTrips.length})</TabsTrigger>
          <TabsTrigger value="completed">Past ({completedTrips.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <TripList trips={activeTrips} />
        </TabsContent>
        <TabsContent value="upcoming" className="mt-4">
          <TripList trips={upcomingTrips} />
        </TabsContent>
        <TabsContent value="completed" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Past Logs</CardTitle>
              <CardDescription>Completed trips for your review.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trip ID</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedTrips.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">#{log.id.slice(-4)}</TableCell>
                    <TableCell>{log.vehicle.make} {log.vehicle.model}</TableCell>
                    <TableCell>
                      <ClientFormattedDate date={log.startTime ?? ''} />
                    </TableCell>
                    <TableCell>
                      {((log.endOdometer ?? 0) - (log.startOdometer ?? 0)).toLocaleString()} km
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openReview(log)}>
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
              {completedTrips.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">No completed logs to display.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PostTripReviewModal
        tripId={reviewTripId}
        open={reviewOpen}
        onOpenChange={(open) => {
          setReviewOpen(open);
          if (!open) setReviewTripId(null);
        }}
        onSubmitted={loadTrips}
      />
    </div>
  );
}
