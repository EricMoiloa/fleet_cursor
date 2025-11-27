<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Cache\RateLimiting\Limit;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\MinistryController;
use App\Http\Controllers\StakeholderController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\VehicleController;
use App\Http\Controllers\DispatchController;
use App\Http\Controllers\TripController;
use App\Http\Controllers\FleetManagerController;
use App\Http\Controllers\MaintenanceController;
use App\Http\Controllers\VehicleInvoiceController;
use App\Http\Controllers\ReviewController;

RateLimiter::for('api', function (Request $request) {
    return Limit::perMinute(120)->by(optional($request->user())->id ?: $request->ip());
});

Route::prefix('v1')->group(function () {

    // (Optional) allow CORS preflight without auth to avoid 500 on OPTIONS
    Route::options('{any}', fn () => response()->noContent())
        ->where('any', '.*');

    // PUBLIC
    Route::post('login', [AuthController::class, 'login']);

    // AUTH
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('me', fn (Request $r) => $r->user()->load('role','ministry','department'));
        Route::post('logout',          [AuthController::class, 'logout']);
        Route::post('change-password', [AuthController::class, 'changePassword']);

        /** Users */
        Route::get(   'users',      [UserController::class, 'index']);
        Route::put(   'users/{id}', [UserController::class, 'update'])->middleware('role:Ministry Admin');
        Route::delete('users/{id}', [UserController::class, 'destroy'])->middleware('role:Ministry Admin');

        /** Ministries (read-only) */
        Route::get('ministries',      [MinistryController::class, 'index']);
        Route::get('ministries/{id}', [MinistryController::class, 'show']);

        /** Ministry Admin scope */
        Route::middleware('role:Ministry Admin')->prefix('ministry')->group(function () {
            Route::get(   'departments',      [DepartmentController::class, 'index']);
            Route::post(  'departments',      [DepartmentController::class, 'store']);
            Route::put(   'departments/{id}', [DepartmentController::class, 'update']);
            Route::delete('departments/{id}', [DepartmentController::class, 'destroy']);

            Route::post('users/supervisor',    [StakeholderController::class, 'createSupervisor']);
            Route::post('users/fleet-manager', [StakeholderController::class, 'createFleetManager']);
            Route::post('users/driver',        [StakeholderController::class, 'createDriver']);
            Route::post('users/staff',         [StakeholderController::class, 'createStaff']);
        });

        Route::get('ping', fn() => response()->json(['ok' => true]));


        /** Vehicles */
        Route::middleware('role:Ministry Admin,Fleet Manager')->group(function () {
            Route::get('vehicles',                      [VehicleController::class, 'index']);
            Route::get('vehicles/{id}',                 [VehicleController::class, 'show']);
            Route::put('vehicles/{id}',                 [VehicleController::class, 'update']);
            Route::post('vehicles/{id}/status',         [VehicleController::class, 'updateStatus']);
            Route::post('vehicles/{id}/assign-driver',  [VehicleController::class, 'assignDriver']);
        });
        Route::post('vehicles', [VehicleController::class, 'store'])->middleware('role:Ministry Admin');

        /** Maintenance & invoices */
        Route::middleware('role:Ministry Admin,Fleet Manager')->group(function () {
            Route::get('vehicles/{vehicle}/maintenance-records', [MaintenanceController::class, 'index']);
            Route::post('vehicles/{vehicle}/maintenance-records', [MaintenanceController::class, 'store']);
            Route::get('vehicles/{vehicle}/invoices', [VehicleInvoiceController::class, 'index']);
            Route::post('vehicles/{vehicle}/invoices', [VehicleInvoiceController::class, 'store']);
            Route::get('fleet/alerts', [MaintenanceController::class, 'alerts']);
        });
        /** FLEET decisions + pickers */
Route::middleware('role:Ministry Admin,Fleet Manager')->prefix('fleet')->group(function () {
    Route::get('vehicles', [\App\Http\Controllers\FleetManagerController::class, 'vehicles']); // list for picker
    Route::get('drivers',  [\App\Http\Controllers\FleetManagerController::class, 'drivers']);  // list for picker
    Route::post('requests/{id}/decide', [\App\Http\Controllers\FleetManagerController::class, 'decide']); // approve/reject
});

        /** DISPATCH */
        Route::post('dispatch-requests', [DispatchController::class, 'store']); // create by staff/driver
        Route::get('dispatch-requests',  [DispatchController::class, 'index'])
            ->middleware('role:Ministry Admin,Fleet Manager');

        /** ✅ FLEET decisions (single, authoritative route) */
        Route::middleware('role:Ministry Admin,Fleet Manager')
            ->post('fleet/requests/{id}/decide', [FleetManagerController::class, 'decide']);

        // (Optional legacy — keep only if you still call it; different path to avoid conflict)
        // Route::middleware('role:Fleet Manager')->prefix('fleet')->group(function () {
        //     Route::post('requests/{id}/decide-legacy', [DispatchController::class, 'fleetDecide']);
        // });

        /** STAFF / WORKER */
        Route::middleware('role:Staff')->prefix('staff')->group(function () {
            Route::get( 'vehicles', [\App\Http\Controllers\StaffRequestController::class, 'vehicles']);
            Route::get( 'requests', [\App\Http\Controllers\StaffRequestController::class, 'index']);
            Route::post('requests', [\App\Http\Controllers\StaffRequestController::class, 'store']);
        });

        /** SUPERVISOR */
        Route::middleware('role:Supervisor')->prefix('supervisor')->group(function () {
            Route::get('requests',               [\App\Http\Controllers\SupervisorController::class, 'requests']);
            Route::post('requests/{id}/decide',  [\App\Http\Controllers\SupervisorController::class, 'decide']);
            Route::post('requests/{id}/approve', [DispatchController::class, 'supervisorApprove']); // legacy
            Route::post('requests/{id}/reject',  [DispatchController::class, 'supervisorReject']);  // legacy
        });

        /** ✅ TRIPS (param is {id} to match controller signatures) */
        Route::get('trips',             [TripController::class, 'index']);
        Route::post('trips/{trip}/start', [TripController::class, 'start']);
        Route::post('trips/{trip}/end',   [TripController::class, 'end']);
        Route::post('trips/{trip}/fuel',  [TripController::class, 'addFuel']);
        Route::post('trips/{trip}/review', [ReviewController::class, 'store'])->middleware('role:Worker,Staff');

        /** Driver helpers */
        Route::get('driver/vehicles',    [VehicleController::class, 'myVehicles']);
        Route::get('driver/assignments', [TripController::class, 'driverAssignments']);

        Route::get('drivers/{driver}/reviews', [ReviewController::class, 'driverReviews']);
    });
});
