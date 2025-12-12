// src/utils/docxParser.ts
import JSZip from 'jszip';
import { StyleRequirement } from '../context/ProjectContext';

// Namespaces XML utilisés par Word
const NS = {
  w: "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
};

/**
 * Extrait les styles définis dans le document Word
 */
export const extractStyles = async (zip: JSZip): Promise<StyleRequirement[]> => {
  try {
    const stylesXml = await zip.file("word/styles.xml")?.async("string");
    if (!stylesXml) return [];

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(stylesXml, "text/xml");
    
    // On récupère tous les styles de type "paragraph"
    const styleNodes = xmlDoc.getElementsByTagName("w:style");
    const styles: StyleRequirement[] = [];

    for (let i = 0; i < styleNodes.length; i++) {
      const node = styleNodes[i];
      const type = node.getAttribute("w:type");
      const styleId = node.getAttribute("w:styleId");
      
      // On s'intéresse surtout aux styles de paragraphe (Titre 1, Normal, etc.)
      if (type === "paragraph" && styleId) {
        const nameNode = node.getElementsByTagName("w:name")[0];
        const name = nameNode ? nameNode.getAttribute("w:val") : styleId;

        // Analyse des propriétés de police (rPr)
        const rPr = node.getElementsByTagName("w:rPr")[0];
        let color = undefined;
        let fontSize = undefined;
        let fontName = undefined;
        let isBold = false;
        let isItalic = false;

        if (rPr) {
          // Couleur
          const colorNode = rPr.getElementsByTagName("w:color")[0];
          if (colorNode) color = colorNode.getAttribute("w:val");

          // Taille (Word stocke en demi-points, donc 24 = 12pt)
          const szNode = rPr.getElementsByTagName("w:sz")[0];
          if (szNode) fontSize = Number(szNode.getAttribute("w:val")) / 2;

          // Police
          const rFonts = rPr.getElementsByTagName("w:rFonts")[0];
          if (rFonts) fontName = rFonts.getAttribute("w:ascii") || rFonts.getAttribute("w:hAnsi");
          
          // Gras / Italique
          if (rPr.getElementsByTagName("w:b").length > 0) isBold = true;
          if (rPr.getElementsByTagName("w:i").length > 0) isItalic = true;
        }

        // Alignement (pPr -> jc)
        let alignment = 'left';
        const pPr = node.getElementsByTagName("w:pPr")[0];
        if (pPr) {
           const jc = pPr.getElementsByTagName("w:jc")[0];
           if (jc) alignment = jc.getAttribute("w:val") || 'left';
        }

        styles.push({
          id: styleId,
          name: name || styleId,
          color,
          fontSize,
          fontName,
          isBold,
          isItalic,
          alignment
        });
      }
    }
    
    // On filtre les styles "système" inutiles pour ne garder que ceux pertinents (Titres, Normal...)
    // Ou on renvoie tout et on laisse l'UI filtrer
    return styles.filter(s => 
      s.id.toLowerCase().includes("heading") || 
      s.id.toLowerCase().includes("titre") ||
      s.id.toLowerCase() === "normal"
    );

  } catch (e) {
    console.error("Erreur parsing styles", e);
    return [];
  }
};

/**
 * Détecte l'orientation globale du document (Portrait/Paysage)
 */
export const detectPageOrientation = async (zip: JSZip): Promise<'portrait' | 'landscape'> => {
  try {
    const docXml = await zip.file("word/document.xml")?.async("string");
    if (!docXml) return 'portrait';

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(docXml, "text/xml");
    
    // On cherche la section properties <w:sectPr>
    const sectPrs = xmlDoc.getElementsByTagName("w:sectPr");
    if (sectPrs.length > 0) {
      // On regarde la dernière section définie (souvent la principale)
      const lastSect = sectPrs[sectPrs.length - 1];
      const pgSz = lastSect.getElementsByTagName("w:pgSz")[0];
      if (pgSz) {
        const orient = pgSz.getAttribute("w:orient");
        if (orient === "landscape") return "landscape";
      }
    }
    return 'portrait';
  } catch (e) {
    console.error("Erreur parsing orientation", e);
    return 'portrait';
  }
};