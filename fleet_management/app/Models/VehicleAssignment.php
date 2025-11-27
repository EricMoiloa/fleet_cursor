<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class VehicleAssignment extends Model
{
    use HasFactory;

    protected $fillable = ['vehicle_id','driver_id','department_id','assigned_at','released_at'];

    protected $casts = [
        'assigned_at' => 'datetime',
        'released_at' => 'datetime',
    ];

    public function vehicle()    { return $this->belongsTo(Vehicle::class); }
    public function driver()     { return $this->belongsTo(User::class, 'driver_id'); }
    public function department() { return $this->belongsTo(Department::class); }
}
