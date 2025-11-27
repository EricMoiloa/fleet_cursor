<?php

namespace App\Console\Commands;

use App\Services\VehicleAlertService;
use Illuminate\Console\Command;

class CheckVehicleAlerts extends Command
{
    protected $signature = 'fleet:check-alerts';

    protected $description = 'Generate notifications for insurance, contract, and maintenance alerts.';

    public function handle(VehicleAlertService $alerts): int
    {
        $count = $alerts->dispatchAlerts();

        $this->info("Vehicle alerts generated: {$count}");

        return Command::SUCCESS;
    }
}

