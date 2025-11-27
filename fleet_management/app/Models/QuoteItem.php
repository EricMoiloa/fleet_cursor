<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class QuoteItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'quote_id',
        'description',
        'quantity',
        'unit_price',
        'line_total',
    ];

    protected $casts = [
        'quote_id'   => 'integer',
        'quantity'   => 'integer',
        'unit_price' => 'decimal:2',
        'line_total' => 'decimal:2',
    ];

    /** Relationships */
    public function quote() { return $this->belongsTo(Quote::class); }

    /** Hooks: compute line_total if missing */
    protected static function booted()
    {
        static::creating(function (QuoteItem $item) {
            if (is_null($item->line_total)) {
                $item->line_total = $item->quantity * $item->unit_price;
            }
        });

        static::created(function (QuoteItem $item) {
            $item->quote?->recalcTotals();
        });

        static::updated(function (QuoteItem $item) {
            $item->quote?->recalcTotals();
        });

        static::deleted(function (QuoteItem $item) {
            $item->quote?->recalcTotals();
        });
    }
}
