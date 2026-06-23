<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Evenement extends Model
{
    protected $fillable = [
        'saison_id', 
        'section_id', 
        'competition_id', // Corrigé de 'competitions_id' à 'competition_id'
        'type',
        'date_heure', 
        'lieu', 
        'domicile',
        'adversaire',
        'score_nous', 
        'score_adversaire', 
        'resultat',
        'is_verrouille', 
        'valide_par', 
        'date_validation', 
        'observations',
        'titre', // Ajouté si vous gérez des thèmes d'entraînements
    ];

    protected $casts = [
        'date_heure'      => 'datetime',
        'date_validation' => 'datetime',
        'is_verrouille'   => 'boolean',
    ];

    public function saison(): BelongsTo 
    { 
        return $this->belongsTo(Saison::class); 
    }

    public function section(): BelongsTo 
    { 
        return $this->belongsTo(Section::class); 
    }

    /**
     * Relation vers la compétition (Corrigé au singulier pour l'Eager Loading)
     */
    public function competition(): BelongsTo 
    { 
        // Si votre classe s'appelle toujours 'Competitions' avec un S, conservez Competitions::class mais utilisez la clé 'competition_id'
        return $this->belongsTo(Competition::class, 'competition_id'); 
    }

    public function validePar(): BelongsTo 
    { 
        return $this->belongsTo(User::class, 'valide_par'); 
    }

    public function participations(): HasMany 
    { 
        return $this->hasMany(Participation::class); 
    }

    public function staffingMatchs(): HasMany 
    { 
        return $this->hasMany(StaffingMatch::class); 
    }

    public function transactions(): HasMany 
    { 
        return $this->hasMany(Transaction::class); 
    }

    // --- Helpers / Encapsulation ---
    public function estVerrouille(): bool { return $this->is_verrouille; }
    public function estMatch(): bool { return $this->type === 'MATCH'; }
    public function estEntrainement(): bool { return $this->type === 'ENTRAINEMENT'; }
}