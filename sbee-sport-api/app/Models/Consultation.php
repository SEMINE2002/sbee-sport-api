<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Consultation extends Model
{
    protected $fillable = [
        'personne_id', 'medecin_contrat_id', 'date_consultation',
        'diagnostic', 'type_blessure', 'jours_indisponibilite',
        'statut_aptitude', 'notes_confidentielles', 'date_reprise_prevue',
    ];

    protected $casts = [
        'date_consultation'  => 'datetime',
        'date_reprise_prevue'=> 'date',
    ];

    public function personne() { return $this->belongsTo(Personne::class); }
    public function medecin() { return $this->belongsTo(Contrat::class, 'medecin_contrat_id'); }

    public function estApte(): bool { return $this->statut_aptitude === 'APTE'; }
}
