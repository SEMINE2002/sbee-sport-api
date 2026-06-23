<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class BudgetSection extends Model
{
    protected $table = 'budgets_sections';
    protected $fillable = [
        'saison_id', 'section_id',
        'montant_alloue', 'montant_restant', 'montant_depense',
    ];

    protected $casts = [
        'montant_alloue'  => 'decimal:2',
        'montant_restant' => 'decimal:2',
        'montant_depense' => 'decimal:2',
    ];

    public function saison() { return $this->belongsTo(Saison::class); }
    public function section() { return $this->belongsTo(Section::class); }
    public function transactions() { return $this->hasMany(Transaction::class); }

    public function pourcentageConsomme(): float
    {
        if ($this->montant_alloue <= 0) return 0;
        return round(($this->montant_depense / $this->montant_alloue) * 100, 1);
    }

    public function aAssezPour(float $montant): bool
    {
        return $this->montant_restant >= $montant;
    }

    /**
     * Débite le budget après validation d'une transaction
     */
    public function debiter(float $montant): void
    {
        $this->decrement('montant_restant', $montant);
        $this->increment('montant_depense', $montant);
    }
}
