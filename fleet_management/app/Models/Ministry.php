<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Ministry extends Model
{
    use HasFactory;

    protected $fillable = ['name','slug','description'];

    public function departments()
    {
        return $this->hasMany(Department::class);
    }
}
