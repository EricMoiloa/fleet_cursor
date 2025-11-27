<?php

namespace App\Http\Controllers;

use App\Models\Trip;
use App\Models\FuelLog;
use App\Models\Vehicle;
use App\Models\DispatchRequest;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Carbon;

class TripController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $q = Trip::with(['vehicle','driver','request'])->orderByDesc('id');

        if ($user->hasRole('Driver')) {
            $q->where('driver_id', $user->id);
        } else {
            $q->where('ministry_id', $user->ministry_id);
        }

        if ($status = $request->query('status')) {
            $q->where('status', $status);
        }

        // active=true → only in_progress
        if ($request->boolean('active', false)) {
            $q->where('status', 'in_progress');
        }

        // scope=active_upcoming → include all startable/upcoming-y states
        if ($request->query('scope') === 'active_upcoming') {
            $q->whereIn('status', ['in_progress', 'pending', 'approved', 'pending_fleet', 'upcoming', 'booked', 'assigned','queued']);
        }

        return $q->paginate(50);
    }

    /** POST /api/v1/trips/{trip}/start */
    public function start(Request $request, Trip $trip): JsonResponse
    {
        // Accept numeric (string or number) for odometer_out
        $data = $request->validate([
            'odometer_out'   => ['required','numeric','min:0'],
            // Optional pre-trip fields (kept for later use)
            'pre.fuel'       => ['nullable','string'],
            'pre.notes'      => ['nullable','string'],
            'pre.checklist'  => ['array'],
        ]);

        // Allow the common booking states too
        $startable = ['pending','approved','pending_fleet','upcoming','assigned','booked','queued'];
        if (!in_array($trip->status, $startable, true)) {
            return response()->json(['error' => 'Trip cannot be started from current state.'], 422);
        }

        $trip->start((int) $data['odometer_out']);   // model helper sets in_progress/started_at

        if ($v = Vehicle::find($trip->vehicle_id)) { // keep vehicle assigned to the driver
            $v->update(['status' => 'assigned', 'current_driver_id' => $trip->driver_id]);
        }

        return response()->json([
            'message' => 'Trip started',
            'trip'    => $trip->fresh(['vehicle','driver','request']),
        ], 200);
    }

    /** POST /api/v1/trips/{trip}/end */
    public function end(Request $request, Trip $trip): JsonResponse
    {
        // accept numeric; cast to int for consistent comparison
        try {
            $data = $request->validate([
                'odometer_in' => ['required','numeric','min:0'],
                // Optional post-trip fields
                'post.fuel'   => ['nullable','string'],
                'post.notes'  => ['nullable','string'],
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'error'   => 'Validation failed',
                'details' => $e->errors(),
            ], 422);
        }

        $odoIn = (int) $data['odometer_in'];

        if ($trip->status !== 'in_progress') {
            return response()->json(['error' => 'Only in-progress trips can be completed.'], 422);
        }
        if (!is_null($trip->odometer_out) && $odoIn < (int) $trip->odometer_out) {
            return response()->json(['error' => 'Ending odometer cannot be less than starting.'], 422);
        }

        $trip->finish($odoIn);

        if ($v = Vehicle::find($trip->vehicle_id)) {
            $this->applyVehicleCompletionState($v, $trip);
        }

        if ($trip->request_id) {
            DispatchRequest::where('id', $trip->request_id)
                ->update(['requires_worker_review' => true]);
        }

        return response()->json([
            'message' => 'Trip completed',
            'trip'    => $trip->fresh(['vehicle','driver','request']),
        ], 200);
    }

    public function addFuel(Request $request, Trip $trip): JsonResponse
    {
        $this->denyIfNotDriverOrManager($request->user(), $trip);

        $data = $request->validate([
            'filled_at'  => 'required|date',
            'litres'     => 'required|numeric|min:0.01',
            'unit_price' => 'nullable|numeric|min:0',
            'amount'     => 'nullable|numeric|min:0',
            'odometer'   => 'nullable|integer|min:0',
            'station'    => 'nullable|string|max:150',
        ]);

        $log = FuelLog::create([
            'trip_id'    => $trip->id,
            'vehicle_id' => $trip->vehicle_id,
            'driver_id'  => $request->user()->id,
        ] + $data);

        return response()->json(['message' => 'Fuel logged', 'data' => $log], 201);
    }

    public function driverAssignments(Request $request): JsonResponse
    {
        $user = $request->user();

        // Fetch driver’s trips once
        $trips = Trip::query()
            ->with('request:id,start_at,purpose,origin,destination')
            ->where('driver_id', $user->id)
            ->orderByDesc('id')
            ->get(['id','status','vehicle_id','driver_id','request_id','odometer_out','odometer_in','started_at','ended_at']);

        $active = $trips->firstWhere('status', 'in_progress');

        // Next can be in any pre-start state (covers FM assignment flow)
        $next = $active ? null : $trips->firstWhere(
            fn ($t) => in_array($t->status, ['pending','approved','pending_fleet','upcoming','booked','assigned','queued'], true)
        );

        // 1) Prefer the vehicle where the user is the current driver (after Start)
        $vehicle = Vehicle::query()
            ->where('ministry_id', $user->ministry_id)
            ->where('current_driver_id', $user->id)
            ->first(['id','plate_number','make','model','status']);

        // 2) Fallback: if no "current_driver" vehicle yet, show the vehicle from the upcoming assignment
        if (!$vehicle && $next && $next->vehicle_id) {
            $vehicle = Vehicle::query()
                ->where('ministry_id', $user->ministry_id)
                ->find($next->vehicle_id, ['id','plate_number','make','model','status']);
        }

        $shape = function ($t) {
            if (!$t) return null;

            $startIso = $t->started_at
                ? $t->started_at->toISOString()
                : (optional($t->request)->start_at ? optional($t->request)->start_at->toISOString() : null);

            return [
                'id'           => $t->id,
                'status'       => $t->status,
                'vehicle_id'   => $t->vehicle_id,
                'purpose'      => optional($t->request)->purpose,
                'origin'       => optional($t->request)->origin,
                'destination'  => optional($t->request)->destination,
                'start_time'   => $startIso,
                'end_time'     => $t->ended_at ? $t->ended_at->toISOString() : null,
                'odometer_out' => $t->odometer_out,
                'odometer_in'  => $t->odometer_in,
            ];
        };

        return response()->json([
            'vehicle'     => $vehicle,          // now shows assigned OR upcoming vehicle
            'active_trip' => $shape($active),
            'next_trip'   => $active ? null : $shape($next),
        ]);
    }

    /** tiny gate */
    private function denyIfNotDriverOrManager($user, Trip $trip): void
    {
        if ($user->hasRole('Driver') && $user->id !== $trip->driver_id) {
            abort(403, 'Not your trip');
        }
        // Fleet Manager / Ministry Admin are allowed implicitly
    }

    private function applyVehicleCompletionState(Vehicle $vehicle, Trip $trip): void
    {
        $vehicle->current_driver_id = null;

        if (!is_null($trip->odometer_in)) {
            $distance = max(0, (int)$trip->odometer_in - (int) ($trip->odometer_out ?? $trip->odometer_in));
            if ($distance > 0) {
                $this->rollMileage($vehicle, $distance);
            }
            $vehicle->odometer = $trip->odometer_in;
        }

        if ($vehicle->next_service_odometer && $vehicle->odometer >= $vehicle->next_service_odometer) {
            $vehicle->status = 'maintenance_due';
        } else {
            $vehicle->status = 'available';
        }

        $vehicle->save();
    }

    private function rollMileage(Vehicle $vehicle, int $distance): void
    {
        $now = Carbon::now();
        $periodStart = $vehicle->mileage_period_start
            ? Carbon::parse($vehicle->mileage_period_start)
            : null;

        if (!$periodStart || !$periodStart->isSameMonth($now)) {
            $vehicle->mileage_period_start = $now->copy()->startOfMonth();
            $vehicle->month_to_date_mileage = 0;
        }

        $vehicle->month_to_date_mileage = (int)$vehicle->month_to_date_mileage + $distance;
    }
}
