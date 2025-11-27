<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class PurchaseOrder extends Model
{
    use HasFactory;

    public const STATUS_OPEN      = 'open';
    public const STATUS_RECEIVED  = 'received';
    public const STATUS_INVOICED  = 'invoiced';
    public const STATUS_CLOSED    = 'closed';

    protected $fillable = [
        'quote_id',
        'po_number',
        'status',
        'subtotal',
        'tax',
        'total',
    ];

    protected $casts = [
        'quote_id' => 'integer',
        'subtotal' => 'decimal:2',
        'tax'      => 'decimal:2',
        'total'    => 'decimal:2',
    ];

    /** Relationships */
    public function quote()   { return $this->belongsTo(Quote::class); }
    public function invoice() { return $this->hasOne(VendorInvoice::class); }

    /** Scopes */
    public function scopeStatus($q, string $status) { return $q->where('status', $status); }
}
