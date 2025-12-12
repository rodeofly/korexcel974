// src/components/screens/WordConfigScreen.tsx
import { useState, useEffect } from 'react';
import { Card, Typography, Upload, Button, Alert, List, Checkbox, Divider, Space, Tag, Spin, Row, Col } from 'antd';
import { InboxOutlined, FileWordOutlined, ArrowRightOutlined, FileTextOutlined } from '@ant-design/icons';
import { useProject, type StyleRequirement, type SectionRequirement } from '../../context/ProjectContext';
import JSZip from 'jszip';
import { extractStyles, extractSections } from '../../utils/docxParser';

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
  const [detectedSections, setDetectedSections] = useState<SectionRequirement[]>([]);

  useEffect(() => {
    if (profWordData) {
      analyzeDoc(profWordData);
    }
  }, [profWordData]);

  const analyzeDoc = async (zip: JSZip) => {
    setAnalyzing(true);
    const styles = await extractStyles(zip);
    setAvailableStyles(styles);

    // Extraction des sections (Nouveau)
    const sections = await extractSections(zip);
    setDetectedSections(sections);
    
    // Initialisation si config vide
    if (wordConfig.stylesToCheck.length === 0 && wordConfig.sectionsToCheck.length === 0) {
      setWordConfig({
        ...wordConfig,
        sectionsToCheck: sections, // On pré-remplit avec ce qu'on a trouvé
      });
    }
    setAnalyzing(false);
  };

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    try {
      const zip = new JSZip();
      const content = await zip.loadAsync(file);
      if (!content.file("word/document.xml")) throw new Error("Ce fichier ne semble pas être un document Word valide.");
      setProfData(file, content);
    } catch (err: any) {
      alert(err.message);
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
    let newStyles = exists 
      ? wordConfig.stylesToCheck.filter(s => s.id !== style.id)
      : [...wordConfig.stylesToCheck, style];
    setWordConfig({ ...wordConfig, stylesToCheck: newStyles });
  };

  const toggleSectionCheck = (index: number, key: 'checkOrientation' | 'checkHeader' | 'checkFooter') => {
    const newSections = wordConfig.sectionsToCheck.map(s => {
      if (s.index === index) {
        return { ...s, [key]: !s[key] };
      }
      return s;
    });
    setWordConfig({ ...wordConfig, sectionsToCheck: newSections });
  };

  return (
    <Card 
      title={<Title level={4}><FileWordOutlined /> Configuration : Traitement de texte</Title>}
      actions={[
        <div style={{ padding: '0 24px', textAlign: 'right' }}>
           <Button type="primary" size="large" icon={<ArrowRightOutlined />} disabled={!profWordData} onClick={() => onNavigate('import')}>
            Valider et Passer à l'import
          </Button>
        </div>
      ]}
    >
      <div style={{ marginBottom: 24 }}>
        <Dragger 
          name="file" multiple={false} accept=".docx" beforeUpload={handleFileUpload} onRemove={handleRemoveFile} maxCount={1}
          fileList={profFile ? [profFile as any] : []}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">Glissez le document Word de référence ici</p>
        </Dragger>
        {loading && <Spin tip="Lecture du fichier..." style={{ marginTop: 20 }} />}
      </div>

      {profWordData && !loading && (
        <>
          {analyzing ? <Spin /> : (
            <Row gutter={24}>
              <Col span={12}>
                <Divider orientation="left">Mise en page & Sections</Divider>
                <Alert message={`${detectedSections.length} sections détectées`} type="info" showIcon style={{marginBottom: 10}} />
                
                <List
                  dataSource={wordConfig.sectionsToCheck.length > 0 ? wordConfig.sectionsToCheck : detectedSections}
                  renderItem={sect => (
                    <Card size="small" title={`Section ${sect.index}`} style={{ marginBottom: 10 }}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Checkbox 
                          checked={sect.checkOrientation}
                          onChange={() => toggleSectionCheck(sect.index, 'checkOrientation')}
                        >
                          Orientation : <Tag>{sect.orientation === 'portrait' ? 'Portrait' : 'Paysage'}</Tag>
                        </Checkbox>
                        
                        <Checkbox 
                          checked={sect.checkHeader}
                          disabled={!sect.headerText}
                          onChange={() => toggleSectionCheck(sect.index, 'checkHeader')}
                        >
                          Entête : {sect.headerText ? <Text type="secondary" italic>"{sect.headerText}"</Text> : <Text type="secondary">(Vide)</Text>}
                        </Checkbox>

                        <Checkbox 
                          checked={sect.checkFooter}
                          disabled={!sect.footerText}
                          onChange={() => toggleSectionCheck(sect.index, 'checkFooter')}
                        >
                          Pied : {sect.footerText ? <Text type="secondary" italic>"{sect.footerText}"</Text> : <Text type="secondary">(Vide)</Text>}
                        </Checkbox>
                      </Space>
                    </Card>
                  )}
                />
              </Col>
              
              <Col span={12}>
                <Divider orientation="left">Styles de texte</Divider>
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
                        <div style={{fontSize: 12, color: '#888', marginTop: 4}}>
                          {style.fontName}, {style.fontSize}pt {style.color && <Tag color={`#${style.color}`} style={{width: 10, height: 10, padding: 0, marginLeft: 5}}></Tag>}
                        </div>
                      </List.Item>
                    );
                  }}
                />
              </Col>
            </Row>
          )}
        </>
      )}
    </Card>
  );
}