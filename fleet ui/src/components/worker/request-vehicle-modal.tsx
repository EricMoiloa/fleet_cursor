'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from '@/components/ui/select';
import type { RequestVehicleForm, Vehicle } from '@/lib/types';

export type RequestVehicleModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (form: RequestVehicleForm) => Promise<void> | void; // REQUIRED
  submitting?: boolean;
  vehicles?: Pick<Vehicle, 'id' | 'make' | 'model' | 'plate_number' | 'type'>[];
  selectedVehicleId?: string;
};

export function RequestVehicleModal({
  isOpen,
  onOpenChange,
  onSubmit,
  submitting,
  vehicles = [],
  selectedVehicleId,
}: RequestVehicleModalProps) {
  const [form, setForm] = React.useState<RequestVehicleForm>({
    purpose: '',
    origin: '',
    destination: '',
    datetime: '',
    requested_vehicle_type: undefined,
    vehicle_id: selectedVehicleId ?? undefined,
  });

  React.useEffect(() => {
    setForm((f) => ({ ...f, vehicle_id: selectedVehicleId ?? undefined }));
  }, [selectedVehicleId]);

  const handleChange = (key: keyof RequestVehicleForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof onSubmit !== 'function') {
      console.error('[RequestVehicleModal] Missing onSubmit prop');
      return;
    }
    await onSubmit(form);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request a Vehicle</DialogTitle>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="purpose">Purpose</Label>
            <Textarea
              id="purpose"
              value={form.purpose ?? ''}
              onChange={(e) => handleChange('purpose', e.target.value)}
              placeholder="Meeting in town, site visit, delivery, …"
            />
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="origin">Origin</Label>
              <Input
                id="origin"
                value={form.origin ?? ''}
                onChange={(e) => handleChange('origin', e.target.value)}
                placeholder="HQ, Dept office, …"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="destination">Destination</Label>
              <Input
                id="destination"
                value={form.destination ?? ''}
                onChange={(e) => handleChange('destination', e.target.value)}
                placeholder="Maseru, Maputsoe, …"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="datetime">Date &amp; Time</Label>
            <Input
              id="datetime"
              type="datetime-local"
              value={form.datetime ?? ''}
              onChange={(e) => handleChange('datetime', e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Vehicle type</Label>
            <Select
              value={form.requested_vehicle_type ?? ''}
              onValueChange={(v) => handleChange('requested_vehicle_type', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select preferred type" />
              </SelectTrigger>
              <SelectContent>
                {vehicles
                  .map((v) => v.type)
                  .filter(Boolean)
                  .filter((value, index, self) => self.indexOf(value) === index)
                  .map((type) => (
                    <SelectItem key={type} value={type!}>
                      {type}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Vehicle</Label>
            <Select
              value={form.vehicle_id ?? ''}
              onValueChange={(v) => handleChange('vehicle_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select vehicle (optional)" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {(v.make || '') + ' ' + (v.model || '')}
                    {v.plate_number ? (
                      <span className="text-muted-foreground"> · {v.plate_number}</span>
                    ) : null}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={!!submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!!submitting}>
              {submitting ? 'Submitting…' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
