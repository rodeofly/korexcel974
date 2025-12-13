// src/components/screens/ImportStudentsScreen.tsx
import { useState, useRef, useEffect } from 'react';
import { Card, Upload, Typography, List, Tag, Button, Space, message, Avatar, Spin, Tooltip } from 'antd';
import { InboxOutlined, UserOutlined, DeleteOutlined, PlayCircleOutlined, FileWordOutlined, TableOutlined, WarningOutlined } from '@ant-design/icons';
import { useProject, type StudentData } from '../../context/ProjectContext';
import JSZip from 'jszip'; 

const { Dragger } = Upload;
const { Title, Text } = Typography;

interface ImportStudentsScreenProps {
  onNavigate: (screen: 'results') => void;
}

export function ImportStudentsScreen({ onNavigate }: ImportStudentsScreenProps) {
  const { globalOptions, students, addStudent, clearStudents, projectType } = useProject();
  const [processing, setProcessing] = useState(false);

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (projectType === 'excel') {
      // On s'assure que le chemin est correct pour Vite
      workerRef.current = new Worker(new URL('../../workers/excel.worker.ts', import.meta.url), { type: 'module' });
    }
    return () => {
      workerRef.current?.terminate();
    };
  }, [projectType]);

  const processWordFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const zip = new JSZip();
      const content = await zip.loadAsync(data);
      
      if (!content.file("word/document.xml")) {
        throw new Error("Pas un fichier .docx valide");
      }

      const rawName = file.name.replace(/\.docx$/i, '');
      const idMatch = rawName.match(/(\d{8})/);
      
      let name = rawName;
      let studentId = "Inconnu";

      if (idMatch) {
        studentId = idMatch[0];
        name = idMatch[0];
      }

      return {
        studentId,
        name, 
        firstName: "", 
        group: "Word", 
        workbook: null,
        wordContent: content, 
        status: 'success' as const,
        idFromFileName: studentId !== "Inconnu" ? studentId : null,
        idFromSheet: null,
        hasIdentityConflict: false
      };

    } catch (e: any) {
      return {
        studentId: "Erreur",
        name: file.name, 
        firstName: "", 
        group: "",
        workbook: null, 
        wordContent: null,
        status: 'error' as const, 
        errorMessage: e.message
      };
    }
  };

  const processExcelWithWorker = (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) return reject("Worker Excel non initialisé");

      const handleMessage = (e: MessageEvent) => {
        const { status, data, message } = e.data;
        workerRef.current?.removeEventListener('message', handleMessage);
        
        if (status === 'success') {
          resolve(data);
        } else {
          reject(message);
        }
      };

      workerRef.current.addEventListener('message', handleMessage);
      workerRef.current.postMessage({ file, globalOptions });
    });
  };

  const handleFileUpload = async (file: File) => {
    setProcessing(true);
    try {
        let result;
        if (projectType === 'excel') {
            result = await processExcelWithWorker(file);
        } else {
            result = await processWordFile(file);
        }

        const newStudent: StudentData = {
           id: file.name + Date.now(),
           filename: file.name,
           
           studentId: result.id || result.studentId,
           name: result.name,
           firstName: result.firstName,
           group: result.group,
           workbook: result.workbook,
           wordContent: result.wordContent,
           
           status: result.status || 'success',
           errorMessage: result.errorMessage,
           
           idFromFileName: result.idFromFileName,
           idFromSheet: result.idFromSheet,
           hasIdentityConflict: result.hasConflict
         };
         
         addStudent(newStudent);
         message.success(`${file.name} traité`);

    } catch (err: any) {
        console.error(err);
        message.error(`Erreur sur ${file.name}: ${err}`);
    } finally {
        setProcessing(false);
    }
    return false; 
  };

  const isWordMode = projectType === 'word';
  const acceptExt = isWordMode ? ".docx" : ".xlsx, .xls";
  const dropText = isWordMode ? "Glissez les fichiers WORD (.docx)" : "Glissez les fichiers EXCEL (.xlsx)";
  const Icon = isWordMode ? FileWordOutlined : TableOutlined;

  return (
    <Card 
      title={<Title level={4}>Étape 3 : Importer les copies ({isWordMode ? "Word" : "Excel"})</Title>}
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
            disabled={students.length === 0 || processing}
            onClick={() => onNavigate('results')}
            loading={processing}
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
          {/* CORRECTION ICI : Remplacement des <p> par des <div> */}
          <div className="ant-upload-drag-icon">
            {processing ? <Spin /> : <Icon style={{ color: isWordMode ? '#1890ff' : '#52c41a' }} />}
          </div>
          <div className="ant-upload-text">{dropText}</div>
          <div className="ant-upload-hint">
            Détection automatique des conflits d'identité (Nom de fichier vs Contenu).
          </div>
        </Dragger>
      </div>

      <Title level={5}>Étudiants détectés ({students.length})</Title>
      
      <List
        grid={{ gutter: 16, column: 2 }}
        dataSource={students}
        renderItem={student => (
          <List.Item>
            <Card 
              size="small" 
              style={{ 
                borderColor: student.hasIdentityConflict ? '#faad14' : (student.status === 'error' ? '#ffccc7' : '#d9d9d9'),
                background: student.hasIdentityConflict ? '#fffbe6' : undefined 
              }}
            >
              <List.Item.Meta
                avatar={
                  <Avatar 
                    style={{ backgroundColor: student.hasIdentityConflict ? '#faad14' : (isWordMode ? '#1890ff' : '#52c41a') }} 
                    icon={student.hasIdentityConflict ? <WarningOutlined /> : <UserOutlined />} 
                  />
                }
                title={
                  <Space>
                    <Text strong>{student.name}</Text>
                    {student.hasIdentityConflict && (
                      <Tooltip title={`Fichier: ${student.idFromFileName} ≠ Feuille: ${student.idFromSheet}`}>
                        <Tag color="warning">Conflit ID</Tag>
                      </Tooltip>
                    )}
                  </Space>
                }
                description={
                  // CORRECTION : Space deprecated warning -> orientation
                  <Space direction="vertical" size={0} style={{ width: '100%' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{student.firstName || student.filename}</Text>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>ID: {student.studentId}</Text>
                      {student.group && <Tag color="blue" style={{ fontSize: 10, lineHeight: '18px' }}>Gr. {student.group}</Tag>}
                    </div>
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