<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\Commentaire;
use App\Models\Like;
use App\Models\MediaPost;
use App\Models\Evenement;
use App\Models\Contrat;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class PublicController extends Controller
{
    // ══════════════════════════════════════════════════
    //  GET /api/public/posts
    // ══════════════════════════════════════════════════
    public function posts(Request $request): JsonResponse
    {
        $posts = Post::with(['medias', 'user'])
            ->valide()
            ->when($request->discipline, fn($q, $d) => $q->discipline($d))
            ->orderByDesc('is_epingle')
            ->orderByDesc('created_at')
            ->paginate($request->per_page ?? 10);

        return response()->json($posts);
    }

    // ══════════════════════════════════════════════════
    //  POST /api/public/posts
    //  Seul le super admin peut publier du contenu
    // ══════════════════════════════════════════════════
    public function storePost(Request $request): JsonResponse
    {
        $user = $request->user();

        // Vérification : L'utilisateur doit être connecté ET être un Super Admin
        // (colonne réelle en BDD : role_systeme — cf. User model / CheckRole)
        if (!$user || $user->role_systeme !== 'SUPER_ADMIN') {
            return response()->json([
                'message' => 'Action non autorisée. Seul le super administrateur peut publier des actualités.'
            ], 403);
        }

        $request->validate([
            'contenu'    => 'required|string|min:3|max:5000',
            'auteur'     => 'nullable|string|max:100',
            'discipline' => 'nullable|string|max:50',
            'medias'     => 'nullable|array|max:10',
            // Passage à 100Mo (102400 Ko) pour autoriser des vidéos d'une minute ou plus
            'medias.*'   => 'file|mimes:jpg,jpeg,png,gif,webp,mp4,mov,avi|max:102400', 
        ]);

        $post = Post::create([
            'contenu'    => $request->contenu,
            'auteur'     => $request->auteur ?: ($user->name ?? 'Administration'),
            'discipline' => $request->discipline ?: null,
            'ip_auteur'  => $request->ip(),
            'is_valide'  => true,
            'user_id'    => $user->id,
        ]);

        // Upload des médias
        if ($request->hasFile('medias')) {
            foreach ($request->file('medias') as $i => $file) {
                $chemin = $file->store('posts/' . $post->id, 'public');
                $type   = str_starts_with($file->getMimeType(), 'video') ? 'VIDEO' : 'IMAGE';

                MediaPost::create([
                    'post_id'      => $post->id,
                    'type'         => $type,
                    'chemin'       => $chemin,
                    'nom_original' => $file->getClientOriginalName(),
                    'mime_type'    => $file->getMimeType(),
                    'taille_bytes' => $file->getSize(),
                    'ordre'        => $i,
                ]);
            }
        }

        return response()->json([
            'message' => 'Publication créée avec succès.',
            'post'    => $post->load('medias'),
        ], 201);
    }

    // ══════════════════════════════════════════════════
    //  POST /api/public/posts/{post}  (avec _method=PUT)
    //  Modification d'une publication — Seul le super admin
    // ══════════════════════════════════════════════════
    public function updatePost(Request $request, Post $post): JsonResponse
    {
        $user = $request->user();

        if (!$user || $user->role_systeme !== 'SUPER_ADMIN') {
            return response()->json([
                'message' => 'Action non autorisée. Seul le super administrateur peut modifier des actualités.'
            ], 403);
        }

        $request->validate([
            'contenu'    => 'required|string|min:3|max:5000',
            'auteur'     => 'nullable|string|max:100',
            'discipline' => 'nullable|string|max:50',
            'medias'     => 'nullable|array|max:10',
            'medias.*'   => 'file|mimes:jpg,jpeg,png,gif,webp,mp4,mov,avi|max:102400',
        ]);

        $post->update([
            'contenu'    => $request->contenu,
            'auteur'     => $request->auteur ?: $post->auteur,
            'discipline' => $request->discipline ?: null,
        ]);

        // Ajout d'éventuels nouveaux médias
        if ($request->hasFile('medias')) {
            $ordreDepart = $post->medias()->max('ordre') ?? -1;

            foreach ($request->file('medias') as $i => $file) {
                $chemin = $file->store('posts/' . $post->id, 'public');
                $type   = str_starts_with($file->getMimeType(), 'video') ? 'VIDEO' : 'IMAGE';

                MediaPost::create([
                    'post_id'      => $post->id,
                    'type'         => $type,
                    'chemin'       => $chemin,
                    'nom_original' => $file->getClientOriginalName(),
                    'mime_type'    => $file->getMimeType(),
                    'taille_bytes' => $file->getSize(),
                    'ordre'        => $ordreDepart + 1 + $i,
                ]);
            }
        }

        return response()->json([
            'message' => 'Publication modifiée avec succès.',
            'post'    => $post->load('medias'),
        ]);
    }

    // ══════════════════════════════════════════════════
    //  DELETE /api/public/posts/{post}
    //  Suppression d'une publication — Seul le super admin
    // ══════════════════════════════════════════════════
    public function deletePost(Request $request, Post $post): JsonResponse
    {
        $user = $request->user();

        if (!$user || $user->role_systeme !== 'SUPER_ADMIN') {
            return response()->json([
                'message' => 'Action non autorisée. Seul le super administrateur peut supprimer des actualités.'
            ], 403);
        }

        // Supprime les fichiers médias associés du disque
        foreach ($post->medias as $media) {
            Storage::disk('public')->delete($media->chemin);
        }

        $post->delete();

        return response()->json([
            'message' => 'Publication supprimée avec succès.',
        ]);
    }

    // ══════════════════════════════════════════════════
    //  GET /api/public/posts/{post}/commentaires
    // ══════════════════════════════════════════════════
    public function commentaires(Post $post): JsonResponse
    {
        $commentaires = $post->commentaires()
            ->orderBy('created_at')
            ->paginate(20);

        return response()->json($commentaires);
    }

    // ══════════════════════════════════════════════════
    //  POST /api/public/posts/{post}/commentaires
    // ══════════════════════════════════════════════════
    public function storeCommentaire(Request $request, Post $post): JsonResponse
    {
        $request->validate([
            'contenu'    => 'required|string|min:1|max:1000',
            'pseudonyme' => 'nullable|string|max:100',
        ]);

        // Anti-spam : max 5 commentaires par IP par heure
        $nbRecents = Commentaire::where('ip_auteur', $request->ip())
            ->where('created_at', '>=', now()->subHour())
            ->count();

        if ($nbRecents >= 10) {
            return response()->json(['message' => 'Trop de commentaires. Réessayez plus tard.'], 429);
        }

        $commentaire = Commentaire::create([
            'post_id'    => $post->id,
            'contenu'    => $request->contenu,
            'pseudonyme' => $request->pseudonyme ?: 'Anonyme',
            'ip_auteur'  => $request->ip(),
            'is_valide'  => true,
            'user_id'    => $request->user()?->id,
        ]);

        return response()->json([
            'message'     => 'Commentaire ajouté.',
            'commentaire' => $commentaire,
        ], 201);
    }

    // ══════════════════════════════════════════════════
    //  POST /api/public/posts/{post}/like
    //  Toggle like (par IP)
    // ══════════════════════════════════════════════════
    public function toggleLike(Request $request, Post $post): JsonResponse
    {
        $ip     = $request->ip();
        $userId = $request->user()?->id;

        $existant = Like::where('post_id', $post->id)
            ->where('ip_auteur', $ip)
            ->first();

        if ($existant) {
            $existant->delete();
            $liked = false;
        } else {
            Like::create([
                'post_id'   => $post->id,
                'ip_auteur' => $ip,
                'user_id'   => $userId,
            ]);
            $liked = true;
        }

        return response()->json([
            'liked'    => $liked,
            'nb_likes' => $post->likes()->count(),
        ]);
    }

    // ══════════════════════════════════════════════════
    //  GET /api/public/stats
    //  Stats publiques du club
    // ══════════════════════════════════════════════════
    public function stats(): JsonResponse
    {
        return response()->json([
            // Un match terminé a un résultat différent de EN_ATTENTE
            'nb_matchs'     => Evenement::where('type', 'MATCH')->where('resultat', '!=', 'EN_ATTENTE')->count(),
            'nb_victoires'  => Evenement::where('type', 'MATCH')->where('resultat', 'VICTOIRE')->count(),
            'nb_membres'    => Contrat::where('statut', 'ACTIF')->count(),
            'nb_posts'      => Post::valide()->count(),
            'nb_disciplines'=> DB::table('disciplines')->count(),
        ]);
    }

    // ══════════════════════════════════════════════════
    //  GET /api/public/prochains-matchs
    // ══════════════════════════════════════════════════
    public function prochainsMatchs(): JsonResponse
    {
        $matchs = Evenement::with('section.discipline')
            ->where('type', 'MATCH')
            ->where('resultat', 'EN_ATTENTE') // Match non joué = en attente
            ->where('date_heure', '>=', now())
            ->orderBy('date_heure')
            ->limit(5)
            ->get()
            ->map(fn($e) => [
                'id'         => $e->id,
                'adversaire' => $e->adversaire,
                'date_heure' => $e->date_heure,
                'lieu'       => $e->lieu,
                'domicile'   => $e->domicile,
                'section'    => ['nom' => $e->section?->nom],
                'discipline' => $e->section?->discipline?->nom,
            ]);

        return response()->json($matchs);
    }

    // ══════════════════════════════════════════════════
    //  GET /api/public/resultats-recents
    // ══════════════════════════════════════════════════
    public function resultatsRecents(): JsonResponse
    {
        $resultats = Evenement::with('section.discipline')
            ->where('type', 'MATCH')
            ->whereIn('resultat', ['VICTOIRE', 'DEFAITE', 'NUL']) // Matchs joués
            ->orderByDesc('date_heure')
            ->limit(5)
            ->get()
            ->map(fn($e) => [
                'id'            => $e->id,
                'adversaire'    => $e->adversaire,
                'date_heure'    => $e->date_heure,
                'resultat'      => $e->resultat,
                'score_nous'    => $e->score_nous,
                'score_adverse' => $e->score_adversaire, // Corrigé ici pour correspondre à la BDD
                'domicile'      => $e->domicile,
                'section'       => ['nom' => $e->section?->nom],
                'discipline'    => $e->section?->discipline?->nom,
            ]);

        return response()->json($resultats);
    }
}