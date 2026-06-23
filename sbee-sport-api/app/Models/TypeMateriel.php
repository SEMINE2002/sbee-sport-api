<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class TypeMateriel extends Model
{
    protected $table = 'types_materiels';
    protected $fillable = ['libelle', 'categorie', 'recuperable', 'unite', 'description'];
    protected $casts = ['recuperable' => 'boolean'];

    public function stocks() { return $this->hasMany(StockSection::class); }
}
