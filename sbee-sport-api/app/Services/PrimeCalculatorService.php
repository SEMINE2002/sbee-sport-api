<?php

namespace App\Services;

use App\Models\BudgetSection;
use App\Models\Contrat;
use App\Models\Evenement;
use App\Models\GrillePrime;
use App\Models\NotificationApp;
use App\Models\Participation;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * PrimeCalculatorService
 *
 * Moteur central de calcul des primes.
 * Déclenché après validation d'un événement par le coach.
 *
 * Règles appliquées :
 *  - RG-SPT-01 : Seuls les joueurs is_present = true sont éligibles
 *  - RG-SPT-02 : Après calcul, l'événement est verrouillé (is_verrouille = true)
 *  - RG-RH-01  : Joueurs BLESSÉ / SUSPENDU / docs invalides → exclus
 *  - RG-FIN-01 : Budget insuffisant → blocage + alerte Trésorier
 */
class PrimeCalculatorService
{
    /**
     * Point d'entrée principal.
     * Calcule et enregistre toutes les primes d'un événement.
     *
     * @return array Résumé du calcul
     */
    public function calculerPourEvenement(Evenement $evenement, int $validePar): array
    {
        // Sécurité : événement déjà verrouillé
        if ($evenement->is_verrouille) {
            return [
                'succes'  => false,
                'message' => 'Cet événement est déjà verrouillé. Les primes ont déjà été calculées.',
            ];
        }

        // Récupère la grille de primes de la discipline
        $grille = $this->getGrille($evenement);
        if (!$grille) {
            return [
                'succes'  => false,
                'message' => "Aucune grille de prime définie pour cette discipline / type de match / résultat.",
            ];
        }

        // Récupère le budget de la section
        $budget = BudgetSection::where('section_id', $evenement->section_id)
            ->where('saison_id', $evenement->saison_id)
            ->first();

        if (!$budget) {
            return [
                'succes'  => false,
                'message' => "Aucun budget alloué à cette section pour cette saison.",
            ];
        }

        // Récupère toutes les participations présentes et éligibles
        $participations = $this->getParticipationsEligibles($evenement);

        if ($participations->isEmpty()) {
            return [
                'succes'  => false,
                'message' => "Aucun joueur présent et éligible pour cet événement.",
            ];
        }

        // Calcule le montant total nécessaire
        $totalNecessaire = $this->calculerTotal($participations, $grille);

        // RG-FIN-01 : Vérification budget suffisant
        if (!$budget->aAssezPour($totalNecessaire)) {
            $this->alerterBudgetInsuffisant($evenement, $budget, $totalNecessaire);

            return [
                'succes'          => false,
                'message'         => "Budget insuffisant. Restant : {$budget->montant_restant} FCFA. Nécessaire : {$totalNecessaire} FCFA.",
                'budget_restant'  => $budget->montant_restant,
                'total_necessaire'=> $totalNecessaire,
            ];
        }

        // Tout est OK → on lance le calcul dans une transaction DB
        DB::beginTransaction();
        try {
            $details = $this->enregistrerPrimes($evenement, $participations, $grille, $budget, $validePar);

            // RG-SPT-02 : Verrouillage de l'événement
            $evenement->update([
                'is_verrouille'   => true,
                'valide_par'      => $validePar,
                'date_validation' => now(),
            ]);

            DB::commit();

            Log::info("Primes calculées", [
                'evenement_id' => $evenement->id,
                'nb_joueurs'   => $details['nb_joueurs'],
                'total'        => $details['total_verse'],
                'valide_par'   => $validePar,
            ]);

            return [
                'succes'       => true,
                'message'      => "Primes calculées et verrouillées avec succès.",
                'details'      => $details,
            ];

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Erreur calcul primes", ['error' => $e->getMessage(), 'evenement_id' => $evenement->id]);

            return [
                'succes'  => false,
                'message' => "Erreur lors du calcul : " . $e->getMessage(),
            ];
        }
    }

    // -------------------------------------------------------
    // Étape 1 : Récupérer la bonne grille de prime
    // -------------------------------------------------------

  private function getGrille(Evenement $evenement): ?GrillePrime
    {
        // Assurez-vous que les relations sont chargées
        $evenement->loadMissing('section.discipline', 'competition');

        if ($evenement->estEntrainement()) {
            return GrillePrime::where('discipline_id', $evenement->section->discipline_id)
                ->where('type_match', 'ENTRAINEMENT')
                ->where('resultat', 'PRESENCE')
                ->first();
        }

        $typeMatch = $evenement->competition?->type ?? 'AMICAL';
        $resultat  = $evenement->resultat;

        // TRACE DE DÉBOGAGE TRÈS IMPORTANTE
        \Log::warning('DEBUG GRILLE PRIME', [
            'evenement_id'  => $evenement->id,
            'discipline_id' => $evenement->section->discipline_id ?? null,
            'discipline_nom'=> $evenement->section->discipline->nom ?? 'Pas de discipline',
            'type_match'    => $typeMatch,
            'resultat'      => $resultat,
        ]);

        if (in_array($resultat, ['EN_ATTENTE', 'ANNULE'])) {
            return null;
        }

        return GrillePrime::where('discipline_id', $evenement->section->discipline_id)
            ->where('type_match', $typeMatch)
            ->where('resultat', $resultat)
            ->first();
    }

    // -------------------------------------------------------
    // Étape 2 : Récupérer les joueurs éligibles
    // -------------------------------------------------------

    private function getParticipationsEligibles(Evenement $evenement)
    {
        return Participation::where('evenement_id', $evenement->id)
            ->where('is_present', true)           // RG-SPT-01 : présent uniquement
            ->whereNull('prime_calculee')          // Pas déjà calculé
            ->with(['contrat.personne', 'contrat.section'])
            ->get()
            ->filter(function (Participation $participation) {
                $contrat = $participation->contrat;

                // RG-RH-01 : Exclure si statut invalide
                if (!in_array($contrat->statut, ['ACTIF'])) {
                    return false;
                }

                // RG-RH-01 : Exclure si documents non valides
                if (!$contrat->documents_valides) {
                    return false;
                }

                // Exclure le staff (type_role != JOUEUR ne reçoit pas de prime de match standard)
                // Le coach reçoit sa prime via son contrat (salaire fixe)
                if (!in_array($contrat->type_role, ['JOUEUR'])) {
                    return false;
                }

                return true;
            });
    }

    // -------------------------------------------------------
    // Étape 3 : Calculer le montant total
    // -------------------------------------------------------

    private function calculerTotal($participations, GrillePrime $grille): float
    {
        $total = 0;

        foreach ($participations as $participation) {
            $total += $grille->calculerMontant($participation->is_titulaire);
        }

        return $total;
    }

    // -------------------------------------------------------
    // Étape 4 : Enregistrer les primes et transactions
    // -------------------------------------------------------

    private function enregistrerPrimes(
        Evenement $evenement,
        $participations,
        GrillePrime $grille,
        BudgetSection $budget,
        int $validePar
    ): array {
        $details     = [];
        $totalVerse  = 0;
        $nbJoueurs   = 0;

        foreach ($participations as $participation) {
            $montant = $grille->calculerMontant($participation->is_titulaire);

            // Enregistre le montant figé sur la participation (RG-SPT-02)
            $participation->update([
                'prime_calculee' => $montant,
            ]);

            // Crée une transaction individuelle pour traçabilité
            Transaction::create([
                'budget_section_id'  => $budget->id,
                'evenement_id'       => $evenement->id,
                'contrat_id'         => $participation->contrat_id,
                'type'               => 'DEBIT',
                'categorie'          => $evenement->estEntrainement() ? 'PRIME_ENTRAINEMENT' : 'PRIME_MATCH',
                'montant'            => $montant,
                'libelle'            => $this->genererLibelle($evenement, $participation, $montant),
                'statut_validation'  => 'VALIDE_N2', // Auto-validé par le moteur
                'date_transaction'   => now(),
                'soumis_par'         => $validePar,
                'valide_n1_par'      => $validePar,
                'valide_n2_par'      => $validePar,
                'date_validation_n1' => now(),
                'date_validation_n2' => now(),
            ]);

            // Débite le budget
            $budget->debiter($montant);

            $details[] = [
                'personne'     => $participation->contrat->personne->nom_complet,
                'statut'       => $participation->is_titulaire ? 'Titulaire' : 'Remplaçant',
                'montant'      => $montant,
            ];

            $totalVerse += $montant;
            $nbJoueurs++;
        }

        // Notifie le Trésorier
        $this->notifierTresorier($evenement, $totalVerse, $nbJoueurs);

        return [
            'nb_joueurs'   => $nbJoueurs,
            'total_verse'  => $totalVerse,
            'grille_used'  => [
                'type_match'  => $grille->type_match,
                'resultat'    => $grille->resultat,
                'montant_base'=> $grille->montant_base,
            ],
            'joueurs'      => $details,
        ];
    }

    // -------------------------------------------------------
    // Helpers
    // -------------------------------------------------------

    private function genererLibelle(Evenement $evenement, Participation $participation, float $montant): string
    {
        $nom    = $participation->contrat->personne->nom_complet;
        $statut = $participation->is_titulaire ? 'Titulaire' : 'Remplaçant';

        if ($evenement->estEntrainement()) {
            return "Indemnité entraînement — {$nom} ({$statut}) — " . $evenement->date_heure->format('d/m/Y');
        }

        return "Prime match vs {$evenement->adversaire} — {$evenement->resultat} — {$nom} ({$statut}) — " . $evenement->date_heure->format('d/m/Y');
    }

    private function alerterBudgetInsuffisant(Evenement $evenement, BudgetSection $budget, float $totalNecessaire): void
    {
        // Notifie le Trésorier
        $tresoriers = User::where('role_systeme', 'TRESORIER')->get();
        $superAdmins = User::where('role_systeme', 'SUPER_ADMIN')->get();
        $destinataires = $tresoriers->merge($superAdmins);

        foreach ($destinataires as $user) {
            NotificationApp::create([
                'user_id'         => $user->id,
                'type'            => 'BUDGET_DEPASSE',
                'titre'           => 'Budget insuffisant — Primes bloquées',
                'message'         => "Le calcul des primes pour l'événement du {$evenement->date_heure->format('d/m/Y')} ({$evenement->section->nom}) a été bloqué. Budget restant : {$budget->montant_restant} FCFA. Nécessaire : {$totalNecessaire} FCFA.",
                'url_action'      => "/budgets/{$budget->id}",
                'notifiable_type' => BudgetSection::class,
                'notifiable_id'   => $budget->id,
            ]);
        }
    }

    private function notifierTresorier(Evenement $evenement, float $total, int $nbJoueurs): void
    {
        $tresoriers = User::where('role_systeme', 'TRESORIER')->get();

        foreach ($tresoriers as $tresorier) {
            NotificationApp::create([
                'user_id'         => $tresorier->id,
                'type'            => 'PRIME_VERSEE',
                'titre'           => 'Primes calculées et validées',
                'message'         => "{$nbJoueurs} prime(s) calculée(s) pour {$evenement->section->nom} — Total : " . number_format($total, 0, ',', '.') . " FCFA",
                'url_action'      => "/evenements/{$evenement->id}",
                'notifiable_type' => Evenement::class,
                'notifiable_id'   => $evenement->id,
            ]);
        }
    }
}
