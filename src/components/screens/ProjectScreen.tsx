// src/components/screens/ProjectScreen.tsx
import { Button, Input, Space, Typography, Card, Radio } from 'antd';
import { useProject } from '../../context/ProjectContext';
import { TableOutlined, FileWordOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface ProjectScreenProps {
  onNavigate: (screen: 'config') => void; // Typage plus strict
}

export function ProjectScreen({ onNavigate }: ProjectScreenProps) {
  // On utilise le contexte pour lire/écrire
  const { projectName, setProjectName, projectType, setProjectType } = useProject();

  const handleCreateConfig = () => {
    if (!projectName.trim()) return;
    onNavigate('config');
  };

  return (
    <Card>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <Title level={4}>1. Nouveau Projet</Title>
        
        <Space orientation="vertical" style={{ width: '100%' }}>
          <Text strong>Nom du projet</Text>
          <Input 
            placeholder="Ex: Partiel Info - Semestre 1" 
            size="large" 
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
        </Space>

        <Space orientation="vertical" style={{ width: '100%' }}>
          <Text strong>Type de correction</Text>
          <Radio.Group 
            value={projectType} 
            onChange={(e) => setProjectType(e.target.value)}
            size="large"
          >
            <Radio.Button value="excel" style={{ height: 50, lineHeight: '50px', padding: '0 20px' }}>
              <Space><TableOutlined style={{ color: '#52c41a' }} /> Tableur (Excel)</Space>
            </Radio.Button>
            <Radio.Button value="word" style={{ height: 50, lineHeight: '50px', padding: '0 20px' }}>
              <Space><FileWordOutlined style={{ color: '#1890ff' }} /> Traitement de texte (Word)</Space>
            </Radio.Button>
          </Radio.Group>
        </Space>

        <Divider />

        <Button 
          type="primary" 
          size="large" 
          onClick={handleCreateConfig}
          disabled={!projectName.trim()}
          style={{ width: '200px' }}
        >
          Commencer la configuration
        </Button>
      </Space>
    </Card>
  );
}

// J'ajoute un import manquant pour Divider
import { Divider } from 'antd';