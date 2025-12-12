// src/context/ProjectContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// === TYPES EXCEL ===
export interface SheetConfig {
  name: string;
  enabled: boolean;
  weight: number;
  checkFormulas?: boolean;
  ignoreDollar?: boolean;
  selectedCells: string[];
}

// === TYPES WORD (EVOLUÉ) ===
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
  index: number; // Section 1, 2...
  orientation: 'portrait' | 'landscape';
  headerText?: string; // Texte contenu dans l'entête
  footerText?: string; // Texte contenu dans le pied de page
  checkOrientation: boolean;
  checkHeader: boolean;
  checkFooter: boolean;
}

export interface WordConfig {
  checkStyles: boolean;
  stylesToCheck: StyleRequirement[];
  // NOUVEAU : Liste des sections à vérifier
  sectionsToCheck: SectionRequirement[]; 
}

export type ProjectType = 'excel' | 'word';

export interface StudentData {
  id: string;
  filename: string;
  name: string;
  firstName: string;
  group: string;
  workbook: any;      
  wordContent?: any;  
  status: 'success' | 'error';
  errorMessage?: string;
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
}

const ProjectContext = createContext<ProjectState | undefined>(undefined);
const STORAGE_KEY = 'korexcel_project_config_v4'; // Version 4

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projectName, setProjectName] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).projectName : '';
  });

  const [projectType, setProjectType] = useState<ProjectType>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved).projectType || 'excel') : 'excel';
  });

  const [profFile, setProfFile] = useState<File | null>(null);
  const [profWorkbook, setProfWorkbook] = useState<any | null>(null);
  const [profWordData, setProfWordData] = useState<any | null>(null);

  const [sheetConfigs, setSheetConfigs] = useState<SheetConfig[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).sheetConfigs : [];
  });

  const [wordConfig, setWordConfig] = useState<WordConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    // Migration v3 -> v4 : on ajoute sectionsToCheck par défaut
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

  const [students, setStudents] = useState<StudentData[]>([]);

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


  const setProfData = (file: File | null, data: any) => {
    setProfFile(file);
    if (projectType === 'excel') {
      setProfWorkbook(data);
      setProfWordData(null);
    } else {
      setProfWordData(data);
      setProfWorkbook(null);
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

  return (
    <ProjectContext.Provider value={{
      projectName, setProjectName,
      projectType, setProjectType,
      profFile, profWorkbook, profWordData, setProfData,
      sheetConfigs, setSheetConfigs, updateSheetConfig,
      wordConfig, setWordConfig, 
      globalOptions, setGlobalOption,
      students, addStudent, clearStudents
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