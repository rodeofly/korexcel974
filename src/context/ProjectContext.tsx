// src/context/ProjectContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// === TYPES ===

export type ProjectType = 'excel' | 'word'; // <--- NOUVEAU TYPE

export interface SheetConfig {
  name: string;
  enabled: boolean;
  weight: number;
  checkFormulas?: boolean;
  ignoreDollar?: boolean;
  selectedCells: string[];
}

export interface StudentData {
  id: string;
  filename: string;
  name: string;
  firstName: string;
  group: string;
  workbook: any;      // Pour Excel
  wordContent?: any;  // Pour Word (contenu dézippé) <--- NOUVEAU CHAMP
  status: 'success' | 'error';
  errorMessage?: string;
}

interface ProjectState {
  projectName: string;
  setProjectName: (name: string) => void;
  
  // NOUVEAU : Type de projet
  projectType: ProjectType;
  setProjectType: (type: ProjectType) => void;

  profFile: File | null;
  profWorkbook: any | null;
  // NOUVEAU : Données prof Word
  profWordData: any | null; 
  
  setProfData: (file: File | null, data: any) => void;

  sheetConfigs: SheetConfig[];
  setSheetConfigs: (configs: SheetConfig[]) => void;
  updateSheetConfig: (name: string, key: keyof SheetConfig, value: any) => void;

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
const STORAGE_KEY = 'korexcel_project_config_v2'; // Changement de version v2

export function ProjectProvider({ children }: { children: ReactNode }) {
  
  // Chargement initial
  const [projectName, setProjectName] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).projectName : '';
  });

  // NOUVEAU STATE
  const [projectType, setProjectType] = useState<ProjectType>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved).projectType || 'excel') : 'excel';
  });

  const [profFile, setProfFile] = useState<File | null>(null);
  const [profWorkbook, setProfWorkbook] = useState<any | null>(null);
  const [profWordData, setProfWordData] = useState<any | null>(null); // Pour Word

  const [sheetConfigs, setSheetConfigs] = useState<SheetConfig[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).sheetConfigs : [];
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

  // Sauvegarde auto
  useEffect(() => {
    const dataToSave = {
      projectName,
      projectType, // On sauvegarde aussi le type
      sheetConfigs,
      globalOptions
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [projectName, projectType, sheetConfigs, globalOptions]);


  const setProfData = (file: File | null, data: any) => {
    setProfFile(file);
    if (projectType === 'excel') {
      setProfWorkbook(data);
      setProfWordData(null);
    } else {
      setProfWordData(data); // On stockera le zip ou le XML ici
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