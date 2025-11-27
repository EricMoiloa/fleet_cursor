<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Schedule;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',     // 👈 add this
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withCommands([
        __DIR__.'/../routes/console.php',
        __DIR__.'/../app/Console/Commands',
    ])
    ->withSchedule(function (Schedule $schedule) {
        $schedule->command('fleet:check-alerts')->dailyAt('07:00');
    })


    ->withMiddleware(function (Middleware $middleware) {
        // ✅ register your middleware aliases (Kernel is not used in Laravel 11/12)
        $middleware->alias([
            'role' => \App\Http\Middleware\CheckRole::class,
        ]);

        // (optional) ensure typical API group middleware
        $middleware->appendToGroup('api', [
            // \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
            \Illuminate\Routing\Middleware\ThrottleRequests::class . ':api',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })
    ->create();
