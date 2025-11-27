'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Car, User, MapPin } from 'lucide-react';
import { mockRequests, mockTrips } from '@/lib/mock-data';
import type { TripLite } from '@/lib/types';
import { ClientFormattedDate } from '@/components/client-formatted-date';
import { apiGet } from '@/lib/apiClient';
import { unpackArrayOrData } from '@/lib/utils';

export default function TripsPage() {
  const [trips, setTrips] = useState<TripLite[]>([] as any);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const payload = await apiGet<TripLite[] | { data: TripLite[] }>('/trips');
        const list = unpackArrayOrData<TripLite>(payload);
        if (mounted && list.length) setTrips(list);
        if (mounted && !list.length) setTrips(mockTrips as any);
      } catch {
        if (mounted) setTrips(mockTrips as any);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const upcomingTrips = trips.filter(trip => trip.status === 'Upcoming');
  const activeTrips = trips.filter(trip => trip.status === 'Active');

  const TripCard = ({ trip }: { trip: TripLite }) => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Trip #{trip.id.slice(-4)}</CardTitle>
          <Badge
            variant={trip.status === 'Active' ? 'default' : 'secondary'}
            className={trip.status === 'Active' ? 'bg-green-500 text-white' : ''}
          >
            {trip.status === 'Active' && <Clock className="mr-1 h-3 w-3 animate-pulse" />}
            {trip.status}
          </Badge>
        </div>
        <CardDescription>Request ID: {trip.requestId ?? '—'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <div className="flex items-start gap-3">
            <Car className="mt-1 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-semibold">
                {trip.vehicle?.make} {trip.vehicle?.model}
              </p>
              <p className="text-muted-foreground">{trip.vehicle?. plate_number}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <User className="mt-1 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-semibold">{trip.driver?.name}</p>
              <p className="text-muted-foreground">Assigned Driver</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="mt-1 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-semibold">Departure Time</p>
              <p className="text-muted-foreground">
                <ClientFormattedDate date={trip.startTime ?? ''} />

              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="mt-1 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-semibold">Destination</p>
              <p className="text-muted-foreground">
                {trip.destination ??
                  (mockRequests.find(r => r.id === trip.requestId)?.destination ?? '—')}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid gap-6">
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold font-headline">Trips</h1>
        <p className="text-muted-foreground">Monitor and manage ongoing and upcoming trips.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div>
          <h2 className="mb-4 text-xl font-semibold">In Progress ({activeTrips.length})</h2>
          <div className="space-y-4">
            {activeTrips.length > 0 ? activeTrips.map(trip => <TripCard key={trip.id} trip={trip} />) : (
              <p className="text-muted-foreground">No active trips.</p>
            )}
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-xl font-semibold">Upcoming ({upcomingTrips.length})</h2>
          <div className="space-y-4">
            {upcomingTrips.length > 0 ? upcomingTrips.map(trip => <TripCard key={trip.id} trip={trip} />) : (
              <p className="text-muted-foreground">No upcoming trips.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
