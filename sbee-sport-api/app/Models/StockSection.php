<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class StockSection extends Model
{
    protected $table = 'stocks_sections';
    protected $fillable = [
        'section_id', 'type_materiel_id',
        'quantite_totale', 'quantite_disponible',
        'quantite_en_dotation', 'seuil_alerte',
    ];

    public function section() { return $this->belongsTo(Section::class); }
    public function typeMateriel() { return $this->belongsTo(TypeMateriel::class); }
    public function dotations() { return $this->hasMany(Dotation::class); }
    public function mouvements() { return $this->hasMany(MouvementStock::class); }

    public function estSousSeuil(): bool
    {
        return $this->quantite_disponible <= $this->seuil_alerte;
    }

    /**
     * Met à jour les quantités après une dotation ou un retour
     */
    public function recalculerQuantites(): void
    {
        $enDotation = $this->dotations()
            ->where('statut', 'EN_COURS')
            ->sum('quantite');

        $this->update([
            'quantite_en_dotation' => $enDotation,
            'quantite_disponible'  => $this->quantite_totale - $enDotation,
        ]);
    }
}
