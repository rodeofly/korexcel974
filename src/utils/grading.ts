// src/utils/grading.ts
import { SheetConfig, StudentData } from "../context/ProjectContext";

declare const XLSX: any; // On utilise la librairie globale

// Interface pour le résultat d'une feuille
export interface SheetResult {
  sheetName: string;
  totalCells: number;
  correctCells: number;
  score: number; // Note sur 20
  details: string[]; // Liste des erreurs (ex: "A1: Attendu 10, Reçu 5")
}

// Interface pour le résultat global d'un élève
export interface StudentResult extends StudentData {
  globalScore: number; // Moyenne pondérée sur 20
  sheetResults: SheetResult[];
}

/**
 * Fonction de nettoyage pour comparaison de formules
 * Retire les espaces et les '$' si l'option est activée
 */
const cleanFormula = (formula: string, ignoreDollar: boolean): string => {
  if (!formula) return "";
  let f = formula.toString().toUpperCase().trim();
  if (f.startsWith('=')) f = f.substring(1); // Enlever le =
  if (ignoreDollar) {
    f = f.replace(/\$/g, ''); // Enlever tous les $
  }
  return f.replace(/\s+/g, ''); // Enlever tous les espaces
};

/**
 * Fonction principale qui note un étudiant
 */
export const gradeStudent = (
  student: StudentData,
  profWorkbook: any,
  configs: SheetConfig[],
  globalOptions: any
): StudentResult => {
  
  const sheetResults: SheetResult[] = [];
  let totalWeightedScore = 0;
  let totalWeight = 0;

  configs.forEach(config => {
    if (!config.enabled) return;

    const profSheet = profWorkbook.Sheets[config.name];
    const studentSheet = student.workbook.Sheets[config.name];
    
    // Si la feuille n'existe pas chez l'élève -> 0
    if (!studentSheet) {
      sheetResults.push({
        sheetName: config.name,
        totalCells: 0,
        correctCells: 0,
        score: 0,
        details: ["Feuille manquante"]
      });
      totalWeight += config.weight;
      return;
    }

    // Déterminer la zone à corriger (basée sur la feuille PROF)
    const range = XLSX.utils.decode_range(profSheet['!ref']);
    
    let totalCells = 0;
    let correctCells = 0;
    const errors: string[] = [];

    // Parcourir toutes les cellules de la zone
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const profCell = profSheet[cellAddress];

        // On ne note que si le prof a mis quelque chose dans la cellule
        if (!profCell) continue;

        totalCells++;
        
        const studentCell = studentSheet[cellAddress];
        let isCorrect = false;

        // --- Logique de Comparaison ---

        // 1. Vérification par FORMULE (si activé et si prof a une formule)
        if (globalOptions.checkFormulas && profCell.f) {
          const profF = cleanFormula(profCell.f, globalOptions.ignoreDollar);
          const studentF = studentCell ? cleanFormula(studentCell.f, globalOptions.ignoreDollar) : "";
          
          if (profF === studentF) {
            isCorrect = true;
          } else {
            // Tolérance : Si la formule est fausse mais la valeur juste ? (Optionnel, ici on compte faux)
            errors.push(`${cellAddress}: Formule attendue [=${profCell.f}] vs [=${studentCell?.f || 'Valeur'}]`);
          }
        } 
        // 2. Vérification par VALEUR (Numérique ou Texte)
        else {
          const profVal = profCell.v;
          const studentVal = studentCell ? studentCell.v : null;

          if (typeof profVal === 'number' && typeof studentVal === 'number') {
            // Comparaison numérique avec tolérance
            const diff = Math.abs(profVal - studentVal);
            if (diff <= globalOptions.globalAbsTolerance) {
              isCorrect = true;
            } else {
               // Vérification tolérance relative (pour les grands nombres)
               const relDiff = diff / Math.abs(profVal);
               if (relDiff <= globalOptions.globalRelTolerance) isCorrect = true;
            }
          } else {
            // Comparaison texte stricte (après trim)
            if (String(profVal).trim() === String(studentVal).trim()) {
              isCorrect = true;
            }
          }
          
          if (!isCorrect) {
             errors.push(`${cellAddress}: Valeur attendue ${profVal} vs ${studentVal}`);
          }
        }

        if (isCorrect) correctCells++;
      }
    }

    // Calcul de la note de la feuille sur 20
    const score20 = totalCells > 0 ? (correctCells / totalCells) * 20 : 0;
    
    sheetResults.push({
      sheetName: config.name,
      totalCells,
      correctCells,
      score: Number(score20.toFixed(2)),
      details: errors.slice(0, 10) // On garde max 10 erreurs pour l'affichage
    });

    totalWeightedScore += score20 * config.weight;
    totalWeight += config.weight;
  });

  const globalScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

  return {
    ...student,
    globalScore: Number(globalScore.toFixed(2)),
    sheetResults
  };
};