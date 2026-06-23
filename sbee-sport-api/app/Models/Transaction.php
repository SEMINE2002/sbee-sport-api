<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    protected $fillable = [
        'budget_section_id', 'evenement_id', 'contrat_id',
        'type', 'categorie', 'montant', 'libelle',
        'justificatif_url', 'statut_validation', 'date_transaction',
        'soumis_par', 'valide_n1_par', 'valide_n2_par',
        'date_validation_n1', 'date_validation_n2', 'motif_rejet',
    ];

    protected $casts = [
        'montant'           => 'decimal:2',
        'date_transaction'  => 'datetime',
        'date_validation_n1'=> 'datetime',
        'date_validation_n2'=> 'datetime',
    ];

    public function budgetSection() { return $this->belongsTo(BudgetSection::class); }
    public function evenement() { return $this->belongsTo(Evenement::class); }
    public function contrat() { return $this->belongsTo(Contrat::class); }
    public function soumisParUser() { return $this->belongsTo(User::class, 'soumis_par'); }
    public function valideN1Par() { return $this->belongsTo(User::class, 'valide_n1_par'); }
    public function valideN2Par() { return $this->belongsTo(User::class, 'valide_n2_par'); }
    public function mouvementsStocks() { return $this->hasMany(MouvementStock::class); }

    public function estValide(): bool { return $this->statut_validation === 'VALIDE_N2'; }
    public function estEnAttente(): bool { return $this->statut_validation === 'EN_ATTENTE'; }
    public function estRejete(): bool { return $this->statut_validation === 'REJETE'; }
}
