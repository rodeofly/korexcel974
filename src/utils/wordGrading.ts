// src/utils/wordGrading.ts
import { type StudentData, type WordConfig, type StyleRequirement } from "../context/ProjectContext";
import { extractStyles, detectPageOrientation } from "./docxParser";

export interface WordResultDetails {
  score: number;
  maxScore: number;
  details: string[];
  detectedStyles: StyleRequirement[];
}

const normalize = (str: any) => String(str || "").toLowerCase().trim();

/**
 * Compare deux valeurs de style avec une certaine tolérance
 */
const compare = (label: string, profVal: any, studentVal: any, errors: string[]) => {
  if (profVal === undefined || profVal === null || profVal === "") return true;
  
  const p = normalize(profVal);
  const s = normalize(studentVal);

  // Tolérance spéciale pour les couleurs (parfois avec ou sans #)
  if (label === "Couleur") {
    if (p.replace('#', '') === s.replace('#', '')) return true;
  }

  if (p !== s) {
    errors.push(`${label} : Attendu "${profVal}", trouvé "${studentVal || 'Défaut'}"`);
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
    studentStyles = await extractStyles(student.wordContent);

    for (const reqStyle of config.stylesToCheck) {
      totalPoints += 5; 
      
      // CORRECTION ICI : Recherche insensible à la casse (Heading1 === heading1)
      const sStyle = studentStyles.find(s => 
        normalize(s.id) === normalize(reqStyle.id) || 
        normalize(s.name) === normalize(reqStyle.name)
      );

      if (!sStyle) {
        details.push(`❌ Style "${reqStyle.name}" introuvable chez l'élève.`);
        continue;
      }

      const styleErrors: string[] = [];
      
      compare("Police", reqStyle.fontName, sStyle.fontName, styleErrors);
      
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

  // 2. Analyse MISE EN PAGE
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
    detectedStyles: studentStyles
  };
};