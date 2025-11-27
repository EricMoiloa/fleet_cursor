'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { apiGet, apiPost } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { ClientFormattedDate } from '@/components/client-formatted-date';

export type PostTripReviewModalProps = {
  tripId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
};

type TripDetail = {
  id: string;
  origin?: string | null;
  destination?: string | null;
  purpose?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  vehicle?: {
    make?: string | null;
    model?: string | null;
    plate_number?: string | null;
  } | null;
};

export function PostTripReviewModal({ tripId, open, onOpenChange, onSubmitted }: PostTripReviewModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [rating, setRating] = useState<string>('5');
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!open || !tripId) {
      setTrip(null);
      setRating('5');
      setComment('');
      return;
    }

    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const list = await apiGet<any>('/trips');
        const found = (list?.data ?? list ?? []).find((t: any) => String(t.id) === String(tripId));
        if (mounted) setTrip(found ?? null);
      } catch (e: any) {
        if (mounted) {
          toast({
            variant: 'destructive',
            title: 'Could not load trip',
            description: e?.message || 'Failed to fetch trip details.',
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open, tripId, toast]);

  const handleSubmit = async () => {
    if (!tripId) return;
    setLoading(true);
    try {
      await apiPost(`/trips/${encodeURIComponent(tripId)}/review`, {
        rating: Number(rating),
        comment: comment || undefined,
      });
      toast({ description: 'Review submitted successfully.' });
      onOpenChange(false);
      onSubmitted?.();
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Could not submit review',
        description: e?.message || 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Post-Trip Review</DialogTitle>
        </DialogHeader>

        {trip ? (
          <div className="space-y-4">
            <div className="rounded-lg border p-3 text-sm">
              <p className="font-semibold">{trip.destination || 'Trip'} </p>
              <p className="text-muted-foreground">{trip.origin || '—'} → {trip.destination || '—'}</p>
              <p className="text-muted-foreground">
                {trip.start_time ? <ClientFormattedDate date={trip.start_time} /> : 'Date not set'}
              </p>
              {trip.vehicle ? (
                <p className="text-muted-foreground">
                  Vehicle: {trip.vehicle.make ?? ''} {trip.vehicle.model ?? ''} {trip.vehicle.plate_number ? `(${trip.vehicle.plate_number})` : ''}
                </p>
              ) : null}
            </div>

            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="rating">Rate your trip</Label>
                <Select value={rating} onValueChange={setRating} disabled={loading}>
                  <SelectTrigger id="rating">
                    <SelectValue placeholder="Choose a rating" />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map((r) => (
                      <SelectItem key={r} value={String(r)}>
                        {r} star{r === 1 ? '' : 's'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="comment">Comments</Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="How was the vehicle and driver?"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Submitting…' : 'Submit Review'}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{loading ? 'Loading trip details…' : 'Trip not found.'}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
