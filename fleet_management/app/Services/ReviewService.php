<?php

namespace App\Services;

use App\Models\DispatchRequest;
use App\Models\DriverReview;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReviewService
{
    /**
     * @throws ValidationException
     */
    public function submit(Trip $trip, array $payload, User $actor): DriverReview
    {
        if ($trip->status !== 'completed') {
            throw ValidationException::withMessages(['trip' => 'Trip must be completed before leaving a review.']);
        }

        if (DriverReview::where('trip_id', $trip->id)->exists()) {
            throw ValidationException::withMessages(['trip' => 'A review already exists for this trip.']);
        }

        $requesterId = optional($trip->request)->requested_by;
        if ((int) $actor->id !== (int) $requesterId) {
            throw ValidationException::withMessages(['trip' => 'Only the original requester can review this trip.']);
        }

        return DB::transaction(function () use ($trip, $payload, $actor) {
            $review = DriverReview::create([
                'trip_id'      => $trip->id,
                'driver_id'    => $trip->driver_id,
                'worker_id'    => $actor->id,
                'rating'       => $payload['rating'],
                'comment'      => $payload['comment'] ?? null,
                'submitted_at' => now(),
            ]);

            if ($trip->request_id) {
                DispatchRequest::where('id', $trip->request_id)
                    ->update(['requires_worker_review' => false]);
            }

            return $review->load('driver');
        });
    }

    public function driverSummary(int $driverId): array
    {
        $aggregate = DriverReview::selectRaw('driver_id, AVG(rating) as avg_rating, COUNT(*) as total_reviews')
            ->where('driver_id', $driverId)
            ->groupBy('driver_id')
            ->first();

        return [
            'driver_id'     => $driverId,
            'avg_rating'    => $aggregate?->avg_rating ? round((float) $aggregate->avg_rating, 2) : null,
            'total_reviews' => (int) ($aggregate->total_reviews ?? 0),
        ];
    }

    public function driverReviews(int $driverId): Collection
    {
        return DriverReview::with(['trip.vehicle', 'worker'])
            ->where('driver_id', $driverId)
            ->orderByDesc('submitted_at')
            ->get();
    }
}

