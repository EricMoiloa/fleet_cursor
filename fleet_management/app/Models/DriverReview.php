<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DriverReview extends Model
{
    use HasFactory;

    protected $fillable = [
        'trip_id',
        'driver_id',
        'worker_id',
        'rating',
        'comment',
        'submitted_at',
    ];

    protected $casts = [
        'trip_id'      => 'integer',
        'driver_id'    => 'integer',
        'worker_id'    => 'integer',
        'rating'       => 'integer',
        'submitted_at' => 'datetime',
    ];

    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'worker_id');
    }
}

