<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class WorkOrder extends Model
{
    use HasFactory;

    public const STATUS_DRAFT           = 'draft';
    public const STATUS_AWAITING_QUOTES = 'awaiting_quotes';
    public const STATUS_APPROVED        = 'approved';
    public const STATUS_IN_PROGRESS     = 'in_progress';
    public const STATUS_COMPLETED       = 'completed';

    protected $fillable = [
        'ministry_id',
        'requested_by',
        'vehicle_id',
        'title',
        'description',
        'status',
    ];

    protected $casts = [
        'ministry_id' => 'integer',
        'requested_by'=> 'integer',
        'vehicle_id'  => 'integer',
    ];

    /** Relationships */
    public function ministry()  { return $this->belongsTo(Ministry::class); }
    public function requester() { return $this->belongsTo(User::class, 'requested_by'); }
    public function quotes()    { return $this->hasMany(Quote::class); }

    /** Scopes */
    public function scopeForMinistry($q, int $ministryId) { return $q->where('ministry_id', $ministryId); }
    public function scopeStatus($q, string $status)       { return $q->where('status', $status); }

    /** Helpers */
    public function canSendForQuote(): bool { return $this->status === self::STATUS_DRAFT; }
    public function markAwaitingQuotes(): void { $this->update(['status' => self::STATUS_AWAITING_QUOTES]); }
}
