// src/context/ProjectContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

// === DÉFINITION DES TYPES ===

// 1. Config d'une feuille
export interface SheetConfig {
  name: string;
  enabled: boolean;
  weight: number;
  checkFormulas?: boolean;
  ignoreDollar?: boolean;
}

// 2. Données d'un étudiant (C'est l'export qui vous manque !)
export interface StudentData {
  id: string;         // Un identifiant unique
  filename: string;   // Nom du fichier
  name: string;       // Nom extrait
  firstName: string;  // Prénom extrait
  group: string;      // Groupe extrait
  workbook: any;      // Le contenu Excel brut
  status: 'success' | 'error';
  errorMessage?: string;
}

// 3. État global du projet
interface ProjectState {
  // Infos Projet
  projectName: string;
  setProjectName: (name: string) => void;
  
  // Fichier Professeur
  profFile: File | null;
  profWorkbook: any | null;
  setProfData: (file: File | null, workbook: any | null) => void;

  // Config des feuilles
  sheetConfigs: SheetConfig[];
  setSheetConfigs: (configs: SheetConfig[]) => void;
  updateSheetConfig: (name: string, key: keyof SheetConfig, value: any) => void;

  // Options Globales
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
  };
  setGlobalOption: (key: string, value: any) => void;

  // LISTE DES ÉLÈVES
  students: StudentData[];
  addStudent: (student: StudentData) => void;
  clearStudents: () => void;
}

const ProjectContext = createContext<ProjectState | undefined>(undefined);

// === LE PROVIDER ===

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projectName, setProjectName] = useState('');
  const [profFile, setProfFile] = useState<File | null>(null);
  const [profWorkbook, setProfWorkbook] = useState<any | null>(null);
  const [sheetConfigs, setSheetConfigs] = useState<SheetConfig[]>([]);
  const [students, setStudents] = useState<StudentData[]>([]); // Stockage élèves
  
  const [globalOptions, setGlobalOptions] = useState({
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
  });

  const setProfData = (file: File | null, workbook: any | null) => {
    setProfFile(file);
    setProfWorkbook(workbook);
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
      profFile, profWorkbook, setProfData,
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