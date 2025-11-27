<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'unread' => $user->unreadNotifications()->limit(50)->get(),
            'all'    => $user->notifications()->limit(100)->get(),
        ]);
    }

    public function markRead(Request $request, $id)
    {
        $user = $request->user();
        $n = $user->notifications()->whereKey($id)->firstOrFail();
        $n->markAsRead();

        return response()->json(['message' => 'Marked as read']);
    }

    public function markAllRead(Request $request)
    {
        $request->user()->unreadNotifications->markAsRead();
        return response()->json(['message' => 'All marked as read']);
    }
}
