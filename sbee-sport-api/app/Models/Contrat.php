<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Contrat extends Model
{
    protected $fillable = [
        'personne_id', 'section_id', 'saison_id', 'type_role',
        'poste_cle', 'numero_maillot', 'numero_licence',
        'salaire_fixe', 'prime_signature', 'mode_paiement',
        'assurance_ref', 'statut', 'certificat_medical_valide',
        'documents_valides', 'date_debut_contrat', 'date_fin_contrat',
        'renouvelable', 'note_renouvellement'
    ];

    protected $casts = [
        'date_debut_contrat'        => 'date',
        'date_fin_contrat'          => 'date',
        'salaire_fixe'              => 'decimal:2',
        'prime_signature'           => 'decimal:2',
        'certificat_medical_valide' => 'boolean',
        'documents_valides'         => 'boolean',
        'renouvelable'              => 'boolean',
    ];

    public function personne() { return $this->belongsTo(Personne::class); }
    public function section() { return $this->belongsTo(Section::class); }
    public function saison() { return $this->belongsTo(Saison::class); }
    public function participations() { return $this->hasMany(Participation::class); }
    public function staffingMatchs() { return $this->hasMany(StaffingMatch::class); }
    public function dotations() { return $this->hasMany(Dotation::class); }
    public function transactions() { return $this->hasMany(Transaction::class); }

    public function estActif(): bool { return $this->statut === 'ACTIF'; }
    
    public function estEligiblePrime(): bool
    {
        return $this->statut === 'ACTIF' && $this->documents_valides;
    }

    /** Expire bientôt (dans 30 jours) */
    public function expireBientot(): bool
    {
        return $this->date_fin_contrat->diffInDays(now()) <= 30
            && $this->date_fin_contrat->isFuture();
    }
}