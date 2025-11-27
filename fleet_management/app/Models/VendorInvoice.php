<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class VendorInvoice extends Model
{
    use HasFactory;

    public const STATUS_UNPAID = 'unpaid';
    public const STATUS_PAID   = 'paid';

    protected $fillable = [
        'purchase_order_id',
        'invoice_number',
        'amount',
        'status',
    ];

    protected $casts = [
        'purchase_order_id' => 'integer',
        'amount'            => 'decimal:2',
    ];

    /** Relationships */
    public function purchaseOrder() { return $this->belongsTo(PurchaseOrder::class); }
    public function quote()         { return $this->purchaseOrder?->quote(); }

    /** Helpers */
    public function markPaid(): void
    {
        $this->update(['status' => self::STATUS_PAID]);
        // Optionally close PO:
        if ($po = $this->purchaseOrder) {
            $po->update(['status' => PurchaseOrder::STATUS_CLOSED]);
        }
    }
}
