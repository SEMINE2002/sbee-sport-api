<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware de vérification des rôles et isolation par section.
 *
 * Usage dans les routes :
 *   ->middleware('role:SUPER_ADMIN,TRESORIER')
 *   ->middleware('role:RESPONSABLE_SECTION')
 */
class CheckRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        // Pas connecté
        if (!$user) {
            return response()->json([
                'message' => 'Non authentifié.',
            ], 401);
        }

        // Compte désactivé
        if (!$user->estActif()) {
            return response()->json([
                'message' => 'Votre compte est désactivé.',
            ], 403);
        }

        // Vérification du rôle
        if (!empty($roles) && !in_array($user->role_systeme, $roles)) {
            return response()->json([
                'message' => 'Accès refusé. Vous n\'avez pas les droits nécessaires.',
                'required_roles' => $roles,
                'your_role'      => $user->role_systeme,
            ], 403);
        }

        return $next($request);
    }
}
