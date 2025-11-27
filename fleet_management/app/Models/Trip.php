<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Trip extends Model
{
    use HasFactory;

    // ✅ match your actual columns
    protected $fillable = [
        'request_id','vehicle_id','driver_id','ministry_id',
        'purpose','origin','destination',
        'odometer_out','odometer_in','status',
        'started_at','ended_at',
    ];

    protected $casts = [
        'request_id'   => 'integer',
        'vehicle_id'   => 'integer',
        'driver_id'    => 'integer',
        'ministry_id'  => 'integer',
        'odometer_out' => 'integer',
        'odometer_in'  => 'integer',
        'started_at'   => 'datetime',
        'ended_at'     => 'datetime',
    ];

    // Relations
    public function request()  { return $this->belongsTo(DispatchRequest::class, 'request_id'); }
    public function vehicle()  { return $this->belongsTo(Vehicle::class); }
    public function driver()   { return $this->belongsTo(User::class, 'driver_id'); }
    public function ministry() { return $this->belongsTo(Ministry::class); }
    public function fuelLogs() { return $this->hasMany(FuelLog::class); }
    public function review()   { return $this->hasOne(DriverReview::class); }

    // ✅ use the correct column names
   // … inside class Trip

/**
 * Start the trip: set odometer_out, started_at, and mark as in_progress.
 */
// app/Models/Trip.php (inside class Trip)

/**
 * Start the trip: set odometer_out, started_at, and mark as in_progress.
 */
public function start(int $odometer): void
{
    // Optional guard — start only from pending
    if ($this->status !== 'pending') {
        // throw new \RuntimeException('Trip can only be started from pending state.');
        // or just return; 
    }

    $this->odometer_out = $odometer;  // ✅ DB column
    $this->started_at   = now();      // ✅ DB column
    $this->status       = 'in_progress'; // ✅ matches enum
    $this->save();
}

/**
 * Finish the trip: set odometer_in, ended_at, and mark as completed.
 */
public function finish(int $odometer): void
{
    // Optional guard — finish only from in_progress
    if ($this->status !== 'in_progress') {
        // throw new \RuntimeException('Trip can only be finished from in_progress state.');
        // or just return;
    }

    $this->odometer_in = $odometer;   // ✅ DB column
    $this->ended_at    = now();       // ✅ DB column
    $this->status      = 'completed'; // ✅ matches enum
    $this->save();
}


}
