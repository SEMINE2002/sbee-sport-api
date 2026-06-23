<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckSectionAccess
{
    /**
     * Vérifie que l'utilisateur a accès à la section concernée.
     *
     * RG-ISO-01 : Un responsable ou un coach ne peut voir et gérer que sa propre section.
     * Exception : SUPER_ADMIN, TRESORIER et SPONSOR ont un accès global à toutes les sections.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // ── 1. Vérification de l'authentification ──
        if (!$user) {
            return response()->json(['message' => 'Non authentifié.'], 401);
        }

        // ── 2. Rôles globaux : Accès illimité et levée immédiate des barrières ──
        $rolesGlobaux = ['SUPER_ADMIN', 'TRESORIER', 'SPONSOR', 'ADMIN'];

        if (in_array($user->role_systeme, $rolesGlobaux) || (method_exists($user, 'hasAnyRole') && $user->hasAnyRole($rolesGlobaux))) {
            return $next($request);
        }

        // ── 3. Rôles restreints : Réfuser l'accès si l'utilisateur n'est rattaché à aucune section ──
        if (!$user->section_id) {
            return response()->json([
                'message' => 'Accès refusé : vous n\'êtes affecté à aucune section sportive.',
            ], 403);
        }

        // ── 4. Extraction intelligente de l'ID de la section demandée ──
        // Analyse la route (Route Model Binding), le corps de la requête ou les paramètres d'URL
        $requestedSectionId = $request->route('section')?->id
            ?? $request->input('section_id')
            ?? $request->query('section_id');

        // Sécurité additionnelle : Si l'ID n'est pas direct mais qu'on cible une participation (ex: Espace Coach)
        if (!$requestedSectionId && $request->route('participation')) {
            $participationParam = $request->route('participation');
            
            // Résolution de la participation si c'est un ID ou un objet déjà injecté
            $participation = is_object($participationParam) 
                ? $participationParam 
                : \App\Models\Participation::with('evenement')->find($participationParam);

            if ($participation && $participation->evenement) {
                $requestedSectionId = $participation->evenement->section_id;
            }
        }

        // ── 5. Contrôle d'étanchéité et comparaison des sections ──
        // Si une section spécifique est ciblée et qu'elle ne correspond pas à la section de l'utilisateur
        if ($requestedSectionId && (int)$requestedSectionId !== (int)$user->section_id) {
            return response()->json([
                'message' => 'Accès refusé : vous ne pouvez accéder qu\'aux données de votre propre section.',
            ], 403);
        }

        return $next($request);
    }
}