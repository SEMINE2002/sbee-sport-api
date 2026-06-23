<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Adapte 'role_systeme' et les valeurs ADMIN/SUPER_ADMIN
        // à ce qui existe réellement dans ta table USER
        if (!$user || !in_array($user->role_systeme, ['ADMIN', 'SUPER_ADMIN'])) {
            return response()->json([
                'message' => 'Action non autorisée. Seul un administrateur peut publier des actualités.'
            ], 403);
        }

        return $next($request);
    }
}