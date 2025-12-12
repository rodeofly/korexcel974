// src/components/screens/WordConfigScreen.tsx
import { useState, useEffect } from 'react';
import { Card, Typography, Upload, Button, Alert, List, Checkbox, Divider, Space, Tag, Spin } from 'antd';
import { InboxOutlined, CheckCircleTwoTone, FileWordOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useProject, StyleRequirement } from '../../context/ProjectContext';
import JSZip from 'jszip';
import { extractStyles, detectPageOrientation } from '../../utils/docxParser';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

interface WordConfigScreenProps {
  onNavigate: (screen: 'import') => void;
}

export function WordConfigScreen({ onNavigate }: WordConfigScreenProps) {
  const { 
    profFile, profWordData, setProfData,
    wordConfig, setWordConfig
  } = useProject();

  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [availableStyles, setAvailableStyles] = useState<StyleRequirement[]>([]);

  // Analyse automatique quand un fichier est chargé
  useEffect(() => {
    if (profWordData) {
      analyzeDoc(profWordData);
    }
  }, [profWordData]);

  const analyzeDoc = async (zip: JSZip) => {
    setAnalyzing(true);
    // 1. Extraire les styles
    const styles = await extractStyles(zip);
    setAvailableStyles(styles);

    // 2. Détecter l'orientation
    const orientation = await detectPageOrientation(zip);
    
    // 3. Pré-remplir la config si vide
    if (wordConfig.stylesToCheck.length === 0) {
      setWordConfig({
        ...wordConfig,
        expectedOrientation: orientation,
        // Par défaut, on ne coche rien, le prof choisit
      });
    }
    setAnalyzing(false);
  };

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    try {
      const zip = new JSZip();
      const content = await zip.loadAsync(file);
      
      if (!content.file("word/document.xml")) {
        throw new Error("Ce fichier ne semble pas être un document Word valide (.docx).");
      }
      setProfData(file, content);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erreur fichier");
      setProfData(null, null);
    } finally {
      setLoading(false);
    }
    return false;
  };

  const handleRemoveFile = () => {
    setProfData(null, null);
    return true;
  };

  const toggleStyleCheck = (style: StyleRequirement) => {
    const exists = wordConfig.stylesToCheck.find(s => s.id === style.id);
    let newStyles = [];
    if (exists) {
      newStyles = wordConfig.stylesToCheck.filter(s => s.id !== style.id);
    } else {
      newStyles = [...wordConfig.stylesToCheck, style];
    }
    setWordConfig({ ...wordConfig, stylesToCheck: newStyles });
  };

  return (
    <Card 
      title={<Title level={4}><FileWordOutlined /> Configuration : Traitement de texte</Title>}
      actions={[
        <div style={{ padding: '0 24px', textAlign: 'right' }}>
           <Button 
            type="primary" 
            size="large" 
            icon={<ArrowRightOutlined />}
            disabled={!profWordData}
            onClick={() => onNavigate('import')}
          >
            Valider et Passer à l'import
          </Button>
        </div>
      ]}
    >
      <div style={{ marginBottom: 24 }}>
        <Title level={5}>2.1 Charger le fichier Maître (.docx)</Title>
        <Dragger 
          name="file"
          multiple={false}
          accept=".docx"
          beforeUpload={handleFileUpload}
          onRemove={handleRemoveFile}
          maxCount={1}
          fileList={profFile ? [profFile as any] : []}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">Glissez le document Word de référence ici</p>
        </Dragger>
        
        {loading && <Spin tip="Lecture du fichier..." style={{ marginTop: 20 }} />}
      </div>

      {profWordData && !loading && (
        <>
          <Divider />
          <Title level={5}>2.2 Critères de correction</Title>
          
          <div style={{ marginBottom: 20 }}>
            <Text strong>Mise en page :</Text>
            <div style={{ marginTop: 8 }}>
              <Checkbox 
                checked={wordConfig.checkPageSetup}
                onChange={e => setWordConfig({...wordConfig, checkPageSetup: e.target.checked})}
              >
                Vérifier l'orientation des pages
              </Checkbox>
              {wordConfig.checkPageSetup && (
                <Tag color="blue" style={{ marginLeft: 10 }}>
                  Attendu : {wordConfig.expectedOrientation === 'portrait' ? 'Portrait' : 'Paysage'}
                </Tag>
              )}
            </div>
          </div>

          <Text strong>Styles à vérifier :</Text>
          <Paragraph type="secondary" style={{ fontSize: 12 }}>
            Cochez les styles dont la définition (Police, Taille, Couleur) doit être respectée par l'élève.
          </Paragraph>

          {analyzing ? <Spin /> : (
            <List
              bordered
              dataSource={availableStyles}
              renderItem={style => {
                const isChecked = wordConfig.stylesToCheck.some(s => s.id === style.id);
                return (
                  <List.Item>
                    <Checkbox checked={isChecked} onChange={() => toggleStyleCheck(style)}>
                      <Text strong>{style.name}</Text>
                    </Checkbox>
                    <Space>
                      {style.fontName && <Tag>{style.fontName}</Tag>}
                      {style.fontSize && <Tag>{style.fontSize} pt</Tag>}
                      {style.color && <Tag color={`#${style.color}`}>Couleur</Tag>}
                      {style.isBold && <Tag>Gras</Tag>}
                      {style.isItalic && <Tag>Italique</Tag>}
                    </Space>
                  </List.Item>
                );
              }}
            />
          )}
        </>
      )}
    </Card>
  );
}