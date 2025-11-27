<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Storage;

class VehicleController extends Controller
{
    /**
     * List vehicles within the actor's ministry.
     */
    public function index(Request $request)
    {
        $user = $request->user()->load('role');

        return Vehicle::where('ministry_id', $user->ministry_id)
            ->orderBy('plate_number')
            ->get();
    }

    public function show($id, Request $request)
    {
        $vehicle = Vehicle::findOrFail($id);
        $this->authorizeView($request->user(), $vehicle);

        return $vehicle->load('documents');
    }

    /**
     * Ministry Admin can create vehicles for their ministry.
     */
    public function store(Request $request)
    {
        $user = $request->user()->load('role');
        if (($user->role->name ?? null) !== 'Ministry Admin') {
            return response()->json(['message' => 'Only Ministry Admin can add vehicles'], 403);
        }

        $data = $request->validate([
            'plate_number'  => ['required','string','max:50','unique:vehicles,plate_number'],
            'vin'           => ['nullable','string','max:100','unique:vehicles,vin'],
            'make'          => ['nullable','string','max:100'],
            'model'         => ['nullable','string','max:100'],
            'type'          => ['nullable','string','max:100'],
            'capacity'      => ['nullable','integer','min:0'],
            'department_id' => ['nullable','exists:departments,id'],
            'odometer'      => ['nullable','integer','min:0'],
            'status'        => ['nullable', Rule::in(['available','assigned','in_maintenance','inactive','maintenance_due','retired'])],
            'ownership_type'=> ['required', Rule::in(['owned','hired'])],
            'contract_end_date'    => ['nullable','date','after:today'],
            'insurance_expires_at' => ['nullable','date','after:today'],
            'monthly_mileage_limit'=> ['nullable','integer','min:0'],
            'next_service_odometer'=> ['nullable','integer','min:0'],
            'insurance_document'   => ['nullable','file','mimes:pdf,jpg,jpeg,png','max:10240'],
        ]);

        // If department set, it must be within the same ministry
        if (!empty($data['department_id'])) {
            $deptMin = \App\Models\Department::where('id',$data['department_id'])->value('ministry_id');
            if ((int)$deptMin !== (int)$user->ministry_id) {
                return response()->json(['error' => 'Department must belong to your ministry'], 422);
            }
        }

        $this->assertHiredVehicleCompliance($data, $request);

        $insurancePath = $this->storeInsuranceDocument($request);

        $status = $data['status'] ?? 'available';

        $vehicle = Vehicle::create([
            'plate_number'           => $data['plate_number'],
            'vin'                    => $data['vin']          ?? null,
            'make'                   => $data['make']         ?? null,
            'model'                  => $data['model']        ?? null,
            'type'                   => $data['type']         ?? null,
            'capacity'               => $data['capacity']     ?? null,
            'department_id'          => $data['department_id']?? null,
            'odometer'               => $data['odometer']     ?? 0,
            'status'                 => $status,
            'ministry_id'            => $user->ministry_id,
            'current_driver_id'      => null,
            'ownership_type'         => $data['ownership_type'],
            'contract_end_date'      => $data['contract_end_date'] ?? null,
            'insurance_document_path'=> $insurancePath,
            'insurance_expires_at'   => $data['insurance_expires_at'] ?? null,
            'monthly_mileage_limit'  => $data['monthly_mileage_limit'] ?? null,
            'month_to_date_mileage'  => 0,
            'mileage_period_start'   => now()->startOfMonth(),
            'next_service_odometer'  => $data['next_service_odometer'] ?? null,
            'retired_at'             => $status === 'retired' ? now() : null,
        ]);

        return response()->json($vehicle, 201);
    }

    /**
     * Updates:
     * - Ministry Admin: can edit all fields (within ministry), including department & current_driver.
     * - Fleet Manager: can change status/odometer and department (within ministry).
     */
    public function update($id, Request $request)
    {
        $vehicle = Vehicle::findOrFail($id);
        $user    = $request->user()->load('role');

        if ((int)$vehicle->ministry_id !== (int)$user->ministry_id) {
            return response()->json(['error' => 'Forbidden (vehicle not in your ministry)'], 403);
        }

        $role = $user->role->name ?? '';

        if ($role === 'Ministry Admin') {
            $data = $request->validate([
                'plate_number'      => ['sometimes','string','max:50', Rule::unique('vehicles','plate_number')->ignore($vehicle->id)],
                'vin'               => ['sometimes','nullable','string','max:100', Rule::unique('vehicles','vin')->ignore($vehicle->id)],
                'make'              => ['sometimes','nullable','string','max:100'],
                'model'             => ['sometimes','nullable','string','max:100'],
                'type'              => ['sometimes','nullable','string','max:100'],
                'capacity'          => ['sometimes','nullable','integer','min:0'],
                'department_id'     => ['sometimes','nullable','integer','exists:departments,id'],
                'odometer'          => ['sometimes','integer','min:0'],
                'status'            => ['sometimes', Rule::in(['available','assigned','in_maintenance','inactive','maintenance_due','retired'])],
                'current_driver_id' => ['sometimes','nullable','integer','exists:users,id'],
                'ownership_type'    => ['sometimes', Rule::in(['owned','hired'])],
                'contract_end_date' => ['sometimes','nullable','date','after:today'],
                'insurance_expires_at' => ['sometimes','nullable','date','after:today'],
                'monthly_mileage_limit'=> ['sometimes','nullable','integer','min:0'],
                'next_service_odometer'=> ['sometimes','nullable','integer','min:0'],
                'insurance_document'   => ['sometimes','nullable','file','mimes:pdf,jpg,jpeg,png','max:10240'],
            ]);

            // Ensure department & current_driver in same ministry (if set)
            if (array_key_exists('department_id', $data) && !is_null($data['department_id'])) {
                $deptMin = \App\Models\Department::where('id',$data['department_id'])->value('ministry_id');
                if ((int)$deptMin !== (int)$user->ministry_id) {
                    return response()->json(['error' => 'Department must belong to your ministry'], 422);
                }
            }
            if (array_key_exists('current_driver_id', $data) && !is_null($data['current_driver_id'])) {
                $drvMin = \App\Models\User::where('id',$data['current_driver_id'])->value('ministry_id');
                if ((int)$drvMin !== (int)$user->ministry_id) {
                    return response()->json(['error' => 'Driver must belong to your ministry'], 422);
                }
            }

            $finalData = $data;
            $finalData['ownership_type'] = $data['ownership_type'] ?? $vehicle->ownership_type;

            $this->assertHiredVehicleCompliance($finalData, $request, true, $vehicle);

            if ($request->hasFile('insurance_document')) {
                $vehicle->insurance_document_path = $this->storeInsuranceDocument($request, $vehicle->insurance_document_path);
            }

            if (array_key_exists('insurance_document', $finalData)) {
                unset($finalData['insurance_document']);
            }

            foreach ($finalData as $key => $value) {
                if ($key === 'status') {
                    $vehicle->retired_at = $value === 'retired' ? now() : null;
                }
                $vehicle->{$key} = $value;
            }

            $vehicle->save();
            return $vehicle->fresh();
        }

        if ($role === 'Fleet Manager') {
            $data = $request->validate([
                'status'        => ['sometimes', Rule::in(['available','assigned','in_maintenance','inactive','maintenance_due'])],
                'odometer'      => ['sometimes','integer','min:0'],
                'department_id' => ['sometimes','nullable','integer','exists:departments,id'],
            ]);

            if (array_key_exists('department_id', $data) && !is_null($data['department_id'])) {
                $deptMin = \App\Models\Department::where('id',$data['department_id'])->value('ministry_id');
                if ((int)$deptMin !== (int)$user->ministry_id) {
                    return response()->json(['error' => 'Department must belong to your ministry'], 422);
                }
                $vehicle->department_id = $data['department_id'];
            }

            if (array_key_exists('status', $data))   $vehicle->status   = $data['status'];
            if (array_key_exists('odometer', $data)) $vehicle->odometer = $data['odometer'];

            $vehicle->save();
            return $vehicle->fresh();
        }

        return response()->json(['message' => 'Forbidden'], 403);
    }

    /**
     * Status-only helper for Ministry Admin / Fleet Manager.
     */
    public function updateStatus($id, Request $request)
    {
        $vehicle = Vehicle::findOrFail($id);
        $user    = $request->user()->load('role');

        if ((int)$vehicle->ministry_id !== (int)$user->ministry_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        if (!in_array($user->role->name ?? '', ['Ministry Admin','Fleet Manager'], true)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'status' => ['required', Rule::in(['available','assigned','in_maintenance','inactive','maintenance_due'])],
        ]);

        $vehicle->update(['status' => $data['status']]);
        return $vehicle->fresh();
    }

    /**
     * Assign / Unassign a driver.
     * Optional limit: config('fleet.max_vehicles_per_driver')
     * - If > 0, enforce that a driver cannot exceed that many "assigned" vehicles.
     * - If 0 or null, no cap is enforced.
     */
    public function assignDriver($id, Request $request)
    {
        $vehicle = Vehicle::findOrFail($id);
        $user    = $request->user()->load('role');

        if (!in_array($user->role->name ?? '', ['Ministry Admin','Fleet Manager'], true)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        if ((int)$vehicle->ministry_id !== (int)$user->ministry_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        if ($vehicle->status === 'retired' || $vehicle->retired_at) {
            return response()->json(['error' => 'Retired vehicles cannot be assigned'], 422);
        }
        if ($vehicle->status === 'maintenance_due') {
            return response()->json(['error' => 'Vehicle is flagged for maintenance'], 422);
        }

        $data = $request->validate([
            'driver_id' => ['nullable','integer','exists:users,id'],
        ]);

        // Unassign
        if (empty($data['driver_id'])) {
            $status = $vehicle->status === 'maintenance_due' ? 'maintenance_due' : 'available';
            $vehicle->update([
                'current_driver_id' => null,
                'status'            => $status,
            ]);
            return response()->json(['message'=>'Driver unassigned','vehicle'=>$vehicle->fresh('currentDriver')]);
        }

        // Assign
        $driver = User::findOrFail($data['driver_id']);
        if (! in_array($driver->role?->name ?? '', ['Driver','Fleet Manager','Ministry Admin'], true)) {
            return response()->json(['error'=>'Selected user is not eligible to drive'], 422);
        }
        if ((int)$driver->ministry_id !== (int)$user->ministry_id ||
            (int)$driver->ministry_id !== (int)$vehicle->ministry_id) {
            return response()->json(['error'=>'Driver and vehicle must be in your ministry'], 422);
        }

        // Optional cap
        $max = (int) config('fleet.max_vehicles_per_driver', 2);
        if ($max > 0) {
            $alreadyAssignedCount = Vehicle::where('current_driver_id', $driver->id)
                ->where('status', 'assigned')
                ->where('id', '!=', $vehicle->id)
                ->count();

            if ($alreadyAssignedCount >= $max) {
                return response()->json([
                    'error' => "This driver already has {$alreadyAssignedCount} assigned vehicles (limit: {$max})"
                ], 422);
            }
        }

        $vehicle->update([
            'current_driver_id' => $driver->id,
            'status'            => 'assigned',
        ]);

        return response()->json(['message'=>'Driver assigned','vehicle'=>$vehicle->fresh('currentDriver')]);
    }

    /* ------------------------ helpers ------------------------ */

    private function authorizeView(User $user, Vehicle $vehicle): void
    {
        if ((int)$user->ministry_id !== (int)$vehicle->ministry_id) {
            abort(403, 'Cross-ministry access denied');
        }
    }

    private function assertHiredVehicleCompliance(array $data, Request $request, bool $isUpdate = false, ?Vehicle $vehicle = null): void
    {
        $ownership = $data['ownership_type'] ?? 'owned';
        if ($ownership !== 'hired') {
            return;
        }

        $errors = [];

        $hasInsuranceDocument = $request->hasFile('insurance_document')
            || ($isUpdate && $vehicle && $vehicle->insurance_document_path);
        if (! $hasInsuranceDocument) {
            $errors['insurance_document'] = 'Insurance document is required for hired vehicles.';
        }

        $limit = $data['monthly_mileage_limit'] ?? $vehicle?->monthly_mileage_limit;
        if (is_null($limit)) {
            $errors['monthly_mileage_limit'] = 'Monthly mileage limit is required for hired vehicles.';
        }

        $contract = $data['contract_end_date'] ?? $vehicle?->contract_end_date;
        if (is_null($contract)) {
            $errors['contract_end_date'] = 'Contract end date is required for hired vehicles.';
        }

        if (!empty($errors)) {
            throw ValidationException::withMessages($errors);
        }
    }

    private function storeInsuranceDocument(Request $request, ?string $existingPath = null): ?string
    {
        if (! $request->hasFile('insurance_document')) {
            return $existingPath;
        }

        $path = $request->file('insurance_document')->store('vehicle-insurance', 'public');

        if ($existingPath) {
            Storage::disk('public')->delete($existingPath);
        }

        return $path;
    }

public function myVehicles(Request $request)
{
    $user = $request->user()->load('role');

    $list = \App\Models\Vehicle::query()
        ->when($user->ministry_id, fn($q) => $q->where('ministry_id', $user->ministry_id))
        ->where('current_driver_id', $user->id)
        ->orderBy('plate_number')
        ->get(['id','plate_number','make','model','status','current_driver_id']);

    return response()->json(['data' => $list], 200);
}



}
