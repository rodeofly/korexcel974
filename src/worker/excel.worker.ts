// src/workers/excel.worker.ts
import * as XLSX from 'xlsx';

interface ParseRequest {
  file: File;
  globalOptions: any;
}

self.onmessage = async (e: MessageEvent<ParseRequest>) => {
  const { file, globalOptions } = e.data;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // 1. Extraction ID depuis le Nom de Fichier (Regex 8 chiffres)
    // "Moodle_Exo1_42000123_Nom.xlsx" -> "42000123"
    const fileNameClean = file.name.replace(/\.[^/.]+$/, "");
    const fileNameIdMatch = fileNameClean.match(/(\d{8})/);
    const idFromFileName = fileNameIdMatch ? fileNameIdMatch[0] : null;

    // 2. Extraction ID depuis la Feuille Excel
    const idSheetName = globalOptions.identitySheet || workbook.SheetNames[0];
    const sheet = workbook.Sheets[idSheetName];
    
    let idFromSheet: string | null = null;
    let name = "Inconnu";
    let firstName = "";
    let group = "";

    if (sheet) {
      const getVal = (addr: string) => sheet[addr] ? String(sheet[addr].v).trim() : "";
      
      idFromSheet = getVal(globalOptions.studentIdCell) || null;
      name = getVal(globalOptions.studentNameCell) || "Nom Inconnu";
      firstName = getVal(globalOptions.studentFirstNameCell);
      group = getVal(globalOptions.groupIdCell);

      // Nettoyage de l'ID feuille pour ne garder que les chiffres (si format "N° 1234")
      if (idFromSheet) {
          const match = idFromSheet.match(/(\d+)/);
          if (match) idFromSheet = match[0];
      }
    }

    // 3. Logique de Conflit
    let finalId = "Inconnu";
    let conflict = false;

    if (idFromFileName && idFromSheet) {
      if (idFromFileName !== idFromSheet) {
        conflict = true;
        finalId = idFromFileName; // Par défaut on prend le fichier (souvent + fiable)
      } else {
        finalId = idFromFileName;
      }
    } else if (idFromFileName) {
      finalId = idFromFileName;
    } else if (idFromSheet) {
      finalId = idFromSheet;
    }

    // Identité de secours si "Inconnu"
    if (name === "Inconnu" && idFromFileName) {
       // Si on n'a pas trouvé de nom dans le fichier, on utilise le nom du fichier
       name = fileNameClean;
    }

    self.postMessage({
      status: 'success',
      data: {
        id: finalId, // ID retenu par défaut
        idFromFileName,
        idFromSheet,
        hasConflict: conflict,
        name,
        firstName,
        group,
        workbook // On renvoie le workbook pour la correction
      }
    });

  } catch (error: any) {
    self.postMessage({
      status: 'error',
      message: error.message || "Erreur inconnue dans le worker"
    });
  }
};