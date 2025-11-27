<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Department extends Model
{
    use HasFactory;

    // add 'slug' so mass-assignment includes it
    protected $fillable = [
        'ministry_id',
        'name',
        'slug',                // ← add this
        'description',         // (already present in your migration)
        'parent_department_id'
    ];

    public function ministry()
    {
        return $this->belongsTo(Ministry::class);
    }

    public function parent()
    {
        return $this->belongsTo(Department::class, 'parent_department_id');
    }

    public function children()
    {
        return $this->hasMany(Department::class, 'parent_department_id');
    }
}
