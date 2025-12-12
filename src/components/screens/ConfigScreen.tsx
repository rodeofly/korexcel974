// src/components/screens/ConfigScreen.tsx
import { useState, useEffect } from 'react';
import { Card, Typography, Upload, Select, Input, Space } from 'antd';
import { InboxOutlined } from '@ant-design/icons';

// Indique à TypeScript que la variable XLSX existe globalement (chargée via index.html)
declare const XLSX: any;

const { Title, Text } = Typography;
const { Dragger } = Upload;

export function ConfigScreen() {
  // State pour l'upload et les feuilles
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');

  // State pour les paramètres d'identité
  const [identitySheet, setIdentitySheet] = useState<string | undefined>(undefined);
  const [studentIdCell, setStudentIdCell] = useState<string>('B2');
  const [groupIdCell, setGroupIdCell] = useState<string>('B3');

  // Effet pour définir la feuille d'identité par défaut une fois les feuilles chargées
  useEffect(() => {
    if (sheetNames.length > 0 && !identitySheet) {
      setIdentitySheet(sheetNames[0]);
    }
  }, [sheetNames, identitySheet]);


  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        setSheetNames(workbook.SheetNames);
        setFileName(file.name);
        // Réinitialiser la feuille d'identité si on charge un nouveau fichier
        setIdentitySheet(workbook.SheetNames.length > 0 ? workbook.SheetNames[0] : undefined);
      } catch (error) {
        console.error("Erreur lors de la lecture du fichier Excel:", error);
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  return (
    <Card>
      <Title level={4}>2. Charger corrigé + Configuration</Title>
      
      <div style={{ marginBottom: 24 }}>
        <Title level={5}>2.1 Charger le fichier prof (corrigé)</Title>
        <Dragger 
          name="file"
          multiple={false}
          accept=".xlsx, .xls, .xlsm"
          beforeUpload={handleFileUpload}
          onRemove={() => {
            setSheetNames([]);
            setFileName('');
            setIdentitySheet(undefined);
          }}
          maxCount={1}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">Cliquez ou glissez-déposez le fichier du corrigé ici</p>
        </Dragger>
      </div>

      {sheetNames.length > 0 && (
        <>
          <div style={{ marginBottom: 24 }}>
            <Title level={5}>Feuilles détectées dans "{fileName}"</Title>
            <div style={{ border: '1px solid #d9d9d9', borderRadius: '2px', padding: '8px' }}>
              {sheetNames.map(name => <div key={name}>{name}</div>)}
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <Title level={5}>2.2 Paramètres "Identité étudiant"</Title>
            <Space orientation="vertical" style={{ width: '100%' }}>
              <div>
                <Text>Feuille contenant l'identité</Text>
                <Select
                  value={identitySheet}
                  onChange={setIdentitySheet}
                  style={{ width: '100%' }}
                  options={sheetNames.map(name => ({ label: name, value: name }))}
                />
              </div>
              <div>
                <Text>Cellule "Numéro étudiant"</Text>
                <Input value={studentIdCell} onChange={(e) => setStudentIdCell(e.target.value)} />
              </div>
              <div>
                <Text>Cellule "Groupe"</Text>
                <Input value={groupIdCell} onChange={(e) => setGroupIdCell(e.target.value)} />
              </div>
            </Space>
          </div>
        </>
      )}
    </Card>
  );
}
