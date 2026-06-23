<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BudgetSection;
use App\Models\NotificationApp;
use App\Models\Saison;
use App\Models\Section;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class BudgetController extends Controller
{
    /**
     * GET /api/budgets
     * Vue globale de tous les budgets (Trésorier/Admin)
     * ou budget de sa section uniquement (Responsable)
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = BudgetSection::with(['saison', 'section.discipline'])
            ->withCount('transactions');

        // Isolation section
        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER', 'SPONSOR'])) {
            $query->where('section_id', $user->section_id);
        }

        $query
            ->when($request->saison_id, fn($q, $id) => $q->where('saison_id', $id))
            ->when($request->section_id, fn($q, $id) => $q->where('section_id', $id));

        // Par défaut : saison active
        if (!$request->saison_id) {
            $saisonActive = Saison::active();
            if ($saisonActive) {
                $query->where('saison_id', $saisonActive->id);
            }
        }

        $budgets = $query->orderBy('section_id')->get();

        // Calcul des totaux globaux
        $totaux = [
            'total_alloue'  => $budgets->sum('montant_alloue'),
            'total_depense' => $budgets->sum('montant_depense'),
            'total_restant' => $budgets->sum('montant_restant'),
            'pourcentage_global' => $budgets->sum('montant_alloue') > 0
                ? round(($budgets->sum('montant_depense') / $budgets->sum('montant_alloue')) * 100, 1)
                : 0,
        ];

        return response()->json([
            'budgets' => $budgets->map(fn($b) => $this->formatBudget($b)),
            'totaux'  => $totaux,
        ]);
    }

    /**
     * POST /api/budgets
     * Allouer un budget à une section pour une saison
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'saison_id'      => 'required|exists:saisons,id',
            'section_id'     => 'required|exists:sections,id',
            'montant_alloue' => 'required|numeric|min:1',
        ]);

        // Vérifie qu'il n'existe pas déjà
        $existant = BudgetSection::where('saison_id', $request->saison_id)
            ->where('section_id', $request->section_id)
            ->first();

        if ($existant) {
            return response()->json([
                'message' => 'Un budget existe déjà pour cette section et cette saison.',
                'budget'  => $this->formatBudget($existant),
            ], 422);
        }

        $budget = BudgetSection::create([
            'saison_id'      => $request->saison_id,
            'section_id'     => $request->section_id,
            'montant_alloue' => $request->montant_alloue,
            'montant_restant'=> $request->montant_alloue,
            'montant_depense'=> 0,
        ]);

        // Notifie le Responsable de section
        $this->notifierAllocation($budget);

        return response()->json([
            'message' => 'Budget alloué avec succès.',
            'budget'  => $this->formatBudget($budget->load(['saison', 'section.discipline'])),
        ], 201);
    }

    /**
     * GET /api/budgets/{budget}
     */
    public function show(Request $request, BudgetSection $budget): JsonResponse
    {
        $user = $request->user();

        if (!$this->peutVoirBudget($user, $budget)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $budget->load(['saison', 'section.discipline']);

        // Répartition des dépenses par catégorie
        $repartition = $budget->transactions()
            ->where('statut_validation', 'VALIDE_N2')
            ->selectRaw('categorie, SUM(montant) as total')
            ->groupBy('categorie')
            ->orderByDesc('total')
            ->get();

        // Évolution mensuelle des dépenses
        $evolutionMensuelle = $budget->transactions()
            ->where('statut_validation', 'VALIDE_N2')
            ->selectRaw('MONTH(date_transaction) as mois, YEAR(date_transaction) as annee, SUM(montant) as total')
            ->groupByRaw('YEAR(date_transaction), MONTH(date_transaction)')
            ->orderByRaw('YEAR(date_transaction), MONTH(date_transaction)')
            ->get();

        return response()->json([
            'budget'             => $this->formatBudget($budget),
            'repartition'        => $repartition,
            'evolution_mensuelle'=> $evolutionMensuelle,
        ]);
    }

    /**
     * PUT /api/budgets/{budget}
     * Modifier le montant alloué (abondement ou réduction)
     */
    /**
     * PUT /api/budgets/{budget}
     * Modifier le montant alloué (ou la section/saison si aucune dépense n'a été faite)
     */
    public function update(Request $request, BudgetSection $budget): JsonResponse
    {
        // 1. Déterminer si le budget est verrouillé (des dépenses existent déjà)
        $isLocked = $budget->montant_depense > 0;

        // 2. Règles de validation dynamiques
        $rules = [
            'montant_alloue' => 'required|numeric|min:1',
            'motif'          => 'nullable|string|max:255', // Mis en nullable pour éviter de bloquer l'application
        ];

        // Si aucune dépense n'a été faite, on valide la section et la saison envoyées par React
        if (!$isLocked) {
            $rules['saison_id']  = 'required|exists:saisons,id';
            $rules['section_id'] = 'required|exists:sections,id';
        }

        $request->validate($rules);

        // 3. Sécurité : Vérifie qu'on ne réduit pas en dessous de ce qui est déjà dépensé
        if ($request->montant_alloue < $budget->montant_depense) {
            return response()->json([
                'message' => "Impossible de réduire le budget en dessous du montant déjà dépensé ({$budget->montant_depense} FCFA).",
            ], 422);
        }

        // 4. Si la section/saison a changé, on vérifie l'unicité (sauf pour le budget en cours)
        if (!$isLocked) {
            $existant = BudgetSection::where('saison_id', $request->saison_id)
                ->where('section_id', $request->section_id)
                ->where('id', '!=', $budget->id) // Ignore le budget actuel
                ->first();

            if ($existant) {
                return response()->json([
                    'message' => 'Un autre budget existe déjà pour cette section et cette saison.',
                ], 422);
            }
        }

        // 5. Calculs des montants
        $ancienMontant = $budget->montant_alloue;
        $difference    = $request->montant_alloue - $ancienMontant;

        // 6. Préparation des données à mettre à jour
        $updateData = [
            'montant_alloue'  => $request->montant_alloue,
            'montant_restant' => $budget->montant_restant + $difference,
        ];

        // On ne met à jour la section et saison que si le budget n'est pas verrouillé
        if (!$isLocked) {
            $updateData['section_id'] = $request->section_id;
            $updateData['saison_id']  = $request->saison_id;
        }

        $budget->update($updateData);

        // 7. Notification avec motif par défaut si non fourni
        $motif = $request->motif ?? 'Réajustement ou correction des informations du budget.';
        $this->notifierModificationBudget($budget, $ancienMontant, $request->montant_alloue, $motif);

        return response()->json([
            'message' => 'Budget mis à jour avec succès.',
            'budget'  => $this->formatBudget($budget->fresh(['saison', 'section.discipline'])),
        ]);
    }

    // -------------------------------------------------------
    // Helpers
    // -------------------------------------------------------

    private function formatBudget(BudgetSection $budget): array
    {
        return [
            'id'                  => $budget->id,
            'saison'              => $budget->saison?->only(['id', 'nom']),
            'section'             => $budget->section ? [
                'id'         => $budget->section->id,
                'nom'        => $budget->section->nom,
                'discipline' => $budget->section->discipline?->only(['id', 'nom', 'code']),
            ] : null,
            'montant_alloue'      => (float) $budget->montant_alloue,
            'montant_depense'     => (float) $budget->montant_depense,
            'montant_restant'     => (float) $budget->montant_restant,
            'pourcentage_consomme'=> $budget->pourcentageConsomme(),
            'transactions_count'  => $budget->transactions_count ?? 0,
            'created_at'          => $budget->created_at,
        ];
    }

    private function peutVoirBudget($user, BudgetSection $budget): bool
    {
        if (in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER', 'SPONSOR'])) {
            return true;
        }
        return $budget->section_id === $user->section_id;
    }

    private function notifierAllocation(BudgetSection $budget): void
    {
        $responsable = User::where('section_id', $budget->section_id)
            ->where('role_systeme', 'RESPONSABLE_SECTION')
            ->first();

        if (!$responsable) return;

        $budget->load(['section', 'saison']);

        NotificationApp::create([
            'user_id'         => $responsable->id,
            'type'            => 'AUTRE',
            'titre'           => 'Budget alloué à votre section',
            'message'         => "Un budget de " . number_format($budget->montant_alloue, 0, ',', '.') . " FCFA a été alloué à {$budget->section->nom} pour la saison {$budget->saison->nom}.",
            'url_action'      => "/budgets/{$budget->id}",
            'notifiable_type' => BudgetSection::class,
            'notifiable_id'   => $budget->id,
        ]);
    }

    private function notifierModificationBudget(BudgetSection $budget, float $ancien, float $nouveau, string $motif): void
    {
        $responsable = User::where('section_id', $budget->section_id)
            ->where('role_systeme', 'RESPONSABLE_SECTION')
            ->first();

        if (!$responsable) return;

        $sens = $nouveau > $ancien ? 'augmenté' : 'réduit';

        NotificationApp::create([
            'user_id'         => $responsable->id,
            'type'            => 'AUTRE',
            'titre'           => "Budget {$sens}",
            'message'         => "Le budget de {$budget->section->nom} a été {$sens} de " . number_format($ancien, 0, ',', '.') . " à " . number_format($nouveau, 0, ',', '.') . " FCFA. Motif : {$motif}",
            'url_action'      => "/budgets/{$budget->id}",
            'notifiable_type' => BudgetSection::class,
            'notifiable_id'   => $budget->id,
        ]);
    }
}
