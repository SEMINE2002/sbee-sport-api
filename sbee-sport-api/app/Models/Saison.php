<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Saison extends Model
{
    protected $fillable = ['nom', 'date_debut', 'date_fin', 'is_active'];

    protected $casts = [
        'date_debut' => 'date',
        'date_fin'   => 'date',
        'is_active'  => 'boolean',
    ];

    public function competitions() { return $this->hasMany(Competition::class); }
    public function contrats() { return $this->hasMany(Contrat::class); }
    public function evenements() { return $this->hasMany(Evenement::class); }
    public function budgets() { return $this->hasMany(BudgetSection::class); }

    public static function active(): ?self
    {
        return static::where('is_active', true)->first();
    }
}
