<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Vendor extends Model
{
    use HasFactory;

    protected $fillable = [
        'ministry_id',
        'name',
        'contact_email',
        'phone',
    ];

    protected $casts = [
        'ministry_id' => 'integer',
    ];

    /** Relationships */
    public function ministry() { return $this->belongsTo(Ministry::class); }
    public function quotes()   { return $this->hasMany(Quote::class); }

    /** Scopes */
    public function scopeForMinistry($q, int $ministryId) { return $q->where('ministry_id', $ministryId); }
}
