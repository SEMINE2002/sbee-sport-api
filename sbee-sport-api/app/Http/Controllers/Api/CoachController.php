<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contrat;
use App\Models\Evenement;
use App\Models\Participation;
use App\Models\PerformanceJoueur;
use App\Models\Sanction;
use App\Services\PrimeCalculatorService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

/**
 * Interface mobile Coach — vue terrain simplifiée
 * Toutes les routes sont sous /api/coach/...
 */
class CoachController extends Controller
{
    public function __construct(private PrimeCalculatorService $primeCalculator) {}

    /**
     * GET /api/coach/evenements
     * Liste les prochains matchs/entraînements du coach connecté
     */
    public function mesEvenements(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Evenement::with(['section.discipline', 'competition'])
            ->withCount([
                'participations as nb_convocations',
                'participations as nb_presents' => fn($q) => $q->where('is_present', true),
            ])
            ->where('section_id', $user->section_id);

        // Filtres
        $query
            ->when($request->type, fn($q, $t) => $q->where('type', $t))
            ->when($request->a_venir, fn($q) => $q->where('date_heure', '>=', now()))
            ->when($request->non_valides, fn($q) => $q->where('is_verrouille', false)
                ->where('date_heure', '<=', now()));

        $evenements = $query->orderByDesc('date_heure')->paginate(10);

        return response()->json($evenements);
    }

    /**
     * GET /api/coach/evenements/{evenement}
     * Détail d'un événement avec liste des joueurs à convoquer
     */
    public function detailEvenement(Request $request, Evenement $evenement): JsonResponse
    {
        $user = $request->user();

        if ($evenement->section_id !== $user->section_id) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        // Liste de tous les joueurs actifs de la section (pour l'appel)
$joueurs = Contrat::where('section_id', $evenement->section_id)
    ->where('saison_id', $evenement->saison_id)
    ->where('type_role', 'JOUEUR')
    ->where('statut', 'ACTIF')
    ->with('personne')
    ->get()
    ->map(function ($contrat) use ($evenement) {
        $participation = $evenement->participations
            ->where('contrat_id', $contrat->id)
            ->first();

        return [
            'contrat_id'     => $contrat->id,
            'numero_maillot' => $contrat->numero_maillot,
            'poste'          => $contrat->poste_cle,
            'nom'            => $contrat->personne->nom,
            'prenoms'        => $contrat->personne->prenoms,
            'photo'          => $contrat->personne->photo_url,
            'statut_contrat' => $contrat->statut,
            'eligible_prime' => $contrat->estEligiblePrime(),
            'is_present'     => $participation?->is_present ?? null,
            'is_titulaire'   => $participation?->is_titulaire ?? false,
            'minutes_jouees' => $participation?->minutes_jouees,
            'prime_calculee' => $participation?->prime_calculee,
            // 👈 Ajoutez ces deux lignes ici
            'performances'   => $participation ? $participation->performances()->get() : [],
            'sanctions'      => $participation ? $participation->sanctions()->get() : [],
        ];
    });

         $evenement->load([
           'section.discipline', 
           'competition', 
           'staffingMatchs.contrat.personne',
          'participations.performances',
          'participations.sanctions'
         ]);

        return response()->json([
            'evenement' => $evenement,
            'joueurs'   => $joueurs,
            'stats'     => [
                'nb_total'     => $joueurs->count(),
                'nb_presents'  => $joueurs->where('is_present', true)->count(),
                'nb_absents'   => $joueurs->where('is_present', false)->count(),
                'nb_appel_fait'=> $joueurs->whereNotNull('is_present')->count(),
            ],
        ]);
    }

    /**
     * POST /api/coach/evenements/{evenement}/appel
     * Appel numérique rapide — version mobile optimisée
     * Reçoit un tableau [{contrat_id, is_present, is_titulaire}]
     */
    public function faireAppel(Request $request, Evenement $evenement): JsonResponse
    {
        $user = $request->user();

        if ($evenement->section_id !== $user->section_id) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        if ($evenement->is_verrouille) {
            return response()->json(['message' => 'Événement verrouillé — appel impossible.'], 422);
        }

        $request->validate([
            'joueurs'                  => 'required|array|min:1',
            'joueurs.*.contrat_id'     => 'required|integer|exists:contrats,id',
            'joueurs.*.is_present'     => 'required|boolean',
            'joueurs.*.is_titulaire'   => 'nullable|boolean',
            'joueurs.*.minutes_jouees' => 'nullable|integer|min:0|max:200',
        ]);

        foreach ($request->joueurs as $item) {
            Participation::updateOrCreate(
                ['evenement_id' => $evenement->id, 'contrat_id' => $item['contrat_id']],
                [
                    'is_present'     => $item['is_present'],
                    'is_titulaire'   => $item['is_titulaire'] ?? false,
                    'minutes_jouees' => $item['minutes_jouees'] ?? null,
                ]
            );
        }

        $nbPresents = Participation::where('evenement_id', $evenement->id)
            ->where('is_present', true)->count();

        return response()->json([
            'message'    => 'Appel enregistré.',
            'nb_presents'=> $nbPresents,
        ]);
    }

    /**
     * POST /api/coach/evenements/{evenement}/valider-resultat
     * Valide le résultat final → déclenche le moteur de primes
     */
    public function validerResultat(Request $request, Evenement $evenement): JsonResponse
    {
        $user = $request->user();

        if ($evenement->section_id !== $user->section_id) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        if ($evenement->is_verrouille) {
            return response()->json(['message' => 'Événement déjà verrouillé.'], 422);
        }

        $request->validate([
            'resultat'         => $evenement->estMatch()
                ? 'required|in:VICTOIRE,DEFAITE,NUL'
                : 'nullable',
            'score_nous'       => 'nullable|integer|min:0',
            'score_adversaire' => 'nullable|integer|min:0',
            'observations'     => 'nullable|string|max:500',
        ]);

        // Pour un entraînement → résultat = PRESENCE (pas de score)
        $resultat = $evenement->estEntrainement() ? 'PRESENCE' : $request->resultat;

        $evenement->update([
            'resultat'         => $resultat,
            'score_nous'       => $request->score_nous,
            'score_adversaire' => $request->score_adversaire,
            'observations'     => $request->observations,
        ]);

        // Déclenche le moteur
        $calcul = $this->primeCalculator->calculerPourEvenement(
            $evenement->fresh(['section.discipline', 'competition']),
            $user->id
        );

        return response()->json([
            'message' => $calcul['succes']
                ? '✅ Résultat validé et primes calculées.'
                : '⚠️ Résultat enregistré mais primes bloquées.',
            'calcul'  => $calcul,
        ], $calcul['succes'] ? 200 : 422);
    }

    /**
     * POST /api/coach/participations/{participation}/performances
     * Ajoute les stats d'un joueur (buts, passes, rebonds...)
     */
    /**
     * POST /api/coach/participations/{participation}/performances
     * Ajoute les stats d'un joueur (buts, passes, rebonds...)
     */
    public function ajouterPerformance(Request $request, Participation $participation): JsonResponse
    {
        $user = $request->user();

        // 👈 Autoriser le SUPER_ADMIN peu importe sa section
        if ($user->role_systeme !== 'SUPER_ADMIN' && $participation->evenement->section_id !== $user->section_id) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $request->validate([
            'stats' => 'required|array',
            'stats.*.metrique' => 'required|string|max:50',
            'stats.*.valeur'   => 'required|integer|min:0',
        ]);

        foreach ($request->stats as $stat) {
            PerformanceJoueur::updateOrCreate(
                ['participation_id' => $participation->id, 'metrique' => $stat['metrique']],
                ['valeur' => $stat['valeur']]
            );
        }

        return response()->json([
            'message'      => 'Performances enregistrées.',
            'performances' => $participation->performances()->get(),
        ]);
    }

    /**
     * POST /api/coach/participations/{participation}/sanctions
     * Enregistre un carton / faute technique
     */
    public function ajouterSanction(Request $request, Participation $participation): JsonResponse
    {
        $user = $request->user();

        // 👈 Autoriser le SUPER_ADMIN peu importe sa section
        if ($user->role_systeme !== 'SUPER_ADMIN' && $participation->evenement->section_id !== $user->section_id) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $request->validate([
            'type'       => 'required|in:JAUNE,ROUGE,BLEU,FAUTE_TECHNIQUE,EXCLUSION',
            'motif'      => 'nullable|string|max:255',
            'minute_jeu' => 'nullable|integer|min:1',
        ]);

        $sanction = Sanction::create([
            'participation_id' => $participation->id,
            ...$request->only(['type', 'motif', 'minute_jeu']),
        ]);

        return response()->json([
            'message'  => 'Sanction enregistrée.',
            'sanction' => $sanction,
        ], 201);
    }

   
}
