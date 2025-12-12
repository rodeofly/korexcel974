// src/App.tsx
import { Layout, Typography } from 'antd';
import { ProjectScreen } from './components/screens/ProjectScreen';

const { Header, Content } = Layout;
const { Title } = Typography;

function App() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        <Title style={{ color: 'white', margin: 0 }} level={3}>
          KoreKcel - Correcteur de fichiers Excel
        </Title>
      </Header>
      <Content style={{ padding: '48px' }}>
        <ProjectScreen />
      </Content>
    </Layout>
  );
}

export default App;
