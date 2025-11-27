<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class VehicleRiskNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly int $vehicleId,
        private readonly string $vehicleLabel,
        private readonly string $alertType,
        private readonly string $message,
        private readonly string $severity = 'warning',
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'vehicle_id'    => $this->vehicleId,
            'vehicle_label' => $this->vehicleLabel,
            'alert_type'    => $this->alertType,
            'message'       => $this->message,
            'severity'      => $this->severity,
        ];
    }
}

