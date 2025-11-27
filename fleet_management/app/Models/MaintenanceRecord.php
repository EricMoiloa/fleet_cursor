<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaintenanceRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'vehicle_id',
        'ministry_id',
        'department_id',
        'vendor_id',
        'created_by',
        'service_type',
        'performed_at',
        'odometer',
        'next_service_odometer',
        'cost',
        'notes',
    ];

    protected $casts = [
        'vehicle_id'            => 'integer',
        'ministry_id'           => 'integer',
        'department_id'         => 'integer',
        'vendor_id'             => 'integer',
        'created_by'            => 'integer',
        'performed_at'          => 'date',
        'odometer'              => 'integer',
        'next_service_odometer' => 'integer',
        'cost'                  => 'decimal:2',
    ];

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

