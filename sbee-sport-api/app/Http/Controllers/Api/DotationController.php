<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Dotation;
use App\Models\MouvementStock;
use App\Models\NotificationApp;
use App\Models\StockSection;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DotationController extends Controller
{
    /**
     * GET /api/dotations
     * Liste des dotations (matériel distribué aux joueurs)
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Dotation::with([
            'contrat.personne',
            'contrat.section.discipline',
            'stockSection.typeMateriel',
            'remisPar',
        ]);

        // Isolation section
        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
            $query->whereHas('stockSection', fn($q) =>
                $q->where('section_id', $user->section_id)
            );
        }

        $query
            ->when($request->section_id, fn($q, $id) =>
                $q->whereHas('stockSection', fn($q) => $q->where('section_id', $id))
            )
            ->when($request->statut, fn($q, $s) => $q->where('statut', $s))
            ->when($request->contrat_id, fn($q, $id) => $q->where('contrat_id', $id))
            ->when($request->en_retard, fn($q) =>
                $q->where('statut', 'EN_COURS')
                  ->whereNotNull('date_retour_prevue')
                  ->where('date_retour_prevue', '<', now()->toDateString())
            );

        // Par défaut : dotations en cours
        if (!$request->statut) {
            $query->where('statut', 'EN_COURS');
        }

        $dotations = $query->orderBy('date_retour_prevue')->paginate(20);

        // Stats rapides
        $nbEnRetard = Dotation::where('statut', 'EN_COURS')
            ->whereNotNull('date_retour_prevue')
            ->where('date_retour_prevue', '<', now()->toDateString())
            ->when(!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER']), fn($q) =>
                $q->whereHas('stockSection', fn($q) => $q->where('section_id', $user->section_id))
            )
            ->count();

        return response()->json([
            'dotations'   => $dotations,
            'nb_en_retard'=> $nbEnRetard,
        ]);
    }

    /**
     * POST /api/dotations
     * Attribuer du matériel à un joueur/staff
     * RG-INV-01 : Matériel récupérable → date de retour obligatoire
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'contrat_id'        => 'required|exists:contrats,id',
            'stock_section_id'  => 'required|exists:stocks_sections,id',
            'quantite'          => 'required|integer|min:1',
            'date_remise'       => 'required|date',
            'date_retour_prevue'=> 'nullable|date|after:date_remise',
            'observations'      => 'nullable|string|max:255',
        ]);

        $user  = $request->user();
        $stock = StockSection::with('typeMateriel')->findOrFail($request->stock_section_id);

        // Isolation section
        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
            if ($stock->section_id !== $user->section_id) {
                return response()->json(['message' => 'Accès refusé à ce stock.'], 403);
            }
        }

        // RG-INV-01 : Si matériel récupérable → date retour obligatoire
        if ($stock->typeMateriel->recuperable && !$request->date_retour_prevue) {
            return response()->json([
                'message' => "RG-INV-01 : Ce matériel ({$stock->typeMateriel->libelle}) est récupérable. Une date de retour prévue est obligatoire.",
            ], 422);
        }

        // Vérifie le stock disponible
        if ($stock->quantite_disponible < $request->quantite) {
            return response()->json([
                'message'             => "Stock insuffisant. Disponible : {$stock->quantite_disponible} {$stock->typeMateriel->unite}(s).",
                'quantite_disponible' => $stock->quantite_disponible,
            ], 422);
        }

        DB::beginTransaction();
        try {
            $dotation = Dotation::create([
                'contrat_id'         => $request->contrat_id,
                'stock_section_id'   => $request->stock_section_id,
                'quantite'           => $request->quantite,
                'date_remise'        => $request->date_remise,
                'date_retour_prevue' => $request->date_retour_prevue,
                'statut'             => 'EN_COURS',
                'observations'       => $request->observations,
                'remis_par'          => $user->id,
            ]);

            // Met à jour les quantités du stock
            $stock->recalculerQuantites();

            // Enregistre le mouvement
            MouvementStock::create([
                'stock_section_id' => $stock->id,
                'dotation_id'      => $dotation->id,
                'type'             => 'DOTATION',
                'quantite'         => -$request->quantite,
                'date_mouv'        => $request->date_remise,
                'commentaire'      => "Dotation à {$dotation->contrat->personne->nom_complet}",
                'effectue_par'     => $user->id,
            ]);

            // Alerte si stock devient bas après dotation
            $stock->refresh();
            if ($stock->estSousSeuil() && $stock->seuil_alerte > 0) {
                $this->notifierStockBas($stock);
            }

            DB::commit();

            return response()->json([
                'message'  => 'Dotation enregistrée.',
                'dotation' => $dotation->load([
                    'contrat.personne',
                    'stockSection.typeMateriel',
                    'remisPar',
                ]),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Erreur : ' . $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/dotations/{dotation}
     */
    public function show(Request $request, Dotation $dotation): JsonResponse
    {
        $user = $request->user();
        $this->verifierAcces($user, $dotation);

        return response()->json([
            'dotation' => $dotation->load([
                'contrat.personne',
                'contrat.section.discipline',
                'stockSection.typeMateriel',
                'remisPar',
                'mouvements.effectuePar',
            ]),
        ]);
    }

    /**
     * PATCH /api/dotations/{dotation}/retourner
     * Enregistrer le retour d'un matériel
     */
    public function retourner(Request $request, Dotation $dotation): JsonResponse
    {
        $user = $request->user();
        $this->verifierAcces($user, $dotation);

        if ($dotation->statut !== 'EN_COURS') {
            return response()->json([
                'message' => "Cette dotation a déjà le statut '{$dotation->statut}'.",
            ], 422);
        }

        $request->validate([
            'date_retour_effective' => 'required|date',
            'observations'          => 'nullable|string|max:255',
        ]);

        DB::beginTransaction();
        try {
            $dotation->update([
                'statut'                => 'RENDU',
                'date_retour_effective' => $request->date_retour_effective,
                'observations'          => $request->observations,
            ]);

            // Recalcule les quantités
            $dotation->stockSection->recalculerQuantites();

            // Mouvement de retour
            MouvementStock::create([
                'stock_section_id' => $dotation->stock_section_id,
                'dotation_id'      => $dotation->id,
                'type'             => 'RETOUR',
                'quantite'         => $dotation->quantite,
                'date_mouv'        => $request->date_retour_effective,
                'commentaire'      => "Retour de {$dotation->contrat->personne->nom_complet}",
                'effectue_par'     => $user->id,
            ]);

            DB::commit();

            return response()->json([
                'message'  => 'Retour enregistré. Stock mis à jour.',
                'dotation' => $dotation->fresh([
                    'contrat.personne',
                    'stockSection.typeMateriel',
                ]),
                'quantite_disponible' => $dotation->stockSection->fresh()->quantite_disponible,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Erreur : ' . $e->getMessage()], 500);
        }
    }

    /**
     * PATCH /api/dotations/{dotation}/declarer-perdu
     * Déclarer un matériel perdu
     * RG-INV-01 : Génère une transaction de débit si PERDU_PAYE
     */
    public function declarerPerdu(Request $request, Dotation $dotation): JsonResponse
    {
        $user = $request->user();
        $this->verifierAcces($user, $dotation);

        if ($dotation->statut !== 'EN_COURS') {
            return response()->json(['message' => 'Cette dotation n\'est plus en cours.'], 422);
        }

        $request->validate([
            'statut'       => 'required|in:PERDU_PAYE,PERDU_NON_PAYE',
            'observations' => 'nullable|string|max:255',
        ]);

        DB::beginTransaction();
        try {
            $dotation->update([
                'statut'       => $request->statut,
                'observations' => $request->observations,
            ]);

            // Le stock ne revient pas → on marque juste comme perdu
            MouvementStock::create([
                'stock_section_id' => $dotation->stock_section_id,
                'dotation_id'      => $dotation->id,
                'type'             => 'PERTE',
                'quantite'         => -$dotation->quantite,
                'date_mouv'        => now()->toDateString(),
                'commentaire'      => "Matériel déclaré {$request->statut} par {$dotation->contrat->personne->nom_complet}",
                'effectue_par'     => $user->id,
            ]);

            // Recalcule les quantités (le matériel ne reviendra pas)
            $dotation->stockSection->decrement('quantite_totale', $dotation->quantite);
            $dotation->stockSection->recalculerQuantites();

            // Notifie le responsable
            $this->notifierPerte($dotation, $request->statut, $user);

            DB::commit();

            return response()->json([
                'message'  => "Perte déclarée ({$request->statut}).",
                'dotation' => $dotation->fresh(['contrat.personne', 'stockSection.typeMateriel']),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Erreur : ' . $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/dotations/en-retard
     * Liste des dotations non rendues après la date prévue
     */
    public function enRetard(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Dotation::with([
            'contrat.personne',
            'stockSection.typeMateriel',
            'stockSection.section',
        ])
        ->where('statut', 'EN_COURS')
        ->whereNotNull('date_retour_prevue')
        ->where('date_retour_prevue', '<', now()->toDateString());

        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
            $query->whereHas('stockSection', fn($q) =>
                $q->where('section_id', $user->section_id)
            );
        }

        $dotations = $query->orderBy('date_retour_prevue')->get();

        return response()->json([
            'count'    => $dotations->count(),
            'dotations'=> $dotations->map(fn($d) => [
                'id'                 => $d->id,
                'personne'           => $d->contrat->personne->nom_complet,
                'materiel'           => $d->stockSection->typeMateriel->libelle,
                'section'            => $d->stockSection->section->nom ?? '-',
                'quantite'           => $d->quantite,
                'date_remise'        => $d->date_remise,
                'date_retour_prevue' => $d->date_retour_prevue,
                'jours_retard'       => now()->diffInDays($d->date_retour_prevue),
            ]),
        ]);
    }

    // -------------------------------------------------------
    // Helpers privés
    // -------------------------------------------------------

    private function verifierAcces($user, Dotation $dotation): void
    {
        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
            $sectionId = $dotation->stockSection->section_id;
            abort_if($sectionId !== $user->section_id, 403, 'Accès refusé.');
        }
    }

    private function notifierStockBas(StockSection $stock): void
    {
        $responsable = User::where('section_id', $stock->section_id)
            ->where('role_systeme', 'RESPONSABLE_SECTION')
            ->first();

        if (!$responsable) return;

        NotificationApp::create([
            'user_id'         => $responsable->id,
            'type'            => 'STOCK_BAS',
            'titre'           => '⚠️ Stock bas après dotation',
            'message'         => "Le stock de {$stock->typeMateriel->libelle} est passé sous le seuil d'alerte. Disponible : {$stock->quantite_disponible}",
            'url_action'      => "/stocks/{$stock->id}",
            'notifiable_type' => StockSection::class,
            'notifiable_id'   => $stock->id,
        ]);
    }

    private function notifierPerte(Dotation $dotation, string $statut, $user): void
    {
        $responsable = User::where('section_id', $dotation->stockSection->section_id)
            ->where('role_systeme', 'RESPONSABLE_SECTION')
            ->where('id', '!=', $user->id)
            ->first();

        if (!$responsable) return;

        $label = $statut === 'PERDU_PAYE' ? 'perdu (remboursé)' : 'perdu (non remboursé)';

        NotificationApp::create([
            'user_id'         => $responsable->id,
            'type'            => 'MATERIEL_NON_RENDU',
            'titre'           => '🔴 Matériel déclaré perdu',
            'message'         => "{$dotation->quantite} {$dotation->stockSection->typeMateriel->libelle} déclaré(s) {$label} par {$dotation->contrat->personne->nom_complet}.",
            'url_action'      => "/dotations/{$dotation->id}",
            'notifiable_type' => Dotation::class,
            'notifiable_id'   => $dotation->id,
        ]);
    }
}
