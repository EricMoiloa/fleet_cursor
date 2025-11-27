'use client';

import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Check, X, Eye, Calendar, Info, MapPin } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { RequestStatus, RequestStatusUI, VehicleRequest, UserRole } from '@/lib/types';
import { ClientFormattedDate } from '@/components/client-formatted-date';

/* ---------- helpers ---------- */

function getStatusBadge(status: RequestStatusUI) {
  switch (status) {
    case 'Pending Supervisor':
      return (
        <Badge className="bg-yellow-500 text-white hover:bg-yellow-500/90">
          {status}
        </Badge>
      );
    case 'Denied':
      return <Badge variant="destructive">{status}</Badge>;
    case 'Pending':
      // This means "approved by supervisor → pending with fleet"
      return (
        <Badge variant="outline" className="border-green-500/80 bg-green-500/20 text-green-700 dark:text-green-400">
          Approved
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getImageUrl(id?: string): string {
  if (!id) return '';
  const image = PlaceHolderImages.find((img) => img.id === id);
  return image ? image.imageUrl : '';
}

/** Make sure the board can accept the UI-status union and a guaranteed string date */
export type RequestForBoard =
  Omit<VehicleRequest, 'status' | 'dateTime'> & {
    status: RequestStatus | RequestStatusUI;
    dateTime: string; // needed for <ClientFormattedDate />
  };

type BoardProps = {
  requests: RequestForBoard[];
  showAll?: boolean;
  onAction: (id: string, newStatus: RequestStatus) => void;
  userRole?: UserRole;    // kept for compatibility
  isReadOnly?: boolean;   // disables Approve/Deny and shows “Details” only
  busyId?: string | null; // disables buttons for the card currently acting
};

/* ---------- card ---------- */

function RequestCard({
  request,
  onAction,
  isReadOnly,
  busyId,
}: {
  request: RequestForBoard;
  onAction: (id: string, newStatus: RequestStatus) => void;
  isReadOnly?: boolean;
  busyId?: string | null;
}) {
  const canTakeAction = request.status === 'Pending Supervisor' && !isReadOnly;
  const waiting = busyId === request.id;

  return (
    <Card key={request.id} className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Req #{request.id.slice(-4)}</CardTitle>
          {getStatusBadge(request.status as RequestStatusUI)}
        </div>
        <CardDescription className="text-xs !mt-1">
          <ClientFormattedDate date={request.dateTime} />
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-grow space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={getImageUrl(request.requester?.avatarUrl)}
              alt={request.requester?.name ?? 'requester'}
            />
            <AvatarFallback>{(request.requester?.name ?? '?').charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{request.requester?.name ?? '-'}</p>
            <p className="text-xs text-muted-foreground">{request.purpose ?? ''}</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">
          <span className="font-semibold">Route:</span>{' '}
          {(request.origin ?? '—')} ➔ {(request.destination ?? '—')}
        </p>
      </CardContent>

      <CardFooter className="grid grid-cols-2 gap-2">
        {/* Details modal - always available */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Eye className="mr-2 h-4 w-4" />
              Details
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Request Details</DialogTitle>
              <DialogDescription>Request ID: {request.id}</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 text-sm">
              <div className="flex items-center gap-3 rounded-md bg-muted p-3">
                <Avatar>
                  <AvatarImage src={getImageUrl(request.requester?.avatarUrl)} />
                  <AvatarFallback>{(request.requester?.name ?? '?').charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{request.requester?.name ?? '-'}</p>
                  <p className="text-xs text-muted-foreground">{request.requester?.id ?? ''}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Calendar className="mt-1 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">Date &amp; Time</p>
                    <p className="text-muted-foreground">
                      <ClientFormattedDate date={request.dateTime} />
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Info className="mt-1 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">Purpose</p>
                    <p className="text-muted-foreground">{request.purpose ?? ''}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 col-span-2">
                  <MapPin className="mt-1 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">Route</p>
                    <p className="text-muted-foreground">
                      {(request.origin ?? '—')} ➔ {(request.destination ?? '—')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Approve / Deny (hidden if read-only or not pending supervisor) */}
        {canTakeAction ? (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={waiting}
              onClick={() => onAction(request.id, 'Denied')}
            >
              <X className="mr-2 h-4 w-4" />
              {waiting ? 'Working…' : 'Deny'}
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-600/90 text-white"
              disabled={waiting}
              onClick={() => onAction(request.id, 'Pending')}
            >
              <Check className="mr-2 h-4 w-4" />
              {waiting ? 'Working…' : 'Approve'}
            </Button>
          </>
        ) : (
          <div className="col-span-1" />
        )}
      </CardFooter>
    </Card>
  );
}

/* ---------- board ---------- */

export function SupervisorRequestsBoard({
  requests,
  showAll = false,
  onAction,
  userRole,      // not used currently; kept for compatibility
  isReadOnly = false,
  busyId = null,
}: BoardProps) {
  const display = showAll ? requests : requests.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isReadOnly ? 'All Requests' : 'Requests Awaiting Your Approval'}</CardTitle>
        {!isReadOnly && (
          <CardDescription>
            Review the requests below and either approve or deny them.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {/* xl shows 4 cards per row */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {display.length > 0 ? (
            display.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                onAction={onAction}
                isReadOnly={isReadOnly}
                busyId={busyId}
              />
            ))
          ) : (
            <p className="text-muted-foreground text-sm p-4 col-span-full text-center">
              No requests to display.
            </p>
          )}
        </div>

        {!showAll && requests.length > 3 && (
          <p className="text-muted-foreground text-center text-sm pt-4">
            and {requests.length - 3} more...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
