<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
use App\Models\Vehicle;
use App\Models\Trip;
use App\Models\User;
use App\Models\DispatchRequest;

class FleetManagerController extends Controller
{
    /**
     * GET /api/v1/dispatch-requests
     * List requests visible to Fleet Manager (and optionally Ministry Admin).
     * Includes supervisor_decision so the UI can show “Approved by Supervisor”.
     */
    public function index(Request $request)
    {
        $me = $request->user()->load('role','ministry');

        if (! in_array(($me->role->name ?? ''), ['Fleet Manager','Ministry Admin'], true)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $rows = DB::table('dispatch_requests as dr')
            ->leftJoin('users as u', 'u.id', '=', 'dr.requested_by')
            ->leftJoin('departments as d', 'd.id', '=', 'dr.department_id')
            ->leftJoin('vehicles as v', 'v.id', '=', 'dr.vehicle_id')
            ->where('dr.ministry_id', $me->ministry_id)
            ->orderByDesc('dr.created_at')
            ->get([
                'dr.id','dr.status','dr.purpose','dr.requested_vehicle_type','dr.origin','dr.destination',
                'dr.start_at','dr.end_at','dr.created_at','dr.supervisor_decision',
                'dr.requires_worker_review','dr.queue_position','dr.department_id',
                'd.name as department_name',

                'u.id as requester_id','u.name as requester_name','u.email as requester_email',

                'v.id as vehicle_id','v.make as vehicle_make','v.model as vehicle_model','v.plate_number',
            ])->map(function ($r) {
                return [
                    'id'          => $r->id,
                    'status'      => $r->status,
                    'purpose'     => $r->purpose,
                    'requested_vehicle_type' => $r->requested_vehicle_type,
                    'origin'      => $r->origin,
                    'destination' => $r->destination,
                    'start_at'    => $r->start_at,
                    'end_at'      => $r->end_at,
                    'created_at'  => $r->created_at,
                    'supervisor_decision' => $r->supervisor_decision,
                    'requires_worker_review' => (bool) $r->requires_worker_review,
                    'queue_position' => $r->queue_position,
                    'department'  => [
                        'id'   => $r->department_id,
                        'name' => $r->department_name,
                    ],
                    'requested_by_user' => [
                        'id'    => $r->requester_id,
                        'name'  => $r->requester_name,
                        'email' => $r->requester_email,
                    ],
                    'vehicle' => $r->vehicle_id ? [
                        'id'           => $r->vehicle_id,
                        'make'         => $r->vehicle_make,
                        'model'        => $r->vehicle_model,
                        'plate_number' => $r->plate_number,
                    ] : null,
                ];
            });

        return response()->json(['data' => $rows], 200);
    }


     public function vehicles(Request $request)
    {
        $me = $request->user()->load('role');
        if (! in_array(($me->role->name ?? ''), ['Fleet Manager','Ministry Admin'], true)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $typeFilter = $request->query('type');
        $ownership  = $request->query('ownership_type');

        $rows = Vehicle::query()
            ->where('ministry_id', $me->ministry_id)
            ->when($typeFilter, fn ($q, $type) => $q->where('type', $type))
            ->when($ownership, fn ($q, $own) => $q->where('ownership_type', $own))
            ->whereNull('retired_at')
            ->whereNotIn('status', ['in_maintenance'])
            ->orderByDesc(DB::raw('COALESCE(monthly_mileage_limit - month_to_date_mileage, 1000000)'))
            ->get(['id','plate_number','make','model','status','ownership_type','monthly_mileage_limit','month_to_date_mileage']);

        $data = $rows->map(function ($vehicle) {
            $remaining = null;
            if ($vehicle->monthly_mileage_limit) {
                $remaining = max((int)$vehicle->monthly_mileage_limit - (int)$vehicle->month_to_date_mileage, 0);
            }
            return [
                'id'                 => $vehicle->id,
                'plate_number'       => $vehicle->plate_number,
                'make'               => $vehicle->make,
                'model'              => $vehicle->model,
                'status'             => $vehicle->status,
                'ownership_type'     => $vehicle->ownership_type,
                'remaining_mileage'  => $remaining,
                'monthly_mileage_limit' => $vehicle->monthly_mileage_limit,
            ];
        });

        return response()->json(['data' => $data], 200);
    }

    /** GET /api/v1/fleet/drivers */
    public function drivers(Request $request)
    {
        $me = $request->user()->load('role');
        if (! in_array(($me->role->name ?? ''), ['Fleet Manager','Ministry Admin'], true)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        // Busy drivers = have an in_progress trip
        $busyIds = Trip::where('status', 'in_progress')->pluck('driver_id')->filter()->all();

        $drivers = User::query()
            ->where('ministry_id', $me->ministry_id)
            ->whereHas('role', fn ($q) => $q->where('name', 'Driver'))
            ->orderBy('name')
            ->get(['id','name','email']);

        $out = $drivers->map(fn ($d) => [
            'id'    => (int) $d->id,
            'name'  => $d->name,
            'email' => $d->email,
            'busy'  => in_array((int)$d->id, $busyIds, true),
        ]);

        return response()->json(['data' => $out], 200);
    }


    /**
     * POST /api/v1/fleet/requests/{id}/decide
     * Body: { decision: 'approve' | 'reject' }
     */
    public function decide(Request $request, $id)
    {
        $me = $request->user()->load('role');
        if (! in_array(($me->role->name ?? ''), ['Fleet Manager','Ministry Admin'], true)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'decision'   => 'required|string|in:approve,reject',
            'vehicle_id' => 'required_if:decision,approve|integer|exists:vehicles,id',
            'driver_id'  => 'required_if:decision,approve|integer|exists:users,id',
        ]);

        $dispatch = DispatchRequest::findOrFail($id);

        if ((int)$dispatch->ministry_id !== (int)$me->ministry_id) {
            return response()->json(['error' => 'Forbidden (cross-ministry)'], 403);
        }

        $status = strtolower($dispatch->status ?? '');
        $decision = strtolower($dispatch->supervisor_decision ?? '');
        $allowedStatuses = ['pending','pending_fleet','queued'];
        if (!in_array($status, $allowedStatuses, true) || $decision !== 'approved') {
            return response()->json([
                'error' => 'Request cannot be decided in its current state',
                'status' => $dispatch->status,
                'supervisor_decision' => $dispatch->supervisor_decision,
            ], 422);
        }

        if ($data['decision'] === 'reject') {
            $dispatch->update([
                'status'           => 'denied',
                'queue_position'   => null,
                'vehicle_id'       => null,
                'driver_id'        => null,
                'updated_at'       => now(),
            ]);
            return response()->json(['message' => 'Request rejected by Fleet'], 200);
        }

        $vehicle = Vehicle::where('id', $data['vehicle_id'])
            ->where('ministry_id', $me->ministry_id)
            ->first();
        if (!$vehicle) {
            return response()->json(['error' => 'Vehicle not in ministry'], 422);
        }
        if ($vehicle->status === 'retired' || $vehicle->retired_at) {
            return response()->json(['error' => 'Retired vehicles cannot be assigned'], 422);
        }
        if ($vehicle->status === 'maintenance_due') {
            return response()->json(['error' => 'Vehicle is flagged for maintenance'], 422);
        }

        $driver = User::where('id', $data['driver_id'])
            ->where('ministry_id', $me->ministry_id)
            ->whereHas('role', fn($q) => $q->where('name','Driver'))
            ->first();

        if (!$driver) {
            return response()->json(['error' => 'Driver not valid for this ministry'], 422);
        }

        $startAt = $dispatch->start_at ? Carbon::parse($dispatch->start_at) : Carbon::now();
        $endAt   = $dispatch->end_at ? Carbon::parse($dispatch->end_at) : $startAt;

        $hasConflict = $this->vehicleHasConflict($vehicle->id, $startAt, $endAt, $dispatch->id);
        $queuePosition = $hasConflict ? $this->nextQueuePosition($vehicle->id) : 1;
        $requestStatus = $hasConflict ? 'queued' : 'approved';
        $tripStatus    = $hasConflict
            ? 'queued'
            : ($startAt->isFuture() ? 'upcoming' : 'pending');

        $trip = DB::transaction(function () use (
            $dispatch,
            $vehicle,
            $driver,
            $requestStatus,
            $queuePosition,
            $tripStatus
        ) {
            $dispatch->update([
                'status'         => $requestStatus,
                'vehicle_id'     => $vehicle->id,
                'driver_id'      => $driver->id,
                'queue_position' => $requestStatus === 'queued' ? $queuePosition : null,
                'updated_at'     => now(),
            ]);

            return Trip::updateOrCreate(
                ['request_id' => $dispatch->id],
                [
                    'vehicle_id'  => $vehicle->id,
                    'driver_id'   => $driver->id,
                    'ministry_id' => $dispatch->ministry_id,
                    'purpose'     => $dispatch->purpose ?? 'General Trip',
                    'origin'      => $dispatch->origin ?? 'Unknown',
                    'destination' => $dispatch->destination ?? 'Unknown',
                    'status'      => $tripStatus,
                    'started_at'  => null,
                    'ended_at'    => null,
                ]
            );
        });

        return response()->json([
            'message'         => $requestStatus === 'queued'
                ? 'Request approved and queued for the selected vehicle.'
                : 'Request approved and ready for dispatch.',
            'queue_position'  => $requestStatus === 'queued' ? $queuePosition : null,
            'trip'            => $trip->fresh(['vehicle','driver']),
        ], 200);
    }

    private function vehicleHasConflict(int $vehicleId, Carbon $startAt, ?Carbon $endAt, ?int $ignoreRequestId = null): bool
    {
        $activeTrip = Trip::where('vehicle_id', $vehicleId)
            ->where('status', 'in_progress')
            ->exists();

        if ($activeTrip) {
            return true;
        }

        $end = $endAt ?? $startAt;

        return DispatchRequest::query()
            ->where('vehicle_id', $vehicleId)
            ->when($ignoreRequestId, fn($q, $id) => $q->where('id', '!=', $id))
            ->whereIn('status', ['approved','queued'])
            ->whereNotNull('start_at')
            ->where(function ($q) use ($startAt, $end) {
                $q->whereBetween('start_at', [$startAt->copy()->subMinutes(1), $end])
                  ->orWhereBetween('end_at', [$startAt, $end])
                  ->orWhere(function ($cover) use ($startAt, $end) {
                      $cover->where('start_at', '<=', $startAt)
                            ->where(function ($inner) use ($end) {
                                $inner->whereNull('end_at')
                                      ->orWhere('end_at', '>=', $end);
                            });
                  });
            })
            ->exists();
    }

    private function nextQueuePosition(int $vehicleId): int
    {
        $max = DispatchRequest::where('vehicle_id', $vehicleId)->max('queue_position');
        return ($max ?? 0) + 1;
    }
}
