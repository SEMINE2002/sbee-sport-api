<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contrat;
use App\Models\Document;
use App\Models\Personne;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DocumentController extends Controller
{
    // Types de documents et extensions autorisées
    const TYPES_AUTORISES = ['CNI', 'CONTRAT_PDF', 'CERTIFICAT_MEDICAL', 'LICENCE', 'PHOTO', 'AUTRE'];
    const EXTENSIONS_AUTORISEES = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
    const TAILLE_MAX_MB = 5;

    /**
     * POST /api/personnes/{personne}/documents
     * Upload d'un document lié à une personne
     */
    public function upload(Request $request, Personne $personne): JsonResponse
    {
        // Vérification isolation section
        $user = $request->user();
        if (!$this->peutGererDocuments($user, $personne)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $request->validate([
            'fichier'          => [
                'required',
                'file',
                'max:' . (self::TAILLE_MAX_MB * 1024), // en KB
                'mimes:pdf,jpg,jpeg,png,webp',
            ],
            'type_document'    => 'required|in:' . implode(',', self::TYPES_AUTORISES),
            'date_expiration'  => 'nullable|date|after:today',
        ]);

        $fichier = $request->file('fichier');

        // Nom de fichier sécurisé : UUID + extension d'origine
        $extension  = $fichier->getClientOriginalExtension();
        $nomFichier = Str::uuid() . '.' . $extension;

        // Chemin de stockage : documents/{personne_uuid}/{type}/
        $dossier    = "documents/{$personne->uuid}/" . strtolower($request->type_document);
        $chemin     = $fichier->storeAs($dossier, $nomFichier, 'local');

        // Supprime l'ancien document du même type si existant
        $ancienDoc = Document::where('personne_id', $personne->id)
            ->where('type_document', $request->type_document)
            ->where('is_valide', true)
            ->first();

        if ($ancienDoc) {
            Storage::disk('local')->delete($ancienDoc->url_fichier);
            $ancienDoc->update(['is_valide' => false]);
        }

        // Enregistrement en base
        $document = Document::create([
            'personne_id'     => $personne->id,
            'type_document'   => $request->type_document,
            'nom_fichier'     => $fichier->getClientOriginalName(),
            'url_fichier'     => $chemin,
            'mime_type'       => $fichier->getMimeType(),
            'taille_bytes'    => $fichier->getSize(),
            'date_expiration' => $request->date_expiration,
            'is_valide'       => true,
            'uploade_par'     => $user->id,
        ]);

        // RG-RH-01 : Vérifie si les documents obligatoires sont complets
        $this->verifierDocumentsObligatoires($personne);

        return response()->json([
            'message'  => 'Document uploadé avec succès.',
            'document' => $document,
            'documents_valides' => $this->tousDocumentsValides($personne),
        ], 201);
    }

    /**
     * GET /api/personnes/{personne}/documents
     * Liste les documents d'une personne
     */
    public function index(Request $request, Personne $personne): JsonResponse
    {
        $user = $request->user();
        if (!$this->peutGererDocuments($user, $personne)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $documents = $personne->documents()
            ->where('is_valide', true)
            ->orderBy('type_document')
            ->get()
            ->map(function ($doc) {
                return [
                    'id'              => $doc->id,
                    'type_document'   => $doc->type_document,
                    'nom_fichier'     => $doc->nom_fichier,
                    'mime_type'       => $doc->mime_type,
                    'taille_bytes'    => $doc->taille_bytes,
                    'date_expiration' => $doc->date_expiration,
                    'est_expire'      => $doc->estExpire(),
                    'url_telechargement' => route('documents.download', $doc->id),
                    'created_at'      => $doc->created_at,
                ];
            });

        $manquants = $this->documentsManquants($personne);

        return response()->json([
            'documents' => $documents,
            'documents_valides' => $manquants->isEmpty(),
            'manquants' => $manquants,
        ]);
    }

    /**
     * GET /api/documents/{document}/download
     * Téléchargement sécurisé d'un document
     */
    public function download(Request $request, Document $document)
    {
        $user = $request->user();
        if (!$this->peutGererDocuments($user, $document->personne)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        if (!Storage::disk('local')->exists($document->url_fichier)) {
            return response()->json(['message' => 'Fichier introuvable.'], 404);
        }

        return Storage::disk('local')->download(
            $document->url_fichier,
            $document->nom_fichier
        );
    }

    /**
     * DELETE /api/documents/{document}
     * Invalide un document (jamais supprimé physiquement)
     */
    public function destroy(Request $request, Document $document): JsonResponse
    {
        $user = $request->user();
        if (!$this->peutGererDocuments($user, $document->personne)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $document->update(['is_valide' => false]);

        // Recalcule documents_valides sur les contrats de la personne
        $this->verifierDocumentsObligatoires($document->personne);

        return response()->json(['message' => 'Document invalidé.']);
    }

    // -------------------------------------------------------
    // Helpers
    // -------------------------------------------------------

    /**
     * RG-RH-01 : Met à jour documents_valides sur tous les contrats actifs
     * Un contrat est valide si CNI + CERTIFICAT_MEDICAL sont présents et non expirés
     */
    private function verifierDocumentsObligatoires(Personne $personne): void
    {
        $tousValides = $this->tousDocumentsValides($personne);

        // Met à jour tous les contrats actifs de la personne
        $personne->contrats()
            ->where('statut', '!=', 'ARCHIVE')
            ->update(['documents_valides' => $tousValides]);
    }

    private function tousDocumentsValides(Personne $personne): bool
    {
        $documentsObligatoires = ['CNI', 'CERTIFICAT_MEDICAL'];

        foreach ($documentsObligatoires as $type) {
            $doc = Document::where('personne_id', $personne->id)
                ->where('type_document', $type)
                ->where('is_valide', true)
                ->first();

            if (!$doc || $doc->estExpire()) {
                return false;
            }
        }

        return true;
    }

    private function documentsManquants(Personne $personne): \Illuminate\Support\Collection
    {
        $obligatoires = ['CNI', 'CERTIFICAT_MEDICAL'];
        $manquants = collect();

        foreach ($obligatoires as $type) {
            $doc = Document::where('personne_id', $personne->id)
                ->where('type_document', $type)
                ->where('is_valide', true)
                ->first();

            if (!$doc) {
                $manquants->push(['type' => $type, 'raison' => 'Document manquant']);
            } elseif ($doc->estExpire()) {
                $manquants->push(['type' => $type, 'raison' => 'Document expiré']);
            }
        }

        return $manquants;
    }

    private function peutGererDocuments($user, Personne $personne): bool
    {
        if (in_array($user->role_systeme, ['SUPER_ADMIN', 'TRESORIER'])) {
            return true;
        }

        return $personne->contrats()
            ->where('section_id', $user->section_id)
            ->exists();
    }
}
