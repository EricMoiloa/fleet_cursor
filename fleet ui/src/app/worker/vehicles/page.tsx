'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Car, Clock, Wrench, CheckCircle, Book } from 'lucide-react';
import type { Vehicle, RequestVehicleForm } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { RequestVehicleModal } from '@/components/worker/request-vehicle-modal';
import { apiGet, apiPost } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

function normalizeVehicle(v: any): Vehicle {
  const raw = String(v.status ?? 'available').toLowerCase();
  const status =
    raw === 'available'       ? 'Available'   :
    raw === 'assigned'        ? 'Assigned'    :
    raw === 'in_maintenance'  ? 'Maintenance' :
    raw === 'inactive'        ? 'Unavailable' :
    (raw.charAt(0).toUpperCase() + raw.slice(1)) as Vehicle['status'];

  return {
    id: String(v.id),
    make: v.make ?? '',
    model: v.model ?? '',
    plate_number: v.plate_number ?? '',
    status,
    department_id: v.department_id ?? null,
  } as any;
}

export default function WorkerViewVehiclesPage() {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>();

  const loadVehicles = useCallback(async () => {
    const res = await apiGet<any>('/staff/vehicles');
    const list = (res?.data ?? res ?? []).map(normalizeVehicle);
    setVehicles(list);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadVehicles();
      } finally {
        setLoading(false);
      }
    })();
  }, [loadVehicles]);

  const handleBookClick = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setIsModalOpen(true);
  };

  const handleSubmitFromModal = async (form: RequestVehicleForm) => {
    const payload = {
      purpose: form?.purpose ?? '',
      origin: form?.origin ?? '',
      destination: form?.destination ?? '',
      start_at: form?.datetime ?? null,
      datetime: form?.datetime ?? null,
      vehicle_id: selectedVehicleId ?? form?.vehicle_id ?? undefined,
    };

    setLoading(true);
    try {
      await apiPost('/staff/requests', payload);
      toast({ description: 'Booking request submitted for approval.' });
      setIsModalOpen(false);
      setSelectedVehicleId(undefined);
      await loadVehicles();
    } catch (e: any) {
      const serverMsg =
        e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Failed to submit booking.';
      toast({ variant: 'destructive', description: serverMsg });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: Vehicle['status']) => {
    switch (status) {
      case 'Available':
        return <CheckCircle className="h-4 w-4" />;
      case 'Assigned':
        return <Clock className="h-4 w-4" />;
      case 'Maintenance':
        return <Wrench className="h-4 w-4" />;
      default:
        return <Car className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: Vehicle['status']) => {
    switch (status) {
      case 'Available':
        return 'border-green-500/30 bg-green-500/20 text-green-700 dark:text-green-400';
      case 'Assigned':
        return 'border-blue-500/30 bg-blue-500/20 text-blue-700 dark:text-blue-400';
      case 'Maintenance':
        return 'border-orange-500/30 bg-orange-500/20 text-orange-700 dark:text-orange-400';
      default:
        return '';
    }
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold font-headline">Vehicle Fleet</h1>
        <p className="text-muted-foreground">View availability and book a vehicle.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Vehicles</CardTitle>
          <CardDescription>Overview of the entire vehicle fleet.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>License Plate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Car className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p>
                          {vehicle.make} {vehicle.model}
                          {vehicle?.year ? <span className="text-muted-foreground"> · {vehicle.year}</span> : null}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{vehicle.plate_number || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(vehicle.status)}>
                      {getStatusIcon(vehicle.status)}
                      <span className="ml-2">{vehicle.status}</span>
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => handleBookClick(vehicle.id)}
                      disabled={loading || vehicle.status !== 'Available'}
                    >
                      <Book className="mr-2 h-4 w-4" />
                      Book
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RequestVehicleModal
        isOpen={isModalOpen}
        onOpenChange={(isOpen) => {
          setIsModalOpen(isOpen);
          if (!isOpen) setSelectedVehicleId(undefined);
        }}
        vehicles={vehicles.map((v) => ({
          id: v.id,
          make: v.make,
          model: v.model,
          plate_number: v.plate_number,
        }))}
        selectedVehicleId={selectedVehicleId}
        onSubmit={handleSubmitFromModal}
        submitting={loading}
      />
    </div>
  );
}
