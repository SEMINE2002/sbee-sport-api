<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class GrillePrime extends Model
{
    protected $table = 'grilles_primes';

    protected $fillable = [
        'discipline_id', 'type_match', 'resultat',
        'montant_base', 'pourcent_remplacant', 'montant_entrainement',
    ];

    protected $casts = [
        'montant_base'         => 'decimal:2',
        'pourcent_remplacant'  => 'decimal:2',
        'montant_entrainement' => 'decimal:2',
    ];

    public function discipline() { return $this->belongsTo(Discipline::class); }

    /**
     * Calcule le montant pour un joueur selon qu'il est titulaire ou remplaçant
     */
    public function calculerMontant(bool $isTitulaire): float
    {
        if ($isTitulaire) {
            return (float) $this->montant_base;
        }
        return (float) $this->montant_base * (float) $this->pourcent_remplacant;
    }
}
