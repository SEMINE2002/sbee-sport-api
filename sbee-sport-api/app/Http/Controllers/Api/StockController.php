<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MouvementStock;
use App\Models\NotificationApp;
use App\Models\StockSection;
use App\Models\TypeMateriel;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class StockController extends Controller
{
    /**
     * GET /api/stocks
     * Liste des stocks selon la section de l'utilisateur
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = StockSection::with(['section.discipline', 'typeMateriel'])
            ->withCount(['dotations as nb_dotations_actives' => fn($q) =>
                $q->where('statut', 'EN_COURS')
            ]);

        // Isolation section
        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
            $query->where('section_id', $user->section_id);
        }

        $query
            ->when($request->section_id, fn($q, $id) => $q->where('section_id', $id))
            ->when($request->categorie, fn($q, $c) =>
                $q->whereHas('typeMateriel', fn($q) => $q->where('categorie', $c))
            )
            ->when($request->sous_seuil, fn($q) =>
                $q->whereColumn('quantite_disponible', '<=', 'seuil_alerte')
                  ->where('seuil_alerte', '>', 0)
            )
            ->when($request->search, fn($q, $s) =>
                $q->whereHas('typeMateriel', fn($q) => $q->where('libelle', 'like', "%{$s}%"))
            );

        $stocks = $query->orderBy('section_id')
                        ->orderByDesc('quantite_disponible')
                        ->paginate(20);

        // Nb articles sous le seuil d'alerte
        $nbSousSeuil = StockSection::where(function ($q) use ($user) {
            if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
                $q->where('section_id', $user->section_id);
            }
        })
        ->whereColumn('quantite_disponible', '<=', 'seuil_alerte')
        ->where('seuil_alerte', '>', 0)
        ->count();

        return response()->json([
            'stocks'        => $stocks,
            'nb_sous_seuil' => $nbSousSeuil,
        ]);
    }

    /**
     * POST /api/stocks
     * Créer un nouveau stock pour une section
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'section_id'       => 'required|exists:sections,id',
            'type_materiel_id' => 'required|exists:types_materiels,id',
            'quantite_totale'  => 'required|integer|min:0',
            'seuil_alerte'     => 'nullable|integer|min:0',
            'commentaire'      => 'nullable|string|max:255',
        ]);

        $user = $request->user();

        // Isolation section
        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
            if ($request->section_id != $user->section_id) {
                return response()->json(['message' => 'Accès refusé à cette section.'], 403);
            }
        }

        // Vérifie si ce stock existe déjà
        $existant = StockSection::where('section_id', $request->section_id)
            ->where('type_materiel_id', $request->type_materiel_id)
            ->first();

        if ($existant) {
            return response()->json([
                'message' => 'Ce matériel existe déjà dans cette section. Utilisez un mouvement d\'ajout.',
                'stock'   => $existant->load(['typeMateriel', 'section']),
            ], 422);
        }

        DB::beginTransaction();
        try {
            $stock = StockSection::create([
                'section_id'           => $request->section_id,
                'type_materiel_id'     => $request->type_materiel_id,
                'quantite_totale'      => $request->quantite_totale,
                'quantite_disponible'  => $request->quantite_totale,
                'quantite_en_dotation' => 0,
                'seuil_alerte'         => $request->seuil_alerte ?? 0,
            ]);

            // Enregistre le mouvement initial
            if ($request->quantite_totale > 0) {
                MouvementStock::create([
                    'stock_section_id' => $stock->id,
                    'type'             => 'ACHAT',
                    'quantite'         => $request->quantite_totale,
                    'date_mouv'        => now()->toDateString(),
                    'commentaire'      => $request->commentaire ?? 'Stock initial',
                    'effectue_par'     => $user->id,
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Stock créé avec succès.',
                'stock'   => $stock->load(['typeMateriel', 'section.discipline']),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Erreur : ' . $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/stocks/{stock}
     * Détail d'un stock avec mouvements et dotations
     */
    public function show(Request $request, StockSection $stock): JsonResponse
    {
        $user = $request->user();
        $this->verifierAcces($user, $stock);

        $stock->load(['typeMateriel', 'section.discipline']);

        $mouvements = $stock->mouvements()
            ->with(['effectuePar', 'dotation.contrat.personne'])
            ->orderByDesc('date_mouv')
            ->limit(30)
            ->get();

        $dotationsActives = $stock->dotations()
            ->where('statut', 'EN_COURS')
            ->with(['contrat.personne', 'remisPar'])
            ->orderBy('date_retour_prevue')
            ->get();

        $dotationsEnRetard = $dotationsActives->filter(fn($d) => $d->estEnRetard());

        return response()->json([
            'stock'               => $stock,
            'mouvements'          => $mouvements,
            'dotations_actives'   => $dotationsActives,
            'dotations_en_retard' => $dotationsEnRetard->values(),
            'stats' => [
                'nb_mouvements'        => $stock->mouvements()->count(),
                'nb_dotations_actives' => $dotationsActives->count(),
                'nb_en_retard'         => $dotationsEnRetard->count(),
            ],
        ]);
    }

    /**
     * PUT /api/stocks/{stock}
     * Modifier le seuil d'alerte
     */
    public function update(Request $request, StockSection $stock): JsonResponse
    {
        $user = $request->user();
        $this->verifierAcces($user, $stock);

        $request->validate([
            'seuil_alerte' => 'required|integer|min:0',
        ]);

        $stock->update(['seuil_alerte' => $request->seuil_alerte]);

        return response()->json([
            'message' => 'Seuil d\'alerte mis à jour.',
            'stock'   => $stock->fresh(['typeMateriel', 'section']),
        ]);
    }

    /**
     * DELETE /api/stocks/{stock}
     * Désactive un stock vide (aucune dotation active)
     */
    public function destroy(Request $request, StockSection $stock): JsonResponse
    {
        $user = $request->user();
        $this->verifierAcces($user, $stock);

        if ($stock->dotations()->where('statut', 'EN_COURS')->exists()) {
            return response()->json([
                'message' => 'Impossible de supprimer un stock avec des dotations actives.',
            ], 422);
        }

        if ($stock->quantite_disponible > 0) {
            return response()->json([
                'message' => 'Impossible de supprimer un stock non vide. Retirez d\'abord les articles.',
            ], 422);
        }

        $stock->delete();

        return response()->json(['message' => 'Stock supprimé.']);
    }

    /**
     * POST /api/stocks/{stock}/ajouter
     * Réapprovisionner un stock
     */
    public function ajouter(Request $request, StockSection $stock): JsonResponse
    {
        $user = $request->user();
        $this->verifierAcces($user, $stock);

        $request->validate([
            'quantite'    => 'required|integer|min:1',
            'type'        => 'required|in:ACHAT,AJUSTEMENT',
            'commentaire' => 'nullable|string|max:255',
        ]);

        DB::transaction(function () use ($request, $stock, $user) {
            $stock->increment('quantite_totale', $request->quantite);
            $stock->increment('quantite_disponible', $request->quantite);

            MouvementStock::create([
                'stock_section_id' => $stock->id,
                'type'             => $request->type,
                'quantite'         => $request->quantite,
                'date_mouv'        => now()->toDateString(),
                'commentaire'      => $request->commentaire ?? 'Réapprovisionnement',
                'effectue_par'     => $user->id,
            ]);
        });

        $stock->refresh();

        // Vérifie si le seuil n'est plus dépassé
        if (!$stock->estSousSeuil()) {
            $this->notifierStockReplenished($stock);
        }

        return response()->json([
            'message'             => "{$request->quantite} unité(s) ajoutée(s) au stock.",
            'quantite_disponible' => $stock->quantite_disponible,
            'quantite_totale'     => $stock->quantite_totale,
        ]);
    }

    /**
     * POST /api/stocks/{stock}/retirer
     * Retirer des articles (perte ou casse)
     */
    public function retirer(Request $request, StockSection $stock): JsonResponse
    {
        $user = $request->user();
        $this->verifierAcces($user, $stock);

        $request->validate([
            'quantite'    => 'required|integer|min:1',
            'type'        => 'required|in:PERTE,CASSE',
            'commentaire' => 'nullable|string|max:255',
        ]);

        if ($stock->quantite_disponible < $request->quantite) {
            return response()->json([
                'message'             => "Stock insuffisant. Disponible : {$stock->quantite_disponible}",
                'quantite_disponible' => $stock->quantite_disponible,
            ], 422);
        }

        DB::transaction(function () use ($request, $stock, $user) {
            $stock->decrement('quantite_disponible', $request->quantite);
            $stock->decrement('quantite_totale', $request->quantite);

            MouvementStock::create([
                'stock_section_id' => $stock->id,
                'type'             => $request->type,
                'quantite'         => -$request->quantite,
                'date_mouv'        => now()->toDateString(),
                'commentaire'      => $request->commentaire,
                'effectue_par'     => $user->id,
            ]);
        });

        $stock->refresh();

        // Alerte si sous le seuil
        if ($stock->estSousSeuil()) {
            $this->notifierStockBas($stock);
        }

        return response()->json([
            'message'             => "{$request->quantite} unité(s) retirée(s) du stock.",
            'quantite_disponible' => $stock->quantite_disponible,
        ]);
    }

    /**
     * GET /api/mouvements-stocks
     * Historique global des mouvements
     */
    public function mouvements(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = MouvementStock::with([
            'stockSection.typeMateriel',
            'stockSection.section',
            'effectuePar',
            'dotation.contrat.personne',
        ]);

        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
            $query->whereHas('stockSection', fn($q) =>
                $q->where('section_id', $user->section_id)
            );
        }

        $query
            ->when($request->section_id, fn($q, $id) =>
                $q->whereHas('stockSection', fn($q) => $q->where('section_id', $id))
            )
            ->when($request->type, fn($q, $t) => $q->where('type', $t))
            ->when($request->date_debut, fn($q, $d) => $q->whereDate('date_mouv', '>=', $d))
            ->when($request->date_fin, fn($q, $d) => $q->whereDate('date_mouv', '<=', $d));

        $mouvements = $query->orderByDesc('date_mouv')->paginate(20);

        return response()->json($mouvements);
    }

    /**
     * GET /api/types-materiels
     */
    public function typesMateriel(Request $request): JsonResponse
    {
        $types = TypeMateriel::when($request->categorie, fn($q, $c) => $q->where('categorie', $c))
            ->orderBy('categorie')
            ->orderBy('libelle')
            ->get();

        return response()->json(['types_materiels' => $types]);
    }

    /**
     * POST /api/types-materiels
     */
    public function storeTypeMateriel(Request $request): JsonResponse
    {
        $request->validate([
            'libelle'     => 'required|string|max:100',
            'categorie'   => 'required|in:CONSOMMABLE,DURABLE',
            'recuperable' => 'required|boolean',
            'unite'       => 'nullable|string|max:20',
            'description' => 'nullable|string',
        ]);

        $type = TypeMateriel::create($request->only([
            'libelle', 'categorie', 'recuperable', 'unite', 'description',
        ]));

        return response()->json(['message' => 'Type créé.', 'type' => $type], 201);
    }

    // -------------------------------------------------------
    // Helpers privés
    // -------------------------------------------------------

    private function verifierAcces($user, StockSection $stock): void
    {
        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
            abort_if($stock->section_id !== $user->section_id, 403, 'Accès refusé.');
        }
    }

    private function notifierStockBas(StockSection $stock): void
    {
        $responsable = User::where('section_id', $stock->section_id)
            ->where('role_systeme', 'RESPONSABLE_SECTION')
            ->first();

        if (!$responsable) return;

        $stock->load('typeMateriel');

        NotificationApp::create([
            'user_id'         => $responsable->id,
            'type'            => 'STOCK_BAS',
            'titre'           => '⚠️ Stock bas — ' . $stock->typeMateriel->libelle,
            'message'         => "Le stock de {$stock->typeMateriel->libelle} est sous le seuil d'alerte. Disponible : {$stock->quantite_disponible} / Seuil : {$stock->seuil_alerte}",
            'url_action'      => "/stocks/{$stock->id}",
            'notifiable_type' => StockSection::class,
            'notifiable_id'   => $stock->id,
        ]);
    }

    private function notifierStockReplenished(StockSection $stock): void
    {
        // Pas de notification nécessaire au réapprovisionnement
        // Mais on pourrait loguer l'info
    }
}
