// src/components/screens/ConfigScreen.tsx
import { useEffect, useState } from 'react';
import { Card, Typography, Upload, Select, Input, Space, Checkbox, List, Switch, InputNumber, Button, Divider, Alert } from 'antd';
import { InboxOutlined, CheckCircleTwoTone, ArrowRightOutlined, SettingOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useProject } from '../../context/ProjectContext';
import { SheetConfigPanel } from '../SheetConfigPanel';

declare const XLSX: any;

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

interface ConfigScreenProps {
  onNavigate: (screen: 'import') => void;
}

export function ConfigScreen({ onNavigate }: ConfigScreenProps) {
  const { 
    profFile, profWorkbook, setProfData,
    sheetConfigs, setSheetConfigs, updateSheetConfig,
    globalOptions, setGlobalOption
  } = useProject();

  const [editingSheet, setEditingSheet] = useState<string | null>(null);

  // Initialisation automatique des feuilles UNIQUEMENT si aucune config n'existe
  useEffect(() => {
    if (profWorkbook && sheetConfigs.length === 0) {
      const names = profWorkbook.SheetNames;
      if (names.length > 0) {
        if (!globalOptions.identitySheet) {
          setGlobalOption('identitySheet', names[0]);
        }
        const initialConfigs = names.map((name: string) => ({ 
          name, 
          enabled: true, 
          weight: 1,
          selectedCells: []
        }));
        setSheetConfigs(initialConfigs);
      }
    }
  }, [profWorkbook]); // On surveille le workbook

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        setProfData(file, workbook);
      } catch (error) {
        console.error("Erreur Excel:", error);
      }
    };
    reader.readAsArrayBuffer(file);
    return false; 
  };

  const handleRemoveFile = () => {
    setProfData(null, null);
    // Note : On ne vide PAS la config ici pour permettre le re-upload
    return true;
  }

  // Si le workbook est chargé, on prend ses feuilles. 
  // Sinon, on affiche celles de la config sauvegardée (si elle existe)
  const displaySheetNames = profWorkbook 
    ? profWorkbook.SheetNames 
    : sheetConfigs.map(c => c.name);

  const isConfigRestored = !profWorkbook && sheetConfigs.length > 0;

  return (
    <Card 
      title={<Title level={4}>Étape 2 : Configuration du Corrigé</Title>}
      actions={[
        <div style={{ padding: '0 24px', textAlign: 'right' }}>
           <Button 
            type="primary" 
            size="large" 
            icon={<ArrowRightOutlined />}
            disabled={!profWorkbook} // On oblige à avoir le fichier chargé pour continuer
            onClick={() => onNavigate('import')}
          >
            {isConfigRestored ? "Fichier rechargé : Continuer" : "Valider et Passer à l'import"}
          </Button>
        </div>
      ]}
    >
      
      <div style={{ marginBottom: 24 }}>
        <Title level={5}>2.1 Charger le fichier Professeur</Title>
        
        {isConfigRestored && (
          <Alert
            message="Configuration restaurée"
            description="Votre configuration précédente a été sauvegardée. Veuillez recharger le fichier Excel Professeur pour réactiver la correction."
            type="warning"
            showIcon
            icon={<ExclamationCircleOutlined />}
            style={{ marginBottom: 16 }}
          />
        )}

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
          <p className="ant-upload-text">
            {profFile ? "Fichier chargé" : "Cliquez ou glissez le fichier du corrigé ici"}
          </p>
        </Dragger>
        
        {profFile && (
          <Paragraph style={{ marginTop: 8, color: 'green' }}>
            <CheckCircleTwoTone twoToneColor="#52c41a" /> "{profFile.name}" est prêt.
          </Paragraph>
        )}
      </div>

      {displaySheetNames.length > 0 && (
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
                // Si le fichier n'est pas chargé, on utilise les noms de la config sauvegardée
                options={displaySheetNames.map((name: string) => ({ label: name, value: name }))}
              />
            </div>
            <Space wrap>
              <div>
                <Text>Cellule "Numéro étudiant"</Text>
                <Input value={globalOptions.studentIdCell} onChange={(e) => setGlobalOption('studentIdCell', e.target.value)} style={{ width: 100 }} />
              </div>
              <div>
                <Text>Cellule "Nom"</Text>
                <Input value={globalOptions.studentNameCell} onChange={(e) => setGlobalOption('studentNameCell', e.target.value)} style={{ width: 100 }} />
              </div>
              <div>
                <Text>Cellule "Prénom"</Text>
                <Input value={globalOptions.studentFirstNameCell} onChange={(e) => setGlobalOption('studentFirstNameCell', e.target.value)} style={{ width: 100 }} />
              </div>
              <div>
                <Text>Cellule "Groupe"</Text>
                <Input value={globalOptions.groupIdCell} onChange={(e) => setGlobalOption('groupIdCell', e.target.value)} style={{ width: 100 }} />
              </div>
            </Space>
          </Space>

          <Divider />
          <Title level={5}>2.3 Paramètres des Feuilles à Corriger</Title>
          <List
            header={<div><Text strong>Feuilles détectées</Text></div>}
            bordered
            dataSource={sheetConfigs}
            renderItem={item => (
              <List.Item
                actions={[
                  <Button 
                    type={item.selectedCells && item.selectedCells.length > 0 ? "primary" : "default"}
                    ghost={item.selectedCells && item.selectedCells.length > 0}
                    icon={<SettingOutlined />}
                    disabled={!profWorkbook} // Impossible de configurer visuellement sans le fichier
                    onClick={() => setEditingSheet(item.name)}
                  >
                    {item.selectedCells && item.selectedCells.length > 0 
                      ? `${item.selectedCells.length} cellules` 
                      : "Tout corriger"}
                  </Button>
                ]}
              >
                <Space align="center">
                  <Switch 
                    checked={item.enabled} 
                    onChange={(checked) => updateSheetConfig(item.name, 'enabled', checked)}
                  />
                  <Text style={{ minWidth: 150 }}>{item.name}</Text>
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
          <Title level={5}>2.4 Options Globales & Affichage</Title>
          <Space direction="vertical" style={{ width: '100%' }}>
            
            <div>
              <Text strong>Zone de scan par défaut :</Text>
              <Space>
                <Text>Max Lignes :</Text>
                <InputNumber 
                  min={10} max={1000} 
                  value={globalOptions.scanMaxRows} 
                  onChange={v => setGlobalOption('scanMaxRows', v)} 
                />
                <Text>Max Colonnes :</Text>
                <InputNumber 
                  min={5} max={100} 
                  value={globalOptions.scanMaxCols} 
                  onChange={v => setGlobalOption('scanMaxCols', v)} 
                />
              </Space>
            </div>

            <div style={{ marginTop: 16 }}>
              <Text strong>Tolérance numérique globale :</Text>
              <Space>
                <Text>Absolue:</Text>
                <InputNumber value={globalOptions.globalAbsTolerance} onChange={v => setGlobalOption('globalAbsTolerance', v)} step="0.001" />
                <Text>Relative:</Text>
                <InputNumber value={globalOptions.globalRelTolerance} onChange={v => setGlobalOption('globalRelTolerance', v)} step="0.0001" />
              </Space>
            </div>
            <div>
              <Text strong>Formules :</Text>
              <div>
                <Switch checked={globalOptions.checkFormulas} onChange={(c) => setGlobalOption('checkFormulas', c)} />
                {globalOptions.checkFormulas && (
                  <Checkbox 
                    style={{ marginLeft: 16 }} 
                    checked={globalOptions.ignoreDollar} 
                    onChange={e => setGlobalOption('ignoreDollar', e.target.checked)}
                  >
                    Ignorer les '$'
                  </Checkbox>
                )}
              </div>
            </div>
          </Space>
        </>
      )}

      <SheetConfigPanel 
        visible={!!editingSheet} 
        sheetName={editingSheet || ""} 
        onClose={() => setEditingSheet(null)} 
      />
    </Card>
  );
}