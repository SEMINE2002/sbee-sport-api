<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Competition;
use Illuminate\Http\Request;

class CompetitionController extends Controller
{
    /**
     * Récupère la liste des compétitions.
     */
    public function index(Request $request)
    {
        $query = Competition::query();

        // Optionnel : Si l'API reçoit un section_id, on filtre les compétitions
        if ($request->has('section_id') && $request->section_id != '') {
            $query->where('section_id', $request->section_id);
        }

        // On récupère les compétitions triées par nom
        $competitions = $query->orderBy('nom', 'asc')->get();

        return response()->json($competitions);
    }
}