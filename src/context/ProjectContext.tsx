// src/context/ProjectContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { get, set, del } from 'idb-keyval'; // Importation pour la sauvegarde de fichier

// === TYPES EXCEL ===
export interface SheetConfig {
  name: string;
  enabled: boolean;
  weight: number;
  checkFormulas?: boolean;
  ignoreDollar?: boolean;
  selectedCells: string[];
}

// === TYPES WORD ===
export interface StyleRequirement {
  id: string; 
  name: string; 
  fontName?: string;
  fontSize?: number;
  color?: string;
  isBold?: boolean;
  isItalic?: boolean;
  alignment?: string;
}

export interface SectionRequirement {
  index: number;
  orientation: 'portrait' | 'landscape';
  headerText?: string;
  footerText?: string;
  checkOrientation: boolean;
  checkHeader: boolean;
  checkFooter: boolean;
}

export interface WordConfig {
  checkStyles: boolean;
  stylesToCheck: StyleRequirement[];
  sectionsToCheck: SectionRequirement[]; 
}

export type ProjectType = 'excel' | 'word';

export interface StudentData {
  id: string;
  studentId: string;
  filename: string;
  name: string;
  firstName: string;
  group: string;
  workbook: any;      
  wordContent?: any;  
  status: 'success' | 'error';
  errorMessage?: string;
  idFromFileName?: string | null;
  idFromSheet?: string | null;
  hasIdentityConflict?: boolean;
}

interface ProjectState {
  projectName: string;
  setProjectName: (name: string) => void;
  projectType: ProjectType;
  setProjectType: (type: ProjectType) => void;

  profFile: File | null;
  profWorkbook: any | null;
  profWordData: any | null; 
  setProfData: (file: File | null, data: any) => void;
  
  isRestoring: boolean; // Nouvel état pour savoir si on charge

  sheetConfigs: SheetConfig[];
  setSheetConfigs: (configs: SheetConfig[]) => void;
  updateSheetConfig: (name: string, key: keyof SheetConfig, value: any) => void;

  wordConfig: WordConfig;
  setWordConfig: (config: WordConfig) => void;

  globalOptions: {
    identitySheet?: string;
    studentIdCell: string; 
    studentNameCell: string; 
    studentFirstNameCell: string; 
    groupIdCell: string; 
    trimIdentity: boolean;
    extractIdNumber: boolean;
    extractGroupNumber: boolean;
    globalAbsTolerance: number;
    globalRelTolerance: number;
    checkFormulas: boolean;
    ignoreDollar: boolean;
    scanMaxRows: number;
    scanMaxCols: number;
  };
  setGlobalOption: (key: string, value: any) => void;

  students: StudentData[];
  addStudent: (student: StudentData) => void;
  clearStudents: () => void;
  resetConfig: () => void; // Nouvelle fonction pour tout remettre à zéro
}

const ProjectContext = createContext<ProjectState | undefined>(undefined);
const STORAGE_KEY = 'korexcel_project_config_v5';

export function ProjectProvider({ children }: { children: ReactNode }) {
  // --- ETATS PERSISTANTS (LocalStorage) ---
  const [projectName, setProjectName] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).projectName : '';
  });

  const [projectType, setProjectType] = useState<ProjectType>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved).projectType || 'excel') : 'excel';
  });

  const [sheetConfigs, setSheetConfigs] = useState<SheetConfig[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).sheetConfigs : [];
  });

  const [wordConfig, setWordConfig] = useState<WordConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const loaded = saved ? JSON.parse(saved).wordConfig : null;
    return loaded ? {
      checkStyles: loaded.checkStyles ?? true,
      stylesToCheck: loaded.stylesToCheck || [],
      sectionsToCheck: loaded.sectionsToCheck || [] 
    } : {
      checkStyles: true,
      stylesToCheck: [],
      sectionsToCheck: []
    };
  });
  
  const defaultGlobalOptions = {
    identitySheet: undefined as string | undefined,
    studentIdCell: 'B1',        
    studentNameCell: 'B2',      
    studentFirstNameCell: 'B3', 
    groupIdCell: 'B4',          
    trimIdentity: true,
    extractIdNumber: true,
    extractGroupNumber: true,
    globalAbsTolerance: 0.001,
    globalRelTolerance: 0.0001,
    checkFormulas: true,
    ignoreDollar: true,
    scanMaxRows: 50,
    scanMaxCols: 26,
  };

  const [globalOptions, setGlobalOptions] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaultGlobalOptions, ...JSON.parse(saved).globalOptions } : defaultGlobalOptions;
  });

  // --- ETATS VOLATILES (Mémoire + IndexedDB) ---
  const [profFile, setProfFile] = useState<File | null>(null);
  const [profWorkbook, setProfWorkbook] = useState<any | null>(null);
  const [profWordData, setProfWordData] = useState<any | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [students, setStudents] = useState<StudentData[]>([]);

  // 1. Sauvegarde Config (LocalStorage) à chaque changement
  useEffect(() => {
    const dataToSave = {
      projectName,
      projectType,
      sheetConfigs,
      wordConfig,
      globalOptions
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [projectName, projectType, sheetConfigs, wordConfig, globalOptions]);

  // 2. Restauration du Fichier (IndexedDB) au démarrage
  useEffect(() => {
    const restoreFile = async () => {
      try {
        const file = await get('profFile'); // On récupère le fichier brut
        if (file) {
          setProfFile(file);
          console.log("Fichier restauré:", file.name);
          
          // On doit le ré-analyser car on ne peut pas stocker l'objet Workbook complexe
          const arrayBuffer = await file.arrayBuffer();
          
          if (file.name.endsWith('.docx')) {
             const JSZip = (await import('jszip')).default;
             const zip = await new JSZip().loadAsync(arrayBuffer);
             setProfWordData(zip);
             // On s'assure que le type est bon (priorité au fichier restauré)
             setProjectType('word');
          } else {
             const XLSX = await import('xlsx');
             const wb = XLSX.read(arrayBuffer, { type: 'array' });
             setProfWorkbook(wb);
             setProjectType('excel');
          }
        }
      } catch (err) {
        console.error("Erreur restauration fichier:", err);
      } finally {
        setIsRestoring(false);
      }
    };
    restoreFile();
  }, []);

  // 3. Mise à jour du fichier Prof + Sauvegarde IDB
  const setProfData = async (file: File | null, data: any) => {
    setProfFile(file);
    
    if (file) {
      // Sauvegarde dans IndexedDB
      await set('profFile', file);
      
      if (projectType === 'excel') {
        setProfWorkbook(data);
        setProfWordData(null);
      } else {
        setProfWordData(data);
        setProfWorkbook(null);
      }
    } else {
      // Suppression
      await del('profFile');
      setProfWorkbook(null);
      setProfWordData(null);
    }
  };

  const updateSheetConfig = (name: string, key: keyof SheetConfig, value: any) => {
    setSheetConfigs(prev => 
      prev.map(config => 
        config.name === name ? { ...config, [key]: value } : config
      )
    );
  };

  const setGlobalOption = (key: string, value: any) => {
    setGlobalOptions(prev => ({ ...prev, [key]: value }));
  };

  const addStudent = (student: StudentData) => {
    setStudents(prev => [...prev, student]);
  };

  const clearStudents = () => {
    setStudents([]);
  };

  // Nouvelle fonction pour tout nettoyer si besoin
  const resetConfig = async () => {
    await del('profFile');
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  return (
    <ProjectContext.Provider value={{
      projectName, setProjectName,
      projectType, setProjectType,
      profFile, profWorkbook, profWordData, setProfData,
      isRestoring,
      sheetConfigs, setSheetConfigs, updateSheetConfig,
      wordConfig, setWordConfig, 
      globalOptions, setGlobalOption,
      students, addStudent, clearStudents, resetConfig
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject doit être utilisé à l\'intérieur de ProjectProvider');
  }
  return context;
}