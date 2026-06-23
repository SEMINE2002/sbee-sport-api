<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * POST /api/auth/login
     * Connexion et retour du token Sanctum
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string|min:6',
        ]);

        // RG-SEC-01 : Blocage après 5 tentatives échouées
        $key = 'login.' . $request->ip() . '.' . $request->email;

        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);

            return response()->json([
                'message' => "Trop de tentatives. Réessayez dans {$seconds} secondes.",
                'retry_after' => $seconds,
            ], 429);
        }

        // Vérification des credentials
        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            RateLimiter::hit($key, 300); // 5 minutes de blocage

            return response()->json([
                'message' => 'Email ou mot de passe incorrect.',
            ], 401);
        }

        // RG-SEC-02 : Vérification compte actif
        if (!$user->estActif()) {
            return response()->json([
                'message' => 'Votre compte a été désactivé. Contactez l\'administrateur.',
            ], 403);
        }

        // Succès : on réinitialise le rate limiter
        RateLimiter::clear($key);

        // Mise à jour dernier login
        $user->update(['dernier_login' => now()]);

        // Supprime les anciens tokens (1 session à la fois)
        $user->tokens()->delete();

        // Création du token Sanctum avec les abilities selon le rôle
        $abilities = $this->getAbilitiesForRole($user->role_systeme);
        $token = $user->createToken('auth_token', $abilities, now()->addHours(24));

        return response()->json([
            'message'      => 'Connexion réussie.',
            'access_token' => $token->plainTextToken,
            'token_type'   => 'Bearer',
            'expires_at'   => $token->accessToken->expires_at,
            'user'         => $this->formatUser($user),
        ]);
    }

    /**
     * POST /api/auth/logout
     * Révocation du token actuel
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Déconnexion réussie.',
        ]);
    }

    /**
     * GET /api/auth/me
     * Retourne le profil de l'utilisateur connecté
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load(['personne', 'section.discipline']);

        return response()->json([
            'user' => $this->formatUser($user),
        ]);
    }

    /**
     * POST /api/auth/refresh
     * Rafraîchit le token (prolonge la session)
     */
    public function refresh(Request $request): JsonResponse
    {
        $user = $request->user();

        // Supprime le token actuel
        $user->currentAccessToken()->delete();

        // Crée un nouveau token
        $abilities = $this->getAbilitiesForRole($user->role_systeme);
        $token = $user->createToken('auth_token', $abilities, now()->addHours(24));

        return response()->json([
            'access_token' => $token->plainTextToken,
            'token_type'   => 'Bearer',
            'expires_at'   => $token->accessToken->expires_at,
        ]);
    }

    /**
     * POST /api/auth/forgot-password
     * Envoi du lien de reset par email
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email|exists:users,email',
        ]);

        $status = Password::sendResetLink($request->only('email'));

        if ($status === Password::RESET_LINK_SENT) {
            return response()->json([
                'message' => 'Un lien de réinitialisation a été envoyé à votre email.',
            ]);
        }

        return response()->json([
            'message' => 'Impossible d\'envoyer le lien. Vérifiez votre email.',
        ], 400);
    }

    /**
     * POST /api/auth/reset-password
     * Réinitialisation du mot de passe via le token reçu par email
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token'                 => 'required|string',
            'email'                 => 'required|email',
            'password'              => 'required|string|min:8|confirmed',
            'password_confirmation' => 'required',
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password'       => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                // Révoque tous les tokens existants
                $user->tokens()->delete();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json([
                'message' => 'Mot de passe réinitialisé avec succès.',
            ]);
        }

        return response()->json([
            'message' => 'Lien de réinitialisation invalide ou expiré.',
        ], 400);
    }

    /**
     * POST /api/auth/change-password
     * Changement de mot de passe par l'utilisateur connecté
     */
    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => 'required|string',
            'password'         => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'Le mot de passe actuel est incorrect.',
            ], 422);
        }

        $user->update([
            'password' => Hash::make($request->password),
        ]);

        // Révoque tous les autres tokens
        $user->tokens()->where('id', '!=', $request->user()->currentAccessToken()->id)->delete();

        return response()->json([
            'message' => 'Mot de passe modifié avec succès.',
        ]);
    }

    // -------------------------------------------------------
    // Helpers privés
    // -------------------------------------------------------

    /**
     * Formate les données utilisateur pour la réponse API
     */
    private function formatUser(User $user): array
    {
        return [
            'id'           => $user->id,
            'name'         => $user->name,
            'email'        => $user->email,
            'role_systeme' => $user->role_systeme,
            'is_actif'     => $user->is_actif,
            'dernier_login' => $user->dernier_login,
            'section'      => $user->section ? [
                'id'              => $user->section->id,
                'nom'             => $user->section->nom,
                'code_analytique' => $user->section->code_analytique,
                'discipline'      => $user->section->discipline ? [
                    'id'   => $user->section->discipline->id,
                    'nom'  => $user->section->discipline->nom,
                    'code' => $user->section->discipline->code,
                ] : null,
            ] : null,
            'personne'     => $user->personne ? [
                'id'      => $user->personne->id,
                'nom'     => $user->personne->nom,
                'prenoms' => $user->personne->prenoms,
                'photo'   => $user->personne->photo_url,
            ] : null,
            'permissions'  => $this->getAbilitiesForRole($user->role_systeme),
        ];
    }

    /**
     * Retourne les abilities Sanctum selon le rôle
     * Ces abilities sont vérifiées dans les middlewares
     */
    private function getAbilitiesForRole(string $role): array
    {
        return match ($role) {
            'SUPER_ADMIN' => ['*'], // Accès total

            'TRESORIER' => [
                'read:*',
                'validate:transactions',
                'validate:budgets',
                'export:reports',
                'manage:grilles-primes',
            ],

            'RESPONSABLE_SECTION' => [
                'read:section',
                'manage:players',
                'manage:contrats',
                'manage:evenements',
                'manage:inventaire',
                'submit:expenses',
                'validate:transactions:n1',
                'export:reports:section',
            ],

            'COACH' => [
                'read:section',
                'validate:matches',
                'manage:participations',
                'manage:staffing',
            ],

            'MEDECIN' => [
                'read:section',
                'manage:consultations',
                'read:medical',
            ],

            'JOUEUR' => [
                'read:self',
            ],

            'SPONSOR' => [
                'read:dashboard',
                'read:reports:aggregated',
            ],

            default => ['read:self'],
        };
    }
}
