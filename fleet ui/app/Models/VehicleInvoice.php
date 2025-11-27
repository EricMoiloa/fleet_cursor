<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VehicleInvoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'vehicle_id',
        'ministry_id',
        'category',
        'invoice_number',
        'vendor_name',
        'amount',
        'currency',
        'invoice_date',
        'due_date',
        'paid_date',
        'notes',
        'line_items',
    ];

    protected $casts = [
        'amount'       => 'decimal:2',
        'invoice_date' => 'date',
        'due_date'     => 'date',
        'paid_date'    => 'date',
        'line_items'   => 'array',
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

