<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Evenement;
use App\Models\Participation;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JoueurController extends Controller
{
    /**
     * GET /api/joueur/profil
     * Profil complet du joueur connecté
     */
    public function monProfil(Request $request): JsonResponse
    {
        $user    = $request->user();
        $personne = $user->personne;

        if (!$personne) {
            return response()->json(['message' => 'Aucun profil joueur associé.'], 404);
        }

        $personne->load([
            'contrats' => fn($q) => $q->with(['section.discipline', 'saison'])
                                      ->where('statut', '!=', 'ARCHIVE')
                                      ->latest(),
            'documents',
            'palmares',
            'consultations' => fn($q) => $q->latest()->limit(3),
        ]);

        // Contrat actif
        $contrat = $personne->contrats->first();

        // Stats primes
        $totalPrimes = Participation::where('is_present', true)
            ->whereNotNull('prime_calculee')
            ->whereHas('contrat', fn($q) => $q->where('personne_id', $personne->id))
            ->sum('prime_calculee');

        $primesVersees = Participation::where('is_present', true)
            ->where('prime_versee', true)
            ->whereNotNull('prime_calculee')
            ->whereHas('contrat', fn($q) => $q->where('personne_id', $personne->id))
            ->sum('prime_calculee');

        // Stats présences
        $totalConvocations = Participation::whereHas('contrat', fn($q) =>
            $q->where('personne_id', $personne->id)
        )->count();

        $totalPresences = Participation::where('is_present', true)
            ->whereHas('contrat', fn($q) => $q->where('personne_id', $personne->id))
        ->count();

        $tauxPresence = $totalConvocations > 0
            ? round(($totalPresences / $totalConvocations) * 100, 1)
            : 0;

        return response()->json([
            'personne'          => $personne,
            'contrat_actif'     => $contrat,
            'stats' => [
                'total_primes'      => $totalPrimes,
                'primes_versees'    => $primesVersees,
                'primes_en_attente' => $totalPrimes - $primesVersees,
                'nb_convocations'   => $totalConvocations,
                'nb_presences'      => $totalPresences,
                'taux_presence'     => $tauxPresence,
            ],
        ]);
    }

    /**
     * GET /api/joueur/convocations
     * Prochains matchs et entraînements du joueur
     */
    public function mesConvocations(Request $request): JsonResponse
    {
        $user    = $request->user();
        $personne = $user->personne;

        if (!$personne) {
            return response()->json(['convocations' => [], 'stats' => []], 200);
        }

        $contratActif = $personne->contrats()
            ->where('statut', '!=', 'ARCHIVE')
            ->latest()->first();

        if (!$contratActif) {
            return response()->json(['convocations' => [], 'stats' => []], 200);
        }

        // Événements à venir où le joueur est dans les participations
        $convocations = Evenement::with([
            'section.discipline',
            'participations' => fn($q) => $q->where('contrat_id', $contratActif->id),
        ])
        ->whereHas('participations', fn($q) =>
            $q->where('contrat_id', $contratActif->id)
        )
        ->where('date_heure', '>=', now())
        ->where('statut', '!=', 'ANNULE')
        ->orderBy('date_heure')
        ->get()
        ->map(fn($evt) => [
            'id'            => $evt->id,
            'type'          => $evt->type,
            'adversaire'    => $evt->adversaire,
            'lieu'          => $evt->lieu,
            'date_heure'    => $evt->date_heure,
            'domicile'      => $evt->domicile,
            'statut'        => $evt->statut,
            'section'       => $evt->section?->nom,
            'discipline'    => $evt->section?->discipline?->nom,
            'is_titulaire'  => $evt->participations->first()?->is_titulaire,
            'is_present'    => $evt->participations->first()?->is_present,
        ]);

        // Historique récent (5 derniers)
        $historique = Evenement::with([
            'participations' => fn($q) => $q->where('contrat_id', $contratActif->id),
        ])
        ->whereHas('participations', fn($q) =>
            $q->where('contrat_id', $contratActif->id)
        )
        ->where('date_heure', '<', now())
        ->where('statut', 'TERMINE')
        ->orderByDesc('date_heure')
        ->limit(5)
        ->get()
        ->map(fn($evt) => [
            'id'           => $evt->id,
            'type'         => $evt->type,
            'adversaire'   => $evt->adversaire,
            'date_heure'   => $evt->date_heure,
            'resultat'     => $evt->resultat,
            'score_nous'   => $evt->score_nous,
            'score_adverse'=> $evt->score_adverse,
            'is_present'   => $evt->participations->first()?->is_present,
            'is_titulaire' => $evt->participations->first()?->is_titulaire,
            'prime'        => $evt->participations->first()?->prime_calculee,
        ]);

        return response()->json([
            'convocations' => $convocations,
            'historique'   => $historique,
            'stats' => [
                'prochains_matchs'  => $convocations->where('type', 'MATCH')->count(),
                'prochains_entrainements' => $convocations->where('type', 'ENTRAINEMENT')->count(),
            ],
        ]);
    }

    /**
     * GET /api/joueur/primes
     * Historique des primes du joueur
     */
    public function mesPrimes(Request $request): JsonResponse
    {
        $user    = $request->user();
        $personne = $user->personne;

        if (!$personne) {
            return response()->json(['participations' => [], 'total_primes' => 0], 200);
        }

        $participations = Participation::with(['evenement', 'contrat'])
            ->where('is_present', true)
            ->whereNotNull('prime_calculee')
            ->whereHas('contrat', fn($q) =>
                $q->where('personne_id', $personne->id)
            )
            ->orderByDesc('created_at')
            ->paginate(20);

        $totalPrimes   = Participation::where('is_present', true)
            ->whereNotNull('prime_calculee')
            ->whereHas('contrat', fn($q) => $q->where('personne_id', $personne->id))
            ->sum('prime_calculee');

        $primesVersees = Participation::where('is_present', true)
            ->where('prime_versee', true)
            ->whereHas('contrat', fn($q) => $q->where('personne_id', $personne->id))
            ->sum('prime_calculee');

        return response()->json([
            'participations' => $participations,
            'total_primes'   => $totalPrimes,
            'primes_versees' => $primesVersees,
            'primes_en_attente' => $totalPrimes - $primesVersees,
        ]);
    }

    /**
     * GET /api/joueur/performances
     * Statistiques de performance du joueur
     */
    public function mesPerformances(Request $request): JsonResponse
    {
        $user    = $request->user();
        $personne = $user->personne;

        if (!$personne) {
            return response()->json(['performances' => []], 200);
        }

        $contratActif = $personne->contrats()
            ->where('statut', '!=', 'ARCHIVE')
            ->latest()->first();

        if (!$contratActif) {
            return response()->json(['performances' => []], 200);
        }

        $participations = Participation::with([
            'evenement',
            'performances',
            'sanctions',
        ])
        ->where('contrat_id', $contratActif->id)
        ->where('is_present', true)
        ->whereHas('evenement', fn($q) => $q->where('statut', 'TERMINE'))
        ->orderByDesc('created_at')
        ->get();

        // Agrégation des stats
        $statsGlobales = [];
        $totalMinutes  = 0;
        $totalTitulaire = 0;

        foreach ($participations as $p) {
            $totalMinutes  += $p->minutes_jouees ?? 0;
            $totalTitulaire += $p->is_titulaire ? 1 : 0;

            foreach ($p->performances as $perf) {
                if (!isset($statsGlobales[$perf->metrique])) {
                    $statsGlobales[$perf->metrique] = 0;
                }
                $statsGlobales[$perf->metrique] += $perf->valeur;
            }
        }

        return response()->json([
            'participations'   => $participations,
            'stats_globales'   => $statsGlobales,
            'total_minutes'    => $totalMinutes,
            'nb_titulaire'     => $totalTitulaire,
            'nb_remplacant'    => $participations->count() - $totalTitulaire,
            'nb_matchs'        => $participations->where('evenement.type', 'MATCH')->count(),
            'nb_entrainements' => $participations->where('evenement.type', 'ENTRAINEMENT')->count(),
        ]);
    }
}