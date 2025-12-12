// src/App.tsx
import { useState } from 'react';
import { Layout, Typography, Steps } from 'antd';
import { ProjectProvider, useProject } from './context/ProjectContext'; // Ajout de useProject

// Ecrans
import { ProjectScreen } from './components/screens/ProjectScreen';
import { ConfigScreen } from './components/screens/ConfigScreen';
import { WordConfigScreen } from './components/screens/WordConfigScreen'; // Ajout de l'import
import { ImportStudentsScreen } from './components/screens/ImportStudentsScreen';
import { ResultsScreen } from './components/screens/ResultsScreen';

const { Header, Content } = Layout;
const { Title } = Typography;

type Screen = 'project' | 'config' | 'import' | 'results';

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('project');
  
  // On récupère le type de projet pour savoir quel écran afficher
  const { projectType } = useProject(); 

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
        // C'EST ICI QUE LA MAGIE OPÈRE : LE BRANCHEMENT CONDITIONNEL
        if (projectType === 'word') {
          return <WordConfigScreen onNavigate={navigateTo} />;
        }
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
          style={{ marginBottom: 32, padding: '0 50px' }}
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