<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BudgetSection;
use App\Models\Transaction;
use App\Models\Evenement;
use App\Models\Discipline;
use App\Models\Section;
use App\Models\Saison;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SponsorController extends Controller
{
    /**
     * GET /api/sponsor/dashboard
     * Tableau de bord sponsor — vue synthétique
     */
    public function dashboard(Request $request): JsonResponse
    {
        $saisonActive = Saison::where('is_active', true)->first();

        // ── Budget global ──
        $budgets = BudgetSection::with('section.discipline')
            ->when($saisonActive, fn($q) => $q->where('saison_id', $saisonActive->id))
            ->get();

        $totalAlloue   = $budgets->sum('montant_alloue');
        $totalDepense  = $budgets->sum('montant_depense');
        $totalRestant  = $totalAlloue - $totalDepense;
        $pctConsomme   = $totalAlloue > 0
            ? round(($totalDepense / $totalAlloue) * 100, 1)
            : 0;

        // ── Répartition par discipline ──
        $parDiscipline = $budgets->groupBy('section.discipline.nom')
            ->map(fn($group) => [
                'discipline'    => $group->first()->section?->discipline?->nom ?? 'Autre',
                'total_alloue'  => $group->sum('montant_alloue'),
                'total_depense' => $group->sum('montant_depense'),
                'pct'           => $group->sum('montant_alloue') > 0
                    ? round(($group->sum('montant_depense') / $group->sum('montant_alloue')) * 100, 1)
                    : 0,
            ])->values();

        // ── Répartition des dépenses par catégorie ──
        $parCategorie = Transaction::where('statut', 'VALIDE')
            ->when($saisonActive, fn($q) => $q->whereHas('budget', fn($q) =>
                $q->where('saison_id', $saisonActive->id)
            ))
            ->selectRaw('categorie, SUM(montant) as total')
            ->groupBy('categorie')
            ->get()
            ->map(fn($row) => [
                'categorie' => $row->categorie,
                'total'     => $row->total,
                'pct'       => $totalDepense > 0
                    ? round(($row->total / $totalDepense) * 100, 1)
                    : 0,
            ]);

        // ── Performances sportives par section ──
        $performances = Section::with('discipline')
            ->withCount([
                'evenements as nb_matchs'   => fn($q) => $q->where('type', 'MATCH')->where('statut', 'TERMINE'),
                'evenements as nb_victoires' => fn($q) => $q->where('type', 'MATCH')->where('resultat', 'VICTOIRE'),
                'evenements as nb_defaites'  => fn($q) => $q->where('type', 'MATCH')->where('resultat', 'DEFAITE'),
                'evenements as nb_nuls'      => fn($q) => $q->where('type', 'MATCH')->where('resultat', 'NUL'),
            ])
            ->get()
            ->map(fn($s) => [
                'section'      => $s->nom,
                'discipline'   => $s->discipline?->nom,
                'nb_matchs'    => $s->nb_matchs,
                'nb_victoires' => $s->nb_victoires,
                'nb_defaites'  => $s->nb_defaites,
                'nb_nuls'      => $s->nb_nuls,
                'taux_victoire'=> $s->nb_matchs > 0
                    ? round(($s->nb_victoires / $s->nb_matchs) * 100, 1)
                    : 0,
                'budget_alloue'=> $budgets->where('section_id', $s->id)->sum('montant_alloue'),
                'budget_depense'=> $budgets->where('section_id', $s->id)->sum('montant_depense'),
            ]);

        // ── Évolution mensuelle des dépenses (6 derniers mois) ──
        $evolutionMensuelle = Transaction::where('statut', 'VALIDE')
            ->where('created_at', '>=', now()->subMonths(6))
            ->selectRaw("DATE_FORMAT(created_at, '%Y-%m') as mois, SUM(montant) as total")
            ->groupBy('mois')
            ->orderBy('mois')
            ->get();

        // ── Récents événements sportifs (publics) ──
        $derniersResultats = Evenement::with('section.discipline')
            ->where('statut', 'TERMINE')
            ->where('type', 'MATCH')
            ->whereNotNull('resultat')
            ->orderByDesc('date_heure')
            ->limit(10)
            ->get()
            ->map(fn($e) => [
                'date'          => $e->date_heure,
                'section'       => $e->section?->nom,
                'discipline'    => $e->section?->discipline?->nom,
                'adversaire'    => $e->adversaire,
                'resultat'      => $e->resultat,
                'score'         => $e->score_nous !== null
                    ? "{$e->score_nous} – {$e->score_adverse}"
                    : null,
                'domicile'      => $e->domicile,
            ]);

        return response()->json([
            'saison'   => $saisonActive,
            'budget'   => [
                'total_alloue'   => $totalAlloue,
                'total_depense'  => $totalDepense,
                'total_restant'  => $totalRestant,
                'pct_consomme'   => $pctConsomme,
            ],
            'par_discipline'     => $parDiscipline,
            'par_categorie'      => $parCategorie,
            'performances'       => $performances,
            'evolution_mensuelle'=> $evolutionMensuelle,
            'derniers_resultats' => $derniersResultats,
        ]);
    }

    /**
     * GET /api/sponsor/budget-consommation
     * Détail de la consommation budgétaire par section
     */
    public function budgetConsommation(Request $request): JsonResponse
    {
        $saisonActive = Saison::where('is_active', true)->first();

        $budgets = BudgetSection::with(['section.discipline', 'transactions' => fn($q) =>
            $q->where('statut', 'VALIDE')->orderByDesc('created_at')->limit(10)
        ])
        ->when($saisonActive, fn($q) => $q->where('saison_id', $saisonActive->id))
        ->orderByDesc('montant_alloue')
        ->get()
        ->map(fn($b) => [
            'section'        => $b->section?->nom,
            'discipline'     => $b->section?->discipline?->nom,
            'montant_alloue' => $b->montant_alloue,
            'montant_depense'=> $b->montant_depense,
            'montant_restant'=> $b->montant_restant,
            'pct_consomme'   => $b->pourcentage_consomme,
            // Répartition interne (sans données sensibles)
            'repartition'    => $b->transactions
                ->groupBy('categorie')
                ->map(fn($txs, $cat) => [
                    'categorie' => $cat,
                    'total'     => $txs->sum('montant'),
                ]),
        ]);

        return response()->json([
            'saison'  => $saisonActive,
            'budgets' => $budgets,
            'totaux'  => [
                'alloue'  => $budgets->sum('montant_alloue'),
                'depense' => $budgets->sum('montant_depense'),
                'restant' => $budgets->sum('montant_restant'),
            ],
        ]);
    }

    /**
     * GET /api/sponsor/performance-cout
     * Analyse rentabilité : coût par section vs résultats sportifs
     */
    public function performanceCout(Request $request): JsonResponse
    {
        $saisonActive = Saison::where('is_active', true)->first();

        $sections = Section::with('discipline')
            ->withCount([
                'evenements as nb_matchs'   => fn($q) => $q->where('type', 'MATCH')->where('statut', 'TERMINE'),
                'evenements as nb_victoires' => fn($q) => $q->where('type', 'MATCH')->where('resultat', 'VICTOIRE'),
                'contrats as nb_membres'     => fn($q) => $q->where('statut', 'ACTIF'),
            ])
            ->get()
            ->map(function ($s) use ($saisonActive) {
                $budget = BudgetSection::where('section_id', $s->id)
                    ->when($saisonActive, fn($q) => $q->where('saison_id', $saisonActive->id))
                    ->first();

                $coutTotal    = $budget?->montant_depense ?? 0;
                $nbMatchs     = $s->nb_matchs;
                $nbVictoires  = $s->nb_victoires;
                $taux         = $nbMatchs > 0 ? round(($nbVictoires / $nbMatchs) * 100, 1) : 0;
                $coutParMatch = $nbMatchs > 0 ? round($coutTotal / $nbMatchs) : 0;
                $coutParPt    = $nbVictoires > 0 ? round($coutTotal / ($nbVictoires * 3)) : null;

                // Score rentabilité : victoires / (coût / 1M)
                $rentabilite = $coutTotal > 0
                    ? round(($nbVictoires / ($coutTotal / 1_000_000)) * 10) / 10
                    : 0;

                return [
                    'section'         => $s->nom,
                    'discipline'      => $s->discipline?->nom,
                    'nb_membres'      => $s->nb_membres,
                    'nb_matchs'       => $nbMatchs,
                    'nb_victoires'    => $nbVictoires,
                    'taux_victoire'   => $taux,
                    'cout_total'      => $coutTotal,
                    'cout_par_match'  => $coutParMatch,
                    'cout_par_point'  => $coutParPt,
                    'score_rentabilite' => $rentabilite,
                    'budget_alloue'   => $budget?->montant_alloue ?? 0,
                    'pct_consomme'    => $budget?->pourcentage_consomme ?? 0,
                ];
            })
            ->sortByDesc('score_rentabilite')
            ->values();

        return response()->json([
            'saison'   => $saisonActive,
            'sections' => $sections,
            'analyse'  => [
                'meilleure_rentabilite' => $sections->first()?->offsetGet('section'),
                'moins_rentable'        => $sections->last()?->offsetGet('section'),
                'cout_moyen_victoire'   => $sections->whereNotNull('cout_par_point')->avg('cout_par_point'),
            ],
        ]);
    }

    /**
     * GET /api/sponsor/rapports
     * Rapports publics accessibles au sponsor
     */
    public function rapports(Request $request): JsonResponse
    {
        $saisonActive = Saison::where('is_active', true)->first();

        // Primes versées (justification des dépenses performance)
        $primesParResultat = DB::table('participations')
            ->join('evenements', 'participations.evenement_id', '=', 'evenements.id')
            ->where('participations.is_present', true)
            ->whereNotNull('participations.prime_calculee')
            ->selectRaw('evenements.resultat, COUNT(*) as nb, SUM(participations.prime_calculee) as total')
            ->groupBy('evenements.resultat')
            ->get();

        // Statistiques globales de la saison
        $statsGlobales = [
            'nb_matchs_joues'    => Evenement::where('type', 'MATCH')->where('statut', 'TERMINE')->count(),
            'nb_victoires'       => Evenement::where('resultat', 'VICTOIRE')->count(),
            'nb_entrainements'   => Evenement::where('type', 'ENTRAINEMENT')->where('statut', 'TERMINE')->count(),
            'total_primes'       => DB::table('participations')->whereNotNull('prime_calculee')->sum('prime_calculee'),
            'nb_membres_actifs'  => DB::table('contrats')->where('statut', 'ACTIF')->count(),
        ];

        return response()->json([
            'saison'            => $saisonActive,
            'stats_globales'    => $statsGlobales,
            'primes_par_resultat' => $primesParResultat,
        ]);
    }
}