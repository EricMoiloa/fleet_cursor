<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

// ✅ you were missing these:
use App\Models\DispatchRequest;
use App\Models\User;

class StaffRequestController extends Controller
{
    /**
     * GET /api/v1/staff/requests
     */
    public function index(Request $request)
    {
        $me = $request->user()->load('role');
        if (($me->role->name ?? null) !== 'Staff') {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $rows = DB::table('dispatch_requests as dr')
            ->leftJoin('departments as d', 'd.id', '=', 'dr.department_id')
            ->select([
                'dr.id',
                'dr.status',
                'dr.purpose',
                'dr.requested_vehicle_type',
                'dr.origin',
                'dr.destination',
                'dr.start_at',
                'dr.end_at',
                'dr.created_at',
                'dr.department_id',
                'd.name as department_name',
                'dr.supervisor_decision',
                'dr.requires_worker_review',
                'dr.queue_position',
            ])
            ->where('dr.requested_by', $me->id)
            ->orderByDesc('dr.created_at')
            ->get();

        $data = $rows->map(function ($r) {
            return [
                'id'          => $r->id,
                'status'      => $r->status,
                'purpose'     => $r->purpose,
                'requested_vehicle_type' => $r->requested_vehicle_type,
                'origin'      => $r->origin,
                'destination' => $r->destination,
                'date_time'   => $r->start_at,
                'created_at'  => $r->created_at,
                'supervisor_decision' => $r->supervisor_decision, // handy for your UI chip
                'requires_worker_review' => (bool) $r->requires_worker_review,
                'queue_position' => $r->queue_position,
                'department'  => [
                    'id'   => $r->department_id,
                    'name' => $r->department_name,
                ],
            ];
        });

        return response()->json(['data' => $data], 200);
    }

    /**
     * POST /api/v1/staff/requests
     */
    public function store(Request $request)
    {
        $user = $request->user()->load('role','department','ministry');

        $data = $request->validate([
            'purpose'     => 'required|string|max:255',
            'origin'      => 'required|string|max:150',
            'destination' => 'required|string|max:150',
            'start_at'    => 'nullable|date',
            'end_at'      => 'nullable|date|after_or_equal:start_at',
            'datetime'    => 'nullable|date',
            'vehicle_id'  => 'nullable|integer|exists:vehicles,id',
            'preferred_vehicle_id' => 'nullable|integer|exists:vehicles,id',
            'requested_vehicle_type' => 'nullable|string|max:120',
        ]);

        $startAtInput = $data['start_at'] ?? $data['datetime'] ?? null;
        $startAt = $startAtInput ? Carbon::parse($startAtInput) : now();

        $supervisorId = $user->supervisor_id
            ?? User::query()
                ->whereHas('role', fn($q) => $q->where('name','Supervisor'))
                ->where('ministry_id',   $user->ministry_id)
                ->where('department_id', $user->department_id)
                ->value('id');

        $preferredVehicle = $data['preferred_vehicle_id'] ?? $data['vehicle_id'] ?? null;

        try {
            $req = DispatchRequest::create([
                'ministry_id'   => $user->ministry_id,
                'department_id' => $user->department_id,
                'requested_by'  => $user->id,
                'supervisor_id' => $supervisorId,
                'status'        => 'pending_supervisor',
                'purpose'       => $data['purpose'],
                'requested_vehicle_type' => $data['requested_vehicle_type'] ?? null,
                'origin'        => $data['origin'],
                'destination'   => $data['destination'],
                'start_at'      => $startAt,
                'end_at'        => $data['end_at'] ?? null,
                'preferred_vehicle_id' => $preferredVehicle,
            ]);

            return response()->json(['message' => 'Request submitted', 'data' => $req], 201);
        } catch (\Throwable $e) {
            Log::error('Create Staff Request failed', ['err' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to create request'], 500);
        }
    }

    /**
     * GET /api/v1/staff/vehicles
     */
    public function vehicles(Request $request)
    {
        $me = $request->user()->load('role');
        if (($me->role->name ?? null) !== 'Staff') {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $status       = $request->query('status', 'available');
        $departmentId = $request->query('department_id', $me->department_id);

        $rows = DB::table('vehicles')
            ->where('ministry_id', $me->ministry_id)
            ->when($departmentId !== null, fn($q) => $q->where('department_id', $departmentId))
            ->when($status, fn($q) => $q->where('status', $status))
            ->orderBy('make')->orderBy('model')
            ->get([
                'id',
                'make',
                'model',
                'plate_number',
                'type',
                'status',
                'department_id',
            ]);

        return response()->json(['data' => $rows], 200);
    }
}
