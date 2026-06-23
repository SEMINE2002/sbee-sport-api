<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class StaffingMatch extends Model
{
    protected $table = 'staffing_matchs';
    protected $fillable = ['evenement_id', 'contrat_id', 'role_match'];

    public function evenement() { return $this->belongsTo(Evenement::class); }
    public function contrat() { return $this->belongsTo(Contrat::class); }
}
