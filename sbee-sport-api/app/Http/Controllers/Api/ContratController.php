<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contrat;
use App\Models\NotificationApp;
use App\Models\User;
use App\Models\Saison;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ContratController extends Controller
{
    /**
     * GET /api/contrats
     * Liste les contrats avec filtres avancés, alertes et statistiques intégrées
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Contrat::with([
            'personne',
            'section.discipline',
            'saison',
        ]);

        // Isolation par section pour les responsables et coachs
        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
            $query->where('section_id', $user->section_id);
        }

        // Filtres dynamiques de recherche et de structure
        $query->when($request->section_id, fn($q, $id) => $q->where('section_id', $id))
            ->when($request->saison_id, fn($q, $id) => $q->where('saison_id', $id))
            ->when($request->type_role, fn($q, $r) => $q->where('type_role', $r))
            ->when($request->statut, fn($q, $s) => $q->where('statut', $s))
            ->when($request->search, function ($q, $search) {
                $q->whereHas('personne', function ($qp) use ($search) {
                    $qp->where('nom', 'like', "%{$search}%")
                       ->orWhere('prenoms', 'like', "%{$search}%");
                });
            });

        // Gestion des alertes d'expiration synchronisées avec le Frontend
        $query->when($request->alerte, function ($q, $alerte) {
            if ($alerte === 'expiration') {
                $q->where('date_fin_contrat', '<=', now()->addDays(30))
                  ->where('date_fin_contrat', '>=', now())
                  ->where('renouvelable', false)
                  ->where('statut', '!=', 'ARCHIVE');
            } elseif ($alerte === 'renouvelable') {
                $q->where('date_fin_contrat', '<=', now()->addDays(30))
                  ->where('date_fin_contrat', '>=', now())
                  ->where('renouvelable', true)
                  ->where('statut', '!=', 'ARCHIVE');
            } elseif ($alerte === 'expires') {
                $q->where('date_fin_contrat', '<', now());
            }
        });

        // Calcul des statistiques globales pour le bandeau supérieur du Frontend
        $statsQuery = Contrat::query();
        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
            $statsQuery->where('section_id', $user->section_id);
        }

        $allContrats = $statsQuery->get();
        $stats = [
            'nb_actifs' => $allContrats->where('statut', 'ACTIF')->where('date_fin_contrat', '>', now()->addDays(30))->count(),
            'nb_expirant_bientot' => $allContrats->where('statut', '!=', 'ARCHIVE')->filter(fn($c) => $c->date_fin_contrat >= now() && $c->date_fin_contrat <= now()->addDays(30) && !$c->renouvelable)->count(),
            'nb_renouvelables' => $allContrats->where('statut', '!=', 'ARCHIVE')->filter(fn($c) => $c->date_fin_contrat >= now() && $c->date_fin_contrat <= now()->addDays(30) && $c->renouvelable)->count(),
            'nb_expires' => $allContrats->filter(fn($c) => $c->date_fin_contrat < now())->count(),
        ];

        // OPTION ADDITIONNELLE : Désactivation de la pagination pour les listes déroulantes de formulaires (ex: Dotations)
        if ($request->has('no_paginate') && $request->no_paginate == 1) {
            $allContratsItems = $query->orderBy('date_fin_contrat', 'desc')->get();
            
            return response()->json([
                'data'         => $allContratsItems,
                'current_page' => 1,
                'last_page'    => 1,
                'total'        => $allContratsItems->count(),
                'stats'        => $stats
            ]);
        }

        // Mode par défaut : Pagination pour les listes tabulaires de l'écran Contrats
        $contrats = $query->orderBy('date_fin_contrat', 'desc')->paginate(20);

        return response()->json([
            'data'         => $contrats->items(),
            'current_page' => $contrats->currentPage(),
            'last_page'    => $contrats->lastPage(),
            'total'        => $contrats->total(),
            'stats'        => $stats
        ]);
    }

    /**
     * POST /api/contrats
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'personne_id'        => 'required|exists:personnes,id',
            'section_id'         => 'required|exists:sections,id',
            'saison_id'          => 'required|exists:saisons,id',
            'type_role'          => 'required|in:JOUEUR,COACH,STAFF,MEDECIN,INTENDANT',
            'poste_cle'          => 'nullable|string|max:50',
            'numero_maillot'     => 'nullable|integer|min:1|max:99',
            'numero_licence'     => 'nullable|string|max:50|unique:contrats,numero_licence',
            'salaire_fixe'       => 'nullable|numeric|min:0',
            'prime_signature'    => 'nullable|numeric|min:0',
            'mode_paiement'      => 'nullable|in:VIREMENT,CHEQUE,ESPECES',
            'date_debut_contrat' => 'required|date',
            'date_fin_contrat'   => 'required|date|after:date_debut_contrat',
            'renouvelable'       => 'required|boolean',
        ]);

        $user = $request->user();

        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
            if ($request->section_id != $user->section_id) {
                return response()->json(['message' => 'Accès refusé à cette section.'], 403);
            }
        }

        $existant = Contrat::where('personne_id', $request->personne_id)
            ->where('section_id', $request->section_id)
            ->where('saison_id', $request->saison_id)
            ->whereIn('statut', ['ACTIF', 'BLESSE', 'SUSPENDU'])
            ->first();

        if ($existant) {
            return response()->json([
                'message' => 'Cette personne possède déjà un contrat actif pour cette saison.',
            ], 422);
        }

        $contrat = Contrat::create([
            ...$request->all(),
            'statut'                    => 'ACTIF',
            'documents_valides'         => false,
            'certificat_medical_valide' => false,
        ]);

        return response()->json([
            'message' => 'Contrat créé avec succès.',
            'contrat' => $contrat->load(['personne', 'section', 'saison']),
        ], 201);
    }

    /**
     * GET /api/contrats/{contrat}
     */
    public function show(Request $request, Contrat $contrat): JsonResponse
    {
        $this->verifierAcces($request->user(), $contrat);

        return response()->json([
            'contrat' => $contrat->load([
                'personne.documents',
                'section.discipline',
                'saison',
                'participations.evenement',
            ]),
        ]);
    }

    /**
     * PATCH /api/contrats/{contrat}/statut
     * Gère à la fois les changements de statuts et la prolongation par renouvellement
     */
    public function updateStatut(Request $request, Contrat $contrat): JsonResponse
    {
        $this->verifierAcces($request->user(), $contrat);

        $request->validate([
            'statut'              => 'required|in:ACTIF,BLESSE,SUSPENDU,ARCHIVE',
            'motif'               => 'nullable|string|max:255',
            'date_fin_contrat'    => 'nullable|date|after:date_debut_contrat',
            'note_renouvellement' => 'nullable|string',
        ]);

        $ancienStatut = $contrat->statut;
        
        DB::transaction(function () use ($request, $contrat) {
            $dataUpdate = ['statut' => $request->statut];
            
            // Si une nouvelle date de fin est soumise, on met à jour (scénario de renouvellement)
            if ($request->has('date_fin_contrat')) {
                $dataUpdate['date_fin_contrat'] = $request->date_fin_contrat;
            }
            if ($request->has('note_renouvellement')) {
                $dataUpdate['note_renouvellement'] = $request->note_renouvellement;
            }

            $contrat->update($dataUpdate);

            if ($request->statut === 'ARCHIVE' && $contrat->personne && $contrat->personne->user) {
                $hasOtherActive = Contrat::where('personne_id', $contrat->personne_id)
                    ->where('id', '!=', $contrat->id)
                    ->where('statut', 'ACTIF')
                    ->exists();

                if (!$hasOtherActive) {
                    $contrat->personne->user->update(['is_actif' => false]);
                }
            }
        });

        $this->notifierChangementStatut($contrat, $ancienStatut, $request->statut, $request->motif ?? $request->note_renouvellement);

        return response()->json([
            'message' => "Mise à jour du contrat effectuée avec succès.",
            'contrat' => $contrat->fresh(['personne']),
        ]);
    }

    /**
     * POST /api/contrats/auto-renouveler
     * Utilité : Renouvelle automatiquement d'un an tous les contrats favorables en cours d'expiration
     */
    public function autoRenouvelerProchaineSaison(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $query = Contrat::where('statut', 'ACTIF')
            ->where('renouvelable', true)
            ->where('date_fin_contrat', '<=', now()->addDays(30))
            ->where('date_fin_contrat', '>=', now());

        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
            $query->where('section_id', $user->section_id);
        }

        $contratsARenouveler = $query->get();
        $compteur = 0;

        DB::transaction(function () use ($contratsARenouveler, &$compteur) {
            foreach ($contratsARenouveler as $contrat) {
                // Prolongation automatique de 1 an
                $nouvelleDateFin = $contrat->date_fin_contrat->addYear();
                $contrat->update([
                    'date_fin_contrat' => $nouvelleDateFin,
                    'note_renouvellement' => "Renouvellement automatique global exécuté le " . now()->format('d-m-Y')
                ]);
                $compteur++;
            }
        });

        return response()->json([
            'message' => "$compteur contrat(s) favorable(s) ont été renouvelés automatiquement pour un an."
        ], 200);
    }

    private function verifierAcces($user, Contrat $contrat): void
    {
        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
            abort_if($contrat->section_id !== $user->section_id, 403, 'Accès non autorisé à ce contrat.');
        }
    }

    private function notifierChangementStatut(Contrat $contrat, string $ancien, string $nouveau, ?string $motif): void
    {
        $responsable = User::where('section_id', $contrat->section_id)
            ->where('role_systeme', 'RESPONSABLE_SECTION')
            ->first();

        if ($responsable) {
            NotificationApp::create([
                'user_id'         => $responsable->id,
                'type'            => 'ALERTE',
                'titre'           => "Évolution de dossier contrat",
                'message'         => "{$contrat->personne?->nom} {$contrat->personne?->prenoms} : statut {$ancien} → {$nouveau}." . ($motif ? " Note : $motif" : ""),
                'url_action'      => "/contrats/{$contrat->id}",
                'notifiable_type' => Contrat::class,
                'notifiable_id'   => $contrat->id,
            ]);
        }
    }
}