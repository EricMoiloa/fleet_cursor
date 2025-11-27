<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class VehicleDocument extends Model
{
    use HasFactory;

    protected $fillable = ['vehicle_id','type','issue_date','expiry_date','file_path'];

    protected $casts = [
        'issue_date'  => 'date',
        'expiry_date' => 'date',
    ];

    public function vehicle() { return $this->belongsTo(Vehicle::class); }
}
