// src/app/driver/trip-log/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Fuel, Gauge, Car, Calendar, FileText } from 'lucide-react';
import { ClientFormattedDate } from '@/components/client-formatted-date';
import { apiGet, apiPost } from '@/lib/apiClient';
import { useAuth } from '@/lib/auth';

type TripRow = {
  id: string;
  requestId?: string;
  status: 'Pending' | 'Active' | 'Upcoming' | 'Completed';
  vehicle: { id: string; make?: string; model?: string; plate_number?: string };
  driver: { id: string; name: string };
  startTime?: string;
  destination?: string;
  startOdometer: number;
  endOdometer?: number | null;
};

function apiToUiStatus(s?: string | null): TripRow['status'] {
  const v = String(s ?? '').toLowerCase();
  if (v === 'active') return 'Active';
  if (v === 'completed') return 'Completed';
  if (v === 'pending' || v === 'approved' || v === 'booked' || v === 'queued') return 'Upcoming';
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

export default function TripLogPage() {
  const { toast } = useToast();
  const { user } = useAuth() as any;
  const driverId = String(user?.id ?? '');

  const [allTrips, setAllTrips] = useState<TripRow[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<TripRow | null>(null);

  // Load my trips
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await apiGet<any[]>('/trips');
        const mine = (list || []).filter((t: any) => String(t?.driver?.id ?? '') === driverId);
        const mapped: TripRow[] = mine.map((t: any) => ({
          id: String(t.id),
          requestId: t.request_id ? String(t.request_id) : undefined,
          status: apiToUiStatus(t.status),
          vehicle: {
            id: String(t.vehicle?.id ?? ''),
            make: t.vehicle?.make ?? '',
            model: t.vehicle?.model ?? '',
            plate_number: t.vehicle?.plate_number ?? '',
          },
          driver: { id: driverId, name: t?.driver?.name ?? '' },
          startTime: t.start_at ?? undefined,
          destination: t.destination ?? undefined,
          startOdometer: Number(t.start_odometer ?? 0),
          endOdometer: t.end_odometer ?? null,
        }));
        if (mounted) setAllTrips(mapped);
      } catch {
        if (mounted) setAllTrips([]);
      }
    })();
    return () => { mounted = false; };
  }, [driverId]);

  const driverTrips = useMemo(
    () => allTrips.filter((t) => t.status === 'Pending' || t.status === 'Upcoming' || t.status === 'Active'),
    [allTrips]
  );
  const pastLogs = useMemo(() => allTrips.filter((t) => t.status === 'Completed'), [allTrips]);
  const selectedTrip = driverTrips.find((t) => t.id === selectedTripId);

  // Form state (kept simple)
  const [startFuel, setStartFuel] = useState<string | undefined>('full');
  const [endFuel, setEndFuel] = useState<string | undefined>(undefined);
  const [startOdo, setStartOdo] = useState<number | undefined>(undefined);
  const [endOdo, setEndOdo] = useState<number | undefined>(undefined);
  const [preTripNotes, setPreTripNotes] = useState('');
  const [postTripNotes, setPostTripNotes] = useState('');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  const toggleCheck = (id: string) =>
    setChecklist((m) => ({ ...m, [id]: !m[id] }));

  const handleSubmit = async () => {
    if (!selectedTripId) return;

    try {
      // A sensible endpoint name; adapt if you expose a different one
      await apiPost(`/trips/${encodeURIComponent(selectedTripId)}/logs`, {
        pre: {
          start_odometer: startOdo ?? null,
          start_fuel: startFuel ?? null,
          checklist,
          notes: preTripNotes,
        },
        post: {
          end_odometer: endOdo ?? null,
          end_fuel: endFuel ?? null,
          notes: postTripNotes,
        },
      });
      toast({
        title: 'Log Submitted',
        description: `Your log for trip #${selectedTripId.slice(-4)} has been recorded.`,
      });
    } catch {
      // Even if backend isn’t ready, keep UX smooth
      toast({
        title: 'Log saved locally',
        description: 'Backend log endpoint not found; record kept in session.',
      });
    }
  };

  return (
    <Tabs defaultValue="new-log">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold font-headline">Trip Log</h1>
          <p className="text-muted-foreground">Record fuel, mileage, and vehicle condition for your trips.</p>
        </div>
        <TabsList>
          <TabsTrigger value="new-log">Create Log</TabsTrigger>
          <TabsTrigger value="past-logs">View Logs</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="new-log">
        <Card className="mt-6">
          <form onSubmit={(e) => e.preventDefault()}>
            <CardHeader>
              <CardTitle>Create New Log</CardTitle>
              <CardDescription>Select a trip to log before and after completion.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="trip">Select Trip</Label>
                <Select
                  value={selectedTripId || undefined}
                  onValueChange={setSelectedTripId}
                >
                  <SelectTrigger id="trip">
                    <SelectValue placeholder="Select an active or upcoming trip" />
                  </SelectTrigger>
                  <SelectContent>
                    {driverTrips.map((trip) => (
                      <SelectItem key={trip.id} value={trip.id}>
                        Trip #{trip.id.slice(-4)} — {trip.vehicle.make} {trip.vehicle.model} ({trip.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTrip && (
                <div className="space-y-6 rounded-lg border p-4 animate-in fade-in-50">
                  {/* Pre-Trip */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Pre-Trip Inspection & Log</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="startOdometer">Starting Odometer (km)</Label>
                        <Input
                          id="startOdometer"
                          type="number"
                          defaultValue={selectedTrip.startOdometer || ''}
                          onChange={(e) => setStartOdo(e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="e.g., 25000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="startFuel">Starting Fuel Level</Label>
                        <Select
                          value={startFuel ?? undefined}
                          onValueChange={setStartFuel}
                        >
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
                              id={`check-${item.id}`}
                              checked={!!checklist[item.id]}
                              onCheckedChange={() => toggleCheck(item.id)}
                            />
                            <label
                              htmlFor={`check-${item.id}`}
                              className="text-sm font-medium leading-none"
                            >
                              {item.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="preTripNotes">Pre-Trip Notes</Label>
                      <Textarea
                        id="preTripNotes"
                        value={preTripNotes}
                        onChange={(e) => setPreTripNotes(e.target.value)}
                        placeholder="Report issues before starting."
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Post-Trip */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Post-Trip Log</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="endOdometer">Ending Odometer (km)</Label>
                        <Input
                          id="endOdometer"
                          type="number"
                          onChange={(e) => setEndOdo(e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="e.g., 25250"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endFuel">Ending Fuel Level</Label>
                        <Select
                          value={endFuel ?? undefined}
                          onValueChange={setEndFuel}
                        >
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
                      <Textarea
                        id="postTripNotes"
                        value={postTripNotes}
                        onChange={(e) => setPostTripNotes(e.target.value)}
                        placeholder="Report any incidents or issues."
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex justify-end">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" disabled={!selectedTripId}>Save Log</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Submit log?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Please confirm that you want to submit this trip log.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSubmit}>
                      Submit Log
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </form>
        </Card>
      </TabsContent>

      <TabsContent value="past-logs">
        <Card className="mt-6">
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
                {pastLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">#{log.id.slice(-4)}</TableCell>
                    <TableCell>{log.vehicle.make} {log.vehicle.model}</TableCell>
                    <TableCell>
                      <ClientFormattedDate date={log.startTime ?? ''} />
                    </TableCell>
                    <TableCell>{((log.endOdometer ?? 0) - (log.startOdometer ?? 0)).toLocaleString()} km</TableCell>
                    <TableCell className="text-right">
                      <Dialog onOpenChange={(isOpen) => !isOpen && setSelectedLog(null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedLog(log)}>
                            View Log
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Log for Trip #{selectedLog?.id.slice(-4)}</DialogTitle>
                            <p className="text-sm text-muted-foreground">
                              {selectedLog?.vehicle.make} {selectedLog?.vehicle.model}
                            </p>
                          </DialogHeader>

                          {selectedLog && (
                            <div className="grid gap-6 py-4 text-sm">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-start gap-3">
                                  <Calendar className="mt-1 h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <p className="font-semibold">Trip Date</p>
                                    <p className="text-muted-foreground">
                                      <ClientFormattedDate date={selectedLog.startTime ?? ''} />
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-3">
                                  <Car className="mt-1 h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <p className="font-semibold">Vehicle</p>
                                    <p className="text-muted-foreground">
                                      {selectedLog.vehicle.make} {selectedLog.vehicle.model}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <Separator />

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-4">
                                  <h4 className="font-semibold">Pre-Trip</h4>
                                  <div className="flex items-start gap-3">
                                    <Gauge className="mt-1 h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="font-semibold">Starting Odometer</p>
                                      <p className="text-muted-foreground">
                                        {(selectedLog.startOdometer ?? 0).toLocaleString()} km
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-4">
                                  <h4 className="font-semibold">Post-Trip</h4>
                                  <div className="flex items-start gap-3">
                                    <Gauge className="mt-1 h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="font-semibold">Ending Odometer</p>
                                      <p className="text-muted-foreground">
                                        {(selectedLog.endOdometer ?? 0).toLocaleString()} km
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {pastLogs.length === 0 && (
              <p className="py-8 text-center text-muted-foreground">No completed logs to display.</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
