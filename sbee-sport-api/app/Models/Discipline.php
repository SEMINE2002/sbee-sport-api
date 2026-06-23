<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Discipline extends Model
{
    protected $fillable = ['nom', 'code', 'type', 'icone_url', 'instance_mondiale', 'nb_joueurs_terrain', 'duree_match_minutes'];

    public function sections(): HasMany 
    { 
        return $this->hasMany(Section::class); 
    }

    // Corrigé de 'grillesPrimes' à 'grillePrimes'
    public function grillePrimes(): HasMany 
    { 
        return $this->hasMany(GrillePrime::class); 
    }
}