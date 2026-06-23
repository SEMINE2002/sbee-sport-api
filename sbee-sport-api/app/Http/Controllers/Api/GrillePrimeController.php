<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GrillePrime;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class GrillePrimeController extends Controller
{
    /**
     * GET /api/grille-primes
     */
    public function index(Request $request): JsonResponse
    {
        $grilles = GrillePrime::with('discipline')
            ->when($request->input('discipline_id'), function ($q, $id) {
                return $q->where('discipline_id', $id);
            })
            ->orderBy('discipline_id')
            ->orderBy('type_match')
            ->get()
            ->groupBy('discipline_id');

        return response()->json(['grilles' => $grilles]);
    }

    /**
     * POST /api/grille-primes
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'discipline_id'       => 'required|exists:disciplines,id',
            'type_match'          => 'required|in:CHAMPIONNAT,COUPE,TOURNOI,AMICAL',
            'resultat'            => 'required|in:VICTOIRE,NUL,DEFAITE',
            'montant_base'        => 'required|numeric|min:0',
            'pourcent_remplacant' => 'nullable|numeric|min:0|max:1',
        ]);

        $grille = GrillePrime::updateOrCreate(
            [
                'discipline_id' => $request->input('discipline_id'),
                'type_match'    => $request->input('type_match'),
                'resultat'      => $request->input('resultat'),
            ],
            [
                'montant_base'        => $request->input('montant_base'),
                'pourcent_remplacant' => $request->input('pourcent_remplacant') ?? 0.5,
            ]
        );

        return response()->json([
            'message' => 'Grille de prime enregistrée avec succès.',
            'grille'  => $grille->load('discipline'),
        ], 201);
    }

    /**
     * PUT/PATCH /api/grille-primes/{grille_prime}
     * Correction du paramètre pour correspondre à la convention d'URL Laravel (snake_case)
     */
    public function update(Request $request, GrillePrime $grille_prime): JsonResponse
    {
        $request->validate([
            'montant_base'        => 'sometimes|numeric|min:0',
            'pourcent_remplacant' => 'sometimes|numeric|min:0|max:1',
        ]);

        $grille_prime->update($request->only([
            'montant_base', 'pourcent_remplacant'
        ]));

        return response()->json([
            'message' => 'Grille tarifaire mise à jour avec succès.',
            'grille'  => $grille_prime->fresh('discipline'),
        ]);
    }

    /**
     * DELETE /api/grille-primes/{grille_prime}
     */
    public function destroy(GrillePrime $grille_prime): JsonResponse
    {
        $grille_prime->delete();
        return response()->json(['message' => 'Grille tarifaire supprimée avec succès.']);
    }
}