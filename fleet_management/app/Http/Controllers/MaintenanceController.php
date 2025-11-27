<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Vehicle;
use App\Services\MaintenanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class MaintenanceController extends Controller
{
    public function __construct(private readonly MaintenanceService $maintenanceService)
    {
    }

    public function index(Request $request, Vehicle $vehicle): JsonResponse
    {
        $this->authorizeVehicle($request->user(), $vehicle);

        return response()->json([
            'data' => $this->maintenanceService->history($vehicle),
        ]);
    }

    public function store(Request $request, Vehicle $vehicle): JsonResponse
    {
        $actor = $request->user();
        $this->authorizeVehicle($actor, $vehicle);

        $data = $request->validate([
            'service_type'          => ['required','string','max:120'],
            'performed_at'          => ['required','date'],
            'odometer'              => ['nullable','integer','min:0'],
            'next_service_odometer' => ['nullable','integer','min:0'],
            'cost'                  => ['nullable','numeric','min:0'],
            'vendor_id'             => ['nullable','integer','exists:vendors,id'],
            'notes'                 => ['nullable','string'],
        ]);

        $record = $this->maintenanceService->logRecord($vehicle, $data, $actor);

        return response()->json([
            'message' => 'Maintenance logged',
            'data'    => $record,
        ], 201);
    }

    public function alerts(Request $request): JsonResponse
    {
        $actor = $request->user();
        $this->assertFleetAccess($actor);

        $maintenanceDue = $this->maintenanceService->dueForMinistry($actor->ministry_id);

        $contractsExpiring = Vehicle::query()
            ->where('ministry_id', $actor->ministry_id)
            ->where('ownership_type', 'hired')
            ->whereNotNull('contract_end_date')
            ->whereBetween('contract_end_date', [now(), Carbon::now()->addDays(30)])
            ->get(['id','plate_number','make','model','contract_end_date','monthly_mileage_limit','month_to_date_mileage']);

        return response()->json([
            'maintenance_due'     => $maintenanceDue,
            'contracts_expiring'  => $contractsExpiring,
        ]);
    }

    private function authorizeVehicle(User $user, Vehicle $vehicle): void
    {
        $this->assertFleetAccess($user);

        if ((int) $vehicle->ministry_id !== (int) $user->ministry_id) {
            abort(403, 'Vehicle not in your ministry.');
        }
    }

    private function assertFleetAccess(User $user): void
    {
        if (! $user->hasRole(['Ministry Admin','Fleet Manager'])) {
            abort(403, 'Only ministry admins or fleet managers can manage maintenance.');
        }
    }
}

