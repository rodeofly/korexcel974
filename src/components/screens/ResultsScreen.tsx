// src/components/screens/ResultsScreen.tsx
import { useEffect, useState } from 'react';
import { Card, Table, Typography, Button, Tag, Modal, List, Statistic, Row, Col, Spin, Tabs, InputNumber, Descriptions } from 'antd';
import { DownloadOutlined, ReloadOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { useProject, type StyleRequirement } from '../../context/ProjectContext';
import { gradeStudent, type StudentResult } from '../../utils/grading';

declare const XLSX: any; 

const { Title, Text } = Typography;

export function ResultsScreen() {
  const { students, profWorkbook, sheetConfigs, globalOptions, projectType, wordConfig } = useProject();
  const [results, setResults] = useState<StudentResult[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Correction initiale
  useEffect(() => {
    const runGrading = async () => {
      if (students.length > 0) {
        setLoading(true);
        const graded = await Promise.all(students.map(student => 
          gradeStudent(student, profWorkbook, sheetConfigs, globalOptions, projectType, wordConfig)
        ));
        
        graded.sort((a, b) => b.globalScore - a.globalScore);
        setResults(graded);
        setLoading(false);
      }
    };
    runGrading();
  }, [students, profWorkbook, projectType]);

  // Gestion de l'ajustement manuel de la note
  const handleManualAdjustment = (value: number | null) => {
    if (!selectedStudent || value === null) return;
    
    // 1. Mettre à jour l'étudiant sélectionné (pour l'affichage immédiat)
    const updatedStudent = { ...selectedStudent, manualAdjustment: value };
    setSelectedStudent(updatedStudent);

    // 2. Mettre à jour la liste principale
    setResults(prevResults => 
      prevResults.map(r => r.id === selectedStudent.id ? updatedStudent : r)
    );
  };

  // Export Excel
  const handleExport = () => {
    let header = ["Nom", "Prénom", "Groupe", "Note Calculée", "Ajustement", "Note Finale /20"];
    if (projectType === 'excel') {
       header.push(...sheetConfigs.filter(c => c.enabled).map(c => c.name));
    } else {
       header.push("Détails Word");
    }

    const data = results.map(r => {
      const finalScore = Math.min(20, Math.max(0, r.globalScore + (r.manualAdjustment || 0)));
      const base = [r.name, r.firstName, r.group, r.globalScore, r.manualAdjustment || 0, finalScore];
      if (projectType === 'excel') {
        return [...base, ...r.sheetResults.map(sr => sr.score)];
      } else {
        return [...base, r.wordDetails?.join(' | ')];
      }
    });

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resultats");
    XLSX.writeFile(wb, `Resultats_KoreKcel_${projectType}.xlsx`);
  };

  // Colonnes du tableau principal
  const columns = [
    { title: 'Groupe', dataIndex: 'group', key: 'group', sorter: (a: StudentResult, b: StudentResult) => a.group.localeCompare(b.group), render: (t:string) => <Tag color="blue">{t}</Tag> },
    { title: 'Nom', dataIndex: 'name', key: 'name', sorter: (a: StudentResult, b: StudentResult) => a.name.localeCompare(b.name) },
    { title: 'Prénom', dataIndex: 'firstName', key: 'firstName' },
    { 
      title: 'Note / 20', 
      key: 'finalScore', 
      render: (_: any, r: StudentResult) => {
        const adjustment = r.manualAdjustment || 0;
        const finalScore = Math.min(20, Math.max(0, r.globalScore + adjustment));
        let color = finalScore < 10 ? 'red' : 'green';
        if (finalScore === 20) color = 'gold';

        return (
          <Space>
            <Tag color={color} style={{ fontSize: '1.1em', fontWeight: 'bold' }}>{finalScore.toFixed(2)}</Tag>
            {adjustment !== 0 && (
              <Text type="secondary" style={{ fontSize: '0.8em' }}>
                ({r.globalScore} {adjustment > 0 ? '+' : ''}{adjustment})
              </Text>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: StudentResult) => (
        <Button icon={<EyeOutlined />} onClick={() => setSelectedStudent(record)}>Détails</Button>
      ),
    },
  ];

  // Colonnes pour l'inspecteur de styles
  const stylesColumns = [
    { title: 'Nom du Style', dataIndex: 'name', key: 'name', render: (t: string) => <strong>{t}</strong> },
    { title: 'Police', dataIndex: 'fontName', key: 'fontName', render: (t: string) => t || <Text type="secondary">Défaut</Text> },
    { title: 'Taille', dataIndex: 'fontSize', key: 'fontSize', render: (t: number) => t ? `${t} pt` : '-' },
    { title: 'Couleur', dataIndex: 'color', key: 'color', render: (c: string) => c ? <Tag color={`#${c}`}>{c}</Tag> : <Text type="secondary">Auto</Text> },
    { title: 'Format', key: 'format', render: (_: any, r: StyleRequirement) => (
      <Space>
        {r.isBold && <Tag>Gras</Tag>}
        {r.isItalic && <Tag>Italique</Tag>}
        {r.alignment && <Tag>{r.alignment}</Tag>}
      </Space>
    )},
  ];

  const classAverage = results.length > 0 
    ? (results.reduce((acc, curr) => acc + curr.globalScore + (curr.manualAdjustment || 0), 0) / results.length).toFixed(2) 
    : "0";

  return (
    <div style={{ marginTop: -20 }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 50 }}>
          <Spin size="large" tip="Analyse en cours..." />
        </div>
      ) : (
        <>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={8}><Card><Statistic title="Nombre de copies" value={results.length} prefix={<ReloadOutlined />} /></Card></Col>
            <Col span={8}><Card><Statistic title="Moyenne de classe" value={classAverage} suffix="/ 20" precision={2} /></Card></Col>
            <Col span={8}>
              <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Button type="primary" size="large" icon={<DownloadOutlined />} onClick={handleExport}>Exporter Excel</Button>
              </Card>
            </Col>
          </Row>

          <Table columns={columns} dataSource={results} rowKey="id" pagination={{ pageSize: 10 }} bordered />

          <Modal
            title={`Correction : ${selectedStudent?.name}`}
            open={!!selectedStudent}
            onCancel={() => setSelectedStudent(null)}
            footer={[<Button key="close" type="primary" onClick={() => setSelectedStudent(null)}>Fermer et Sauvegarder</Button>]}
            width={900}
          >
            {selectedStudent && (
              <Tabs defaultActiveKey="1" items={[
                {
                  key: '1',
                  label: 'Rapport de Correction',
                  children: (
                    <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
                      <div style={{ background: '#f5f5f5', padding: 16, marginBottom: 16, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text strong style={{ fontSize: 16 }}>Note Calculée : </Text>
                          <Tag color="blue" style={{ fontSize: 16 }}>{selectedStudent.globalScore} / 20</Tag>
                        </div>
                        <div>
                          <Text strong>Ajustement Manuel : </Text>
                          <InputNumber 
                            value={selectedStudent.manualAdjustment || 0} 
                            onChange={handleManualAdjustment}
                            step={0.5}
                            style={{ width: 70 }}
                          />
                          <Text style={{ marginLeft: 8 }}>points</Text>
                        </div>
                        <div>
                          <Text strong style={{ fontSize: 16 }}>Note Finale : </Text>
                          <Tag color="gold" style={{ fontSize: 16 }}>
                            {Math.min(20, Math.max(0, selectedStudent.globalScore + (selectedStudent.manualAdjustment || 0))).toFixed(2)} / 20
                          </Tag>
                        </div>
                      </div>

                      {projectType === 'word' && selectedStudent.wordDetails && (
                        <List
                          bordered
                          dataSource={selectedStudent.wordDetails}
                          renderItem={item => (
                            <List.Item>
                              <Text type={item.startsWith('❌') ? 'danger' : (item.startsWith('⚠️') ? 'warning' : 'success')}>
                                {item}
                              </Text>
                            </List.Item>
                          )}
                        />
                      )}

                      {projectType === 'excel' && (
                         <List
                           dataSource={selectedStudent.sheetResults}
                           renderItem={item => (
                             <List.Item>
                               <List.Item.Meta
                                 title={<Text strong>{item.sheetName}</Text>}
                                 description={
                                   <ul style={{ color: '#cf1322', fontSize: '0.9em' }}>
                                     {item.details.map((err, idx) => <li key={idx}>{err}</li>)}
                                   </ul>
                                 }
                               />
                               <Tag color={item.score > 10 ? 'green' : 'red'}>{item.score} / 20</Tag>
                             </List.Item>
                           )}
                         />
                      )}
                    </div>
                  )
                },
                {
                  key: '2',
                  label: projectType === 'word' ? 'Inspecteur de Styles (Vue Élève)' : 'Détails bruts',
                  children: (
                    <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
                      {projectType === 'word' && selectedStudent.detectedStyles ? (
                        <>
                          <Alert message="Voici tous les styles détectés dans le document de l'élève." type="info" showIcon style={{ marginBottom: 16 }} />
                          <Table 
                            dataSource={selectedStudent.detectedStyles} 
                            columns={stylesColumns} 
                            rowKey="id" 
                            size="small"
                            pagination={false}
                          />
                        </>
                      ) : (
                        <Text type="secondary">Aucune donnée détaillée disponible pour ce mode.</Text>
                      )}
                    </div>
                  )
                }
              ]} />
            )}
          </Modal>
        </>
      )}
    </div>
  );
}