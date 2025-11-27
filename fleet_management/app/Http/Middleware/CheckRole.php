<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckRole
{
    /**
     * Usage examples:
     *   ->middleware('role:Super Admin')
     *   ->middleware('role:Super Admin,Ministry Admin')
     *   ->middleware('role:Super Admin|Ministry Admin') // pipe also supported
     */
    public function handle(Request $request, Closure $next, ...$roles)
    {
        $user = $request->user()?->loadMissing('role');

        if (! $user || ! $user->role) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Normalize allowed roles: support comma- or pipe-separated entries
        $allowed = collect($roles)
            ->flatMap(fn ($r) => preg_split('/[|,]/', (string) $r))
            ->map(fn ($r) => strtolower(trim($r)))
            ->filter()
            ->values()
            ->all();

        $actual = strtolower($user->role->name ?? '');

        if (! in_array($actual, $allowed, true)) {
            return response()->json(['error' => 'Forbidden: insufficient role'], 403);
        }

        return $next($request);
    }
}
