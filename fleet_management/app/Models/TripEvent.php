<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TripEvent extends Model
{
    use HasFactory;

    protected $fillable = ['trip_id','type','details','logged_at'];

    protected $casts = ['logged_at' => 'datetime'];

    public function trip() { return $this->belongsTo(Trip::class); }
}
