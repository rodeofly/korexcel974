// src/App.tsx
import { useState } from 'react';
import { Layout, Typography, Steps } from 'antd';
import { ProjectProvider } from './context/ProjectContext';
import { ResultsScreen } from './components/screens/ResultsScreen';

// Ecrans
import { ProjectScreen } from './components/screens/ProjectScreen';
import { ConfigScreen } from './components/screens/ConfigScreen';
import { ImportStudentsScreen } from './components/screens/ImportStudentsScreen';

const { Header, Content } = Layout;
const { Title } = Typography;

type Screen = 'project' | 'config' | 'import' | 'results';

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('project');

  // Petit mapping pour la barre de progression (Steps)
  const stepItems = [
    { title: 'Projet', key: 'project' },
    { title: 'Config Prof', key: 'config' },
    { title: 'Import Élèves', key: 'import' },
    { title: 'Résultats', key: 'results' },
  ];

  const currentStepIndex = stepItems.findIndex(s => s.key === currentScreen);

  const navigateTo = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'project':
        return <ProjectScreen onNavigate={navigateTo} />;
      case 'config':
        return <ConfigScreen onNavigate={navigateTo} />;
      case 'import':
        return <ImportStudentsScreen onNavigate={navigateTo} />;
      case 'results':
        return <ResultsScreen />; // C'est ici qu'on branche l'écran !
      default:
        return <ProjectScreen onNavigate={navigateTo} />;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        <Title style={{ color: 'white', margin: 0 }} level={3}>
          KoreKcel 974
        </Title>
      </Header>
      
      <Content style={{ padding: '24px 48px' }}>
        {/* Barre de progression */}
        <Steps 
          current={currentStepIndex} 
          items={stepItems} 
          style={{ marginBottom: 32, padding: '0 50px' }}
        />

        {/* Contenu de l'écran */}
        {renderScreen()}
      </Content>
    </Layout>
  );
}

export default function App() {
  return (
    <ProjectProvider>
      <AppContent />
    </ProjectProvider>
  );
}