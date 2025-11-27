'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { mockTrips, mockUsers, mockRequests } from '@/lib/mock-data';
import type { Trip } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Fuel, Gauge, Car, User, Calendar, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ClientFormattedDate } from '@/components/client-formatted-date';


// Mocking trip log data based on completed trips
const mockTripLogs = mockTrips
    .filter(t => t.status === 'Completed')
    .map(trip => ({
        ...trip,
        startFuel: 'Full',
        endFuel: '1/2 Tank',
        preTripNotes: 'Vehicle is clean and in good condition.',
        postTripNotes: 'Slight vibration felt at high speeds.'
    }));


export default function FleetManagerTripLogsPage() {
  const [selectedLog, setSelectedLog] = useState<Trip | null>(null);

  const getRequestDetails = (requestId: string) => {
    return mockRequests.find(r => r.id === requestId);
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold font-headline">Driver Trip Logs</h1>
        <p className="text-muted-foreground">Review submitted logs for all completed trips.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Logs</CardTitle>
          <CardDescription>Browse through the trip logs from all drivers.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trip ID</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockTripLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs">#{log.id.slice(-4)}</TableCell>
                  <TableCell>{log.driver.name}</TableCell>
                  <TableCell>{log.vehicle.make} {log.vehicle.model}</TableCell>
                  <TableCell><ClientFormattedDate date={log.startTime} /></TableCell>
                  <TableCell className="text-right">
                    <Dialog onOpenChange={(isOpen) => !isOpen && setSelectedLog(null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedLog(log)}>View Log</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Log for Trip #{selectedLog?.id.slice(-4)}</DialogTitle>
                          <p className="text-sm text-muted-foreground">
                            {selectedLog?.vehicle.make} {selectedLog?.vehicle.model} - Driven by {selectedLog?.driver.name}
                          </p>
                        </DialogHeader>
                        {selectedLog && (
                             <div className="grid gap-6 py-4 text-sm">
                                <div className="grid grid-cols-2 gap-4">
                                     <div className="flex items-start gap-3">
                                        <Calendar className="mt-1 h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="font-semibold">Trip Date</p>
                                            <p className="text-muted-foreground"><ClientFormattedDate date={selectedLog.startTime} /></p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Car className="mt-1 h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="font-semibold">Vehicle</p>
                                            <p className="text-muted-foreground">{selectedLog.vehicle.make} {selectedLog.vehicle.model}</p>
                                        </div>
                                    </div>
                                     <div className="flex items-start gap-3">
                                        <User className="mt-1 h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="font-semibold">Driver</p>
                                            <p className="text-muted-foreground">{selectedLog.driver.name}</p>
                                        </div>
                                    </div>
                                     <div className="flex items-start gap-3">
                                        <FileText className="mt-1 h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="font-semibold">Purpose</p>
                                            <p className="text-muted-foreground">{getRequestDetails(selectedLog.requestId)?.purpose}</p>
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
                                                <p className="text-muted-foreground">{selectedLog.startOdometer.toLocaleString()} km</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Fuel className="mt-1 h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="font-semibold">Starting Fuel</p>
                                                <p className="text-muted-foreground">{mockTripLogs.find(l=>l.id === selectedLog.id)?.startFuel}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                         <h4 className="font-semibold">Post-Trip</h4>
                                        <div className="flex items-start gap-3">
                                            <Gauge className="mt-1 h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="font-semibold">Ending Odometer</p>
                                                <p className="text-muted-foreground">{selectedLog.endOdometer?.toLocaleString()} km</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Fuel className="mt-1 h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="font-semibold">Ending Fuel</p>
                                                <p className="text-muted-foreground">{mockTripLogs.find(l=>l.id === selectedLog.id)?.endFuel}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                 <Separator />
                                 <div className="space-y-2">
                                     <h4 className="font-semibold">Notes</h4>
                                     <p className="text-muted-foreground text-xs p-3 bg-muted rounded-md"><strong>Pre-Trip: </strong>{mockTripLogs.find(l=>l.id === selectedLog.id)?.preTripNotes}</p>
                                     <p className="text-muted-foreground text-xs p-3 bg-muted rounded-md"><strong>Post-Trip: </strong>{mockTripLogs.find(l=>l.id === selectedLog.id)?.postTripNotes}</p>
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
           {mockTripLogs.length === 0 && <p className="py-8 text-center text-muted-foreground">No trip logs found.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
