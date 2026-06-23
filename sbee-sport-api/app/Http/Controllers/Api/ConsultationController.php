<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Consultation;
use App\Models\Contrat;
use App\Models\Personne;
use App\Models\NotificationApp;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ConsultationController extends Controller
{
    /**
     * GET /api/consultations
     * Liste filtrée et étanche des consultations médicales de la SBEE.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Consultation::with([
            'personne',
            'medecin.personne',
        ]);

        // Matrice d'accès : Cloisonnement strict par discipline sportive
        $rolesGlobaux = ['SUPER_ADMIN', 'TRESORIER', 'SPONSOR'];
        
        if (!in_array($user->role_systeme, $rolesGlobaux)) {
            // Un médecin ou un coach ne doit voir que les blessés/consultations de SA section
            $query->whereHas('personne.contrats', function($q) use ($user) {
                $q->where('section_id', $user->section_id)
                  ->where('statut', '!=', 'ARCHIVE');
            });
        }

        // Filtres dynamiques de recherche médical
        $query
            ->when($request->personne_id, fn($q, $id) => $q->where('personne_id', $id))
            ->when($request->type,        fn($q, $t)  => $q->where('type_consultation', $t))
            ->when($request->date_debut,  fn($q, $d)  => $q->whereDate('date_consultation', '>=', $d))
            ->when($request->date_fin,    fn($q, $d)  => $q->whereDate('date_consultation', '<=', $d));

        $consultations = $query->orderByDesc('date_consultation')->paginate(20);

        return response()->json($consultations);
    }

    /**
     * POST /api/consultations
     * Enregistrement d'une consultation + Automate de mise à jour d'aptitude terrain.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'personne_id'       => 'required|exists:personnes,id',
            'date_consultation' => 'required|date',
            'type_consultation' => 'required|in:VISITE_MEDICALE,CONTROLE,URGENCE,BLESSURE,SUIVI',
            'diagnostic'        => 'nullable|string',
            'traitement'        => 'nullable|string',
            'duree_arret_jours' => 'nullable|integer|min:0',
            'apte_sport'        => 'required|boolean',
            'observations'      => 'nullable|string',
            'prochain_rdv'      => 'nullable|date',
        ]);

        $user = $request->user();

        // ── SÉCURITÉ RG-ISO-01 : Validation de l'étanchéité du Médecin avant traitement ──
        $rolesGlobaux = ['SUPER_ADMIN', 'TRESORIER'];
        if (!in_array($user->role_systeme, $rolesGlobaux)) {
            $checkContrat = Contrat::where('personne_id', $request->personne_id)
                ->where('section_id', $user->section_id)
                ->where('statut', '!=', 'ARCHIVE')
                ->exists();

            if (!$checkContrat) {
                return response()->json([
                    'message' => 'Accès refusé. Cet athlète dépend d\'une autre section sportive.'
                ], 403);
            }
        }

        DB::beginTransaction();
        try {
            $consultation = Consultation::create([
                'personne_id'        => $request->personne_id,
                'medecin_id'         => $user->id, // Liaison directe à l'utilisateur connecté
                'date_consultation'  => $request->date_consultation,
                'type_consultation'  => $request->type_consultation,
                'diagnostic'         => $request->diagnostic,
                'traitement'         => $request->traitement,
                'duree_arret_jours'  => $request->duree_arret_jours ?? 0,
                'apte_sport'         => $request->apte_sport,
                'observations'       => $request->observations,
                'prochain_rdv'       => $request->prochain_rdv,
            ]);

            // Récupération du contrat actif de l'athlète au sein du club
            $contrat = Contrat::where('personne_id', $request->personne_id)
                ->where('statut', '!=', 'ARCHIVE')
                ->first();

            if ($contrat) {
                if (!$request->apte_sport) {
                    // Passage automatique de l'athlète au statut BLESSE
                    $contrat->update(['statut' => 'BLESSE']);

                    // Recherche du responsable de la section pour notification
                    $responsable = User::where('section_id', $contrat->section_id)
                        ->where('role_systeme', 'RESPONSABLE_SECTION')
                        ->first();

                    if ($responsable) {
                        $personne = Personne::find($request->personne_id);
                        NotificationApp::create([
                            'user_id'         => $responsable->id,
                            'type'            => 'JOUEUR_BLESSE',
                            'titre'           => '🏥 Alerte Médicale : Joueur Inapte',
                            'message'         => "{$personne->prenoms} {$personne->nom} a été déclaré inapte à la pratique sportive" . ($request->duree_arret_jours > 0 ? " pour une durée de {$request->duree_arret_jours} jour(s)." : "."),
                            'url_action'      => "/personnes/{$request->personne_id}",
                            'notifiable_type' => Consultation::class,
                            'notifiable_id'   => $consultation->id,
                        ]);
                    }
                } else {
                    // Si le joueur est déclaré de nouveau APTE, son contrat redevient ACTIF
                    if ($contrat->statut === 'BLESSE') {
                        $contrat->update(['statut' => 'ACTIF']);
                    }
                }
            }

            DB::commit();

            return response()->json([
                'message'      => 'Consultation médicale enregistrée avec succès.',
                'consultation' => $consultation->load(['personne', 'medecin.personne']),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Erreur lors du traitement médical.', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/consultations/{consultation}
     */
    public function show(Consultation $consultation): JsonResponse
    {
        return response()->json([
            'consultation' => $consultation->load(['personne', 'medecin.personne']),
        ]);
    }

    /**
     * PUT /api/consultations/{consultation}
     */
    public function update(Request $request, Consultation $consultation): JsonResponse
    {
        $request->validate([
            'diagnostic'        => 'nullable|string',
            'traitement'        => 'nullable|string',
            'duree_arret_jours' => 'nullable|integer|min:0',
            'apte_sport'        => 'nullable|boolean',
            'observations'      => 'nullable|string',
            'prochain_rdv'      => 'nullable|date',
        ]);

        $consultation->update($request->only([
            'diagnostic', 'traitement', 'duree_arret_jours',
            'apte_sport', 'observations', 'prochain_rdv',
        ]));

        return response()->json([
            'message'      => 'Dossier de consultation mis à jour.',
            'consultation' => $consultation->fresh(['personne']),
        ]);
    }

    /**
     * GET /api/joueurs/{personne}/consultations
     * Historique du carnet de santé d'un athlète de la SBEE.
     */
    public function historique(Personne $personne): JsonResponse
    {
        $consultations = $personne->consultations()
            ->with('medecin.personne')
            ->orderByDesc('date_consultation')
            ->get();

        $derniereConsult = $consultations->first();

        return response()->json([
            'consultations'   => $consultations,
            'apte_sport'      => $derniereConsult ? (bool)$derniereConsult->apte_sport : true,
            'derniere_visite' => $derniereConsult?->date_consultation,
            'prochain_rdv'    => $derniereConsult?->prochain_rdv,
        ]);
    }

    /**
     * PATCH /api/contrats/{contrat}/aptitude
     * Forçage manuel ou administratif du statut d'aptitude d'un contrat.
     */
    public function updateAptitude(Request $request, Contrat $contrat): JsonResponse
    {
        $request->validate([
            'apte'  => 'required|boolean',
            'motif' => 'nullable|string|max:255',
        ]);

        $statut = $request->apte ? 'ACTIF' : 'BLESSE';
        $contrat->update(['statut' => $statut]);

        return response()->json([
            'message' => $request->apte ? 'Le joueur a été requalifié comme APTE.' : 'Le joueur a été basculé comme INAPTE/BLESSE.',
            'contrat' => $contrat->fresh(),
        ]);
    }
}