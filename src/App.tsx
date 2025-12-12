// src/App.tsx
import { useState } from 'react';
import { Layout, Typography, Steps } from 'antd';
import { ProjectProvider, useProject } from './context/ProjectContext';

// Ecrans
import { ProjectScreen } from './components/screens/ProjectScreen';
import { ConfigScreen } from './components/screens/ConfigScreen';
import { WordConfigScreen } from './components/screens/WordConfigScreen';
import { ImportStudentsScreen } from './components/screens/ImportStudentsScreen';
import { ResultsScreen } from './components/screens/ResultsScreen';

const { Header, Content } = Layout;
const { Title } = Typography;

type Screen = 'project' | 'config' | 'import' | 'results';

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('project');
  const { projectType } = useProject(); 

  const stepItems = [
    { title: 'Projet', key: 'project' },
    { title: 'Config Prof', key: 'config' },
    { title: 'Import Élèves', key: 'import' },
    { title: 'Résultats', key: 'results' },
  ];

  const currentStepIndex = stepItems.findIndex(s => s.key === currentScreen);

  // Fonction de navigation directe via les Steps
  const onStepChange = (current: number) => {
    const targetScreen = stepItems[current].key as Screen;
    setCurrentScreen(targetScreen);
  };

  const navigateTo = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'project':
        return <ProjectScreen onNavigate={navigateTo} />;
      case 'config':
        if (projectType === 'word') return <WordConfigScreen onNavigate={navigateTo} />;
        return <ConfigScreen onNavigate={navigateTo} />;
      case 'import':
        return <ImportStudentsScreen onNavigate={navigateTo} />;
      case 'results':
        return <ResultsScreen />;
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
        <Steps 
          current={currentStepIndex} 
          items={stepItems} 
          onChange={onStepChange} // <-- C'est ça qui active le clic !
          style={{ marginBottom: 32, padding: '0 50px', cursor: 'pointer' }}
        />

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