<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use App\Models\User;

class AuthController extends Controller
{
    public function login(Request $request)
{
    $validated = $request->validate([
        'email'    => ['required','email'],
        'password' => ['required','string'],
    ]);

    $user = User::with(['role','ministry','department'])
        ->where('email', $validated['email'])
        ->first();

    if (! $user || ! Hash::check($validated['password'], $user->password)) {
        throw ValidationException::withMessages([
            'email' => ['The provided credentials are incorrect.'],
        ]);
    }

    if (! $user->is_active) {
        return response()->json(['message' => 'Account disabled'], 403);
    }

    $token = $user->createToken('auth_token')->plainTextToken;

    // Always return 200 with a flag so FE can redirect, but it can call /change-password using this token.
    if ($user->is_first_login) {
        return response()->json([
            'message'                   => 'First login: please change your password.',
            'requires_password_change'  => true,
            'token'                     => $token,
            'user'                      => $user,
        ], 200);
    }

    return response()->json([
        'message' => 'Login successful',
        'requires_password_change' => false,
        'token'   => $token,
        'user'    => $user,
    ], 200);
}

    public function logout(Request $request)
    {
        $token = $request->user()?->currentAccessToken();
        if ($token) {
            $token->delete();
        }

        return response()->json(['message' => 'Logged out successfully'], 200);
    }
public function changePassword(Request $request)
{
    $validated = $request->validate([
        'old_password'              => ['required','string'],
        'new_password'              => ['required','string','min:8','confirmed'],
        // FE must send: new_password & new_password_confirmation
    ]);

    $user = $request->user();

    if (! Hash::check($validated['old_password'], $user->password)) {
        return response()->json(['message' => 'Old password is incorrect.'], 422);
    }

    $user->password = Hash::make($validated['new_password']);
    $user->is_first_login = false;
    $user->save();

    return response()->json(['message' => 'Password changed successfully.'], 200);
}

}
