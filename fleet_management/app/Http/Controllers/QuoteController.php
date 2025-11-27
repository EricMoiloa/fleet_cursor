<?php

namespace App\Http\Controllers;

use App\Models\Quote;
use App\Models\QuoteItem;
use App\Models\Vendor;
use App\Models\WorkOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuoteController extends Controller
{
    // Add a quote with line items for a work order
    public function store(Request $request, $workOrderId)
    {
        $actor = $request->user();

        $wo = WorkOrder::findOrFail($workOrderId);
        if ($actor->role->name !== 'Super Admin' && $wo->ministry_id !== $actor->ministry_id) {
            return response()->json(['error' => 'Forbidden: wrong ministry'], 403);
        }

        $data = $request->validate([
            'vendor_id'  => 'required|exists:vendors,id',
            'reference'  => 'nullable|string|max:120',
            'quote_date' => 'nullable|date',
            'items'      => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.quantity'    => 'required|integer|min:1',
            'items.*.unit_price'  => 'required|numeric|min:0',
        ]);

        // Vendor must belong to the same ministry
        $vendor = Vendor::findOrFail($data['vendor_id']);
        if ($vendor->ministry_id !== $wo->ministry_id) {
            return response()->json(['error' => 'Vendor not in same ministry'], 422);
        }

        return DB::transaction(function () use ($wo, $data) {
            $quote = Quote::create([
                'work_order_id' => $wo->id,
                'vendor_id'     => $data['vendor_id'],
                'reference'     => $data['reference'] ?? null,
                'quote_date'    => $data['quote_date'] ?? now(),
                'subtotal'      => 0,
                'tax'           => 0,
                'total'         => 0,
                'status'        => 'pending',
            ]);

            $subtotal = 0;
            foreach ($data['items'] as $item) {
                $line = ($item['quantity'] * $item['unit_price']);
                QuoteItem::create([
                    'quote_id'    => $quote->id,
                    'description' => $item['description'],
                    'quantity'    => $item['quantity'],
                    'unit_price'  => $item['unit_price'],
                    'line_total'  => $line,
                ]);
                $subtotal += $line;
            }

            // simple 16% tax example (adjust or compute from request)
            $tax   = round($subtotal * 0.16, 2);
            $total = $subtotal + $tax;

            $quote->update(['subtotal' => $subtotal, 'tax' => $tax, 'total' => $total]);

            return response()->json(['message' => 'Quote created', 'data' => $quote->load('items')], 201);
        });
    }

    public function approve(Request $request, $quoteId)
    {
        $actor = $request->user();

        $quote = Quote::with('items')->findOrFail($quoteId);
        $wo = WorkOrder::findOrFail($quote->work_order_id);

        if ($actor->role->name !== 'Super Admin' && $wo->ministry_id !== $actor->ministry_id) {
            return response()->json(['error' => 'Forbidden: wrong ministry'], 403);
        }

        if ($quote->status !== 'pending') {
            return response()->json(['error' => 'Only pending quotes can be approved'], 422);
        }

        // Optionally reject others here.
        $quote->status = 'approved';
        $quote->save();

        $wo->status = 'approved';
        $wo->save();

        return response()->json(['message' => 'Quote approved', 'data' => $quote]);
    }

    public function reject(Request $request, $quoteId)
    {
        $actor = $request->user();

        $quote = Quote::findOrFail($quoteId);
        $wo = WorkOrder::findOrFail($quote->work_order_id);

        if ($actor->role->name !== 'Super Admin' && $wo->ministry_id !== $actor->ministry_id) {
            return response()->json(['error' => 'Forbidden: wrong ministry'], 403);
        }

        if ($quote->status !== 'pending') {
            return response()->json(['error' => 'Only pending quotes can be rejected'], 422);
        }

        $quote->status = 'rejected';
        $quote->save();

        return response()->json(['message' => 'Quote rejected', 'data' => $quote]);
    }
}
