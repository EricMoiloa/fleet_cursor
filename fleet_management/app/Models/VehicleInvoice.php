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
        'department_id',
        'vendor_id',
        'created_by',
        'type',
        'reference',
        'currency',
        'amount',
        'invoice_date',
        'due_date',
        'notes',
    ];

    protected $casts = [
        'vehicle_id'   => 'integer',
        'ministry_id'  => 'integer',
        'department_id'=> 'integer',
        'vendor_id'    => 'integer',
        'created_by'   => 'integer',
        'amount'       => 'decimal:2',
        'invoice_date' => 'date',
        'due_date'     => 'date',
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

