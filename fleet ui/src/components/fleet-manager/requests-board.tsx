'use client';

import { useMemo, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Check, X, MapPin, Calendar, User, Info } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ClientFormattedDate } from '@/components/client-formatted-date';
import type { FMRequest } from '@/lib/types';

/* ---------- helpers ---------- */

function statusBadge(s?: string) {
  const st = String(s ?? '').toLowerCase();
  if (st === 'pending' || st === 'pending_fleet' || st.includes('pending fleet')) {
    return <Badge className="bg-yellow-500 text-white hover:bg-yellow-500/90">Pending</Badge>;
  }
  if (st === 'denied' || st === 'rejected') return <Badge variant="destructive">Denied</Badge>;
  if (st.startsWith('approved')) return <Badge className="bg-blue-500 text-white">Approved</Badge>;
  if (st.startsWith('active')) return <Badge variant="secondary">Active</Badge>;
  if (st.startsWith('completed')) return <Badge className="bg-green-500 text-white">Completed</Badge>;
  return <Badge variant="secondary">{s ?? '—'}</Badge>;
}

// FMRequest.department is string | null in your types
function deptLabel(d?: FMRequest['department']) {
  return (d ?? '—') || '—';
}

// Accept both licensePlate and plate_number shapes safely
function vehicleLabel(v: FMRequest['vehicle']) {
  if (!v) return '—';
  const make = v.make ?? '';
  const model = v.model ?? '';
  const plate =
    (v as any).licensePlate ??
    (v as any).plate_number ??
    '';
  return `${make} ${model} ${plate}`.trim() || '—';
}

/** Supervisor decision badge — subtle and fits existing UI */
function SupervisorDecisionBadge({ decision }: { decision?: 'pending' | 'approved' | 'denied' }) {
  if (!decision || decision === 'pending') {
    return (
      <Badge variant="outline" className="border-amber-500/60 text-amber-600">
        Awaiting Supervisor
      </Badge>
    );
  }
  if (decision === 'approved') {
    return (
      <Badge variant="outline" className="border-green-500/70 text-green-600">
        Approved by Supervisor
      </Badge>
    );
  }
  return <Badge variant="destructive">Rejected by Supervisor</Badge>;
}

/* ---------- card ---------- */

function RequestCard({
  req,
  onApprove,
  onReject,
}: {
  req: FMRequest & { supervisorDecision?: 'pending' | 'approved' | 'denied' };
  onApprove?: (r: FMRequest) => void;
  onReject?: (r: FMRequest) => void;
}) {
  const [open, setOpen] = useState(false);

  const canAct = useMemo(() => {
    const st = String(req.status ?? '').toLowerCase();
    return st === 'pending' || st === 'pending_fleet' || st.includes('pending fleet') || st === 'queued';
  }, [req.status]);

  const requesterName = String(req.requester?.name ?? 'U');

  return (
    <Card key={String(req.id)} className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Req #{String(req.id).slice(-4)}</CardTitle>
          {statusBadge(req.status)}
        </div>

        {/* 👇 NEW: just below title, unobtrusive */}
        <div className="mt-1">
          <SupervisorDecisionBadge decision={(req as any).supervisorDecision} />
        </div>

        <CardDescription className="text-xs !mt-1">
          <ClientFormattedDate date={String(req.dateTime ?? '')} />
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-grow space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={''} />
            <AvatarFallback>{requesterName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{requesterName || '—'}</p>
            <p className="text-xs text-muted-foreground">{req.purpose ?? '—'}</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          <span className="font-semibold">Route:</span>{' '}
          {(req.origin ?? '—') + ' → ' + (req.destination ?? '—')}
        </p>

        {req.vehicle && (
          <p className="text-sm">
            <span className="font-semibold">Vehicle:</span> {vehicleLabel(req.vehicle)}
          </p>
        )}
      </CardContent>

      <CardFooter className="flex items-center gap-2">
        {/* Details modal */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Eye className="mr-2 h-4 w-4" /> Details
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Request Details</DialogTitle>
              <DialogDescription>Request ID: {String(req.id)}</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 text-sm">
              <div className="flex items-center gap-3 rounded-md bg-muted p-3">
                <Avatar>
                  <AvatarImage src={''} />
                  <AvatarFallback>{requesterName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{requesterName || '—'}</p>
                  {/* Add email later if needed */}
                </div>
              </div>

              <Separator />

              {/* 👇 place supervisor chip at top of details for clarity */}
              <div>
                <SupervisorDecisionBadge decision={(req as any).supervisorDecision} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Calendar className="mt-1 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">Requested</p>
                    <p className="text-muted-foreground">
                      <ClientFormattedDate date={String(req.dateTime ?? '')} />
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="mt-1 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">Department</p>
                    <p className="text-muted-foreground">{deptLabel(req.department)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 col-span-2">
                  <MapPin className="mt-1 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">Route</p>
                    <p className="text-muted-foreground">
                      {(req.origin ?? '—') + ' → ' + (req.destination ?? '—')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 col-span-2">
                  <Info className="mt-1 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">Purpose</p>
                    <p className="text-muted-foreground">{req.purpose ?? '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {canAct && onReject && (
          <Button variant="outline" size="sm" onClick={() => onReject(req)}>
            <X className="mr-2 h-4 w-4" /> Reject
          </Button>
        )}
        {canAct && onApprove && (
          <Button
            size="sm"
            className="bg-green-600 text-white hover:bg-green-600/90"
            onClick={() => onApprove(req)}
          >
            <Check className="mr-2 h-4 w-4" /> Approve
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

/* ---------- board ---------- */

export function RequestsBoard({
  requests,
  onApprove,
  onReject,
  showAll = false,
}: {
  requests: (FMRequest & { supervisorDecision?: 'pending' | 'approved' | 'denied' })[];
  onApprove?: (r: FMRequest) => void;
  onReject?: (r: FMRequest) => void;
  showAll?: boolean;
}) {
  const pending = useMemo(
    () =>
      (requests ?? []).filter((r) => {
        const st = String(r.status ?? '').toLowerCase();
        const noVehicleYet = !r.vehicle;
        return (
          st === 'pending' ||
          st === 'pending_fleet' ||
          st.includes('pending fleet') ||
          st === 'queued' ||
          (st === 'approved' && noVehicleYet)
        );
      }),
    [requests]
  );

  const booked = useMemo(
    () =>
      (requests ?? []).filter((r) => {
        const st = String(r.status ?? '').toLowerCase();
        return st === 'approved' || st === 'booked' || st === 'active';
      }),
    [requests]
  );

  const completed = useMemo(
    () =>
      (requests ?? []).filter((r) => {
        const st = String(r.status ?? '').toLowerCase();
        return st === 'completed' || st === 'denied' || st === 'rejected';
      }),
    [requests]
  );

  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <CardTitle>Requests Board</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">
              Pending <Badge className="ml-2">{pending.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="booked">
              Booked <Badge className="ml-2">{booked.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed <Badge className="ml-2">{completed.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              {pending.length > 0 ? (
                pending.slice(0, showAll ? undefined : 2).map((req) => (
                  <RequestCard
                    key={String(req.id)}
                    req={req as any}
                    onApprove={onApprove}
                    onReject={onReject}
                  />
                ))
              ) : (
                <p className="text-muted-foreground text-sm p-4">No pending requests.</p>
              )}
              {!showAll && pending.length > 2 && (
                <p className="text-muted-foreground text-sm px-4">and {pending.length - 2} more...</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="booked" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              {booked.length > 0 ? (
                booked.slice(0, showAll ? undefined : 2).map((req) => (
                  <RequestCard
                    key={String(req.id)}
                    req={req as any}
                    onApprove={onApprove}
                    onReject={onReject}
                  />
                ))
              ) : (
                <p className="text-muted-foreground text-sm p-4">No booked requests.</p>
              )}
              {!showAll && booked.length > 2 && (
                <p className="text-muted-foreground text-sm px-4">and {booked.length - 2} more...</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              {completed.length > 0 ? (
                completed.slice(0, showAll ? undefined : 2).map((req) => (
                  <RequestCard
                    key={String(req.id)}
                    req={req as any}
                    onApprove={onApprove}
                    onReject={onReject}
                  />
                ))
              ) : (
                <p className="text-muted-foreground text-sm p-4">No completed requests.</p>
              )}
              {!showAll && completed.length > 2 && (
                <p className="text-muted-foreground text-sm px-4">and {completed.length - 2} more...</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
