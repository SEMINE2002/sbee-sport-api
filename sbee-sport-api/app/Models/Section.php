<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Section extends Model
{
    protected $fillable = ['discipline_id', 'nom', 'code_analytique', 'genre', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    public function discipline() { return $this->belongsTo(Discipline::class); }
    public function contrats() { return $this->hasMany(Contrat::class); }
    public function evenements() { return $this->hasMany(Evenement::class); }
    public function budgets() { return $this->hasMany(BudgetSection::class); }
    public function stocks() { return $this->hasMany(StockSection::class); }
    public function users() { return $this->hasMany(User::class); }

    /** Budget actif pour la saison en cours */
    public function budgetActif()
    {
        return $this->hasOne(BudgetSection::class)
                    ->whereHas('saison', fn($q) => $q->where('is_active', true));
    }
}
