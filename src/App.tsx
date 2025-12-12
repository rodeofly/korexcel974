// src/App.tsx
import { useState } from 'react';
import { Layout, Typography } from 'antd';
import { ProjectScreen } from './components/screens/ProjectScreen';
import { ConfigScreen } from './components/screens/ConfigScreen';

const { Header, Content } = Layout;
const { Title } = Typography;

// Définir les types pour les écrans afin d'éviter les chaînes de caractères magiques
type Screen = 'project' | 'config' | 'import' | 'results';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('project');

  const navigateTo = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'project':
        return <ProjectScreen onNavigate={navigateTo} />;
      case 'config':
        return <ConfigScreen />;
      // Les autres écrans viendront ici
      default:
        return <ProjectScreen onNavigate={navigateTo} />;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        <Title style={{ color: 'white', margin: 0 }} level={3}>
          KoreKcel - Correcteur de fichiers Excel
        </Title>
      </Header>
      <Content style={{ padding: '48px' }}>
        {renderScreen()}
      </Content>
    </Layout>
  );
}

export default App;
