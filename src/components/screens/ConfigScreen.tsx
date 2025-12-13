// src/components/screens/ConfigScreen.tsx
import { useEffect, useState } from 'react';
import { Card, Typography, Upload, Select, Input, Space, Switch, InputNumber, Button, Divider, Alert, List, Tooltip } from 'antd';
import { InboxOutlined, CheckCircleTwoTone, ArrowRightOutlined, SettingOutlined, ExclamationCircleOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useProject } from '../../context/ProjectContext';
import { SheetConfigPanel } from '../SheetConfigPanel';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

interface ConfigScreenProps {
  onNavigate: (screen: 'import') => void;
}

export function ConfigScreen({ onNavigate }: ConfigScreenProps) {
  const { 
    profFile, profWorkbook, setProfData,
    sheetConfigs, setSheetConfigs, updateSheetConfig,
    globalOptions, setGlobalOption,
    resetConfig 
  } = useProject();

  const [editingSheet, setEditingSheet] = useState<string | null>(null);

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
  }, [profWorkbook]);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        import('xlsx').then((XLSX) => {
             const workbook = XLSX.read(data, { type: 'array' });
             setProfData(file, workbook);
        });
      } catch (error) {
        console.error("Erreur Excel:", error);
      }
    };
    reader.readAsArrayBuffer(file);
    return false; 
  };

  const handleRemoveFile = () => {
    setProfData(null, null);
    return true;
  }

  const displaySheetNames = profWorkbook 
    ? profWorkbook.SheetNames 
    : sheetConfigs.map(c => c.name);

  const isConfigRestored = !profWorkbook && sheetConfigs.length > 0;

  return (
    <Card 
      title={<Title level={4}>Étape 2 : Configuration du Corrigé</Title>}
      extra={
        <Button danger type="text" icon={<DeleteOutlined />} onClick={resetConfig}>
          Réinitialiser tout
        </Button>
      }
      actions={[
        <div style={{ padding: '0 24px', textAlign: 'right' }}>
           <Button 
            type="primary" 
            size="large" 
            icon={<ArrowRightOutlined />}
            disabled={!profWorkbook} 
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
            description="Veuillez recharger le fichier Excel Professeur pour réactiver la correction."
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
                options={displaySheetNames.map((name: string) => ({ label: name, value: name }))}
              />
            </div>
            <Space wrap>
              <div><Text>Cellule "Numéro étudiant"</Text><Input value={globalOptions.studentIdCell} onChange={(e) => setGlobalOption('studentIdCell', e.target.value)} style={{ width: 100 }} /></div>
              <div><Text>Cellule "Nom"</Text><Input value={globalOptions.studentNameCell} onChange={(e) => setGlobalOption('studentNameCell', e.target.value)} style={{ width: 100 }} /></div>
              <div><Text>Cellule "Prénom"</Text><Input value={globalOptions.studentFirstNameCell} onChange={(e) => setGlobalOption('studentFirstNameCell', e.target.value)} style={{ width: 100 }} /></div>
              <div><Text>Cellule "Groupe"</Text><Input value={globalOptions.groupIdCell} onChange={(e) => setGlobalOption('groupIdCell', e.target.value)} style={{ width: 100 }} /></div>
            </Space>
          </Space>

          <Divider />
          <Title level={5}>2.3 Feuilles à Corriger</Title>
          <List
            bordered
            dataSource={sheetConfigs}
            renderItem={item => (
              <List.Item
                actions={[
                  <Button 
                    type={item.selectedCells && item.selectedCells.length > 0 ? "primary" : "default"}
                    ghost={item.selectedCells && item.selectedCells.length > 0}
                    icon={<SettingOutlined />}
                    disabled={!profWorkbook}
                    onClick={() => setEditingSheet(item.name)}
                  >
                    {item.selectedCells && item.selectedCells.length > 0 ? `${item.selectedCells.length} cellules` : "Tout corriger"}
                  </Button>
                ]}
              >
                <Space>
                  <Switch checked={item.enabled} onChange={(c) => updateSheetConfig(item.name, 'enabled', c)} />
                  <Text style={{ minWidth: 150 }}>{item.name}</Text>
                  <Text>Poids :</Text>
                  <InputNumber min={0} value={item.weight} onChange={(v) => updateSheetConfig(item.name, 'weight', v)} style={{ width: 70 }} />
                </Space>
              </List.Item>
            )}
          />

          <Divider />
          <Title level={5}>2.4 Options de Tolérance</Title>
          <div style={{ background: '#f9f9f9', padding: 15, borderRadius: 8 }}>
            <Space size="large" wrap>
              <div>
                <Space>
                  <Text strong>Absolue (Écart fixe)</Text>
                  <Tooltip title="Accepte une erreur fixe. Ex: Si la réponse est 10 et tolérance 0.1, alors 9.9 et 10.1 sont acceptés.">
                    <InfoCircleOutlined style={{ color: '#1890ff' }} />
                  </Tooltip>
                </Space>
                <br/>
                <InputNumber value={globalOptions.globalAbsTolerance} onChange={v => setGlobalOption('globalAbsTolerance', v)} step="0.001" style={{ width: 120, marginTop: 5 }} />
              </div>

              <div>
                <Space>
                  <Text strong>Relative (Pourcentage)</Text>
                  <Tooltip title="Accepte un écart proportionnel. Ex: Tolérance 0.05 = 5% d'erreur acceptée. Utile pour les grands nombres.">
                    <InfoCircleOutlined style={{ color: '#1890ff' }} />
                  </Tooltip>
                </Space>
                <br/>
                <InputNumber value={globalOptions.globalRelTolerance} onChange={v => setGlobalOption('globalRelTolerance', v)} step="0.0001" style={{ width: 120, marginTop: 5 }} />
              </div>
            </Space>
          </div>
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