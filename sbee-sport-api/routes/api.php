<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\DisciplineController;
use App\Http\Controllers\Api\SaisonController;
use App\Http\Controllers\Api\GrillePrimeController;
use App\Http\Controllers\Api\SectionController;
use App\Http\Controllers\Api\PersonneController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\ContratController;
use App\Http\Controllers\Api\EvenementController;
use App\Http\Controllers\Api\CoachController;
use App\Http\Controllers\Api\BudgetController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\RapportController;
use App\Http\Controllers\Api\StockController;
use App\Http\Controllers\Api\DotationController;
use App\Http\Controllers\Api\CompetitionController;
use App\Http\Controllers\Api\DashboardController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\PublicController;

// ============================================================
// ROUTES PUBLIQUES
// ============================================================
Route::prefix('auth')->group(function () {
    Route::post('/login',           [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password',  [AuthController::class, 'resetPassword']);
});

Route::prefix('public')->group(function () {
    // Stats globales du club
    Route::get('/stats',                [PublicController::class, 'stats']);
 
    // Prochains matchs
    Route::get('/prochains-matchs',   [PublicController::class, 'prochainsMatchs']);
 
    // Résultats récents
    Route::get('/resultats-recents',  [PublicController::class, 'resultatsRecents']);
 
    // Posts — lecture seule pour le public
    Route::get('/posts',                [PublicController::class, 'posts']);
    
    // Commentaires (lecture et ajout restent publics)
    Route::get('/posts/{post}/commentaires',  [PublicController::class, 'commentaires']);
    Route::post('/posts/{post}/commentaires', [PublicController::class, 'storeCommentaire']);
 
    // Likes (toggle par IP)
    Route::post('/posts/{post}/like', [PublicController::class, 'toggleLike']);
});
 
// ============================================================
// ROUTES PROTÉGÉES (Nécessitent d'être connecté)
// ============================================================
Route::middleware(['auth:sanctum'])->group(function () {

    // --- Gestion des posts sécurisée : SUPER_ADMIN uniquement ---
    Route::middleware(['role:SUPER_ADMIN'])->group(function () {
        Route::post('/public/posts',          [PublicController::class, 'storePost']);
        Route::post('/public/posts/{post}',     [PublicController::class, 'updatePost']);
        Route::delete('/public/posts/{post}',   [PublicController::class, 'deletePost']);
    });
    
    // --- Statistiques du Tableau de bord (Dashboard) ---
    Route::get('dashboard/stats', [DashboardController::class, 'getStats']);
    Route::get('evenements/{evenement}/joueurs-disponibles', [EvenementController::class, 'getJoueursDisponibles']);
    
    // --- Compétitions (Déplacé ici pour éviter le crash de cache) ---
    Route::get('/competitions', [CompetitionController::class, 'index']);
 
    // --- Auth ---
    Route::prefix('auth')->group(function () {
        Route::get('/me',               [AuthController::class, 'me']);
        Route::post('/logout',          [AuthController::class, 'logout']);
        Route::post('/refresh',         [AuthController::class, 'refresh']);
        Route::post('/change-password', [AuthController::class, 'changePassword']);
    });

    // ---------------------------------------------------------------------
    // ACCÈS GLOBAL (Tous les rôles connectés)
    // ---------------------------------------------------------------------
    Route::get('saisons/active', [SaisonController::class, 'current']);
    Route::get('saisons',        [SaisonController::class, 'index']);

    // --------------------------------------------------------
    // SUPER ADMIN uniquement
    // --------------------------------------------------------
    Route::middleware(['role:SUPER_ADMIN'])->group(function () {
        Route::apiResource('users', UserController::class);
        Route::patch('users/{user}/toggle-actif',         [UserController::class, 'toggleActif']);
        Route::patch('users/{user}/reset-password-admin', [UserController::class, 'resetPasswordAdmin']);
        Route::get('users/{user}/profile', [UserController::class, 'showProfile']);
    });

    // --------------------------------------------------------
    // SUPER ADMIN + TRESORIER
    // --------------------------------------------------------
    Route::middleware(['role:SUPER_ADMIN,TRESORIER'])->group(function () {
        Route::apiResource('disciplines', DisciplineController::class);
        
        // Actions d'écriture sur les saisons
        Route::post('saisons',                 [SaisonController::class, 'store']);
        Route::get('saisons/{saison}',         [SaisonController::class, 'show']);
        Route::put('saisons/{saison}',         [SaisonController::class, 'update']);
        Route::delete('saisons/{saison}',      [SaisonController::class, 'destroy']);
        Route::patch('saisons/{saison}/activer', [SaisonController::class, 'activer']);
        
        Route::apiResource('grilles-primes', GrillePrimeController::class);

        // Budgets
        Route::apiResource('budgets', BudgetController::class)->except(['destroy']);

        // Validation N2 des transactions
        Route::patch('transactions/{transaction}/valider-n2', [TransactionController::class, 'validerN2']);
        Route::patch('transactions/{transaction}/rejeter',    [TransactionController::class, 'rejeter']);
        Route::get('transactions/{transaction}/justificatif', [TransactionController::class, 'downloadJustificatif']);

        // ─── PROTECTION DES RAPPORTS ET ÉTATS FINANCIERS ───
        
        // 1. Accès exclusif au SUPER_ADMIN pour le rapport global (PDF)
        Route::middleware(['role:SUPER_ADMIN'])->group(function () {
            Route::get('rapports/export-pdf',       [RapportController::class, 'exportPdf']);
            Route::get('rapports/bilan-financier',  [RapportController::class, 'bilanFinancier']);
        });

        // 2. Accès partagé (SUPER_ADMIN + TRESORIER) pour la comptabilité (Excel & Paie)
        Route::get('rapports/export-excel',     [RapportController::class, 'exportExcel']);
        Route::get('rapports/etat-paie',        [RapportController::class, 'etatPaie']);
        Route::get('rapports/etat-paie-excel',  [RapportController::class, 'etatPaieExcel']);
        
        // ───────────────────────────────────────────────────

        // Referentiel Stock global
        Route::get('types-materiels',  [StockController::class, 'typesMateriel']);
        Route::post('types-materiels', [StockController::class, 'storeTypeMateriel']);
    });

    // ---------------------------------------------------------------------------------
    // ACCÈS SOUMIS À L'ISOLATION PAR SECTION
    // ---------------------------------------------------------------------------------
    Route::middleware(['role:SUPER_ADMIN,TRESORIER,RESPONSABLE_SECTION,COACH'])->group(function () {
        
        Route::middleware(['section.access'])->group(function () {
            // Listes
            Route::get('sections',            [SectionController::class, 'index']);
            Route::get('personnes',           [PersonneController::class, 'index']);
            Route::get('contrats',            [ContratController::class, 'index']);
            Route::get('evenements',          [EvenementController::class, 'index']);
            Route::get('transactions',        [TransactionController::class, 'index']);
            Route::get('stocks',              [StockController::class, 'index']);
            Route::get('dotations',           [DotationController::class, 'index']);
            Route::get('mouvements-stocks',   [StockController::class, 'mouvements']);
            Route::get('contrats-expirant',   [ContratController::class, 'expirantBientot']);
            Route::get('dotations/en-retard', [DotationController::class, 'enRetard']);

            // Rapports — effectifs, contrats, inventaire, dotations, événements
            // (isolation par section gérée à l'intérieur du contrôleur, comme etat-paie)
            Route::get('rapports/effectifs-pdf',    [RapportController::class, 'effectifsPdf']);
            Route::get('rapports/effectifs-excel',  [RapportController::class, 'effectifsExcel']);
            Route::get('rapports/contrats-pdf',     [RapportController::class, 'contratsPdf']);
            Route::get('rapports/contrats-excel',   [RapportController::class, 'contratsExcel']);
            Route::get('rapports/inventaire-pdf',   [RapportController::class, 'inventairePdf']);
            Route::get('rapports/inventaire-excel', [RapportController::class, 'inventaireExcel']);
            Route::get('rapports/dotations-pdf',    [RapportController::class, 'dotationsPdf']);
            Route::get('rapports/dotations-excel',  [RapportController::class, 'dotationsExcel']);
            Route::get('rapports/evenements-pdf',   [RapportController::class, 'evenementsPdf']);
            Route::get('rapports/evenements-excel', [RapportController::class, 'evenementsExcel']);

            // Créations (Prise en compte de code_analytique et genre dans le SectionController)
            Route::post('sections',         [SectionController::class, 'store']);
            Route::post('personnes',        [PersonneController::class, 'store']);
            Route::post('contrats',         [ContratController::class, 'store']);
            Route::post('evenements',       [EvenementController::class, 'store']);
            Route::post('transactions',     [TransactionController::class, 'store']);
            Route::post('stocks',           [StockController::class, 'store']);
            Route::post('dotations',        [DotationController::class, 'store']);
            
            // Détails et Actions Sections
            Route::get('sections/{section}',      [SectionController::class, 'show']);
            Route::put('sections/{section}',      [SectionController::class, 'update']);
            Route::delete('sections/{section}',   [SectionController::class, 'destroy']);
            Route::get('sections/{section}/rapport', [RapportController::class, 'rapportSection']);
            
            // Personnes & Documents
            Route::get('personnes/{personne}',                     [PersonneController::class, 'show']);
            Route::put('personnes/{personne}',                     [PersonneController::class, 'update']);
            Route::delete('personnes/{personne}',                  [PersonneController::class, 'destroy']);
            Route::get('personnes/{personne}/historique-primes',    [PersonneController::class, 'historiquePrimes']);
            Route::get('personnes/{personne}/documents',            [DocumentController::class, 'index']);
            Route::post('personnes/{personne}/documents',           [DocumentController::class, 'upload']);
            
            Route::get('documents/{document}/download', [DocumentController::class, 'download'])->name('documents.download');
            Route::delete('documents/{document}',       [DocumentController::class, 'destroy']);

            // Contrats
            Route::get('contrats/{contrat}',         [ContratController::class, 'show']);
            Route::put('contrats/{contrat}',         [ContratController::class, 'update']);
            Route::delete('contrats/{contrat}',      [ContratController::class, 'destroy']);
            Route::patch('contrats/{contrat}/statut', [ContratController::class, 'updateStatut']);

            // Événements
            Route::get('evenements/{evenement}',                 [EvenementController::class, 'show']);
            Route::put('evenements/{evenement}',                 [EvenementController::class, 'update']);
            Route::delete('evenements/{evenement}',              [EvenementController::class, 'destroy']);
            Route::post('evenements/{evenement}/valider',        [EvenementController::class, 'valider']);
            Route::post('evenements/{evenement}/participations', [EvenementController::class, 'enregistrerParticipations']);
            Route::post('evenements/{evenement}/cloturer',       [EvenementController::class, 'cloturer']);
            Route::post('evenements/{evenement}/decloturer',     [EvenementController::class, 'decloturer']);
            Route::post('evenements/{evenement}/staffing', [EvenementController::class, 'ajouterStaff']);
            
            // Transactions
            Route::get('transactions/{transaction}',        [TransactionController::class, 'show']);
            Route::patch('transactions/{transaction}/valider-n1', [TransactionController::class, 'validerN1']);

            // Inventaires (Stocks & Dotations)
            Route::get('stocks/{stock}',             [StockController::class, 'show']);
            Route::put('stocks/{stock}',             [StockController::class, 'update']);
            Route::delete('stocks/{stock}',          [StockController::class, 'destroy']);
            Route::post('stocks/{stock}/ajouter',    [StockController::class, 'ajouter']);
            Route::post('stocks/{stock}/retirer',    [StockController::class, 'retirer']);

            // Dotations
            Route::get('dotations/{dotation}',                  [DotationController::class, 'show']);
            Route::patch('dotations/{dotation}/retourner',      [DotationController::class, 'retourner']);
            Route::patch('dotations/{dotation}/declarer-perdu', [DotationController::class, 'declarerPerdu']);
        });
    });

    // --------------------------------------------------------
    // COACH — Interface Mobile Terrain
    // --------------------------------------------------------
    Route::middleware(['role:SUPER_ADMIN,RESPONSABLE_SECTION,COACH', 'section.access'])->group(function () {
        Route::get('coach/evenements',                                      [CoachController::class, 'mesEvenements']);
        Route::get('coach/evenements/{evenement}',                          [CoachController::class, 'detailEvenement']);
        Route::post('coach/evenements/{evenement}/appel',                   [CoachController::class, 'faireAppel']);
        Route::post('coach/evenements/{evenement}/valider',                 [CoachController::class, 'validerResultat']);
        Route::post('coach/participations/{participation}/performances',    [CoachController::class, 'ajouterPerformance']);
        Route::post('coach/participations/{participation}/sanctions',       [CoachController::class, 'ajouterSanction']);
    });
});