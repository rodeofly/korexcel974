// src/utils/grading.ts
import { type SheetConfig, type StudentData } from "../context/ProjectContext";

declare const XLSX: any; 

export interface SheetResult {
  sheetName: string;
  totalCells: number;
  correctCells: number;
  score: number;
  details: string[];
}

export interface StudentResult extends StudentData {
  globalScore: number;
  sheetResults: SheetResult[];
}

const cleanFormula = (formula: string, ignoreDollar: boolean): string => {
  if (!formula) return "";
  let f = formula.toString().toUpperCase().trim();
  if (f.startsWith('=')) f = f.substring(1);
  if (ignoreDollar) {
    f = f.replace(/\$/g, '');
  }
  return f.replace(/\s+/g, '');
};

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

    if (!profSheet['!ref']) return; 
    
    // Déterminer les cellules à corriger
    // Soit celles sélectionnées manuellement, soit toutes les cellules utilisées par le prof
    let cellsToGrade: string[] = config.selectedCells && config.selectedCells.length > 0 
      ? config.selectedCells 
      : [];

    // Si aucune sélection manuelle, on génère la liste de toutes les cellules de la plage
    if (cellsToGrade.length === 0) {
      const range = XLSX.utils.decode_range(profSheet['!ref']);
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          // On n'ajoute que si le prof a mis une valeur
          if (profSheet[addr]) {
            cellsToGrade.push(addr);
          }
        }
      }
    }
    
    let totalCells = 0;
    let correctCells = 0;
    const errors: string[] = [];

    // On boucle uniquement sur la liste définie
    cellsToGrade.forEach(cellAddress => {
        const profCell = profSheet[cellAddress];
        
        // Sécurité : si on a cliqué une cellule vide dans le prof
        if (!profCell) return; 

        totalCells++;
        
        const studentCell = studentSheet[cellAddress];
        let isCorrect = false;

        // 1. Vérification FORMULE
        if (globalOptions.checkFormulas && profCell.f) {
          const profF = cleanFormula(profCell.f, globalOptions.ignoreDollar);
          const studentF = studentCell ? cleanFormula(studentCell.f, globalOptions.ignoreDollar) : "";
          
          if (profF === studentF) {
            isCorrect = true;
          } else {
            errors.push(`${cellAddress}: Formule attendue [=${profCell.f}] vs [=${studentCell?.f || 'Valeur'}]`);
          }
        } 
        // 2. Vérification VALEUR
        else {
          const profVal = profCell.v;
          const studentVal = studentCell ? studentCell.v : null;

          if (typeof profVal === 'number' && typeof studentVal === 'number') {
            const diff = Math.abs(profVal - studentVal);
            if (diff <= globalOptions.globalAbsTolerance) {
              isCorrect = true;
            } else {
               const relDiff = diff / Math.abs(profVal);
               if (relDiff <= globalOptions.globalRelTolerance) isCorrect = true;
            }
          } else {
            if (String(profVal).trim() === String(studentVal).trim()) {
              isCorrect = true;
            }
          }
          
          if (!isCorrect) {
             errors.push(`${cellAddress}: Valeur attendue ${profVal} vs ${studentVal}`);
          }
        }

        if (isCorrect) correctCells++;
    });

    const score20 = totalCells > 0 ? (correctCells / totalCells) * 20 : 0;
    
    sheetResults.push({
      sheetName: config.name,
      totalCells,
      correctCells,
      score: Number(score20.toFixed(2)),
      details: errors.slice(0, 10)
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