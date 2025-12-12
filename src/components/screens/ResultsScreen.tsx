// src/components/screens/ResultsScreen.tsx
import { useEffect, useState } from 'react';
import { Card, Table, Typography, Button, Tag, Modal, List, Statistic, Row, Col } from 'antd';
import { DownloadOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import { useProject } from '../../context/ProjectContext';
import { gradeStudent, StudentResult } from '../../utils/grading';

declare const XLSX: any; // Utilisation de SheetJS pour l'export

const { Title, Text } = Typography;

export function ResultsScreen() {
  const { students, profWorkbook, sheetConfigs, globalOptions } = useProject();
  const [results, setResults] = useState<StudentResult[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null);

  // Lancement de la correction au chargement de l'écran
  useEffect(() => {
    if (students.length > 0 && profWorkbook) {
      const graded = students.map(student => 
        gradeStudent(student, profWorkbook, sheetConfigs, globalOptions)
      );
      // Tri par note décroissante
      graded.sort((a, b) => b.globalScore - a.globalScore);
      setResults(graded);
    }
  }, [students, profWorkbook]);

  // Fonction d'export Excel
  const handleExport = () => {
    const header = ["Nom", "Prénom", "Groupe", "Note Globale /20", ...sheetConfigs.filter(c => c.enabled).map(c => c.name)];
    const data = results.map(r => [
      r.name,
      r.firstName,
      r.group,
      r.globalScore,
      ...r.sheetResults.map(sr => sr.score)
    ]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resultats");
    XLSX.writeFile(wb, "Resultats_KoreKcel.xlsx");
  };

  const columns = [
    {
      title: 'Groupe',
      dataIndex: 'group',
      key: 'group',
      sorter: (a: StudentResult, b: StudentResult) => a.group.localeCompare(b.group),
      render: (text: string) => <Tag color="blue">{text}</Tag>
    },
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: StudentResult, b: StudentResult) => a.name.localeCompare(b.name),
    },
    {
      title: 'Prénom',
      dataIndex: 'firstName',
      key: 'firstName',
    },
    {
      title: 'Note / 20',
      dataIndex: 'globalScore',
      key: 'globalScore',
      sorter: (a: StudentResult, b: StudentResult) => a.globalScore - b.globalScore,
      render: (score: number) => {
        let color = score < 10 ? 'red' : 'green';
        if (score === 20) color = 'gold';
        return <Tag color={color} style={{ fontSize: '1.1em', fontWeight: 'bold' }}>{score} / 20</Tag>;
      }
    },
    {
      title: 'Détails',
      key: 'action',
      render: (_: any, record: StudentResult) => (
        <Button icon={<EyeOutlined />} onClick={() => setSelectedStudent(record)}>
          Voir
        </Button>
      ),
    },
  ];

  // Calcul moyenne de la classe
  const classAverage = results.length > 0 
    ? (results.reduce((acc, curr) => acc + curr.globalScore, 0) / results.length).toFixed(2) 
    : "0";

  return (
    <div style={{ marginTop: -20 }}>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic title="Nombre de copies" value={results.length} prefix={<ReloadOutlined />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Moyenne de classe" value={classAverage} suffix="/ 20" precision={2} />
          </Card>
        </Col>
        <Col span={8}>
          <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Button type="primary" size="large" icon={<DownloadOutlined />} onClick={handleExport}>
              Exporter les résultats (Excel)
            </Button>
          </Card>
        </Col>
      </Row>

      <Table 
        columns={columns} 
        dataSource={results} 
        rowKey="id" 
        pagination={{ pageSize: 10 }}
        bordered
      />

      {/* Modal de Détails */}
      <Modal
        title={`Détails : ${selectedStudent?.name} ${selectedStudent?.firstName}`}
        open={!!selectedStudent}
        onCancel={() => setSelectedStudent(null)}
        footer={[<Button key="close" onClick={() => setSelectedStudent(null)}>Fermer</Button>]}
        width={800}
      >
        {selectedStudent && (
          <List
            dataSource={selectedStudent.sheetResults}
            renderItem={item => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text strong>{item.sheetName}</Text>
                      <Tag color={item.score > 10 ? 'green' : 'red'}>{item.score} / 20</Tag>
                    </div>
                  }
                  description={
                    <div>
                      <div>Précision : {item.correctCells} / {item.totalCells} cellules correctes.</div>
                      {item.details.length > 0 && (
                        <div style={{ marginTop: 8, background: '#fff1f0', padding: 8, borderRadius: 4 }}>
                          <Text type="danger" strong>Premières erreurs :</Text>
                          <ul style={{ margin: 0, paddingLeft: 20, color: '#cf1322', fontSize: '0.9em' }}>
                            {item.details.map((err, idx) => <li key={idx}>{err}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Modal>
    </div>
  );
}