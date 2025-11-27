<?php

namespace App\Http\Controllers;

use App\Models\PurchaseOrder;
use App\Models\Quote;
use App\Models\WorkOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PurchaseOrderController extends Controller
{
    // Create a PO from an approved quote (Procurement or Super Admin)
    public function store(Request $request, $quoteId)
    {
        $actor = $request->user();

        $quote = Quote::with('items')->findOrFail($quoteId);
        $wo = WorkOrder::findOrFail($quote->work_order_id);

        // Finance & Procurement has no ministry in your seed, but if you add, scope it:
        if ($actor->role->name !== 'Super Admin' && $wo->ministry_id !== $actor->ministry_id) {
            return response()->json(['error' => 'Forbidden: wrong ministry'], 403);
        }

        if ($quote->status !== 'approved') {
            return response()->json(['error' => 'Quote must be approved first'], 422);
        }

        // simple unique PO number
        $po = PurchaseOrder::create([
            'quote_id'  => $quote->id,
            'po_number' => 'PO-' . Str::upper(Str::random(8)),
            'status'    => 'open',
            'subtotal'  => $quote->subtotal,
            'tax'       => $quote->tax,
            'total'     => $quote->total,
        ]);

        // Optionally: $wo->status = 'in_progress'; $wo->save();

        return response()->json(['message' => 'Purchase order created', 'data' => $po], 201);
    }

    // Mark goods/services received
    public function receive(Request $request, $poId)
    {
        $actor = $request->user();

        $po = PurchaseOrder::findOrFail($poId);
        $quote = Quote::findOrFail($po->quote_id);
        $wo = WorkOrder::findOrFail($quote->work_order_id);

        if ($actor->role->name !== 'Super Admin' && $wo->ministry_id !== $actor->ministry_id) {
            return response()->json(['error' => 'Forbidden: wrong ministry'], 403);
        }

        if (!in_array($po->status, ['open', 'invoiced'])) {
            return response()->json(['error' => 'PO cannot be received in current status'], 422);
        }

        $po->status = 'received';
        $po->save();

        // Optionally: $wo->status = 'completed'; $wo->save();

        return response()->json(['message' => 'PO marked received', 'data' => $po]);
    }
}
