// src/components/screens/ConfigScreen.tsx
import { useState, useEffect } from 'react';
import { Card, Typography, Upload, Select, Input, Space, Checkbox, List, Switch, InputNumber, Button, Divider } from 'antd';
import { InboxOutlined, CheckCircleTwoTone } from '@ant-design/icons';

// Indique à TypeScript que la variable XLSX existe globalement (chargée via index.html)
declare const XLSX: any;

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

// Interface pour la configuration d'une feuille
interface SheetConfig {
  name: string;
  enabled: boolean;
  weight: number;
}

export function ConfigScreen() {
  // State pour l'upload et les feuilles
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');

  // State pour les paramètres d'identité
  const [identitySheet, setIdentitySheet] = useState<string | undefined>(undefined);
  const [studentIdCell, setStudentIdCell] = useState<string>('B2');
  const [groupIdCell, setGroupIdCell] = useState<string>('B3');
  const [trimIdentity, setTrimIdentity] = useState<boolean>(true);
  const [extractIdNumber, setExtractIdNumber] = useState<boolean>(true);
  const [extractGroupNumber, setExtractGroupNumber] = useState<boolean>(true);

  // State pour la configuration des feuilles à corriger
  const [sheetConfigs, setSheetConfigs] = useState<SheetConfig[]>([]);

  // State pour les options globales de notation
  const [globalAbsTolerance, setGlobalAbsTolerance] = useState<number>(0.001);
  const [globalRelTolerance, setGlobalRelTolerance] = useState<number>(0.0001);
  const [checkFormulas, setCheckFormulas] = useState<boolean>(true);
  const [ignoreDollar, setIgnoreDollar] = useState<boolean>(true);
  const [valueOkFormulaKoScore, setValueOkFormulaKoScore] = useState<number>(80);
  const [valueKoFormulaOkScore, setValueKoFormulaOkScore] = useState<number>(0);


  // Effet pour définir la feuille d'identité par défaut et initialiser les configs
  useEffect(() => {
    if (sheetNames.length > 0) {
      if (!identitySheet) {
        setIdentitySheet(sheetNames[0]);
      }
      setSheetConfigs(sheetNames.map(name => ({ name, enabled: true, weight: 1 })));
    } else {
      setSheetConfigs([]);
    }
  }, [sheetNames]);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const loadedSheetNames = workbook.SheetNames;
        setSheetNames(loadedSheetNames);
        setFileName(file.name);
        setIdentitySheet(loadedSheetNames.length > 0 ? loadedSheetNames[0] : undefined);
      } catch (error) {
        console.error("Erreur lors de la lecture du fichier Excel:", error);
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  const handleRemoveFile = () => {
    setSheetNames([]);
    setFileName('');
    setIdentitySheet(undefined);
    setSheetConfigs([]);
    return true;
  }

  const handleSheetConfigChange = (name: string, key: keyof SheetConfig, value: any) => {
    setSheetConfigs(prev => 
      prev.map(config => 
        config.name === name ? { ...config, [key]: value } : config
      )
    );
  };


  return (
    <Card>
      <Title level={4}>Étape 2 : Charger le corrigé et Configurer</Title>
      
      <div style={{ marginBottom: 24 }}>
        <Title level={5}>2.1 Charger le fichier Professeur (corrigé)</Title>
        <Dragger 
          name="file"
          multiple={false}
          accept=".xlsx, .xls, .xlsm"
          beforeUpload={handleFileUpload}
          onRemove={handleRemoveFile}
          maxCount={1}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">Cliquez ou glissez-déposez le fichier du corrigé ici</p>
        </Dragger>
        {fileName && (
          <Paragraph style={{ marginTop: 8, color: 'green' }}>
            <CheckCircleTwoTone twoToneColor="#52c41a" /> "{fileName}" chargé.
          </Paragraph>
        )}
      </div>

      {sheetNames.length > 0 && (
        <>
          <Divider />
          <Title level={5}>2.2 Paramètres "Identité Étudiant"</Title>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text>Feuille contenant l'identité</Text>
              <Select
                value={identitySheet}
                onChange={setIdentitySheet}
                style={{ width: '100%' }}
                options={sheetNames.map(name => ({ label: name, value: name }))}
              />
            </div>
            <Space>
              <div>
                <Text>Cellule "Numéro étudiant"</Text>
                <Input value={studentIdCell} onChange={(e) => setStudentIdCell(e.target.value)} />
              </div>
              <div>
                <Text>Cellule "Groupe"</Text>
                <Input value={groupIdCell} onChange={(e) => setGroupIdCell(e.target.value)} />
              </div>
            </Space>
            <div style={{ paddingTop: 8 }}>
              <Text>Options de nettoyage :</Text>
              <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 4 }}>
                  <Checkbox checked={trimIdentity} onChange={(e) => setTrimIdentity(e.target.checked)}>
                    Supprimer les espaces avant/après (trim)
                  </Checkbox>
                  <Checkbox checked={extractIdNumber} onChange={(e) => setExtractIdNumber(e.target.checked)}>
                    Extraire uniquement les chiffres de l'ID étudiant
                  </Checkbox>
                  <Checkbox checked={extractGroupNumber} onChange={(e) => setExtractGroupNumber(e.target.checked)}>
                    Extraire le numéro du groupe (ex: "Groupe 2" -&gt; 2)
                  </Checkbox>
              </div>
            </div>
          </Space>

          <Divider />
          <Title level={5}>2.3 Paramètres des Feuilles à Corriger</Title>
          <List
            header={<div><Text strong>Feuilles détectées</Text></div>}
            bordered
            dataSource={sheetConfigs}
            renderItem={item => (
              <List.Item
                actions={[<Button type="link">Configurer</Button>]}
              >
                <Space align="center">
                  <Switch 
                    checked={item.enabled} 
                    onChange={(checked) => handleSheetConfigChange(item.name, 'enabled', checked)}
                  />
                  <Text style={{ minWidth: 200 }}>{item.name}</Text>
                  <Text>Poids :</Text>
                  <InputNumber 
                    min={0} 
                    value={item.weight}
                    onChange={(value) => handleSheetConfigChange(item.name, 'weight', value as number)}
                    style={{ width: 70 }}
                  />
                </Space>
              </List.Item>
            )}
          />

          <Divider />
          <Title level={5}>2.4 Options Globales de Notation</Title>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>Mode de calcul :</Text>
              <Paragraph>Mode fiable (recalcul complet) - Activé par défaut</Paragraph>
            </div>
            
            <div>
              <Text strong>Tolérance numérique globale :</Text>
              <Space>
                <Text>Absolue:</Text>
                <InputNumber value={globalAbsTolerance} onChange={v => setGlobalAbsTolerance(v as number)} step="0.001" />
                <Text>Relative:</Text>
                <InputNumber value={globalRelTolerance} onChange={v => setGlobalRelTolerance(v as number)} step="0.0001" />
              </Space>
            </div>

            <div>
              <Text strong>Vérification des formules :</Text>
              <div>
                <Switch checked={checkFormulas} onChange={setCheckFormulas} />
                {checkFormulas && (
                  <Checkbox style={{ marginLeft: 16 }} checked={ignoreDollar} onChange={e => setIgnoreDollar(e.target.checked)}>
                    Accepter les formules sans '
