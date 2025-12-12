// src/components/screens/ImportStudentsScreen.tsx
import { useState } from 'react';
import { Card, Upload, Typography, List, Tag, Button, Space, message, Avatar } from 'antd';
import { InboxOutlined, UserOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useProject, StudentData } from '../../context/ProjectContext';

// Variable globale XLSX
declare const XLSX: any;

const { Dragger } = Upload;
const { Title, Text } = Typography;

interface ImportStudentsScreenProps {
  onNavigate: (screen: 'results') => void;
}

export function ImportStudentsScreen({ onNavigate }: ImportStudentsScreenProps) {
  const { globalOptions, students, addStudent, clearStudents } = useProject();
  const [processing, setProcessing] = useState(false);

  // Fonction utilitaire pour lire une cellule (ex: "B2")
  const getCellValue = (sheet: any, cellAddress: string): string => {
    if (!sheet || !sheet[cellAddress]) return '';
    return String(sheet[cellAddress].v || '').trim();
  };

  const handleFileUpload = async (file: File) => {
    setProcessing(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Extraction de l'identité
        const idSheetName = globalOptions.identitySheet || workbook.SheetNames[0];
        const sheet = workbook.Sheets[idSheetName];

        let name = "Inconnu";
        let firstName = "";
        let group = "Aucun";

        if (sheet) {
          // Lecture des cellules configurées
          name = getCellValue(sheet, globalOptions.studentNameCell) || "Nom Inconnu";
          firstName = getCellValue(sheet, globalOptions.studentFirstNameCell) || "";
          group = getCellValue(sheet, globalOptions.groupIdCell) || "";

          // Nettoyage (Trim)
          if (globalOptions.trimIdentity) {
            name = name.trim().toUpperCase();
            firstName = firstName.trim();
          }
          // Extraction Groupe (ex: "Groupe 2" -> "2")
          if (globalOptions.extractGroupNumber && group) {
             const match = group.match(/\d+/);
             if (match) group = match[0];
          }
        }

        const newStudent: StudentData = {
          id: file.name + Date.now(),
          filename: file.name,
          name,
          firstName,
          group,
          workbook,
          status: sheet ? 'success' : 'error',
          errorMessage: sheet ? undefined : `Feuille "${idSheetName}" introuvable`
        };

        addStudent(newStudent);
        message.success(`${file.name} importé`);

      } catch (error) {
        console.error(error);
        message.error(`Erreur lecture ${file.name}`);
      } finally {
        setProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
    
    return false; // Bloque l'upload automatique
  };

  return (
    <Card 
      title={<Title level={4}>Étape 3 : Importer les copies élèves</Title>}
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
          accept=".xlsx, .xls"
          beforeUpload={handleFileUpload}
          showUploadList={false}
          style={{ padding: 20 }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            Glissez-déposez TOUS les fichiers Excel des élèves ici
          </p>
          <p className="ant-upload-hint">
            L'analyse de l'identité se fera automatiquement selon vos réglages.
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
                avatar={<Avatar style={{ backgroundColor: '#87d068' }} icon={<UserOutlined />} />}
                title={<Text strong>{student.name} {student.firstName}</Text>}
                description={
                  <Space direction="vertical" size={0}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{student.filename}</Text>
                    <Space>
                      <Tag color="blue">Gr: {student.group}</Tag>
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