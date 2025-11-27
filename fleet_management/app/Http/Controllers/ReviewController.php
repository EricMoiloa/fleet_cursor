<?php

namespace App\Http\Controllers;

use App\Models\Trip;
use App\Models\User;
use App\Services\ReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function __construct(private readonly ReviewService $reviewService)
    {
    }

    public function store(Request $request, Trip $trip): JsonResponse
    {
        $actor = $request->user();
        $data = $request->validate([
            'rating'  => ['required','integer','min:1','max:5'],
            'comment' => ['nullable','string','max:2000'],
        ]);

        $review = $this->reviewService->submit($trip, $data, $actor);

        return response()->json([
            'message' => 'Review submitted',
            'data'    => $review,
        ], 201);
    }

    public function driverReviews(Request $request, User $driver): JsonResponse
    {
        $actor = $request->user();
        if (! $actor->hasRole(['Fleet Manager','Ministry Admin','Supervisor'])) {
            abort(403, 'Not authorized to view reviews.');
        }

        if ((int) $driver->ministry_id !== (int) $actor->ministry_id) {
            abort(403, 'Cross-ministry access denied.');
        }

        return response()->json([
            'summary' => $this->reviewService->driverSummary($driver->id),
            'data'    => $this->reviewService->driverReviews($driver->id),
        ]);
    }
}

