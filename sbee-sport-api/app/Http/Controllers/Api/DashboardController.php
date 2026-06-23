<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Evenement;
use App\Models\Contrat;
use App\Models\BudgetSection; // Utilisation de votre modèle exact
use App\Models\Saison;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function getStats(Request $request)
    {
        try {
            $user = $request->user();
            $sectionId = null;

            // Alignement sur la nomenclature de vos rôles : SUPER_ADMIN, TRESORIER, etc.
            // Restriction par section uniquement pour les Coachs et Responsables de Section
            if ($user && in_array($user->role_systeme, ['RESPONSABLE_SECTION', 'COACH']) && !empty($user->section_id)) {
                $sectionId = $user->section_id;
            }

            // 1. Décompte des Événements
            $evenementsCount = 0;
            if (class_exists(Evenement::class)) {
                $evenementsCount = Evenement::when($sectionId, function ($query) use ($sectionId) {
                    return $query->where('section_id', $sectionId);
                })->count();
            }

            // 2. Décompte des Membres / Athlètes via les Contrats
            $membresCount = 0;
            if (class_exists(Contrat::class)) {
                $membresCount = Contrat::when($sectionId, function ($query) use ($sectionId) {
                    return $query->where('section_id', $sectionId);
                })->count();
            }

            // 3. Calcul Budgétaire Réel via BudgetSection
            $montantAlloue = 0;
            $montantDepense = 0;
            $montantRestant = 0;

            if (class_exists(BudgetSection::class)) {
                // On cible la saison active comme dans votre BudgetController
                $saisonActive = class_exists(\App\Models\Saison::class) ? Saison::active() : null;

                $queryBudget = BudgetSection::query();

                // Filtrage par saison active si elle existe
                if ($saisonActive) {
                    $queryBudget->where('saison_id', $saisonActive->id);
                }

                if ($sectionId) {
                    // Vue restreinte : Uniquement la ligne de la section
                    $budget = $queryBudget->where('section_id', $sectionId)->first();
                    if ($budget) {
                        $montantAlloue  = (float) $budget->montant_alloue;
                        $montantDepense = (float) $budget->montant_depense;
                        $montantRestant = (float) $budget->montant_restant;
                    }
                } else {
                    // VUE GLOBALE (SUPER_ADMIN, TRESORIER) : Somme cumulée de toutes les sections
                    $budgets = $queryBudget->get();
                    
                    $montantAlloue  = (float) $budgets->sum('montant_alloue');
                    $montantDepense = (float) $budgets->sum('montant_depense');
                    $montantRestant = (float) $budgets->sum('montant_restant');

                    // Sécurité d'intégrité si le calcul du restant donne 0 alors qu'il y a un budget
                    if ($montantRestant == 0 && $montantAlloue > 0) {
                        $montantRestant = $montantAlloue - $montantDepense;
                    }
                }
            }

            return response()->json([
                'status' => 'success',
                'data' => [
                    'evenements_count' => (int) $evenementsCount,
                    'membres_count'    => (int) $membresCount,
                    'montant_alloue'   => $montantAlloue,
                    'montant_depense'  => $montantDepense,
                    'montant_restant'  => $montantRestant,
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ], 500);
        }
    }
}