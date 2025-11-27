<?php

namespace App\Services;

use App\Models\MaintenanceRecord;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class MaintenanceService
{
    public function logRecord(Vehicle $vehicle, array $payload, User $actor): MaintenanceRecord
    {
        return DB::transaction(function () use ($vehicle, $payload, $actor) {
            $record = MaintenanceRecord::create([
                'vehicle_id'            => $vehicle->id,
                'ministry_id'           => $vehicle->ministry_id,
                'department_id'         => $vehicle->department_id,
                'vendor_id'             => $payload['vendor_id'] ?? null,
                'created_by'            => $actor->id,
                'service_type'          => $payload['service_type'],
                'performed_at'          => $payload['performed_at'],
                'odometer'              => $payload['odometer'] ?? null,
                'next_service_odometer' => $payload['next_service_odometer'] ?? null,
                'cost'                  => $payload['cost'] ?? null,
                'notes'                 => $payload['notes'] ?? null,
            ]);

            $vehicle->last_serviced_at = $payload['performed_at'];
            if (isset($payload['next_service_odometer'])) {
                $vehicle->next_service_odometer = $payload['next_service_odometer'];
            }
            if (isset($payload['odometer'])) {
                $vehicle->odometer = $payload['odometer'];
            }

            $vehicle->status = $this->shouldFlagMaintenanceDue($vehicle)
                ? 'maintenance_due'
                : ($vehicle->status === 'in_maintenance' ? 'available' : $vehicle->status);

            $vehicle->save();

            return $record;
        });
    }

    public function history(Vehicle $vehicle): Collection
    {
        return MaintenanceRecord::query()
            ->where('vehicle_id', $vehicle->id)
            ->orderByDesc('performed_at')
            ->get();
    }

    public function dueForMinistry(int $ministryId)
    {
        return Vehicle::query()
            ->where('ministry_id', $ministryId)
            ->whereNotNull('next_service_odometer')
            ->whereColumn('odometer', '>=', 'next_service_odometer')
            ->get(['id','plate_number','make','model','odometer','next_service_odometer','status']);
    }

    private function shouldFlagMaintenanceDue(Vehicle $vehicle): bool
    {
        if (is_null($vehicle->next_service_odometer)) {
            return false;
        }

        return (int) $vehicle->odometer >= (int) $vehicle->next_service_odometer;
    }
}

