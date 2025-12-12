// src/components/screens/ConfigScreen.tsx
import { useEffect } from 'react';
import { Card, Typography, Upload, Select, Input, Space, Checkbox, List, Switch, InputNumber, Button, Divider } from 'antd';
import { InboxOutlined, CheckCircleTwoTone, ArrowRightOutlined } from '@ant-design/icons';
import { useProject } from '../../context/ProjectContext';

// Indique à TypeScript que la variable XLSX existe globalement (chargée via index.html)
declare const XLSX: any;

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

interface ConfigScreenProps {
  onNavigate: (screen: 'import') => void;
}

export function ConfigScreen({ onNavigate }: ConfigScreenProps) {
  // On récupère toutes les données et fonctions depuis notre "mémoire" globale
  const { 
    profFile, profWorkbook, setProfData,
    sheetConfigs, setSheetConfigs, updateSheetConfig,
    globalOptions, setGlobalOption
  } = useProject();

  // Initialisation automatique des feuilles si nouveau fichier
  useEffect(() => {
    if (profWorkbook && sheetConfigs.length === 0) {
      const names = profWorkbook.SheetNames;
      if (names.length > 0) {
        // Par défaut, la 1ère feuille est celle d'identité
        if (!globalOptions.identitySheet) {
          setGlobalOption('identitySheet', names[0]);
        }
        // On crée une config par défaut pour chaque feuille
        const initialConfigs = names.map((name: string) => ({ 
          name, 
          enabled: true, 
          weight: 1 
        }));
        setSheetConfigs(initialConfigs);
      }
    }
  }, [profWorkbook]);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        // On sauvegarde dans le contexte global
        setProfData(file, workbook);
      } catch (error) {
        console.error("Erreur lors de la lecture du fichier Excel:", error);
      }
    };
    reader.readAsArrayBuffer(file);
    return false; // Empêche l'upload automatique par AntD
  };

  const handleRemoveFile = () => {
    setProfData(null, null);
    setSheetConfigs([]);
    setGlobalOption('identitySheet', undefined);
    return true;
  }

  const sheetNames = profWorkbook ? profWorkbook.SheetNames : [];

  return (
    <Card 
      title={<Title level={4}>Étape 2 : Charger le corrigé et Configurer</Title>}
      actions={[
        <div style={{ padding: '0 24px', textAlign: 'right' }}>
           <Button 
            type="primary" 
            size="large" 
            icon={<ArrowRightOutlined />}
            disabled={!profWorkbook}
            onClick={() => onNavigate('import')}
          >
            Valider et Passer à l'import des élèves
          </Button>
        </div>
      ]}
    >
      
      <div style={{ marginBottom: 24 }}>
        <Title level={5}>2.1 Charger le fichier Professeur (corrigé)</Title>
        <Dragger 
          name="file"
          multiple={false}
          accept=".xlsx, .xls, .xlsm"
          beforeUpload={handleFileUpload}
          onRemove={handleRemoveFile}
          maxCount={1}
          fileList={profFile ? [profFile as any] : []}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">Cliquez ou glissez-déposez le fichier du corrigé ici</p>
        </Dragger>
        {profFile && (
          <Paragraph style={{ marginTop: 8, color: 'green' }}>
            <CheckCircleTwoTone twoToneColor="#52c41a" /> "{profFile.name}" chargé avec succès.
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
                value={globalOptions.identitySheet}
                onChange={(val) => setGlobalOption('identitySheet', val)}
                style={{ width: '100%' }}
                options={sheetNames.map((name: string) => ({ label: name, value: name }))}
              />
            </div>
            <Space>
              <div>
                <Text>Cellule "Numéro étudiant"</Text>
                <Input value={globalOptions.studentIdCell} onChange={(e) => setGlobalOption('studentIdCell', e.target.value)} />
              </div>
              <div>
                <Text>Cellule "Groupe"</Text>
                <Input value={globalOptions.groupIdCell} onChange={(e) => setGlobalOption('groupIdCell', e.target.value)} />
              </div>
            </Space>
            <div style={{ paddingTop: 8 }}>
              <Text>Options de nettoyage :</Text>
              <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 4 }}>
                  <Checkbox checked={globalOptions.trimIdentity} onChange={(e) => setGlobalOption('trimIdentity', e.target.checked)}>
                    Supprimer les espaces avant/après (trim)
                  </Checkbox>
                  <Checkbox checked={globalOptions.extractIdNumber} onChange={(e) => setGlobalOption('extractIdNumber', e.target.checked)}>
                    Extraire uniquement les chiffres de l'ID étudiant
                  </Checkbox>
                  <Checkbox checked={globalOptions.extractGroupNumber} onChange={(e) => setGlobalOption('extractGroupNumber', e.target.checked)}>
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
                actions={[<Button type="link">Configurer (bientôt)</Button>]}
              >
                <Space align="center">
                  <Switch 
                    checked={item.enabled} 
                    onChange={(checked) => updateSheetConfig(item.name, 'enabled', checked)}
                  />
                  <Text style={{ minWidth: 200 }}>{item.name}</Text>
                  <Text>Poids :</Text>
                  <InputNumber 
                    min={0} 
                    value={item.weight}
                    onChange={(value) => updateSheetConfig(item.name, 'weight', value)}
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
              <Paragraph>Mode fiable (recalcul complet)</Paragraph>
            </div>
            
            <div>
              <Text strong>Tolérance numérique globale :</Text>
              <Space>
                <Text>Absolue:</Text>
                <InputNumber 
                  value={globalOptions.globalAbsTolerance} 
                  onChange={v => setGlobalOption('globalAbsTolerance', v)} 
                  step="0.001" 
                />
                <Text>Relative:</Text>
                <InputNumber 
                  value={globalOptions.globalRelTolerance} 
                  onChange={v => setGlobalOption('globalRelTolerance', v)} 
                  step="0.0001" 
                />
              </Space>
            </div>

            <div>
              <Text strong>Vérification des formules :</Text>
              <div>
                <Switch 
                  checked={globalOptions.checkFormulas} 
                  onChange={(c) => setGlobalOption('checkFormulas', c)} 
                />
                {globalOptions.checkFormulas && (
                  <Checkbox 
                    style={{ marginLeft: 16 }} 
                    checked={globalOptions.ignoreDollar} 
                    onChange={e => setGlobalOption('ignoreDollar', e.target.checked)}
                  >
                    Accepter les formules sans '$' (références relatives)
                  </Checkbox>
                )}
              </div>
            </div>
          </Space>
        </>
      )}
    </Card>
  );
}