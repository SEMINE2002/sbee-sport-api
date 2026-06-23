<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Participation extends Model
{
    protected $fillable = [
        'evenement_id', 'contrat_id', 'is_present',
        'is_titulaire', 'minutes_jouees', 'prime_calculee', 'prime_versee',
    ];

    protected $casts = [
        'is_present'     => 'boolean',
        'is_titulaire'   => 'boolean',
        'prime_calculee' => 'decimal:2',
        'prime_versee'   => 'boolean',
    ];

    public function evenement() { return $this->belongsTo(Evenement::class); }
    public function contrat() { return $this->belongsTo(Contrat::class); }
    public function performances() { return $this->hasMany(PerformanceJoueur::class); }
    public function sanctions() { return $this->hasMany(Sanction::class); }
}
