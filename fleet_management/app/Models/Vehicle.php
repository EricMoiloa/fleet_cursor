<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\Storage;

class Vehicle extends Model
{
      use HasFactory;

    protected $fillable = [
        'ministry_id','department_id',
        'plate_number','vin','make','model','type','capacity',
        'status','odometer','next_service_odometer','last_serviced_at',
        'ownership_type','contract_end_date','insurance_document_path','insurance_expires_at',
        'monthly_mileage_limit','month_to_date_mileage','mileage_period_start',
        'retired_at',
        'current_driver_id',
    ];

    protected $appends = [
        'insurance_document_url',
    ];

    protected $casts = [
        'ministry_id'     => 'integer',
        'department_id'   => 'integer',
        'capacity'        => 'integer',
        'odometer'        => 'integer',
        'next_service_odometer' => 'integer',
        'current_driver_id'=> 'integer',
        'contract_end_date'=> 'date',
        'insurance_expires_at' => 'date',
        'monthly_mileage_limit' => 'integer',
        'month_to_date_mileage' => 'integer',
        'mileage_period_start'  => 'date',
        'last_serviced_at'      => 'date',
        'retired_at'            => 'datetime',
    ];

    public function getInsuranceDocumentUrlAttribute(): ?string
    {
        if (! $this->insurance_document_path) {
            return null;
        }

        return \Storage::disk('public')->url($this->insurance_document_path);
    }

    public function currentDriver() { return $this->belongsTo(User::class, 'current_driver_id'); }


    public function ministry()   { return $this->belongsTo(Ministry::class); }
    public function department() { return $this->belongsTo(Department::class); }
    public function documents()  { return $this->hasMany(VehicleDocument::class); }
    public function maintenanceRecords() { return $this->hasMany(MaintenanceRecord::class); }
    public function invoices()   { return $this->hasMany(VehicleInvoice::class); }
    public function assignments(){ return $this->hasMany(VehicleAssignment::class); }
    public function trips()      { return $this->hasMany(Trip::class); }
    public function fuelLogs()   { return $this->hasMany(FuelLog::class); }

    public function scopeAvailable($q)   { return $q->where('status','available'); }
    public function scopeForMinistry($q, int $mid) { return $q->where('ministry_id',$mid); }
}
