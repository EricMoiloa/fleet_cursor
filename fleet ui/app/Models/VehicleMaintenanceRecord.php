<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VehicleMaintenanceRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'vehicle_id',
        'ministry_id',
        'service_type',
        'description',
        'odometer',
        'cost',
        'performed_at',
        'next_service_odometer',
        'document_path',
        'notes',
    ];

    protected $casts = [
        'performed_at'          => 'date',
        'odometer'              => 'integer',
        'next_service_odometer' => 'integer',
        'cost'                  => 'decimal:2',
    ];

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function ministry(): BelongsTo
    {
        return $this->belongsTo(Ministry::class);
    }
}

