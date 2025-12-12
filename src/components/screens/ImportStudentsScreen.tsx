// src/components/screens/ImportStudentsScreen.tsx
import { useState } from 'react';
import { Card, Upload, Typography, List, Tag, Button, Space, message, Avatar } from 'antd';
import { InboxOutlined, UserOutlined, DeleteOutlined, PlayCircleOutlined, FileWordOutlined, TableOutlined } from '@ant-design/icons';
import { useProject, type StudentData } from '../../context/ProjectContext';
import JSZip from 'jszip'; 

// Variable globale XLSX (pour Excel uniquement)
declare const XLSX: any;

const { Dragger } = Upload;
const { Title, Text } = Typography;

interface ImportStudentsScreenProps {
  onNavigate: (screen: 'results') => void;
}

export function ImportStudentsScreen({ onNavigate }: ImportStudentsScreenProps) {
  const { globalOptions, students, addStudent, clearStudents, projectType } = useProject();
  const [processing, setProcessing] = useState(false);

  // --- LOGIQUE EXCEL ---
  const getCellValue = (sheet: any, cellAddress: string): string => {
    if (!sheet || !sheet[cellAddress]) return '';
    return String(sheet[cellAddress].v || '').trim();
  };

  const processExcelFile = (file: File, data: ArrayBuffer) => {
    const workbook = XLSX.read(data, { type: 'array' });
    
    const idSheetName = globalOptions.identitySheet || workbook.SheetNames[0];
    const sheet = workbook.Sheets[idSheetName];

    let name = "Inconnu";
    let firstName = "";
    let group = "";

    if (sheet) {
      name = getCellValue(sheet, globalOptions.studentNameCell) || "Nom Inconnu";
      firstName = getCellValue(sheet, globalOptions.studentFirstNameCell) || "";
      group = getCellValue(sheet, globalOptions.groupIdCell) || "";

      if (globalOptions.trimIdentity) {
        name = name.trim().toUpperCase();
        firstName = firstName.trim();
      }
      if (globalOptions.extractGroupNumber && group) {
         const match = group.match(/\d+/);
         if (match) group = match[0];
      }
    }

    return {
      name, firstName, group,
      workbook,
      wordContent: undefined,
      status: sheet ? 'success' : 'error' as const,
      errorMessage: sheet ? undefined : `Feuille "${idSheetName}" introuvable`
    };
  };

  // --- LOGIQUE WORD (Corrigée pour 8 chiffres) ---
  const processWordFile = async (file: File, data: ArrayBuffer) => {
    try {
      const zip = new JSZip();
      const content = await zip.loadAsync(data);
      
      if (!content.file("word/document.xml")) {
        return {
          name: file.name, firstName: "", group: "?",
          workbook: null, wordContent: null,
          status: 'error' as const, errorMessage: "Pas un fichier .docx valide"
        };
      }

      // 1. On nettoie le nom de fichier (on enlève .docx)
      const rawName = file.name.replace(/\.docx$/i, '');
      
      let name = "Inconnu";
      let firstName = rawName; // Par défaut, tout le nom va dans le prénom

      // 2. REGLE : Chercher 8 chiffres consécutifs
      const idMatch = rawName.match(/(\d{8})/);

      if (idMatch) {
        name = idMatch[0]; // "42000894" devient le NOM (Identifiant principal)
        // On enlève le numéro du reste pour faire le prénom
        firstName = rawName.replace(idMatch[0], '').trim().replace(/^[_-\s]+|[_-\s]+$/g, '');
        if (!firstName) firstName = "(Etudiant)";
      } else {
        // Si pas de numéro trouvé, on garde le comportement par défaut
        name = rawName;
        firstName = "";
      }

      return {
        name, 
        firstName, 
        group: "Word", 
        workbook: null,
        wordContent: content, 
        status: 'success' as const,
        errorMessage: undefined
      };

    } catch (e) {
      console.error(e);
      return {
        name: file.name, firstName: "", group: "",
        workbook: null, wordContent: null,
        status: 'error' as const, errorMessage: "Erreur lecture fichier"
      };
    }
  };

  // --- GESTIONNAIRE PRINCIPAL ---
  const handleFileUpload = async (file: File) => {
    setProcessing(true);
    
    // Vérification de l'extension
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isWord = file.name.endsWith('.docx');

    if (projectType === 'excel' && !isExcel) {
      message.error(`${file.name} : Fichier Excel requis`);
      setProcessing(false);
      return false;
    }
    if (projectType === 'word' && !isWord) {
      message.error(`${file.name} : Fichier Word requis`);
      setProcessing(false);
      return false;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        let studentInfo;

        if (projectType === 'word') {
          studentInfo = await processWordFile(file, data);
        } else {
          studentInfo = processExcelFile(file, data);
        }

        const newStudent: StudentData = {
          id: file.name + Date.now(),
          filename: file.name,
          ...studentInfo
        };

        addStudent(newStudent);
        message.success(`${file.name} importé`);

      } catch (error) {
        console.error(error);
        message.error(`Erreur fatale sur ${file.name}`);
      } finally {
        setProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
    
    return false; 
  };

  // Configuration de l'affichage
  const isWordMode = projectType === 'word';
  const acceptExt = isWordMode ? ".docx" : ".xlsx, .xls";
  const dropText = isWordMode ? "Glissez les fichiers WORD (.docx) des élèves" : "Glissez les fichiers EXCEL (.xlsx) des élèves";
  const Icon = isWordMode ? FileWordOutlined : TableOutlined;

  return (
    <Card 
      title={<Title level={4}>Étape 3 : Importer les copies élèves ({isWordMode ? "Word" : "Excel"})</Title>}
      extra={
        <Button danger onClick={clearStudents} icon={<DeleteOutlined />}>
          Tout effacer
        </Button>
      }
      actions={[
        <div style={{ padding: '0 24px', textAlign: 'right' }}>
           <Button 
            type="primary" 
            size="large" 
            icon={<PlayCircleOutlined />}
            disabled={students.length === 0}
            onClick={() => onNavigate('results')}
          >
            Lancer la correction ({students.length} copies)
          </Button>
        </div>
      ]}
    >
      <div style={{ marginBottom: 24 }}>
        <Dragger
          name="files"
          multiple={true}
          accept={acceptExt}
          beforeUpload={handleFileUpload}
          showUploadList={false}
          style={{ padding: 20, background: isWordMode ? '#f0f5ff' : '#f6ffed' }}
        >
          <p className="ant-upload-drag-icon">
            <Icon style={{ color: isWordMode ? '#1890ff' : '#52c41a' }} />
          </p>
          <p className="ant-upload-text">
            {dropText}
          </p>
          <p className="ant-upload-hint">
            {isWordMode 
              ? "Recherche automatique du N° Étudiant (8 chiffres) dans le nom du fichier." 
              : "L'identité sera lue automatiquement dans les cellules configurées."}
          </p>
        </Dragger>
      </div>

      <Title level={5}>Étudiants détectés ({students.length})</Title>
      
      <List
        grid={{ gutter: 16, column: 2 }}
        dataSource={students}
        renderItem={student => (
          <List.Item>
            <Card size="small" style={{ borderColor: student.status === 'error' ? '#ffccc7' : '#d9d9d9' }}>
              <List.Item.Meta
                avatar={<Avatar style={{ backgroundColor: isWordMode ? '#1890ff' : '#52c41a' }} icon={<UserOutlined />} />}
                title={<Text strong>{student.name}</Text>}
                description={
                  <Space direction="vertical" size={0}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{student.firstName || student.filename}</Text>
                    <Space>
                      {student.group && <Tag color="blue">{student.group}</Tag>}
                      {student.status === 'error' && <Tag color="error">{student.errorMessage}</Tag>}
                    </Space>
                  </Space>
                }
              />
            </Card>
          </List.Item>
        )}
      />
    </Card>
  );
}