<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Personne;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * GET /api/users
     * Liste tous les comptes (Super Admin uniquement)
     */
    public function index(Request $request): JsonResponse
    {
        $users = User::with(['personne', 'section.discipline'])
            ->when($request->role, fn($q, $role) => $q->where('role_systeme', $role))
            ->when($request->section_id, fn($q, $id) => $q->where('section_id', $id))
            ->when($request->search, function ($q, $search) {
                $q->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->orderBy('role_systeme')
            ->orderBy('name')
            ->paginate(20);

        return response()->json($users);
    }

    /**
     * POST /api/users
     * Créer un nouveau compte utilisateur
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name'         => 'required|string|max:150',
            'email'        => 'required|email|unique:users,email',
            'role_systeme' => ['required', Rule::in([
                'SUPER_ADMIN', 'TRESORIER', 'RESPONSABLE_SECTION',
                'COACH', 'MEDECIN', 'JOUEUR', 'SPONSOR'
            ])],
            'section_id'   => [
                Rule::requiredIf(fn() => in_array($request->role_systeme, [
                    'RESPONSABLE_SECTION', 'COACH', 'MEDECIN', 'JOUEUR'
                ])),
                'nullable',
                'exists:sections,id',
            ],
            'personne_id'  => 'nullable|exists:personnes,id',
            'password'     => 'nullable|string|min:8',
        ]);

        // Génère un mot de passe si non fourni
        $plainPassword = $request->password ?? Str::random(12);

        $user = User::create([
            'name'         => $request->name,
            'email'        => $request->email,
            'password'     => Hash::make($plainPassword),
            'role_systeme' => $request->role_systeme,
            'section_id'   => $request->section_id,
            'personne_id'  => $request->personne_id,
            'is_actif'     => true,
        ]);

        // Assigne le rôle Spatie également
        $user->assignRole(strtolower(str_replace('_', '-', $request->role_systeme)));

        return response()->json([
            'message'        => 'Compte créé avec succès.',
            'user'           => $user->load(['personne', 'section']),
            'temp_password'  => $request->password ? null : $plainPassword,
        ], 201);
    }

    /**
     * GET /api/users/{user}
     */
    public function show(User $user): JsonResponse
    {
        return response()->json([
            'user' => $user->load(['personne', 'section.discipline']),
        ]);
    }

    /**
     * PUT /api/users/{user}
     * Modifier un compte
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $request->validate([
            'name'         => 'sometimes|string|max:150',
            'email'        => ['sometimes', 'email', Rule::unique('users')->ignore($user->id)],
            'role_systeme' => ['sometimes', Rule::in([
                'SUPER_ADMIN', 'TRESORIER', 'RESPONSABLE_SECTION',
                'COACH', 'MEDECIN', 'JOUEUR', 'SPONSOR'
            ])],
            'section_id'   => 'nullable|exists:sections,id',
            'personne_id'  => 'nullable|exists:personnes,id',
        ]);

        $user->update($request->only([
            'name', 'email', 'role_systeme', 'section_id', 'personne_id'
        ]));

        // Met à jour le rôle Spatie si changé
        if ($request->has('role_systeme')) {
            $user->syncRoles([strtolower(str_replace('_', '-', $request->role_systeme))]);
        }

        return response()->json([
            'message' => 'Compte mis à jour.',
            'user'    => $user->fresh(['personne', 'section']),
        ]);
    }

    /**
     * DELETE /api/users/{user}
     * Désactive le compte (jamais supprimé pour l'audit)
     */
    public function destroy(User $user): JsonResponse
    {
        // On ne supprime jamais un compte, on le désactive
        $user->update(['is_actif' => false]);
        $user->tokens()->delete(); // Révoque tous les tokens

        return response()->json([
            'message' => 'Compte désactivé. L\'historique est conservé.',
        ]);
    }

    /**
     * PATCH /api/users/{user}/toggle-actif
     * Activer/désactiver un compte
     */
    public function toggleActif(User $user): JsonResponse
    {
        // Empêche de désactiver le seul Super Admin
        if ($user->role_systeme === 'SUPER_ADMIN') {
            $superAdminCount = User::where('role_systeme', 'SUPER_ADMIN')
                                   ->where('is_actif', true)->count();
            if ($superAdminCount <= 1 && $user->is_actif) {
                return response()->json([
                    'message' => 'Impossible de désactiver le seul Super Admin.',
                ], 422);
            }
        }

        $user->update(['is_actif' => !$user->is_actif]);

        // Si désactivé, révoque tous les tokens
        if (!$user->is_actif) {
            $user->tokens()->delete();
        }

        return response()->json([
            'message'  => $user->is_actif ? 'Compte activé.' : 'Compte désactivé.',
            'is_actif' => $user->is_actif,
        ]);
    }

    /**
     * GET /api/users/{user}/profile
     * Récupère les données complètes pour la page profil
     */
    public function showProfile($id): JsonResponse
{
    $user = User::with(['personne', 'section.discipline'])->findOrFail($id);

    // 1. Calcul des statistiques (Matchs, Buts, Présence)
    // On récupère les participations avec les performances et l'événement associé
    $participations = $user->participations()->with(['evenement', 'performances'])->get();
    
    $matchsCount = $participations->where('evenement.type', 'MATCH')->count();
    $butsCount = $participations->flatMap->performances
        ->where('metrique', 'buts')
        ->sum('valeur');
    
    // Calcul taux de présence (Ex: (Matchs joués / Matchs totaux) * 100)
    $tauxPresence = $matchsCount > 0 ? ($matchsCount / 10) * 100 : 0; // Remplacez 10 par le total réel de matchs

    // 2. Calcul financier (Somme des transactions liées aux participations)
    // En supposant que Transaction est liée à Evenement ou Participation
    $totalRevenus = Transaction::whereIn('participation_id', $participations->pluck('id'))
        ->sum('montant');

    return response()->json([
        'id' => $user->id,
        'nom' => $user->name,
        'poste' => $user->role_systeme,
        'matricule' => $user->personne?->matricule ?? 'N/A',
        'statut' => $user->is_actif ? 'VALIDÉ' : 'EN ATTENTE',
        'stats' => [
            'matchs' => $matchsCount,
            'buts' => (int)$butsCount,
            'presence' => round($tauxPresence, 1)
        ],
        'finance' => [
            'montant' => number_format($totalRevenus, 0, ',', '.') . ' FCFA'
        ],
        'documents' => [
            ['nom' => 'Dossier Sportif', 'etat' => 'VALIDÉ'],
            ['nom' => 'Fiche Médicale', 'etat' => $user->is_actif ? 'VALIDÉ' : 'EN ATTENTE']
        ]
    ]);
}

    /**
     * PATCH /api/users/{user}/reset-password-admin
     * Reset du mot de passe par l'admin (génère un nouveau mot de passe)
     */
    public function resetPasswordAdmin(User $user): JsonResponse
    {
        $newPassword = Str::random(12);

        $user->update([
            'password' => Hash::make($newPassword),
        ]);

        $user->tokens()->delete();

        return response()->json([
            'message'       => 'Mot de passe réinitialisé.',
            'new_password'  => $newPassword,
            'note'          => 'Communiquez ce mot de passe à l\'utilisateur et demandez-lui de le changer.',
        ]);
    }
}
