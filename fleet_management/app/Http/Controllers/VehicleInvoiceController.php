<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Vehicle;
use App\Services\InvoiceService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class VehicleInvoiceController extends Controller
{
    public function __construct(private readonly InvoiceService $invoiceService)
    {
    }

    public function index(Request $request, Vehicle $vehicle): JsonResponse
    {
        $this->authorizeVehicle($request->user(), $vehicle);

        return response()->json([
            'data' => $this->invoiceService->forVehicle($vehicle),
        ]);
    }

    public function store(Request $request, Vehicle $vehicle): JsonResponse
    {
        $actor = $request->user();
        $this->authorizeVehicle($actor, $vehicle);

        $data = $request->validate([
            'type'         => ['required', Rule::in(['rental','maintenance','repair','parts'])],
            'amount'       => ['required','numeric','min:0'],
            'currency'     => ['nullable','string','size:3'],
            'invoice_date' => ['required','date'],
            'due_date'     => ['nullable','date','after_or_equal:invoice_date'],
            'reference'    => ['nullable','string','max:120'],
            'vendor_id'    => ['nullable','integer','exists:vendors,id'],
            'notes'        => ['nullable','string'],
        ]);

        $invoice = $this->invoiceService->record($vehicle, $data, $actor);

        return response()->json([
            'message' => 'Invoice recorded',
            'data'    => $invoice,
        ], 201);
    }

    private function authorizeVehicle(User $user, Vehicle $vehicle): void
    {
        if ((int) $vehicle->ministry_id !== (int) $user->ministry_id) {
            abort(403, 'Vehicle not in your ministry.');
        }

        if (! $user->hasRole(['Ministry Admin','Fleet Manager'])) {
            abort(403, 'Only ministry admins or fleet managers can manage invoices.');
        }
    }
}

