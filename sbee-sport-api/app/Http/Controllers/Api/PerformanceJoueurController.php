<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PerformanceJoueur;
use App\Models\Participation;
use Illuminate\Http\Request;

class PerformanceJoueurController extends Controller
{
    public function store(Request $request, $participationId)
    {
        // 1. Récupération des valeurs envoyées par Axios
        $metrique = $request->input('metrique');
        $valeurRaw = $request->input('valeur');

        // Sécurité : Si la métrique est vide ou non numérique, on ignore pour éviter un crash
        if (empty($metrique) || !is_numeric($valeurRaw)) {
            return response()->json([
                'status' => 'ignored',
                'message' => 'Ligne ignorée'
            ], 200);
        }

        $valeur = (int)$valeurRaw;

        // 2. Vérification de la participation
        $participationExists = Participation::where('id', $participationId)->exists();
        if (!$participationExists) {
            return response()->json([
                'status' => 'error',
                'message' => 'Fiche de match introuvable.'
            ], 404);
        }

        // 3. Si la valeur est 0, on nettoie la ligne pour alléger la base de données
        if ($valeur <= 0) {
            PerformanceJoueur::where('participation_id', $participationId)
                ->where('metrique', $metrique)
                ->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Statistique nettoyée.'
            ], 200);
        }

        // 4. Enregistrement ou mise à jour (CORRIGÉ : 'valeur' sans S pour correspondre à ta table MySQL)
        $performance = PerformanceJoueur::updateOrCreate(
            [
                'participation_id' => $participationId,
                'metrique'         => $metrique,
            ],
            [
                'valeur'           => $valeur, // <-- Correction ici !
            ]
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Performance enregistrée avec succès !',
            'data' => $performance
        ], 200);
    }
}