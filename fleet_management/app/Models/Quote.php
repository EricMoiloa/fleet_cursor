<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Quote extends Model
{
    use HasFactory;

    public const STATUS_PENDING  = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'work_order_id',
        'vendor_id',
        'reference',
        'quote_date',
        'subtotal',
        'tax',
        'total',
        'status',
    ];

    protected $casts = [
        'work_order_id' => 'integer',
        'vendor_id'     => 'integer',
        'quote_date'    => 'datetime',
        'subtotal'      => 'decimal:2',
        'tax'           => 'decimal:2',
        'total'         => 'decimal:2',
    ];

    /** Relationships */
    public function workOrder() { return $this->belongsTo(WorkOrder::class); }
    public function vendor()    { return $this->belongsTo(Vendor::class); }
    public function items()     { return $this->hasMany(QuoteItem::class); }
    public function purchaseOrder() { return $this->hasOne(PurchaseOrder::class); }

    /** Scopes */
    public function scopePending($q)  { return $q->where('status', self::STATUS_PENDING); }
    public function scopeApproved($q) { return $q->where('status', self::STATUS_APPROVED); }
    public function scopeRejected($q) { return $q->where('status', self::STATUS_REJECTED); }

    /** Helpers */
    public function recalcTotals(float $taxRate = 0.16): void
    {
        $subtotal = $this->items()->sum('line_total');
        $tax      = round($subtotal * $taxRate, 2);
        $total    = $subtotal + $tax;

        $this->update(compact('subtotal', 'tax', 'total'));
    }
}
