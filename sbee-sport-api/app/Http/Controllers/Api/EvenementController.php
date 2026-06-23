<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Evenement;
use App\Models\Participation;
use App\Models\Contrat;
use App\Services\PrimeCalculatorService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Exceptions\HttpResponseException;

class EvenementController extends Controller
{
    public function __construct(private PrimeCalculatorService $primeCalculator) {}

    /**
     * GET /api/evenements
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Evenement::with(['section.discipline', 'saison', 'competition', 'validePar'])
            ->withCount(['participations as nb_presents' => function($q) {
                return $q->where('is_present', true);
            }]);

        // Restriction stricte au niveau de la section pour les utilisateurs non admin
        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'ADMIN', 'TRESORIER'])) {
            $query->where('section_id', $user->section_id);
        }

        // Filtres de recherche dynamiques
        $query
            ->when($request->input('section_id'), fn($q, $id) => $q->where('section_id', $id))
            ->when($request->input('saison_id'),  fn($q, $id) => $q->where('saison_id', $id))
            ->when($request->input('type'),       fn($q, $t)  => $q->where('type', $t))
            ->when($request->input('statut'),     fn($q, $s)  => $q->where('statut', $s))
            ->when($request->input('resultat'),   fn($q, $r)  => $q->where('resultat', $r))
            ->when($request->input('date_debut'), fn($q, $d)  => $q->whereDate('date_heure', '>=', $d))
            ->when($request->input('date_fin'),   fn($q, $d)  => $q->where('date_heure', '<=', $d . ' 23:59:59'));

        return response()->json($query->orderByDesc('date_heure')->paginate(20));
    }

    /**
     * POST /api/evenements
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'section_id'     => 'required|exists:sections,id',
            'saison_id'      => 'required|exists:saisons,id',
            'competition_id' => 'nullable|exists:competitions,id',
            'type'           => 'required|in:MATCH,ENTRAINEMENT,TOURNOI,AMICAL',
            'date_heure'     => 'required|date',
            'lieu'           => 'nullable|string|max:150',
            'domicile'       => 'nullable|boolean',
            'adversaire'     => 'required_if:type,MATCH|nullable|string|max:150',
            'duree_minutes'  => 'nullable|integer|min:15|max:300',
            'observations'   => 'nullable|string',
           
        ]);

        $user = $request->user();
        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'ADMIN', 'TRESORIER']) &&
            $request->input('section_id') != $user->section_id) {
            return response()->json(['message' => 'Accès refusé à cette section.'], 403);
        }

        $evenement = Evenement::create([
            ...$request->only([
                'section_id', 'saison_id', 'competition_id',
                'type', 'date_heure', 'lieu', 'domicile',
                'adversaire', 'duree_minutes', 'observations'
            ]),
            'statut'        => 'PLANIFIE',
            'resultat'      => 'EN_ATTENTE',
            'is_verrouille' => false,
        ]);

        return response()->json([
            'message'   => 'Événement créé avec succès.',
            'evenement' => $evenement->load(['section.discipline', 'competition']),
        ], 201);
    }

    /**
     * GET /api/evenements/{evenement}
     */
   /**
     * GET /api/evenements/{evenement}
     */
    public function show(Request $request, Evenement $evenement): JsonResponse
    {
        $this->verifierAcces($request->user(), $evenement);

        // Nettoyage des relations pour ne garder que celles qui existent réellement
        $evenement->load([
            'section.discipline.grillePrimes',
            'saison',
            'competition',
            'validePar',
            'participations.contrat.personne',
            'participations.performances', // ⬅️ Ajouté ici
            'participations.sanctions',    // ⬅️ Ajouté ici
            'staffingMatchs.contrat.personne',
        ]);

        // Calcule le montant total des primes (Verrouillé ou Simulation)
        $totalPrimes = $evenement->participations
            ->whereNotNull('prime_calculee')
            ->sum('prime_calculee');

        if ($totalPrimes == 0 && !$evenement->is_verrouille && $evenement->type === 'MATCH' && $evenement->resultat) {
            $grille = $evenement->section->discipline->grillePrimes
                ->where('type_match', $evenement->competition_id ? 'CHAMPIONNAT' : 'AMICAL')
                ->where('resultat', $evenement->resultat)
                ->first();

            if ($grille) {
                $base = (float)$grille->montant_base;
                $prorata = (float)$grille->pourcent_remplacant;
                $totalPrimes = $evenement->participations->sum(function($p) use ($base, $prorata) {
                    if (!$p->is_present) return 0;
                    return $p->is_titulaire ? $base : ($base * $prorata);
                });
            }
        }

        $evenementData = $evenement->toArray();
        $evenementData['primes_calculees'] = $totalPrimes;

        return response()->json(['evenement' => $evenementData]);
    }

    /**
     * PUT /api/evenements/{evenement}
     */
    public function update(Request $request, Evenement $evenement): JsonResponse
    {
        $this->verifierAcces($request->user(), $evenement);

        if ($evenement->is_verrouille) {
            return response()->json(['message' => 'Événement verrouillé, modification impossible.'], 422);
        }

        $request->validate([
            'date_heure'       => 'sometimes|date',
            'lieu'             => 'nullable|string|max:150',
            'domicile'         => 'nullable|boolean',
            'adversaire'       => 'nullable|string|max:150',
            'observations'     => 'nullable|string',
            'statut'           => 'sometimes|in:PLANIFIE,EN_COURS,TERMINE,ANNULE,REPORTE',
            'resultat'         => 'nullable|in:VICTOIRE,DEFAITE,NUL,EN_ATTENTE',
            'score_nous'       => 'nullable|integer|min:0',
            'score_adversaire' => 'nullable|integer|min:0', // Corrigé (score_adverse -> score_adversaire)
            'duree_minutes'    => 'nullable|integer|min:15|max:300',
            'is_verrouille'    => 'nullable|boolean'
        ]);

        // On récupère les données et on mappe correctement le champ si reçu depuis le front
        $data = $request->only([
            'date_heure', 'lieu', 'domicile', 'adversaire',
            'observations', 'statut', 'resultat',
            'score_nous', 'duree_minutes', 'is_verrouille'
        ]);

        if ($request->has('score_adversaire')) {
            $data['score_adversaire'] = $request->input('score_adversaire');
        } elseif ($request->has('score_adverse')) {
            $data['score_adversaire'] = $request->input('score_adverse');
        }

        $evenement->update($data);

        if ($request->has('is_verrouille') && $request->input('is_verrouille') == true) {
            $this->primeCalculator->calculerPourEvenement($evenement->fresh(), $request->user()->id);
        }

        return response()->json([
            'message'   => 'Événement mis à jour avec succès.',
            'evenement' => $evenement->fresh([
                'section.discipline', 'saison',
                'participations.contrat.personne',
            ]),
        ]);
    }

    /**
     * POST /api/evenements/{evenement}/valider
     */
    public function valider(Request $request, Evenement $evenement): JsonResponse
    {
        $this->verifierAcces($request->user(), $evenement);

        if ($evenement->is_verrouille) {
            return response()->json(['message' => 'Cet événement is déjà verrouillé.'], 422);
        }

        $request->validate([
            'resultat'         => 'required_if:type,MATCH|nullable|in:VICTOIRE,DEFAITE,NUL',
            'score_nous'       => 'nullable|integer|min:0',
            'score_adversaire' => 'nullable|integer|min:0', // Corrigé ici aussi
            'observations'     => 'nullable|string',
        ]);

        $evenement->update([
            'resultat'         => $request->input('resultat') ?? $evenement->resultat,
            'score_nous'       => $request->input('score_nous'),
            'score_adversaire' => $request->input('score_adversaire') ?? $request->input('score_adverse'), // Sécurité
            'observations'     => $request->input('observations') ?? $evenement->observations,
            'statut'           => 'TERMINE',
            'is_verrouille'    => false, 
        ]);

        $evenementFrais = $evenement->fresh(['section.discipline', 'competition', 'participations.contrat']);
        $resultatService = $this->primeCalculator->calculerPourEvenement($evenementFrais, $request->user()->id);

        $evenement->update(['is_verrouille' => true]);

        $evenementComplet = $evenement->fresh([
            'section.discipline', 'saison', 'competition', 'validePar',
            'participations.contrat.personne', 'staffingMatchs.contrat.personne',
        ]);

        $totalPrimes = $evenementComplet->participations->whereNotNull('prime_calculee')->sum('prime_calculee');

        if (!$resultatService['succes']) {
            return response()->json([
                'succes'    => false,
                'message'   => $resultatService['message'],
                'evenement' => array_merge($evenementComplet->toArray(), ['primes_calculees' => 0]),
            ], 422);
        }

        return response()->json([
            'succes'         => true,
            'message'        => "Événement validé. {$resultatService['details']['nb_joueurs']} prime(s) calculée(s) — Total : " . number_format($totalPrimes, 0, ',', ' ') . " FCFA",
            'evenement'      => array_merge($evenementComplet->toArray(), ['primes_calculees' => $totalPrimes]),
            'details_primes' => $resultatService['details'] ?? [],
        ]);
    }
    /**
     * POST /api/evenements/{evenement}/participations
     */
    public function enregistrerParticipations(Request $request, Evenement $evenement): JsonResponse
    {
        $this->verifierAcces($request->user(), $evenement);

        if ($evenement->is_verrouille) {
            return response()->json(['message' => 'L\'événement est verrouillé. Pointage impossible.'], 422);
        }

        $listeJoueurs = $request->has('participations') ? $request->input('participations') : $request->input('joueurs');

        $request->validate([
            'participations' => 'sometimes|array',
            'joueurs'        => 'sometimes|array',
            '*.contrat_id'   => 'integer',
            '*.is_present'   => 'boolean',
        ]);

        if (empty($listeJoueurs)) {
            return response()->json(['message' => 'Aucune donnée de participation reçue.'], 422);
        }

        $creations = 0;
        $mises_a_jour = 0;

        DB::transaction(function () use ($listeJoueurs, $evenement, &$creations, &$mises_a_jour) {
            foreach ($listeJoueurs as $joueurData) {
                $contrat = Contrat::where('id', $joueurData['contrat_id'])
                    ->where('section_id', $evenement->section_id)
                    ->first();

                if (!$contrat) continue;

                $participation = Participation::updateOrCreate(
                    [
                        'evenement_id' => $evenement->id,
                        'contrat_id'   => $joueurData['contrat_id'],
                    ],
                    [
                        'is_present'     => $joueurData['is_present'],
                        'is_titulaire'   => $joueurData['is_titulaire'] ?? false,
                        'minutes_jouees' => $joueurData['minutes_jouees'] ?? null,
                    ]
                );

                $participation->wasRecentlyCreated ? $creations++ : $mises_a_jour++;
            }
        });

        return response()->json([
            'message'        => 'Appel enregistré avec succès.',
            'crees'          => $creations,
            'mis_a_jour'     => $mises_a_jour,
            'participations' => $evenement->participations()->with('contrat.personne')->get(),
        ]);
    }

    /**
     * PATCH /api/participations/{participation}
     */
    public function updateParticipation(Request $request, Participation $participation): JsonResponse
    {
        $evenement = $participation->evenement;
        $this->verifierAcces($request->user(), $evenement);

        if ($evenement->is_verrouille) {
            return response()->json(['message' => 'Événement verrouillé.'], 422);
        }

        $request->validate([
            'is_present'     => 'sometimes|boolean',
            'is_titulaire'   => 'sometimes|boolean',
            'minutes_jouees' => 'nullable|integer|min:0|max:300',
        ]);

        $participation->update($request->only(['is_present', 'is_titulaire', 'minutes_jouees']));

        return response()->json([
            'message'       => 'Participation mise à jour.',
            'participation' => $participation->fresh(['contrat.personne', 'performances', 'sanctions']),
        ]);
    }

    /**
     * POST /api/evenements/{evenement}/staffing
     */
    public function ajouterStaff(Request $request, Evenement $evenement): JsonResponse
    {
        $this->verifierAcces($request->user(), $evenement);

        $request->validate([
            'contrat_id' => 'required|exists:contrats,id',
            'role_match' => 'required|in:PRINCIPAL,ADJOINT,KINE,MEDECIN,INTENDANT',
        ]);

        $staffing = $evenement->staffingMatchs()->updateOrCreate(
            ['contrat_id' => $request->input('contrat_id')],
            ['role_match' => $request->input('role_match')]
        );

        return response()->json([
            'message'  => 'Staff ajouté avec succès.',
            'staffing' => $staffing->load('contrat.personne'),
        ], 201);
    }

    /**
     * DELETE /api/staffing-matchs/{staffing}
     */
    public function retirerStaff(Request $request, $staffingId): JsonResponse
    {
        $staffing = \App\Models\StaffingMatch::findOrFail($staffingId);
        $this->verifierAcces($request->user(), $staffing->evenement);
        $staffing->delete();
        return response()->json(['message' => 'Staff retiré avec succès.']);
    }

    /**
     * DELETE /api/participations/{participation}
     */
    public function retirerParticipation(Request $request, Participation $participation): JsonResponse
    {
        $evenement = $participation->evenement;
        $this->verifierAcces($request->user(), $evenement);

        if ($evenement->is_verrouille) {
            return response()->json(['message' => 'Événement verrouillé.'], 422);
        }

        $participation->delete();
        return response()->json(['message' => 'Joueur retiré de la composition.']);
    }

    /**
     * DELETE /api/evenements/{evenement}
     */
    public function destroy(Request $request, Evenement $evenement): JsonResponse
    {
        $this->verifierAcces($request->user(), $evenement);

        if ($evenement->is_verrouille) {
            return response()->json(['message' => 'Impossible de supprimer un événement verrouillé.'], 422);
        }

        $evenement->participations()->delete();
        $evenement->staffingMatchs()->delete();
        $evenement->delete();

        return response()->json(['message' => 'Événement supprimé avec succès.']);
    }

    /**
     * POST /api/evenements/{evenement}/cloturer
     */
    public function cloturer(Request $request, Evenement $evenement): JsonResponse
    {
        if (!in_array($request->user()->role_systeme, ['SUPER_ADMIN', 'ADMIN', 'TRESORIER'])) {
            return response()->json(['message' => 'Action non autorisée.'], 403);
        }

        $resultat = $this->primeCalculator->calculerPourEvenement($evenement, $request->user()->id);

        if (!$resultat['succes']) {
            return response()->json(['message' => $resultat['message']], 400);
        }

        return response()->json([
            'message'   => 'Événement clôturé avec succès et primes enregistrées.',
            'evenement' => $evenement->fresh(['section.discipline', 'saison', 'participations.contrat.personne'])
        ]);
    }

    /**
     * POST /api/evenements/{evenement}/decloturer
     */
    public function decloturer(Request $request, Evenement $evenement): JsonResponse
    {
        $user = $request->user();
        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'ADMIN', 'TRESORIER'])) {
            return response()->json(['message' => 'Action non autorisée. Seul un administrateur ou trésorier peut déclôturer un événement.'], 403);
        }

        $evenement->update([
            'is_verrouille' => false,
            'statut'        => 'PLANIFIE'
        ]);

        $evenement->participations()->update(['prime_calculee' => null]);

        return response()->json([
            'message'   => 'Événement déclôturé avec succès. Les modifications sont à nouveau possibles.',
            'evenement' => $evenement->fresh([
                'section.discipline', 'saison', 'competition', 'validePar',
                'participations.contrat.personne', 'participations.performances', 'participations.sanctions'
            ])
        ]);
    }

    /**
     * Méthode de vérification d'accès formatée JSON propre pour l'API React
     */
    private function verifierAcces($user, Evenement $evenement): void
    {
        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'ADMIN', 'TRESORIER'])) {
            if ($evenement->section_id !== $user->section_id) {
                $response = response()->json(['message' => 'Accès refusé. Vous n\'avez pas les droits sur cette section sportive.'], 403);
                throw new HttpResponseException($response);
            }
        }
    }
}