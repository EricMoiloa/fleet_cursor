<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    /**
     * Mass-assignable fields.
     * Note: added avatar_url and supervisor_id.
     */
    protected $fillable = [
        'name',
        'email',
        'password',

        'role_id',
        'ministry_id',
        'department_id',
        'supervisor_id',   // NEW
        'avatar_url',      // NEW

        'is_first_login',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'is_first_login'    => 'boolean',
        'is_active'         => 'boolean',
    ];

    /* ----------------- relationships ----------------- */

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id', 'id');
    }

    public function ministry(): BelongsTo
    {
        return $this->belongsTo(Ministry::class, 'ministry_id', 'id');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'department_id', 'id');
    }

    /** The user’s direct supervisor (if they are Staff). */
    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'supervisor_id', 'id');
    }

    /** Direct reports for a Supervisor (staff members). */
    public function reports(): HasMany
    {
        return $this->hasMany(User::class, 'supervisor_id', 'id');
    }

    /* ----------------- helpers ----------------- */

    /**
     * Convenience helper: does the user have any of the given role names?
     * Accepts a string ("Supervisor") or an array of names.
     */
    public function hasRole(string|array $roles): bool
    {
        $this->relationLoaded('role') || $this->load('role');

        $current = $this->role->name ?? null;
        if ($current === null) {
            return false;
        }

        if (is_array($roles)) {
            return in_array($current, $roles, true);
        }

        return $current === $roles;
    }

    /** Optional tiny helpers (use or ignore) */
    public function isSupervisor(): bool { return $this->hasRole('Supervisor'); }
    public function isStaff(): bool      { return $this->hasRole('Staff'); }
    public function isDriver(): bool     { return $this->hasRole('Driver'); }
    public function isFleetManager(): bool { return $this->hasRole('Fleet Manager'); }
    public function isMinistryAdmin(): bool { return $this->hasRole('Ministry Admin'); }
}
