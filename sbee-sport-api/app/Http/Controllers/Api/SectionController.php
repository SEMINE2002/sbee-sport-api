<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Section;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SectionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Section::with('discipline')
            ->withCount([
                'contrats as nb_membres' => fn($q) =>
                    $q->where('statut', 'ACTIF'),
                'contrats as nb_contrats_actifs' => fn($q) =>
                    $q->where('statut', 'ACTIF'),
            ]);

        // Isolation des données par section
        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
            $query->where('id', $user->section_id);
        }

        $query->when($request->discipline_id, fn($q, $id) =>
            $q->where('discipline_id', $id)
        );

        $sections = $query->orderBy('discipline_id')->orderBy('nom')->get();

        return response()->json(['sections' => $sections]);
    }

    public function store(Request $request): JsonResponse
    {
        // Validation stricte incluant le code analytique et le genre
        $request->validate([
            'nom'              => 'required|string|max:150',
            'discipline_id'    => 'required|exists:disciplines,id',
            'code_analytique'  => 'nullable|string|max:50|unique:sections,code_analytique',
            'genre'            => ['required', Rule::in(['M', 'F', 'MIXTE'])],
            'description'      => 'nullable|string',
            'lieu'             => 'nullable|string|max:150',
            'responsable'      => 'nullable|string|max:150',
        ]);

        // Insertion sécurisée de tous les champs manipulés par le formulaire React
        $section = Section::create($request->only([
            'nom', 'discipline_id', 'code_analytique', 'genre', 'description', 'lieu', 'responsable'
        ]));

        return response()->json([
            'message' => 'Section créée avec succès.',
            'section' => $section->load('discipline'),
        ], 201);
    }

    public function show(Section $section, Request $request): JsonResponse
    {
        // Sécurité applicative : Empêcher l'accès direct par ID si l'utilisateur est restreint
        $user = $request->user();
        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER']) && $user->section_id !== $section->id) {
            return response()->json(['message' => 'Accès non autorisé à cette section.'], 403);
        }

        // 1. Chargement de la discipline et des statistiques d'effectifs
        $section->load('discipline');
        $section->loadCount([
            'contrats as nb_membres'         => fn($q) => $q->where('statut', 'ACTIF'),
            'contrats as nb_contrats_actifs' => fn($q) => $q->where('statut', 'ACTIF'),
        ]);

        // 2. Chargement des contrats actifs et des profils des personnes associées
        $section->load(['contrats' => function($q) {
            $q->where('statut', 'ACTIF');
        }, 'contrats.personne']);

        return response()->json(['section' => $section]);
    }

    public function update(Request $request, Section $section): JsonResponse
    {
        // Sécurité applicative pour la modification
        $user = $request->user();
        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER']) && $user->section_id !== $section->id) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $request->validate([
            'nom'              => 'sometimes|string|max:150',
            'code_analytique'  => [
                'nullable', 
                'string', 
                'max:50', 
                Rule::unique('sections', 'code_analytique')->ignore($section->id)
            ],
            'genre'            => ['sometimes', Rule::in(['M', 'F', 'MIXTE'])],
            'description'      => 'nullable|string',
            'lieu'             => 'nullable|string|max:150',
            'responsable'      => 'nullable|string|max:150',
        ]);

        // Mise à jour complète
        $section->update($request->only([
            'nom', 'code_analytique', 'genre', 'description', 'lieu', 'responsable'
        ]));

        return response()->json([
            'message' => 'Section mise à jour avec succès.',
            'section' => $section->fresh(['discipline']),
        ]);
    }

    public function destroy(Section $section, Request $request): JsonResponse
    {
        // Sécurité applicative pour la suppression
        $user = $request->user();
        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER']) && $user->section_id !== $section->id) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $nbActifs = $section->contrats()->where('statut', 'ACTIF')->count();

        if ($nbActifs > 0) {
            return response()->json([
                'message' => "Impossible de supprimer : {$nbActifs} membre(s) actif(s) dans cette section.",
            ], 422);
        }

        $section->delete();

        return response()->json(['message' => 'Section supprimée.']);
    }
}