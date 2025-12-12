// src/utils/docxParser.ts
import JSZip from 'jszip';
import { type StyleRequirement, type SectionRequirement } from '../context/ProjectContext';

/**
 * Extrait tout le texte brut d'un XML (utile pour lire header/footer)
 */
const getXmlTextContent = (xmlString: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "text/xml");
  return (doc.documentElement.textContent || "").trim();
};

/**
 * Analyse les relations pour mapper rId -> Nom de fichier
 * Ex: rId1 -> "header1.xml"
 */
const parseRelationships = async (zip: JSZip): Promise<Record<string, string>> => {
  const rels: Record<string, string> = {};
  try {
    const relsXml = await zip.file("word/_rels/document.xml.rels")?.async("string");
    if (relsXml) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(relsXml, "text/xml");
      const nodes = doc.getElementsByTagName("Relationship");
      for (let i = 0; i < nodes.length; i++) {
        const id = nodes[i].getAttribute("Id");
        const target = nodes[i].getAttribute("Target");
        if (id && target) rels[id] = target;
      }
    }
  } catch (e) {
    console.warn("Erreur lecture relations", e);
  }
  return rels;
};

/**
 * Extrait les styles (Inchangé)
 */
export const extractStyles = async (zip: JSZip): Promise<StyleRequirement[]> => {
  try {
    const stylesXml = await zip.file("word/styles.xml")?.async("string");
    if (!stylesXml) return [];

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(stylesXml, "text/xml");
    
    const styleNodes = xmlDoc.getElementsByTagName("w:style");
    const styles: StyleRequirement[] = [];

    for (let i = 0; i < styleNodes.length; i++) {
      const node = styleNodes[i];
      const type = node.getAttribute("w:type");
      const styleId = node.getAttribute("w:styleId");
      
      if (type === "paragraph" && styleId) {
        const nameNode = node.getElementsByTagName("w:name")[0];
        const name = nameNode ? nameNode.getAttribute("w:val") : styleId;

        const rPr = node.getElementsByTagName("w:rPr")[0];
        let color = undefined;
        let fontSize = undefined;
        let fontName = undefined;
        let isBold = false;
        let isItalic = false;

        if (rPr) {
          const colorNode = rPr.getElementsByTagName("w:color")[0];
          if (colorNode) color = colorNode.getAttribute("w:val");

          const szNode = rPr.getElementsByTagName("w:sz")[0];
          if (szNode) fontSize = Number(szNode.getAttribute("w:val")) / 2;

          const rFonts = rPr.getElementsByTagName("w:rFonts")[0];
          if (rFonts) fontName = rFonts.getAttribute("w:ascii") || rFonts.getAttribute("w:hAnsi");
          
          if (rPr.getElementsByTagName("w:b").length > 0) isBold = true;
          if (rPr.getElementsByTagName("w:i").length > 0) isItalic = true;
        }

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
 * Extrait les sections, leur orientation et le contenu de leurs entêtes/pieds
 */
export const extractSections = async (zip: JSZip): Promise<SectionRequirement[]> => {
  const sections: SectionRequirement[] = [];
  try {
    const docXml = await zip.file("word/document.xml")?.async("string");
    if (!docXml) return [];

    const rels = await parseRelationships(zip); // Chargement des liens vers header/footer
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(docXml, "text/xml");
    
    // On cherche TOUTES les propriétés de section <w:sectPr>
    // Elles peuvent être à la fin du document (dernière section) ou dans un paragraphe (saut de section)
    const sectPrNodes = xmlDoc.getElementsByTagName("w:sectPr");

    for (let i = 0; i < sectPrNodes.length; i++) {
      const sectNode = sectPrNodes[i];
      
      // 1. Orientation
      let orientation: 'portrait' | 'landscape' = 'portrait';
      const pgSz = sectNode.getElementsByTagName("w:pgSz")[0];
      if (pgSz) {
        const orient = pgSz.getAttribute("w:orient");
        if (orient === "landscape") orientation = "landscape";
      }

      // 2. Entête (Header)
      let headerText = "";
      const headerRefs = sectNode.getElementsByTagName("w:headerReference");
      // On cherche l'entête 'default' (il peut y avoir 'first' ou 'even')
      let headerId = null;
      for(let h=0; h<headerRefs.length; h++) {
         if(headerRefs[h].getAttribute("w:type") === "default") headerId = headerRefs[h].getAttribute("r:id");
      }
      
      if (headerId && rels[headerId]) {
         const filename = "word/" + rels[headerId];
         const xml = await zip.file(filename)?.async("string");
         if (xml) headerText = getXmlTextContent(xml);
      }

      // 3. Pied de page (Footer)
      let footerText = "";
      const footerRefs = sectNode.getElementsByTagName("w:footerReference");
      let footerId = null;
      for(let f=0; f<footerRefs.length; f++) {
         if(footerRefs[f].getAttribute("w:type") === "default") footerId = footerRefs[f].getAttribute("r:id");
      }

      if (footerId && rels[footerId]) {
         const filename = "word/" + rels[footerId];
         const xml = await zip.file(filename)?.async("string");
         if (xml) footerText = getXmlTextContent(xml);
      }

      sections.push({
        index: i + 1,
        orientation,
        headerText: headerText.slice(0, 50), // On garde un extrait pour l'affichage
        footerText: footerText.slice(0, 50),
        checkOrientation: true,
        checkHeader: false,
        checkFooter: false
      });
    }

  } catch (e) {
    console.error("Erreur parsing sections", e);
  }
  return sections;
};