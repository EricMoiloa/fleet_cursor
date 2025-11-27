<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DispatchRequest extends Model
{
    protected $table = 'dispatch_requests';

    protected $fillable = [
        'ministry_id',
        'department_id',
        'requested_by',
        'preferred_vehicle_id',
        'purpose',
        'requested_vehicle_type',
        'origin',
        'destination',
        'start_at',
        'end_at',
        'status',
        'requires_worker_review',
        'queue_position',
        'vehicle_id',
        'driver_id',
    ];

    protected $casts = [
        'start_at' => 'datetime',
        'end_at'   => 'datetime',
        'requires_worker_review' => 'boolean',
        'queue_position' => 'integer',
    ];

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Department::class, 'department_id');
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Vehicle::class, 'vehicle_id');
    }
    public function trips()
{
    return $this->hasMany(\App\Models\Trip::class, 'request_id');
}
}
