<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BudgetSection;
use App\Models\Contrat;
use App\Models\Dotation;
use App\Models\Evenement;
use App\Models\Saison;
use App\Models\Section;
use App\Models\StockSection;
use App\Models\Transaction;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Maatwebsite\Excel\Facades\Excel;

class RapportController extends Controller
{
    /**
     * GET /api/rapports/bilan-financier
     * Bilan global de toutes les sections pour la saison active
     */
    public function bilanFinancier(Request $request): JsonResponse
    {
        $saisonId = $request->saison_id ?? Saison::active()?->id;

        if (!$saisonId) {
            return response()->json(['message' => 'Aucune saison active.'], 422);
        }

        $saison  = Saison::findOrFail($saisonId);
        $budgets = BudgetSection::with(['section.discipline'])
            ->where('saison_id', $saisonId)
            ->get();

        $bilan = $budgets->map(function ($budget) {
            // Répartition par catégorie
            $repartition = $budget->transactions()
                ->where('statut_validation', 'VALIDE_N2')
                ->selectRaw('categorie, SUM(montant) as total')
                ->groupBy('categorie')
                ->pluck('total', 'categorie');

            // Résultats sportifs
            $stats = Evenement::where('section_id', $budget->section_id)
                ->where('saison_id', $budget->saison_id)
                ->where('type', 'MATCH')
                ->where('is_verrouille', true)
                ->selectRaw("
                    COUNT(*) as nb_matchs,
                    SUM(CASE WHEN resultat = 'VICTOIRE' THEN 1 ELSE 0 END) as victoires,
                    SUM(CASE WHEN resultat = 'NUL' THEN 1 ELSE 0 END) as nuls,
                    SUM(CASE WHEN resultat = 'DEFAITE' THEN 1 ELSE 0 END) as defaites
                ")
                ->first();

            // Coût par point (si matchs joués)
            $points      = ($stats->victoires * 3) + ($stats->nuls * 1);
            $coutParPoint = $points > 0
                ? round($budget->montant_depense / $points)
                : null;

            return [
                'section'          => [
                    'id'         => $budget->section->id,
                    'nom'        => $budget->section->nom,
                    'discipline' => $budget->section->discipline->nom,
                ],
                'budget'           => [
                    'alloue'              => (float) $budget->montant_alloue,
                    'depense'             => (float) $budget->montant_depense,
                    'restant'             => (float) $budget->montant_restant,
                    'pourcentage_consomme'=> $budget->pourcentageConsomme(),
                ],
                'repartition'      => $repartition,
                'sportif'          => [
                    'nb_matchs' => $stats->nb_matchs ?? 0,
                    'victoires' => $stats->victoires ?? 0,
                    'nuls'      => $stats->nuls ?? 0,
                    'defaites'  => $stats->defaites ?? 0,
                    'points'    => $points,
                ],
                'cout_par_point'   => $coutParPoint,
                'rentabilite'      => $this->evaluerRentabilite($budget->montant_depense, $points),
            ];
        });

        return response()->json([
            'saison'        => $saison->only(['id', 'nom', 'date_debut', 'date_fin']),
            'bilan'         => $bilan,
            'totaux_globaux'=> [
                'total_alloue'  => $budgets->sum('montant_alloue'),
                'total_depense' => $budgets->sum('montant_depense'),
                'total_restant' => $budgets->sum('montant_restant'),
            ],
        ]);
    }

    /**
     * GET /api/sections/{section}/rapport
     * Rapport détaillé d'une section
     */
    public function rapportSection(Request $request, Section $section): JsonResponse
    {
        $user = $request->user();

        if (!$user->appartientASection($section->id)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $saisonId = $request->saison_id ?? Saison::active()?->id;
        $saison   = Saison::findOrFail($saisonId);

        $budget = BudgetSection::where('section_id', $section->id)
            ->where('saison_id', $saisonId)
            ->first();

        if (!$budget) {
            return response()->json(['message' => 'Aucun budget pour cette section/saison.'], 404);
        }

        // Transactions récentes
        $transactions = $budget->transactions()
            ->with(['soumisParUser', 'valideN2Par', 'evenement'])
            ->orderByDesc('date_transaction')
            ->limit(50)
            ->get();

        // Top 5 dépenses
        $topDepenses = $budget->transactions()
            ->where('statut_validation', 'VALIDE_N2')
            ->orderByDesc('montant')
            ->limit(5)
            ->get(['libelle', 'montant', 'categorie', 'date_transaction']);

        // Membres actifs
        $membres = Contrat::where('section_id', $section->id)
            ->where('saison_id', $saisonId)
            ->where('statut', 'ACTIF')
            ->with('personne')
            ->get()
            ->groupBy('type_role');

        // Matchs joués
        $evenements = Evenement::where('section_id', $section->id)
            ->where('saison_id', $saisonId)
            ->where('is_verrouille', true)
            ->orderByDesc('date_heure')
            ->get(['date_heure', 'adversaire', 'resultat', 'score_nous', 'score_adversaire', 'type']);

        return response()->json([
            'section'      => $section->load('discipline'),
            'saison'       => $saison->only(['id', 'nom']),
            'budget'       => [
                'alloue'              => (float) $budget->montant_alloue,
                'depense'             => (float) $budget->montant_depense,
                'restant'             => (float) $budget->montant_restant,
                'pourcentage_consomme'=> $budget->pourcentageConsomme(),
            ],
            'transactions' => $transactions,
            'top_depenses' => $topDepenses,
            'membres'      => $membres,
            'evenements'   => $evenements,
        ]);
    }

    /**
     * GET /api/rapports/export-pdf
     * Export PDF du bilan financier
     */
    public function exportPdf(Request $request)
    {
        $saisonId = $request->saison_id ?? Saison::active()?->id;
        $saison   = Saison::findOrFail($saisonId);

        $budgets = BudgetSection::with(['section.discipline', 'transactions'])
            ->where('saison_id', $saisonId)
            ->get();

        $data = [
            'saison'  => $saison,
            'budgets' => $budgets,
            'date'    => now()->format('d/m/Y H:i'),
            'totaux'  => [
                'alloue'  => $budgets->sum('montant_alloue'),
                'depense' => $budgets->sum('montant_depense'),
                'restant' => $budgets->sum('montant_restant'),
            ],
        ];

        $pdf = Pdf::loadView('rapports.bilan-financier', $data)
            ->setPaper('a4', 'landscape');

        return $pdf->download("bilan-financier-{$saison->nom}.pdf");
    }

    /**
     * GET /api/rapports/export-excel
     * Export Excel du bilan financier
     */
    public function exportExcel(Request $request)
    {
        $saisonId = $request->saison_id ?? Saison::active()?->id;
        $saison   = Saison::findOrFail($saisonId);

        return Excel::download(
            new \App\Exports\BilanFinancierExport($saisonId),
            "bilan-financier-{$saison->nom}.xlsx"
        );
    }

    /**
     * GET /api/rapports/etat-paie
     * État de paie mensuel (salaires + primes du mois)
     */
    public function etatPaie(Request $request): JsonResponse
    {
        $request->validate([
            'mois'      => 'required|integer|min:1|max:12',
            'annee'     => 'required|integer|min:2020',
            'section_id'=> 'nullable|exists:sections,id',
        ]);

        $user = $request->user();

        $query = Transaction::with(['contrat.personne', 'budgetSection.section'])
            ->whereIn('categorie', ['PRIME_MATCH', 'PRIME_ENTRAINEMENT', 'SALAIRE', 'PRIME_SIGNATURE'])
            ->where('statut_validation', 'VALIDE_N2')
            ->whereMonth('date_transaction', $request->mois)
            ->whereYear('date_transaction', $request->annee);

        // Isolation section
        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
            $query->whereHas('budgetSection', fn($q) => $q->where('section_id', $user->section_id));
        } elseif ($request->section_id) {
            $query->whereHas('budgetSection', fn($q) => $q->where('section_id', $request->section_id));
        }

        $transactions = $query->orderBy('categorie')->get();

        // Groupement par personne
        $parPersonne = $transactions
            ->groupBy('contrat_id')
            ->map(function ($items) {
                $premier = $items->first();
                return [
                    'personne'  => $premier->contrat?->personne?->nom_complet ?? 'Inconnu',
                    'section'   => $premier->budgetSection?->section?->nom ?? '-',
                    'primes'    => $items->where('categorie', 'PRIME_MATCH')->sum('montant'),
                    'salaire'   => $items->where('categorie', 'SALAIRE')->sum('montant'),
                    'autres'    => $items->whereNotIn('categorie', ['PRIME_MATCH', 'SALAIRE'])->sum('montant'),
                    'total'     => $items->sum('montant'),
                ];
            })
            ->values();

        return response()->json([
            'mois'        => $request->mois,
            'annee'       => $request->annee,
            'beneficiaires'=> $parPersonne,
            'total_global'=> $parPersonne->sum('total'),
        ]);
    }

    /**
     * GET /api/rapports/etat-paie-excel
     * Export Excel de l'état de paie mensuel (même données que etatPaie)
     */
    public function etatPaieExcel(Request $request)
    {
        $request->validate([
            'mois'      => 'required|integer|min:1|max:12',
            'annee'     => 'required|integer|min:2020',
            'section_id'=> 'nullable|exists:sections,id',
        ]);

        $user = $request->user();

        $query = Transaction::with(['contrat.personne', 'budgetSection.section'])
            ->whereIn('categorie', ['PRIME_MATCH', 'PRIME_ENTRAINEMENT', 'SALAIRE', 'PRIME_SIGNATURE'])
            ->where('statut_validation', 'VALIDE_N2')
            ->whereMonth('date_transaction', $request->mois)
            ->whereYear('date_transaction', $request->annee);

        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
            $query->whereHas('budgetSection', fn($q) => $q->where('section_id', $user->section_id));
        } elseif ($request->section_id) {
            $query->whereHas('budgetSection', fn($q) => $q->where('section_id', $request->section_id));
        }

        $transactions = $query->orderBy('categorie')->get();

        $parPersonne = $transactions
            ->groupBy('contrat_id')
            ->map(function ($items) {
                $premier = $items->first();
                return [
                    'personne'  => $premier->contrat?->personne?->nom_complet ?? 'Inconnu',
                    'section'   => $premier->budgetSection?->section?->nom ?? '-',
                    'primes'    => $items->where('categorie', 'PRIME_MATCH')->sum('montant'),
                    'salaire'   => $items->where('categorie', 'SALAIRE')->sum('montant'),
                    'autres'    => $items->whereNotIn('categorie', ['PRIME_MATCH', 'SALAIRE'])->sum('montant'),
                    'total'     => $items->sum('montant'),
                ];
            })
            ->values();

        return Excel::download(
            new \App\Exports\EtatPaieExport($parPersonne),
            "etat-paie-{$request->mois}-{$request->annee}.xlsx"
        );
    }

    // ═══════════════════════════════════════════════════════════════════
    //  EFFECTIFS — Membres par discipline / section
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Construit la requête de base des contrats actifs, avec isolation
     * par section pour les rôles non globaux (même logique que etatPaie).
     */
    private function queryEffectifs(Request $request)
    {
        $user     = $request->user();
        $saisonId = $request->saison_id ?? Saison::active()?->id;

        $query = Contrat::with(['personne', 'section.discipline'])
            ->where('saison_id', $saisonId)
            ->where('statut', 'ACTIF');

        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
            $query->where('section_id', $user->section_id);
        } elseif ($request->section_id) {
            $query->where('section_id', $request->section_id);
        }

        return $query->orderBy('section_id')->orderBy('type_role');
    }

    /**
     * GET /api/rapports/effectifs-pdf
     */
    public function effectifsPdf(Request $request)
    {
        $saison = Saison::findOrFail($request->saison_id ?? Saison::active()?->id);
        $contrats = $this->queryEffectifs($request)->get();

        $pdf = Pdf::loadView('rapports.effectifs', [
            'saison'   => $saison,
            'contrats' => $contrats,
            'date'     => now()->format('d/m/Y H:i'),
        ])->setPaper('a4', 'landscape');

        return $pdf->download("effectifs-{$saison->nom}.pdf");
    }

    /**
     * GET /api/rapports/effectifs-excel
     */
    public function effectifsExcel(Request $request)
    {
        $saison   = Saison::findOrFail($request->saison_id ?? Saison::active()?->id);
        $contrats = $this->queryEffectifs($request)->get();

        return Excel::download(
            new \App\Exports\EffectifsExport($contrats),
            "effectifs-{$saison->nom}.xlsx"
        );
    }

    // ═══════════════════════════════════════════════════════════════════
    //  CONTRATS — Registre des contrats (en cours / à renouveler / expirés)
    // ═══════════════════════════════════════════════════════════════════

    private function queryContrats(Request $request)
    {
        $user = $request->user();

        $query = Contrat::with(['personne', 'section.discipline', 'saison']);

        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
            $query->where('section_id', $user->section_id);
        } elseif ($request->section_id) {
            $query->where('section_id', $request->section_id);
        }

        if ($request->statut) {
            $query->where('statut', $request->statut);
        }

        return $query->orderByDesc('date_fin_contrat');
    }

    /**
     * GET /api/rapports/contrats-pdf
     */
    public function contratsPdf(Request $request)
    {
        $contrats = $this->queryContrats($request)->get();

        $pdf = Pdf::loadView('rapports.contrats', [
            'contrats' => $contrats,
            'date'     => now()->format('d/m/Y H:i'),
        ])->setPaper('a4', 'landscape');

        return $pdf->download('registre-contrats-' . now()->format('Y-m-d') . '.pdf');
    }

    /**
     * GET /api/rapports/contrats-excel
     */
    public function contratsExcel(Request $request)
    {
        $contrats = $this->queryContrats($request)->get();

        return Excel::download(
            new \App\Exports\ContratsExport($contrats),
            'registre-contrats-' . now()->format('Y-m-d') . '.xlsx'
        );
    }

    // ═══════════════════════════════════════════════════════════════════
    //  INVENTAIRE — État des stocks par section
    // ═══════════════════════════════════════════════════════════════════

    private function queryInventaire(Request $request)
    {
        $user = $request->user();

        $query = StockSection::with(['section.discipline', 'typeMateriel']);

        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
            $query->where('section_id', $user->section_id);
        } elseif ($request->section_id) {
            $query->where('section_id', $request->section_id);
        }

        return $query->orderBy('section_id');
    }

    /**
     * GET /api/rapports/inventaire-pdf
     */
    public function inventairePdf(Request $request)
    {
        $stocks = $this->queryInventaire($request)->get();

        $pdf = Pdf::loadView('rapports.inventaire', [
            'stocks' => $stocks,
            'date'   => now()->format('d/m/Y H:i'),
        ])->setPaper('a4', 'landscape');

        return $pdf->download('inventaire-materiel-' . now()->format('Y-m-d') . '.pdf');
    }

    /**
     * GET /api/rapports/inventaire-excel
     */
    public function inventaireExcel(Request $request)
    {
        $stocks = $this->queryInventaire($request)->get();

        return Excel::download(
            new \App\Exports\InventaireExport($stocks),
            'inventaire-materiel-' . now()->format('Y-m-d') . '.xlsx'
        );
    }

    // ═══════════════════════════════════════════════════════════════════
    //  DOTATIONS — Équipements prêtés / en retard / perdus
    // ═══════════════════════════════════════════════════════════════════

    private function queryDotations(Request $request)
    {
        $user = $request->user();

        $query = Dotation::with(['contrat.personne', 'contrat.section.discipline', 'stockSection.typeMateriel']);

        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
            $query->whereHas('contrat', fn($q) => $q->where('section_id', $user->section_id));
        } elseif ($request->section_id) {
            $query->whereHas('contrat', fn($q) => $q->where('section_id', $request->section_id));
        }

        if ($request->statut) {
            $query->where('statut', $request->statut);
        }

        return $query->orderByDesc('date_remise');
    }

    /**
     * GET /api/rapports/dotations-pdf
     */
    public function dotationsPdf(Request $request)
    {
        $dotations = $this->queryDotations($request)->get();

        $pdf = Pdf::loadView('rapports.dotations', [
            'dotations' => $dotations,
            'date'      => now()->format('d/m/Y H:i'),
        ])->setPaper('a4', 'landscape');

        return $pdf->download('suivi-dotations-' . now()->format('Y-m-d') . '.pdf');
    }

    /**
     * GET /api/rapports/dotations-excel
     */
    public function dotationsExcel(Request $request)
    {
        $dotations = $this->queryDotations($request)->get();

        return Excel::download(
            new \App\Exports\DotationsExport($dotations),
            'suivi-dotations-' . now()->format('Y-m-d') . '.xlsx'
        );
    }

    // ═══════════════════════════════════════════════════════════════════
    //  ÉVÉNEMENTS — Bilan des matchs / entraînements / réunions
    // ═══════════════════════════════════════════════════════════════════

    private function queryEvenements(Request $request)
    {
        $user     = $request->user();
        $saisonId = $request->saison_id ?? Saison::active()?->id;

        $query = Evenement::with(['section.discipline'])
            ->where('saison_id', $saisonId);

        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
            $query->where('section_id', $user->section_id);
        } elseif ($request->section_id) {
            $query->where('section_id', $request->section_id);
        }

        if ($request->date_debut) {
            $query->whereDate('date_heure', '>=', $request->date_debut);
        }
        if ($request->date_fin) {
            $query->whereDate('date_heure', '<=', $request->date_fin);
        }

        return $query->orderByDesc('date_heure');
    }

    /**
     * GET /api/rapports/evenements-pdf
     */
    public function evenementsPdf(Request $request)
    {
        $saison     = Saison::findOrFail($request->saison_id ?? Saison::active()?->id);
        $evenements = $this->queryEvenements($request)->get();

        $pdf = Pdf::loadView('rapports.evenements', [
            'saison'     => $saison,
            'evenements' => $evenements,
            'date'       => now()->format('d/m/Y H:i'),
        ])->setPaper('a4', 'landscape');

        return $pdf->download("bilan-evenements-{$saison->nom}.pdf");
    }

    /**
     * GET /api/rapports/evenements-excel
     */
    public function evenementsExcel(Request $request)
    {
        $saison     = Saison::findOrFail($request->saison_id ?? Saison::active()?->id);
        $evenements = $this->queryEvenements($request)->get();

        return Excel::download(
            new \App\Exports\EvenementsExport($evenements),
            "bilan-evenements-{$saison->nom}.xlsx"
        );
    }

    // -------------------------------------------------------
    // Helper privé
    // -------------------------------------------------------

    private function evaluerRentabilite(float $depense, int $points): string
    {
        if ($points === 0) return 'NON_EVALUE';
        $coutParPoint = $depense / $points;
        if ($coutParPoint < 500000) return 'TRES_RENTABLE';
        if ($coutParPoint < 1000000) return 'RENTABLE';
        if ($coutParPoint < 2000000) return 'ACCEPTABLE';
        return 'NON_RENTABLE';
    }
}