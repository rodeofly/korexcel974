// src/utils/grading.ts
import { type SheetConfig, type StudentData, type ProjectType, type WordConfig, type StyleRequirement } from "../context/ProjectContext";
import { gradeWordDocument } from "./wordGrading"; 

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
  wordDetails?: string[];
  // NOUVEAU : Les styles trouvés chez l'élève
  detectedStyles?: StyleRequirement[]; 
  // NOUVEAU : Bonus manuel
  manualAdjustment?: number; 
}

const cleanFormula = (formula: string, ignoreDollar: boolean): string => {
  if (!formula) return "";
  let f = formula.toString().toUpperCase().trim();
  if (f.startsWith('=')) f = f.substring(1);
  if (ignoreDollar) f = f.replace(/\$/g, '');
  return f.replace(/\s+/g, '');
};

export const gradeStudent = async (
  student: StudentData,
  profWorkbook: any,
  configs: SheetConfig[],
  globalOptions: any,
  projectType: ProjectType,
  wordConfig: WordConfig
): Promise<StudentResult> => {
  
  // === BRANCHE WORD ===
  if (projectType === 'word') {
    const wordResult = await gradeWordDocument(student, wordConfig);
    return {
      ...student,
      globalScore: wordResult.globalScore,
      sheetResults: [], 
      wordDetails: wordResult.details,
      detectedStyles: wordResult.detectedStyles, // On passe les données
      manualAdjustment: 0
    };
  }

  // === BRANCHE EXCEL ===
  const sheetResults: SheetResult[] = [];
  let totalWeightedScore = 0;
  let totalWeight = 0;

  if (profWorkbook && student.workbook) {
      configs.forEach(config => {
        if (!config.enabled) return;

        const profSheet = profWorkbook.Sheets[config.name];
        const studentSheet = student.workbook.Sheets[config.name];
        
        if (!studentSheet) {
          sheetResults.push({ sheetName: config.name, totalCells: 0, correctCells: 0, score: 0, details: ["Feuille manquante"] });
          totalWeight += config.weight;
          return;
        }

        if (!profSheet['!ref']) return; 
        
        let cellsToGrade: string[] = config.selectedCells && config.selectedCells.length > 0 
          ? config.selectedCells 
          : [];

        if (cellsToGrade.length === 0) {
          const range = XLSX.utils.decode_range(profSheet['!ref']);
          for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
              const addr = XLSX.utils.encode_cell({ r: R, c: C });
              if (profSheet[addr]) cellsToGrade.push(addr);
            }
          }
        }
        
        let totalCells = 0;
        let correctCells = 0;
        const errors: string[] = [];

        cellsToGrade.forEach(cellAddress => {
            const profCell = profSheet[cellAddress];
            if (!profCell) return; 

            totalCells++;
            const studentCell = studentSheet[cellAddress];
            let isCorrect = false;

            if (globalOptions.checkFormulas && profCell.f) {
              const profF = cleanFormula(profCell.f, globalOptions.ignoreDollar);
              const studentF = studentCell ? cleanFormula(studentCell.f, globalOptions.ignoreDollar) : "";
              if (profF === studentF) isCorrect = true;
              else errors.push(`${cellAddress}: Formule attendue [=${profCell.f}] vs [=${studentCell?.f || 'Valeur'}]`);
            } else {
              const profVal = profCell.v;
              const studentVal = studentCell ? studentCell.v : null;

              if (typeof profVal === 'number' && typeof studentVal === 'number') {
                const diff = Math.abs(profVal - studentVal);
                if (diff <= globalOptions.globalAbsTolerance) isCorrect = true;
                else {
                  const relDiff = diff / Math.abs(profVal);
                  if (relDiff <= globalOptions.globalRelTolerance) isCorrect = true;
                }
              } else {
                if (String(profVal).trim() === String(studentVal).trim()) isCorrect = true;
              }
              if (!isCorrect) errors.push(`${cellAddress}: Valeur attendue ${profVal} vs ${studentVal}`);
            }
            if (isCorrect) correctCells++;
        });

        const score20 = totalCells > 0 ? (correctCells / totalCells) * 20 : 0;
        sheetResults.push({ sheetName: config.name, totalCells, correctCells, score: Number(score20.toFixed(2)), details: errors.slice(0, 10) });

        totalWeightedScore += score20 * config.weight;
        totalWeight += config.weight;
      });
  }

  const globalScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

  return {
    ...student,
    globalScore: Number(globalScore.toFixed(2)),
    sheetResults,
    manualAdjustment: 0
  };
};