// src/components/screens/ProjectScreen.tsx
import { Button, Input, Space, Typography, Card } from 'antd';

const { Title } = Typography;

interface ProjectScreenProps {
  onNavigate: (screen: string) => void;
}

export function ProjectScreen({ onNavigate }: ProjectScreenProps) {
  const handleCreateConfig = () => {
    console.log('Action: Créer une nouvelle configuration');
    onNavigate('config'); // Appel de la fonction de navigation
  };

  const handleImportConfig = () => {
    console.log('Action: Importer une configuration');
    // La logique d'import viendra ici
  };

  return (
    <Card>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <Title level={4}>1. Projet</Title>
        
        <Space orientation="vertical" style={{ width: '100%' }}>
          <label htmlFor="project-name">Nom du projet</label>
          <Input 
            id="project-name"
            placeholder="Ex: TP Excel S1 - Finance" 
            size="large" 
          />
        </Space>

        <Space>
          <Button type="primary" size="large" onClick={handleCreateConfig}>
            Créer une configuration
          </Button>
          <Button size="large" onClick={handleImportConfig}>
            Importer une configuration (JSON)
          </Button>
        </Space>
      </Space>
    </Card>
  );
}
