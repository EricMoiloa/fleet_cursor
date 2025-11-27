<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Driver assignment limits
    |--------------------------------------------------------------------------
    |
    | Set how many vehicles a single driver may be assigned to simultaneously.
    | - Set to a positive integer (e.g., 2) to enforce a limit.
    | - Set to 0 or null to disable the rule entirely.
    |
    */
    'max_vehicles_per_driver' => env('FLEET_MAX_VEHICLES_PER_DRIVER', 2),

];
