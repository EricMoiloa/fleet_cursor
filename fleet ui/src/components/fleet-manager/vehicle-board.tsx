'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, Clock, Wrench } from "lucide-react";
import type { Vehicle } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

function st(x?: string | null) { return String(x ?? '').toLowerCase().trim(); }

function normalizeStatus(x?: string | null): 'Available' | 'Assigned' | 'Maintenance' | 'Other' {
  const s = st(x);
  if (['available', 'idle', 'free'].includes(s)) return 'Available';
  if (['assigned', 'booked', 'in_use', 'inuse'].includes(s)) return 'Assigned';
  if (['maintenance', 'in_maintenance', 'repair', 'service'].includes(s)) return 'Maintenance';
  return 'Other';
}

export function VehicleBoard({ vehicles }: { vehicles: Vehicle[] }) {
  const normalized = (vehicles ?? []).map((v) => ({
    ...v,
    status: normalizeStatus((v as any).status),
  }));

  const availableVehicles   = normalized.filter(v => v.status === 'Available');
  const assignedVehicles    = normalized.filter(v => v.status === 'Assigned');
  const maintenanceVehicles = normalized.filter(v => v.status === 'Maintenance');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehicle Board</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="available">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="available">
              Available <Badge className="ml-2">{availableVehicles.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="assigned">
              Assigned <Badge className="ml-2">{assignedVehicles.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="maintenance">
              Maintenance <Badge className="ml-2">{maintenanceVehicles.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="mt-4">
            <div className="space-y-2">
              {availableVehicles.slice(0, 3).map((vehicle) => (
                <Card key={String((vehicle as any).id)}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <Car className="h-5 w-5" />
                    <div>
                      <p className="text-sm font-semibold">
                        {(vehicle as any).make} {(vehicle as any).model}
                      </p>
                      <p className="text-xs text-muted-foreground">{(vehicle as any).licensePlate}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {availableVehicles.length === 0 && (
                <p className="text-muted-foreground text-sm p-4 text-center">
                  No vehicles available.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="assigned" className="mt-4">
            <div className="space-y-2">
              {assignedVehicles.slice(0, 3).map((vehicle) => (
                <Card key={String((vehicle as any).id)}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <Clock className="h-5 w-5" />
                    <div>
                      <p className="text-sm font-semibold">
                        {(vehicle as any).make} {(vehicle as any).model}
                      </p>
                      <p className="text-xs text-muted-foreground">{(vehicle as any).licensePlate}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {assignedVehicles.length === 0 && (
                <p className="text-muted-foreground text-sm p-4 text-center">
                  No vehicles assigned.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="maintenance" className="mt-4">
            <div className="space-y-2">
              {maintenanceVehicles.slice(0, 3).map((vehicle) => (
                <Card key={String((vehicle as any).id)}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <Wrench className="h-5 w-5" />
                    <div>
                      <p className="text-sm font-semibold">
                        {(vehicle as any).make} {(vehicle as any).model}
                      </p>
                      <p className="text-xs text-muted-foreground">{(vehicle as any).licensePlate}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {maintenanceVehicles.length === 0 && (
                <p className="text-muted-foreground text-sm p-4 text-center">
                  No vehicles in maintenance.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
