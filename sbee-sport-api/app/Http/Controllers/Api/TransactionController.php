<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BudgetSection;
use App\Models\NotificationApp;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class TransactionController extends Controller
{
    /**
     * GET /api/transactions
     * Liste des transactions selon le rôle
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Transaction::with([
            'budgetSection.section.discipline',
            'budgetSection.saison',
            'evenement',
            'contrat.personne',
            'soumisParUser',
            'valideN1Par',
            'valideN2Par',
        ]);

        // Isolation section pour les rôles subordonnés
        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
            $query->whereHas('budgetSection', fn($q) => $q->where('section_id', $user->section_id));
        }

        $query
            ->when($request->section_id, fn($q, $id) =>
                $q->whereHas('budgetSection', fn($q) => $q->where('section_id', $id)))
            ->when($request->categorie, fn($q, $c) => $q->where('categorie', $c))
            ->when($request->statut, fn($q, $s) => $q->where('statut_validation', $s))
            ->when($request->type, fn($q, $t) => $q->where('type', $t))
            ->when($request->date_debut, fn($q, $d) => $q->whereDate('date_transaction', '>=', $d))
            ->when($request->date_fin, fn($q, $d) => $q->whereDate('date_transaction', '<=', $d));

        $transactions = $query->orderByDesc('date_transaction')->paginate(20);

        // Totaux de la page courante
        $totaux = [
            'en_attente' => Transaction::whereHas('budgetSection', function ($q) use ($user) {
                if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
                    $q->where('section_id', $user->section_id);
                }
            })->where('statut_validation', 'EN_ATTENTE')->sum('montant'),

            'valide_n1' => Transaction::whereHas('budgetSection', function ($q) use ($user) {
                if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
                    $q->where('section_id', $user->section_id);
                }
            })->where('statut_validation', 'VALIDE_N1')->sum('montant'),
        ];

        return response()->json([
            'transactions' => $transactions,
            'totaux'       => $totaux,
        ]);
    }

    /**
     * POST /api/transactions
     * Soumettre une proposition de dépense (En attente d'approbation administrative)
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'budget_section_id' => 'required|exists:budgets_sections,id',
            'categorie'         => 'required|in:PRIME_MATCH,PRIME_ENTRAINEMENT,SALAIRE,PRIME_SIGNATURE,ACHAT_MATERIEL,TRANSPORT,HEBERGEMENT,MEDICAL,ARBITRAGE,AUTRE',
            'montant'           => 'required|numeric|min:1',
            'libelle'           => 'required|string|max:255',
            'date_transaction'  => 'required|date',
            'evenement_id'      => 'nullable|exists:evenements,id',
            'contrat_id'        => 'nullable|exists:contrats,id',
            'justificatif'      => [
                'nullable',
                'file',
                'max:5120',
                'mimes:pdf,jpg,jpeg,png,webp',
            ],
        ]);

        $user   = $request->user();
        $budget = BudgetSection::findOrFail($request->budget_section_id);

        // Isolation section
        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
            if ($budget->section_id !== $user->section_id) {
                return response()->json(['message' => 'Accès refusé à ce budget.'], 403);
            }
        }

        // RG-FIN-03 : Justificatif obligatoire pour certaines catégories
        $categoriesAvecJustificatif = ['ACHAT_MATERIEL', 'TRANSPORT', 'HEBERGEMENT', 'ARBITRAGE', 'AUTRE'];
        if (in_array($request->categorie, $categoriesAvecJustificatif) && !$request->hasFile('justificatif')) {
            return response()->json([
                'message' => 'RG-FIN-03 : Un justificatif (photo/PDF) est obligatoire pour cette catégorie de dépense.',
            ], 422);
        }

        // RG-FIN-01 : Vérification budget suffisant prévisionnel
        if (!$budget->aAssezPour($request->montant)) {
            $this->alerterBudgetInsuffisant($budget, $request->montant);
            return response()->json([
                'message'        => "Budget insuffisant. Restant disponible : " . number_format($budget->montant_restant, 0, ',', '.') . " FCFA.",
                'montant_restant'=> $budget->montant_restant,
                'montant_demande'=> $request->montant,
            ], 422);
        }

        // Upload du justificatif si présent
        $justificatifUrl = null;
        if ($request->hasFile('justificatif')) {
            $fichier         = $request->file('justificatif');
            $nomFichier      = uniqid('justif_') . '.' . $fichier->getClientOriginalExtension();
            $justificatifUrl = $fichier->storeAs('justificatifs', $nomFichier, 'local');
        }

        // La transaction est créée mais elle n'est pas encore appliquée sur le budget
        $transaction = Transaction::create([
            'budget_section_id' => $request->budget_section_id,
            'evenement_id'      => $request->evenement_id,
            'contrat_id'        => $request->contrat_id,
            'type'              => 'DEBIT',
            'categorie'         => $request->categorie,
            'montant'           => $request->montant,
            'libelle'           => $request->libelle,
            'justificatif_url'  => $justificatifUrl,
            'statut_validation' => 'EN_ATTENTE',
            'date_transaction'  => $request->date_transaction,
            'soumis_par'        => $user->id,
        ]);

        // Notifie le Responsable de Section pour validation intermédiaire N1
        $this->notifierValidationN1($transaction, $budget);

        return response()->json([
            'message'     => 'Dépense enregistrée avec succès. Elle doit être validée par l\'administration avant exécution.',
            'transaction' => $transaction->load(['budgetSection.section', 'soumisParUser']),
        ], 201);
    }

    /**
     * GET /api/transactions/{transaction}
     */
    public function show(Request $request, Transaction $transaction): JsonResponse
    {
        $user = $request->user();

        if (!$this->peutVoirTransaction($user, $transaction)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        return response()->json([
            'transaction' => $transaction->load([
                'budgetSection.section.discipline',
                'evenement',
                'contrat.personne',
                'soumisParUser.personne',
                'valideN1Par.personne',
                'valideN2Par.personne',
            ]),
        ]);
    }

    /**
     * PATCH /api/transactions/{transaction}/valider-n1
     * Validation N1 par le Responsable de Section
     */
    public function validerN1(Request $request, Transaction $transaction): JsonResponse
    {
        $user = $request->user();

        if (!$this->peutVoirTransaction($user, $transaction)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        if ($transaction->statut_validation !== 'EN_ATTENTE') {
            return response()->json([
                'message' => "Impossible de valider : statut actuel '{$transaction->statut_validation}'.",
            ], 422);
        }

        // Un Responsable ne peut pas valider sa propre soumission (Sauf s'il est SUPER_ADMIN)
        if ($transaction->soumis_par === $user->id && $user->role_systeme !== 'SUPER_ADMIN') {
            return response()->json([
                'message' => 'Vous ne pouvez pas valider votre propre dépense.',
            ], 422);
        }

        $transaction->update([
            'statut_validation'  => 'VALIDE_N1',
            'valide_n1_par'      => $user->id,
            'date_validation_n1' => now(),
        ]);

        // Notifie les administrateurs et trésoriers pour l'approbation finale obligatoire
        $this->notifierValidationN2($transaction);

        return response()->json([
            'message'     => 'Validation intermédiaire (N1) effectuée. En attente de l\'approbation finale de l\'administrateur ou du trésorier.',
            'transaction' => $transaction->fresh(['budgetSection.section', 'valideN1Par']),
        ]);
    }

    /**
     * PATCH /api/transactions/{transaction}/valider-n2
     * APPROBATION ADMINISTRATIVE FINALE (ADMIN / TRESORIER)
     * Déclenche le débit réel de l'argent après contrôle
     */
    public function validerN2(Request $request, Transaction $transaction): JsonResponse
    {
        $user = $request->user();

        // SÉCURITÉ : Seul l'Administrateur Général ou le Trésorier peut donner l'autorisation finale
        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
            return response()->json([
                'message' => 'Autorisation refusée : Seul l\'administrateur ou le trésorier peut valider définitivement une transaction.',
            ], 403);
        }

        if ($transaction->statut_validation !== 'VALIDE_N1') {
            return response()->json([
                'message' => "Impossible : la transaction doit d'abord passer par la validation intermédiaire N1. Statut actuel : '{$transaction->statut_validation}'.",
            ], 422);
        }

        $budget = $transaction->budgetSection;

        // Revérification stricte de la disponibilité des fonds avant débit réel
        if (!$budget->aAssezPour($transaction->montant)) {
            return response()->json([
                'message'        => "Validation impossible : Le budget restant actuel ({$budget->montant_restant} FCFA) est insuffisant pour couvrir cette dépense.",
                'montant_restant'=> $budget->montant_restant,
            ], 422);
        }

        // Transaction SQL isolée pour garantir l'intégrité des données financières
        DB::transaction(function () use ($transaction, $budget, $user) {
            $transaction->update([
                'statut_validation'  => 'VALIDE_N2',
                'valide_n2_par'      => $user->id,
                'date_validation_n2' => now(),
            ]);

            // RG-FIN-01 : Débit effectif et définitif de l'enveloppe budgétaire
            $budget->debiter($transaction->montant);
        });

        // Notifie le demandeur original
        $this->notifierValidationFinale($transaction);

        return response()->json([
            'message'        => '✅ Dépense officiellement validée par l\'administration. Les fonds ont été débités.',
            'transaction'    => $transaction->fresh(['budgetSection', 'valideN2Par']),
            'budget_restant' => $budget->fresh()->montant_restant,
        ]);
    }

    /**
     * PATCH /api/transactions/{transaction}/rejeter
     */
    public function rejeter(Request $request, Transaction $transaction): JsonResponse
    {
        $request->validate([
            'motif_rejet' => 'required|string|max:255',
        ]);

        if ($transaction->statut_validation === 'VALIDE_N2') {
            return response()->json([
                'message' => 'Impossible de rejeter une transaction déjà validée et décaissée.',
            ], 422);
        }

        $transaction->update([
            'statut_validation' => 'REJETE',
            'motif_rejet'       => $request->motif_rejet,
        ]);

        $this->notifierRejet($transaction, $request->motif_rejet);

        return response()->json([
            'message'     => 'Transaction rejetée avec succès.',
            'transaction' => $transaction->fresh(),
        ]);
    }

    /**
     * GET /api/transactions/{transaction}/justificatif
     */
    public function downloadJustificatif(Request $request, Transaction $transaction)
    {
        $user = $request->user();

        if (!$this->peutVoirTransaction($user, $transaction)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        if (!$transaction->justificatif_url || !Storage::disk('local')->exists($transaction->justificatif_url)) {
            return response()->json(['message' => 'Justificatif introuvable.'], 404);
        }

        return Storage::disk('local')->download($transaction->justificatif_url);
    }

    // -------------------------------------------------------
    // Helpers
    // -------------------------------------------------------

    private function peutVoirTransaction($user, Transaction $transaction): bool
    {
        if (in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
            return true;
        }
        return $transaction->budgetSection->section_id === $user->section_id;
    }

    private function notifierValidationN1(Transaction $transaction, BudgetSection $budget): void
    {
        $responsable = User::where('section_id', $budget->section_id)
            ->where('role_systeme', 'RESPONSABLE_SECTION')
            ->first();

        if (!$responsable || $responsable->id === $transaction->soumis_par) return;

        NotificationApp::create([
            'user_id'         => $responsable->id,
            'type'            => 'TRANSACTION_EN_ATTENTE',
            'titre'           => 'Dépense à valider (N1)',
            'message'         => "Une dépense de " . number_format($transaction->montant, 0, ',', '.') . " FCFA ({$transaction->libelle}) attend votre validation.",
            'url_action'      => "/transactions/{$transaction->id}",
            'notifiable_type' => Transaction::class,
            'notifiable_id'   => $transaction->id,
        ]);
    }

    private function notifierValidationN2(Transaction $transaction): void
    {
        // Envoi des notifications d'approbation à la fois aux trésoriers et aux super-administrateurs
        $administrateurs = User::whereIn('role_systeme', ['SUPER_ADMIN', 'TRESORIER'])->get();

        foreach ($administrateurs as $admin) {
            NotificationApp::create([
                'user_id'         => $admin->id,
                'type'            => 'TRANSACTION_EN_ATTENTE',
                'titre'           => 'Demande d\'approbation financière (N2)',
                'message'         => "La dépense de " . number_format($transaction->montant, 0, ',', '.') . " FCFA ({$transaction->libelle}) exige votre validation finale pour déblocage des fonds.",
                'url_action'      => "/transactions/{$transaction->id}",
                'notifiable_type' => Transaction::class,
                'notifiable_id'   => $transaction->id,
            ]);
        }
    }

    private function notifierValidationFinale(Transaction $transaction): void
    {
        if (!$transaction->soumis_par) return;

        NotificationApp::create([
            'user_id'         => $transaction->soumis_par,
            'type'            => 'PRIME_VERSEE',
            'titre'           => '✅ Dépense validée par l\'administration',
            'message'         => "Votre demande de dépense de " . number_format($transaction->montant, 0, ',', '.') . " FCFA ({$transaction->libelle}) a été officiellement approuvée. Les fonds sont débloqués.",
            'url_action'      => "/transactions/{$transaction->id}",
            'notifiable_type' => Transaction::class,
            'notifiable_id'   => $transaction->id,
        ]);
    }

    private function notifierRejet(Transaction $transaction, string $motif): void
    {
        if (!$transaction->soumis_par) return;

        NotificationApp::create([
            'user_id'         => $transaction->soumis_par,
            'type'            => 'AUTRE',
            'titre'           => '❌ Dépense refusée par l\'administration',
            'message'         => "Votre demande de dépense de " . number_format($transaction->montant, 0, ',', '.') . " FCFA ({$transaction->libelle}) a été rejetée. Motif : {$motif}",
            'url_action'      => "/transactions/{$transaction->id}",
            'notifiable_type' => Transaction::class,
            'notifiable_id'   => $transaction->id,
        ]);
    }

    private function alerterBudgetInsuffisant(BudgetSection $budget, float $montant): void
    {
        $admins = User::whereIn('role_systeme', ['TRESORIER', 'SUPER_ADMIN'])->get();

        foreach ($admins as $user) {
            NotificationApp::create([
                'user_id'         => $user->id,
                'type'            => 'BUDGET_DEPASSE',
                'titre'           => '⚠️ Blocage : Tentative de dépassement budgétaire',
                'message'         => "Une tentative de transaction de " . number_format($montant, 0, ',', '.') . " FCFA a été rejetée automatiquement sur la section {$budget->section->nom} (Fonds insuffisants).",
                'url_action'      => "/budgets/{$budget->id}",
                'notifiable_type' => BudgetSection::class,
                'notifiable_id'   => $budget->id,
            ]);
        }
    }
}