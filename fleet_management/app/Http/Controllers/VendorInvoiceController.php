<?php

namespace App\Http\Controllers;

use App\Models\VendorInvoice;
use App\Models\PurchaseOrder;
use App\Models\Quote;
use App\Models\WorkOrder;
use Illuminate\Http\Request;

class VendorInvoiceController extends Controller
{
    // Upload/record vendor invoice for a PO
    public function store(Request $request, $poId)
    {
        $actor = $request->user();

        $po = PurchaseOrder::findOrFail($poId);
        $quote = Quote::findOrFail($po->quote_id);
        $wo = WorkOrder::findOrFail($quote->work_order_id);

        if ($actor->role->name !== 'Super Admin' && $wo->ministry_id !== $actor->ministry_id) {
            return response()->json(['error' => 'Forbidden: wrong ministry'], 403);
        }

        $data = $request->validate([
            'invoice_number' => 'required|string|max:120|unique:vendor_invoices,invoice_number',
            'amount'         => 'required|numeric|min:0',
        ]);

        $invoice = VendorInvoice::create([
            'purchase_order_id' => $po->id,
            'invoice_number'    => $data['invoice_number'],
            'amount'            => $data['amount'],
            'status'            => 'unpaid',
        ]);

        // Optionally: $po->status = 'invoiced'; $po->save();

        return response()->json(['message' => 'Invoice recorded', 'data' => $invoice], 201);
    }

    // Mark invoice as paid
    public function markPaid(Request $request, $invoiceId)
    {
        $actor = $request->user();

        $invoice = VendorInvoice::findOrFail($invoiceId);

        $po    = PurchaseOrder::findOrFail($invoice->purchase_order_id);
        $quote = Quote::findOrFail($po->quote_id);
        $wo    = WorkOrder::findOrFail($quote->work_order_id);

        if ($actor->role->name !== 'Super Admin' && $wo->ministry_id !== $actor->ministry_id) {
            return response()->json(['error' => 'Forbidden: wrong ministry'], 403);
        }

        if ($invoice->status === 'paid') {
            return response()->json(['error' => 'Invoice already paid'], 422);
        }

        $invoice->status = 'paid';
        $invoice->save();

        // Optionally: $po->status = 'closed'; $po->save();

        return response()->json(['message' => 'Invoice marked paid', 'data' => $invoice]);
    }
}
