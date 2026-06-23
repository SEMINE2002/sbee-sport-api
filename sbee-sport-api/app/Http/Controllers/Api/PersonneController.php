<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contrat;
use App\Models\Document;
use App\Models\Personne;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class PersonneController extends Controller
{
    // ──────────────────────────────────────────────────────────
    //  GET /api/personnes
    // ──────────────────────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Personne::with([
            'contrats' => fn($q) => $q->with(['section.discipline', 'saison'])
                                    ->where('statut', '!=', 'ARCHIVE'),
            'documents',
            'user',
        ]);

        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
            $query->whereHas('contrats', fn($q) =>
                $q->where('section_id', $user->section_id)->where('statut', '!=', 'ARCHIVE')
            );
        }

        $query
            ->when($request->search, fn($q, $s) =>
                $q->where(fn($q) => $q
                    ->where('nom',       'like', "%{$s}%")
                    ->orWhere('prenoms', 'like', "%{$s}%")
                    ->orWhere('cni_numero', 'like', "%{$s}%")
                    ->orWhere('telephone',  'like', "%{$s}%")
                )
            )
            ->when($request->section_id, fn($q, $id) =>
                $q->whereHas('contrats', fn($q) => $q->where('section_id', $id))
            )
            ->when($request->type_role, fn($q, $role) =>
                $q->whereHas('contrats', fn($q) => $q->where('type_role', $role))
            )
            ->when($request->statut, fn($q, $statut) =>
                $q->whereHas('contrats', fn($q) => $q->where('statut', $statut))
            );

        return response()->json($query->orderBy('nom')->orderBy('prenoms')->paginate(20));
    }

    // ──────────────────────────────────────────────────────────
    //  POST /api/personnes
    // ──────────────────────────────────────────────────────────
    public function store(Request $request): JsonResponse
    {
        // 1. Génération automatique du NUMÉRO DE LICENCE séquentiel (ex: LIC-0001, LIC-0002...)
        // On va chercher le dernier contrat ayant un numéro de licence généré
        $dernierContrat = Contrat::whereNotNull('numero_licence')
            ->where('numero_licence', 'like', 'LIC-%')
            ->latest('id')
            ->first();

        if ($dernierContrat) {
            // On extrait le numéro (ex: de "LIC-0012" on prend "0012" -> 12)
            $dernierNombre = (int) str_replace('LIC-', '', $dernierContrat->numero_licence);
            $prochaineLicence = 'LIC-' . str_pad($dernierNombre + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $prochaineLicence = 'LIC-0001';
        }

        // Injection du numéro de licence généré dans la requête
        $request->merge(['numero_licence' => $prochaineLicence]);

        // 2. Validation des données reçues
        $request->validate([
            'nom'                  => 'required|string|max:100',
            'prenoms'              => 'required|string|max:150',
            'sexe'                 => 'nullable|in:M,F',
            'date_naissance'       => 'nullable|date|before:today',
            'lieu_naissance'       => 'nullable|string|max:100',
            'nationalite'          => 'nullable|string|max:100',
            'cni_numero'           => 'nullable|string|max:50|unique:personnes,cni_numero', // Devient manuel/optionnel
            'telephone'            => 'nullable|string|max:20',
            'adresse'              => 'nullable|string|max:255',
            'taille_cm'            => 'nullable|numeric|min:50|max:250',
            'poids_kg'             => 'nullable|numeric|min:20|max:200',
            'groupe_sanguin'       => 'nullable|string|max:5',
            'allergies'            => 'nullable|string|max:255',
            'antecedents_medicaux' => 'nullable|string',
            'photo_url'            => 'nullable|file|mimes:jpg,jpeg,png,webp|max:2048',
            'section_id'           => 'required|exists:sections,id',
            'saison_id'            => 'required|exists:saisons,id',
            'type_role'            => 'required|in:JOUEUR,COACH,STAFF,MEDECIN,INTENDANT',
            'poste_cle'            => 'nullable|string|max:50',
            // Unicité du maillot sur les contrats non archivés de la même section/saison
            'numero_maillot'       => [
                'nullable',
                'integer',
                'min:1',
                'max:99',
                Rule::unique('contrats', 'numero_maillot')->where(function ($query) use ($request) {
                    return $query->where('section_id', $request->section_id)
                                 ->where('saison_id', $request->saison_id)
                                 ->where('statut', '!=', 'ARCHIVE');
                }),
            ],
            'numero_licence'       => 'required|string|max:50|unique:contrats,numero_licence', // Validation de la licence auto-générée
            'salaire_fixe'         => 'nullable|numeric|min:0',
            'prime_signature'      => 'nullable|numeric|min:0',
            'mode_paiement'        => 'nullable|in:VIREMENT,CHEQUE,ESPECES',
            'assurance_ref'        => 'nullable|string|max:100',
            'statut'               => 'nullable|in:ACTIF,BLESSE,SUSPENDU',
            'date_debut_contrat'   => 'required|date',
            'date_fin_contrat'     => 'required|date|after:date_debut_contrat',
            'certificat_medical_valide' => 'nullable|boolean',
            'certificat_fichier'   => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'contrat_fichier'      => 'nullable|file|mimes:pdf|max:5120',
        ]);

        $user = $request->user();
        
        $val = $request->input('certificat_medical_valide');
        $request->merge([
            'certificat_medical_valide' => in_array($val, ['1', 1, true, 'true', 'on'], true)
        ]);

        if (!in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
            if ((int)$request->section_id !== $user->section_id) {
                return response()->json(['message' => 'Accès refusé à cette section.'], 403);
            }
        }

        DB::beginTransaction();
        try {
            $photoUrl = null;
            if ($request->hasFile('photo_url')) {
                $photoUrl = $request->file('photo_url')->store('photos/membres', 'public');
            }

            // Insertion de la personne avec CNI saisie manuellement (ou nulle)
            $personne = Personne::create([
                'nom'                  => $request->nom,
                'prenoms'              => $request->prenoms,
                'sexe'                 => $request->sexe ?? 'M',
                'date_naissance'       => $request->date_naissance   ?: null,
                'lieu_naissance'       => $request->lieu_naissance   ?: null,
                'nationalite'          => $request->nationalite      ?: 'Béninoise',
                'cni_numero'           => $request->cni_numero       ?: null, 
                'telephone'            => $request->telephone        ?: null,
                'adresse'              => $request->adresse          ?: null,
                'taille_cm'            => $request->taille_cm        ?: null,
                'poids_kg'             => $request->poids_kg         ?: null,
                'groupe_sanguin'       => $request->groupe_sanguin   ?: null,
                'allergies'            => $request->allergies        ?: null,
                'antecedents_medicaux' => $request->antecedents_medicaux ?: null,
                'photo_url'            => $photoUrl,
            ]);

            $documentsValides = $request->hasFile('certificat_fichier') && $request->hasFile('contrat_fichier');

            // Création du contrat avec le NUMÉRO DE LICENCE automatique injecté
            Contrat::create([
                'personne_id'              => $personne->id,
                'section_id'               => (int)$request->section_id,
                'saison_id'                => (int)$request->saison_id,
                'type_role'                => $request->type_role,
                'poste_cle'                => $request->poste_cle    ?: null,
                'numero_maillot'           => $request->numero_maillot ? (int)$request->numero_maillot : null,
                'numero_licence'           => $request->numero_licence, // Licence auto-générée ici
                'salaire_fixe'             => (float)($request->salaire_fixe ?? 0),
                'prime_signature'          => (float)($request->prime_signature ?? 0),
                'mode_paiement'            => $request->mode_paiement ?? 'ESPECES',
                'assurance_ref'            => $request->assurance_ref ?: null,
                'statut'                   => $request->statut ?? 'ACTIF',
                'date_debut_contrat'       => $request->date_debut_contrat,
                'date_fin_contrat'         => $request->date_fin_contrat,
                'certificat_medical_valide' => $request->boolean('certificat_medical_valide'),
                'documents_valides'        => $documentsValides,
            ]);

            $this->uploadDocuments($personne, $request, $user->id);

            DB::commit();

            return response()->json([
                'message'  => 'Membre enregistré avec succès.',
                'personne' => $personne->load(['contrats.section', 'documents']),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Erreur lors de l\'enregistrement.', 'error' => $e->getMessage()], 500);
        }
    }

    // ──────────────────────────────────────────────────────────
    //  GET /api/personnes/{personne}
    // ──────────────────────────────────────────────────────────
    public function show(Request $request, Personne $personne): JsonResponse
    {
        if (!$this->peutVoirPersonne($request->user(), $personne)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $personne->load([
            'contrats.section.discipline',
            'contrats.saison',
            'documents',
            'palmares',
            'user',
        ]);

        if ($personne->photo_url && !str_starts_with($personne->photo_url, 'http')) {
            $personne->photo_url = Storage::disk('public')->url($personne->photo_url);
        }

        return response()->json(['personne' => $personne]);
    }

    // ──────────────────────────────────────────────────────────
    //  PUT /api/personnes/{personne}
    // ──────────────────────────────────────────────────────────
    public function update(Request $request, Personne $personne): JsonResponse
    {
        if (!$this->peutVoirPersonne($request->user(), $personne)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $contratActif = $personne->contrats()->where('statut', '!=', 'ARCHIVE')->latest()->first();

        $request->validate([
            'nom'                  => 'sometimes|string|max:100',
            'prenoms'              => 'sometimes|string|max:150',
            'sexe'                 => 'nullable|in:M,F',
            'date_naissance'       => 'nullable|date|before:today',
            'lieu_naissance'       => 'nullable|string|max:100',
            'nationalite'          => 'nullable|string|max:100',
            'cni_numero'           => 'nullable|string|max:50|unique:personnes,cni_numero,' . $personne->id,
            'telephone'            => 'nullable|string|max:20',
            'adresse'              => 'nullable|string|max:255',
            'taille_cm'            => 'nullable|numeric|min:50|max:250',
            'poids_kg'             => 'nullable|numeric|min:20|max:200',
            'groupe_sanguin'       => 'nullable|string|max:5',
            'allergies'            => 'nullable|string|max:255',
            'antecedents_medicaux' => 'nullable|string',
            'section_id'           => 'sometimes|exists:sections,id',
            'saison_id'            => 'sometimes|exists:saisons,id',
            'type_role'            => 'sometimes|in:JOUEUR,COACH,STAFF,MEDECIN,INTENDANT',
            'poste_cle'            => 'nullable|string|max:50',
            'numero_maillot'       => [
                'nullable',
                'integer',
                'min:1',
                'max:99',
                Rule::unique('contrats', 'numero_maillot')->ignore($contratActif?->id)->where(function ($query) use ($request, $contratActif) {
                    return $query->where('section_id', $request->section_id ?? $contratActif?->section_id)
                                 ->where('saison_id', $request->saison_id ?? $contratActif?->saison_id)
                                 ->where('statut', '!=', 'ARCHIVE');
                }),
            ],
            'numero_licence'       => 'nullable|string|max:50|unique:contrats,numero_licence,' . $contratActif?->id,
            'salaire_fixe'         => 'nullable|numeric|min:0',
            'prime_signature'      => 'nullable|numeric|min:0',
            'mode_paiement'        => 'nullable|in:VIREMENT,CHEQUE,ESPECES',
            'assurance_ref'        => 'nullable|string|max:100',
            'statut'               => 'nullable|in:ACTIF,BLESSE,SUSPENDU,ARCHIVE',
            'date_debut_contrat'   => 'nullable|date',
            'date_fin_contrat'     => 'nullable|date',
            'certificat_medical_valide' => 'nullable|boolean',
        ]);

        DB::beginTransaction();
        try {
            $personne->update($request->only([
                'nom', 'prenoms', 'sexe', 'date_naissance', 'lieu_naissance',
                'nationalite', 'cni_numero', 'telephone', 'adresse',
                'taille_cm', 'poids_kg', 'groupe_sanguin',
                'allergies', 'antecedents_medicaux',
            ]));

            $champsContrat = [
                'section_id', 'saison_id', 'type_role', 'poste_cle',
                'numero_maillot', 'numero_licence', 'salaire_fixe', 'prime_signature',
                'mode_paiement', 'assurance_ref', 'statut',
                'date_debut_contrat', 'date_fin_contrat', 'certificat_medical_valide',
            ];

            $donneesContrat = $request->only($champsContrat);

            if ($contratActif) {
                $contratActif->update($donneesContrat);
            } elseif ($request->has('section_id') && $request->has('saison_id')) {
                Contrat::create(array_merge($donneesContrat, [
                    'personne_id'       => $personne->id,
                    'documents_valides' => false,
                ]));
            }

            DB::commit();

            return response()->json([
                'message'  => 'Membre mis à jour avec succès.',
                'personne' => $personne->fresh(['contrats.section.discipline', 'documents']),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Erreur lors de la mise à jour.', 'error' => $e->getMessage()], 500);
        }
    }

    // ──────────────────────────────────────────────────────────
    //  POST /api/personnes/{personne}/documents
    // ──────────────────────────────────────────────────────────
    public function uploadDocumentsPost(Request $request, Personne $personne): JsonResponse
    {
        if (!$this->peutVoirPersonne($request->user(), $personne)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $request->validate([
            'photo_url'          => 'nullable|file|mimes:jpg,jpeg,png,webp|max:2048',
            'certificat_fichier' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'contrat_fichier'    => 'nullable|file|mimes:pdf|max:5120',
        ]);

        if ($request->hasFile('photo_url')) {
            if ($personne->photo_url) {
                Storage::disk('public')->delete($personne->photo_url);
            }
            $path = $request->file('photo_url')->store('photos/membres', 'public');
            $personne->update(['photo_url' => $path]);
        }

        $this->uploadDocuments($personne, $request, $request->user()->id);

        $contrat = $personne->contrats()->where('statut', '!=', 'ARCHIVE')->latest()->first();
        if ($contrat) {
            $nbDocs = $personne->documents()->where('is_valide', true)->count();
            $contrat->update(['documents_valides' => $nbDocs >= 2]);
        }

        return response()->json([
            'message'  => 'Documents mis à jour avec succès.',
            'personne' => $personne->fresh(['contrats', 'documents']),
        ]);
    }

    // ──────────────────────────────────────────────────────────
    //  DELETE /api/personnes/{personne}
    // ──────────────────────────────────────────────────────────
    public function destroy(Request $request, Personne $personne): JsonResponse
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Seul le Super Admin peut archiver un membre.'], 403);
        }

        $personne->contrats()->where('statut', 'ACTIF')->update(['statut' => 'ARCHIVE']);

        if ($personne->user) {
            $personne->user->update(['is_actif' => false]);
            $personne->user->tokens()->delete();
        }

        return response()->json(['message' => 'Personne et contrats associés archivés avec succès.']);
    }

    // ──────────────────────────────────────────────────────────
    //  GET /api/personnes/{personne}/historique-primes
    // ──────────────────────────────────────────────────────────
    public function historiquePrimes(Personne $personne): JsonResponse
    {
        $participations = $personne->contrats()
            ->with(['participations' => fn($q) => $q
                ->with('evenement')
                ->where('is_present', true)
                ->whereNotNull('prime_calculee')
                ->orderByDesc('created_at')
            ])
            ->get()
            ->pluck('participations')
            ->flatten();

        return response()->json([
            'participations' => $participations,
            'total_primes'   => $participations->sum('prime_calculee'),
        ]);
    }

    // ──────────────────────────────────────────────────────────
    //  Helpers privés
    // ──────────────────────────────────────────────────────────

    private function peutVoirPersonne($user, Personne $personne): bool
    {
        if (in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) return true;
        return $personne->contrats()->where('section_id', $user->section_id)->exists();
    }

    private function uploadDocuments(Personne $personne, Request $request, int $userId): void
    {
        $docs = [
            'certificat_fichier' => 'CERTIFICAT_MEDICAL',
            'contrat_fichier'    => 'CONTRAT_PDF',
        ];

        foreach ($docs as $field => $type) {
            if (!$request->hasFile($field)) continue;

            $file = $request->file($field);
            
            $path = $file->storeAs(
                "documents/{$personne->uuid}/{$type}",
                uniqid() . '.' . $file->extension(),
                'local'
            );

            Document::create([
                'personne_id'   => $personne->id,
                'type_document' => $type,
                'nom_fichier'   => $file->getClientOriginalName(),
                'url_fichier'   => $path,
                'mime_type'     => $file->getMimeType(),
                'taille_bytes'  => $file->getSize(),
                'is_valide'     => true,
                'uploade_par'   => $userId,
            ]);
        }
    }
}