<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Competition extends Model
{
    protected $fillable = ['saison_id', 'nom', 'type', 'niveau'];

    public function saison() { return $this->belongsTo(Saison::class); }
    public function evenements() { return $this->hasMany(Evenement::class); }
}
