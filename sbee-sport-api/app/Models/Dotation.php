<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Dotation extends Model
{
    protected $fillable = [
        'contrat_id', 'stock_section_id', 'quantite',
        'date_remise', 'date_retour_prevue', 'date_retour_effective',
        'statut', 'observations', 'remis_par',
    ];

    protected $casts = [
        'date_remise'           => 'date',
        'date_retour_prevue'    => 'date',
        'date_retour_effective' => 'date',
    ];

    public function contrat() { return $this->belongsTo(Contrat::class); }
    public function stockSection() { return $this->belongsTo(StockSection::class); }
    public function remisPar() { return $this->belongsTo(User::class, 'remis_par'); }
    public function mouvements() { return $this->hasMany(MouvementStock::class); }

    public function estEnRetard(): bool
    {
        return $this->statut === 'EN_COURS'
            && $this->date_retour_prevue
            && $this->date_retour_prevue->isPast();
    }
}
