// src/utils/wordGrading.ts
import { type StudentData, type WordConfig, type StyleRequirement } from "../context/ProjectContext";
import { extractStyles, detectPageOrientation } from "./docxParser";

export interface WordResultDetails {
  score: number;
  maxScore: number;
  details: string[];
  // NOUVEAU : On renvoie les styles trouvés pour l'affichage
  detectedStyles: StyleRequirement[];
}

/**
 * Compare deux valeurs de style avec une certaine tolérance
 */
const compare = (label: string, profVal: any, studentVal: any, errors: string[]) => {
  if (profVal === undefined || profVal === null || profVal === "") return true;
  
  const p = String(profVal).toLowerCase().trim();
  const s = String(studentVal || "").toLowerCase().trim();

  if (p !== s) {
    errors.push(`${label} : Attendu "${profVal}", trouvé "${studentVal || 'Aucun'}"`);
    return false;
  }
  return true;
};

export const gradeWordDocument = async (
  student: StudentData, 
  config: WordConfig
): Promise<{ globalScore: number, details: string[], detectedStyles: StyleRequirement[] }> => {
  
  const details: string[] = [];
  let earnedPoints = 0;
  let totalPoints = 0;
  let studentStyles: StyleRequirement[] = [];

  if (!student.wordContent) {
    return { globalScore: 0, details: ["Document vide ou non analysé"], detectedStyles: [] };
  }

  // 1. Analyse des STYLES
  if (config.checkStyles) {
    // On extrait TOUS les styles de l'élève
    studentStyles = await extractStyles(student.wordContent);

    for (const reqStyle of config.stylesToCheck) {
      totalPoints += 5; 
      
      const sStyle = studentStyles.find(s => s.id === reqStyle.id || s.name === reqStyle.name);

      if (!sStyle) {
        details.push(`❌ Style "${reqStyle.name}" introuvable chez l'élève.`);
        continue;
      }

      const styleErrors: string[] = [];
      
      compare("Police", reqStyle.fontName, sStyle.fontName, styleErrors);
      // Tolérance de 0.5pt pour la taille
      if (reqStyle.fontSize && sStyle.fontSize) {
         if (Math.abs(reqStyle.fontSize - sStyle.fontSize) > 0.5) {
            styleErrors.push(`Taille : Attendu ${reqStyle.fontSize}, trouvé ${sStyle.fontSize}`);
         }
      }
      compare("Couleur", reqStyle.color, sStyle.color, styleErrors);
      
      if (reqStyle.isBold !== undefined && reqStyle.isBold !== sStyle.isBold) {
        styleErrors.push(`Gras : Attendu ${reqStyle.isBold ? 'Oui' : 'Non'}, trouvé ${sStyle.isBold ? 'Oui' : 'Non'}`);
      }
      
      if (reqStyle.isItalic !== undefined && reqStyle.isItalic !== sStyle.isItalic) {
        styleErrors.push(`Italique : Attendu ${reqStyle.isItalic ? 'Oui' : 'Non'}, trouvé ${sStyle.isItalic ? 'Oui' : 'Non'}`);
      }

      if (reqStyle.alignment !== undefined) {
         compare("Alignement", reqStyle.alignment, sStyle.alignment, styleErrors);
      }

      if (styleErrors.length === 0) {
        earnedPoints += 5;
      } else {
        details.push(`⚠️ Style "${reqStyle.name}" incorrect : ${styleErrors.join(', ')}`);
      }
    }
  }

  // 2. Analyse de la MISE EN PAGE
  if (config.checkPageSetup) {
    totalPoints += 2;
    const orientation = await detectPageOrientation(student.wordContent);
    
    if (orientation === config.expectedOrientation) {
      earnedPoints += 2;
      details.push(`✅ Orientation page (${orientation}) respectée.`);
    } else {
      details.push(`❌ Orientation incorrecte : Attendu ${config.expectedOrientation}, trouvé ${orientation}.`);
    }
  }

  const finalScore = totalPoints > 0 ? (earnedPoints / totalPoints) * 20 : 0;

  return {
    globalScore: Number(finalScore.toFixed(2)),
    details,
    detectedStyles: studentStyles // On renvoie la liste brute pour l'inspecteur
  };
};