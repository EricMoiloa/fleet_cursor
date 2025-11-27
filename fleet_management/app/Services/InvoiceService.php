<?php

namespace App\Services;

use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleInvoice;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class InvoiceService
{
    public function record(Vehicle $vehicle, array $payload, User $actor): VehicleInvoice
    {
        return DB::transaction(function () use ($vehicle, $payload, $actor) {
            return VehicleInvoice::create([
                'vehicle_id'   => $vehicle->id,
                'ministry_id'  => $vehicle->ministry_id,
                'department_id'=> $vehicle->department_id,
                'vendor_id'    => $payload['vendor_id'] ?? null,
                'created_by'   => $actor->id,
                'type'         => $payload['type'],
                'reference'    => $payload['reference'] ?? null,
                'currency'     => $payload['currency'] ?? 'GHS',
                'amount'       => $payload['amount'],
                'invoice_date' => $payload['invoice_date'],
                'due_date'     => $payload['due_date'] ?? null,
                'notes'        => $payload['notes'] ?? null,
            ]);
        });
    }

    public function forVehicle(Vehicle $vehicle): Collection
    {
        return VehicleInvoice::query()
            ->where('vehicle_id', $vehicle->id)
            ->orderByDesc('invoice_date')
            ->get();
    }
}

