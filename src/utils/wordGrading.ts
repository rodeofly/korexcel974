// src/utils/wordGrading.ts
import { type StudentData, type WordConfig, type StyleRequirement, type SectionRequirement } from "../context/ProjectContext";
import { extractStyles, extractSections } from "./docxParser";

export interface WordResultDetails {
  score: number;
  maxScore: number;
  details: string[];
  detectedStyles: StyleRequirement[];
}

const normalize = (str: any) => String(str || "").toLowerCase().trim();

const compare = (label: string, profVal: any, studentVal: any, errors: string[]) => {
  if (profVal === undefined || profVal === null || profVal === "") return true;
  const p = normalize(profVal);
  const s = normalize(studentVal);
  if (label === "Couleur" && p.replace('#', '') === s.replace('#', '')) return true;
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
    return { globalScore: 0, details: ["Document vide"], detectedStyles: [] };
  }

  // 1. Analyse des STYLES (50% de la note)
  if (config.checkStyles) {
    studentStyles = await extractStyles(student.wordContent);
    for (const reqStyle of config.stylesToCheck) {
      totalPoints += 5; 
      const sStyle = studentStyles.find(s => normalize(s.id) === normalize(reqStyle.id) || normalize(s.name) === normalize(reqStyle.name));

      if (!sStyle) {
        details.push(`❌ Style "${reqStyle.name}" introuvable.`);
        continue;
      }
      const styleErrors: string[] = [];
      compare("Police", reqStyle.fontName, sStyle.fontName, styleErrors);
      if (reqStyle.fontSize && sStyle.fontSize) {
         if (Math.abs(reqStyle.fontSize - sStyle.fontSize) > 0.5) styleErrors.push(`Taille : Attendu ${reqStyle.fontSize}, trouvé ${sStyle.fontSize}`);
      }
      compare("Couleur", reqStyle.color, sStyle.color, styleErrors);
      if (reqStyle.isBold !== undefined && reqStyle.isBold !== sStyle.isBold) styleErrors.push(`Gras incorrect`);
      if (reqStyle.isItalic !== undefined && reqStyle.isItalic !== sStyle.isItalic) styleErrors.push(`Italique incorrect`);
      
      if (styleErrors.length === 0) earnedPoints += 5;
      else details.push(`⚠️ Style "${reqStyle.name}" : ${styleErrors.join(', ')}`);
    }
  }

  // 2. Analyse des SECTIONS (50% de la note)
  const studentSections = await extractSections(student.wordContent);
  
  for (const reqSect of config.sectionsToCheck) {
    // On essaie de trouver la section correspondante par index
    const sSect = studentSections.find(s => s.index === reqSect.index);

    if (!sSect) {
      if (reqSect.checkOrientation || reqSect.checkHeader || reqSect.checkFooter) {
         details.push(`❌ Section ${reqSect.index} manquante.`);
         totalPoints += 2; // Pénalité
      }
      continue;
    }

    if (reqSect.checkOrientation) {
      totalPoints += 2;
      if (reqSect.orientation === sSect.orientation) {
        earnedPoints += 2;
        details.push(`✅ Section ${reqSect.index} : Orientation ${sSect.orientation} OK.`);
      } else {
        details.push(`❌ Section ${reqSect.index} : Orientation incorrecte (Attendu ${reqSect.orientation}, trouvé ${sSect.orientation}).`);
      }
    }

    if (reqSect.checkHeader && reqSect.headerText) {
      totalPoints += 2;
      // Comparaison souple : est-ce que le texte attendu est contenu dans l'entête ?
      if (sSect.headerText && normalize(sSect.headerText).includes(normalize(reqSect.headerText))) {
        earnedPoints += 2;
        details.push(`✅ Section ${reqSect.index} : Entête correct.`);
      } else {
        details.push(`❌ Section ${reqSect.index} : Entête incorrect ou absent.`);
      }
    }
    
    if (reqSect.checkFooter && reqSect.footerText) {
      totalPoints += 2;
      if (sSect.footerText && normalize(sSect.footerText).includes(normalize(reqSect.footerText))) {
        earnedPoints += 2;
        details.push(`✅ Section ${reqSect.index} : Pied de page correct.`);
      } else {
        details.push(`❌ Section ${reqSect.index} : Pied de page incorrect.`);
      }
    }
  }

  const finalScore = totalPoints > 0 ? (earnedPoints / totalPoints) * 20 : 0;

  return {
    globalScore: Number(finalScore.toFixed(2)),
    details,
    detectedStyles: studentStyles
  };
};