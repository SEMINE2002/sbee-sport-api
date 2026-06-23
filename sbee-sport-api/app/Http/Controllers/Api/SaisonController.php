<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Saison;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class SaisonController extends Controller
{
    public function index(): JsonResponse
    {
        $saisons = Saison::orderByDesc('date_debut')->get();
        return response()->json(['saisons' => $saisons]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'nom'        => 'required|string|max:100',
            'date_debut' => 'required|date',
            'date_fin'   => 'required|date|after:date_debut',
        ]);

        $saison = Saison::create([
            ...$request->only(['nom', 'date_debut', 'date_fin']),
            'is_active' => false,
        ]);

        return response()->json(['message' => 'Saison créée.', 'saison' => $saison], 201);
    }

    public function show(Saison $saison): JsonResponse
    {
        return response()->json(['saison' => $saison->load(['competitions'])]);
    }

    public function update(Request $request, Saison $saison): JsonResponse
    {
        $request->validate([
            'nom'      => 'sometimes|string|max:100',
            'date_fin' => 'sometimes|date|after:date_debut',
        ]);

        $saison->update($request->only(['nom', 'date_fin']));
        return response()->json(['message' => 'Saison mise à jour.', 'saison' => $saison]);
    }

    public function destroy(Saison $saison): JsonResponse
    {
        if ($saison->is_active) {
            return response()->json(['message' => 'Impossible de supprimer la saison active.'], 422);
        }
        $saison->delete();
        return response()->json(['message' => 'Saison supprimée.']);
    }

    /**
     * PATCH /api/saisons/{saison}/activer
     * Une seule saison active à la fois
     */
    public function activer(Saison $saison): JsonResponse
    {
        DB::transaction(function () use ($saison) {
            Saison::where('is_active', true)->update(['is_active' => false]);
            $saison->update(['is_active' => true]);
        });

        return response()->json([
            'message' => "Saison '{$saison->nom}' activée.",
            'saison'  => $saison,
        ]);
    }

    /**
     * GET /api/saisons/active
     * Récupère directement la unique saison active actuelle (Requis pour l'interface du Coach)
     */
    public function current(): JsonResponse
    {
        $saison = Saison::active();

        if (!$saison) {
            return response()->json(['message' => 'Aucune saison active actuellement.'], 404);
        }

        // Retourne la saison directement ou encapsulée suivant les préférences de ton React
        return response()->json($saison);
    }
}