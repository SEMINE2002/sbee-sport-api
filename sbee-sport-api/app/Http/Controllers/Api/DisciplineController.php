<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Discipline;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DisciplineController extends Controller
{
    public function index(): JsonResponse
    {
        // On récupère les disciplines avec le vrai décompte cumulé des membres actifs
        $disciplines = Discipline::withCount([
            'sections',
            // CORRECTION : Utilisation d'une sous-requête pour sommer les contrats actifs de toutes les sections
            'sections as nb_membres' => fn($q) =>
                $q->join('contrats', 'sections.id', '=', 'contrats.section_id')
                  ->where('contrats.statut', 'ACTIF')
        ])->orderBy('nom')->get();

        return response()->json(['disciplines' => $disciplines]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'nom'                 => 'required|string|max:100|unique:disciplines,nom',
            'code'                => 'nullable|string|max:10|unique:disciplines,code',
            'description'         => 'nullable|string',
            'instance_mondiale'   => 'nullable|string|max:255',
            'nb_joueurs_terrain'   => 'nullable|integer',
            'duree_match_minutes' => 'nullable|integer',
            'icone_file'          => 'nullable|file|mimes:jpeg,png,jpg,svg|max:2048',
        ]);

        $data = $request->only([
            'nom', 'code', 'description', 'instance_mondiale', 'nb_joueurs_terrain', 'duree_match_minutes'
        ]);

        // Gestion de l'upload de fichier s'il existe
        if ($request->hasFile('icone_file')) {
            $path = $request->file('icone_file')->store('disciplines-icones', 'public');
            $data['icone_url'] = $path;
        }

        $discipline = Discipline::create($data);

        return response()->json([
            'message'    => 'Discipline créée.',
            'discipline' => $discipline,
        ], 201);
    }

    public function show(Discipline $discipline): JsonResponse
    {
        // Charge les sections et calcule correctement les effectifs actifs de chaque section
        $discipline->load(['sections' => fn($q) =>
            $q->withCount(['contrats as nb_membres' => fn($subQ) => $subQ->where('statut', 'ACTIF')])
        ]);

        return response()->json(['discipline' => $discipline]);
    }

    public function update(Request $request, Discipline $discipline): JsonResponse
    {
        $request->validate([
            'nom'                 => 'sometimes|string|max:100|unique:disciplines,nom,' . $discipline->id,
            'code'                => 'nullable|string|max:10|unique:disciplines,code,' . $discipline->id,
            'description'         => 'nullable|string',
            'instance_mondiale'   => 'nullable|string|max:255',
            'nb_joueurs_terrain'   => 'nullable|integer',
            'duree_match_minutes' => 'nullable|integer',
            'icone_file'          => 'nullable|file|mimes:jpeg,png,jpg,svg|max:2048',
        ]);

        $data = $request->only([
            'nom', 'code', 'description', 'instance_mondiale', 'nb_joueurs_terrain', 'duree_match_minutes'
        ]);

        // Gestion de l'upload de fichier lors de la mise à jour
        if ($request->hasFile('icone_file')) {
            // Optionnel : Supprimer l'ancienne icône si elle existe
            if ($discipline->icone_url) {
                Storage::disk('public')->delete($discipline->icone_url);
            }
            
            $path = $request->file('icone_file')->store('disciplines-icones', 'public');
            $data['icone_url'] = $path;
        }

        $discipline->update($data);

        return response()->json([
            'message'    => 'Discipline mise à jour.',
            'discipline' => $discipline->fresh(),
        ]);
    }

    public function destroy(Discipline $discipline): JsonResponse
    {
        // CORRECTION DU COMPTAGE POUR LA SÉCURITÉ DE SUPPRESSION
        // On compte le total réel de contrats actifs à travers toutes les sections de la discipline
        $nbMembres = \App\Models\Contrat::whereHas('section', fn($q) => 
            $q->where('discipline_id', $discipline->id)
        )->where('statut', 'ACTIF')->count();

        if ($nbMembres > 0) {
            return response()->json([
                'message' => "Impossible de supprimer : {$nbMembres} membre(s) actif(s) sont rattaché(s) aux sections de cette discipline.",
            ], 422);
        }

        // Supprimer l'icône physique si elle existe lors de la suppression
        if ($discipline->icone_url) {
            Storage::disk('public')->delete($discipline->icone_url);
        }

        // Optionnel : Supprimer les sections vides associées avant de supprimer la discipline
        $discipline->sections()->delete();

        $discipline->delete();

        return response()->json(['message' => 'Discipline supprimée.']);
    }
}