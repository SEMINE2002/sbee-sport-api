<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class PerformanceJoueur extends Model
{
    protected $table = 'performances_joueurs';
    protected $fillable = ['participation_id', 'metrique', 'valeur'];

    public function participation() { return $this->belongsTo(Participation::class); }
}
