<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class FuelLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'trip_id','vehicle_id','driver_id','filled_at',
        'litres','unit_price','amount','odometer','station'
    ];

    protected $casts = [
        'filled_at'  => 'datetime',
        'litres'     => 'decimal:2',
        'unit_price' => 'decimal:2',
        'amount'     => 'decimal:2',
        'odometer'   => 'integer',
    ];

    public function trip()    { return $this->belongsTo(Trip::class); }
    public function vehicle() { return $this->belongsTo(Vehicle::class); }
    public function driver()  { return $this->belongsTo(User::class, 'driver_id'); }
}
