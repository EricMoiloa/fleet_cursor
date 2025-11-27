<?php

namespace App\Services;

use App\Models\User;
use App\Models\Vehicle;
use App\Notifications\VehicleRiskNotification;
use Carbon\Carbon;
use Illuminate\Notifications\DatabaseNotification;

class VehicleAlertService
{
    public function dispatchAlerts(): int
    {
        $vehicles = Vehicle::query()
            ->select(['id','plate_number','make','model','ministry_id','ownership_type','contract_end_date','insurance_expires_at','odometer','next_service_odometer'])
            ->get();

        $created = 0;

        foreach ($vehicles as $vehicle) {
            $alerts = $this->buildAlerts($vehicle);

            if (empty($alerts)) {
                continue;
            }

            $recipients = $this->recipientsForMinistry($vehicle->ministry_id);

            foreach ($recipients as $user) {
                foreach ($alerts as $alert) {
                    if ($this->alreadyNotified($user, $vehicle->id, $alert['type'])) {
                        continue;
                    }

                    $user->notify(new VehicleRiskNotification(
                        vehicleId: $vehicle->id,
                        vehicleLabel: trim(($vehicle->make.' '.$vehicle->model.' '.$vehicle->plate_number)),
                        alertType: $alert['type'],
                        message: $alert['message'],
                        severity: $alert['severity'],
                    ));

                    $created++;
                }
            }
        }

        return $created;
    }

    private function recipientsForMinistry(int $ministryId)
    {
        return User::query()
            ->where('ministry_id', $ministryId)
            ->whereHas('role', fn($q) => $q->whereIn('name', ['Ministry Admin','Fleet Manager']))
            ->get();
    }

    private function buildAlerts(Vehicle $vehicle): array
    {
        $alerts = [];
        $today = Carbon::today();

        if ($vehicle->insurance_expires_at) {
            $expires = Carbon::parse($vehicle->insurance_expires_at);

            if ($expires->isPast()) {
                $alerts[] = [
                    'type' => 'insurance_expired',
                    'message' => 'Insurance has expired for this vehicle.',
                    'severity' => 'critical',
                ];
            } elseif ($expires->diffInDays($today) <= 14) {
                $alerts[] = [
                    'type' => 'insurance_expiring',
                    'message' => 'Insurance will expire soon (within 14 days).',
                    'severity' => 'warning',
                ];
            }
        }

        if ($vehicle->ownership_type === 'hired' && $vehicle->contract_end_date) {
            $contractEnd = Carbon::parse($vehicle->contract_end_date);

            if ($contractEnd->isPast()) {
                $alerts[] = [
                    'type' => 'contract_expired',
                    'message' => 'Hire contract has expired for this vehicle.',
                    'severity' => 'critical',
                ];
            } elseif ($contractEnd->diffInDays($today) <= 30) {
                $alerts[] = [
                    'type' => 'contract_expiring',
                    'message' => 'Hire contract ends within 30 days.',
                    'severity' => 'warning',
                ];
            }
        }

        if ($vehicle->next_service_odometer && $vehicle->odometer >= $vehicle->next_service_odometer) {
            $alerts[] = [
                'type' => 'maintenance_due',
                'message' => 'Odometer has reached the next service threshold.',
                'severity' => 'critical',
            ];
        }

        return $alerts;
    }

    private function alreadyNotified(User $user, int $vehicleId, string $type): bool
    {
        return DatabaseNotification::query()
            ->where('notifiable_id', $user->id)
            ->where('notifiable_type', User::class)
            ->where('type', VehicleRiskNotification::class)
            ->whereJsonContains('data->vehicle_id', $vehicleId)
            ->whereJsonContains('data->alert_type', $type)
            ->whereNull('read_at')
            ->exists();
    }
}

