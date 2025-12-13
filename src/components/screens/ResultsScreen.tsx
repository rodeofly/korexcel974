// src/components/screens/ResultsScreen.tsx
import { useEffect, useState } from 'react';
import { Card, Table, Typography, Button, Tag, Modal, List, Statistic, Row, Col, Spin, Tabs, InputNumber, Space, Alert, Tooltip, Divider, Radio, Input, message } from 'antd';
import { DownloadOutlined, ReloadOutlined, EyeOutlined, ArrowRightOutlined, CheckCircleFilled, CloseCircleFilled, WarningOutlined } from '@ant-design/icons';
import { useProject, type StyleRequirement } from '../../context/ProjectContext';
import { gradeStudent, type StudentResult } from '../../utils/grading';
// CORRECTION : Import nécessaire
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;

export function ResultsScreen() {
  const { students, profWorkbook, sheetConfigs, globalOptions, projectType, wordConfig } = useProject();
  const [results, setResults] = useState<StudentResult[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null);
  const [loading, setLoading] = useState(false);

  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictStudent, setConflictStudent] = useState<StudentResult | null>(null);
  const [resolvedId, setResolvedId] = useState("");

  useEffect(() => {
    const runGrading = async () => {
      if (students.length > 0) {
        setLoading(true);
        try {
          const graded = await Promise.all(students.map(student => 
            gradeStudent(student, profWorkbook, sheetConfigs, globalOptions, projectType, wordConfig)
          ));
          graded.sort((a, b) => b.globalScore - a.globalScore);
          setResults(graded);
        } catch (error) {
          console.error("Erreur correction:", error);
          message.error("Erreur lors du calcul des notes. Vérifiez la console.");
        } finally {
          setLoading(false); // S'assure que le chargement s'arrête
        }
      }
    };
    runGrading();
  }, [students, profWorkbook, projectType, sheetConfigs, globalOptions, wordConfig]);

  const handleManualAdjustment = (value: number | null) => {
    if (!selectedStudent || value === null) return;
    const updatedStudent = { ...selectedStudent, manualAdjustment: value };
    setSelectedStudent(updatedStudent);
    setResults(prevResults => prevResults.map(r => r.id === selectedStudent.id ? updatedStudent : r));
  };

  const handleResolveConflict = (student: StudentResult) => {
    setConflictStudent(student);
    setResolvedId(student.idFromFileName || "");
    setConflictModalOpen(true);
  };

  const saveConflictResolution = () => {
    if (!conflictStudent) return;
    setResults(prevResults => prevResults.map(r => {
      if (r.id === conflictStudent.id) {
        return { 
          ...r, 
          studentId: resolvedId,
          hasIdentityConflict: false 
        };
      }
      return r;
    }));
    setConflictModalOpen(false);
    setConflictStudent(null);
  };

  const handleExport = () => {
    let header = ["Nom", "Prénom", "Groupe", "ID Étudiant", "Note Calculée", "Ajustement", "Note Finale /20"];
    if (projectType === 'excel') {
       header.push(...sheetConfigs.filter(c => c.enabled).map(c => c.name));
    } else {
       header.push("Détails Word");
    }

    const data = results.map(r => {
      const finalScore = Math.min(20, Math.max(0, r.globalScore + (r.manualAdjustment || 0)));
      const exportId = r.hasIdentityConflict ? "CONFLIT" : (r.studentId || "");
      const base = [r.name, r.firstName, r.group, exportId, r.globalScore, r.manualAdjustment || 0, finalScore];
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

  // --- Composants visuels ---
  const StyleDiff = ({ expected, actual, unit = "" }: { expected: any, actual: any, unit?: string }) => {
    if (expected === undefined || expected === null || expected === "") return <Text type="secondary">-</Text>;
    const e = String(expected).toLowerCase().trim().replace('#', '');
    const a = String(actual || "").toLowerCase().trim().replace('#', '');
    
    if (e === a) {
      return <Tag color="success" style={{ display: 'flex', alignItems: 'center', width: 'fit-content' }}><CheckCircleFilled style={{ marginRight: 5 }} /> {String(expected)}{unit}</Tag>;
    }
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Tooltip title="Incorrect"><Tag color="error" style={{ textDecoration: 'line-through' }}>{String(actual || "Vide")}{unit}</Tag></Tooltip>
        <ArrowRightOutlined style={{ color: '#999', fontSize: 10 }} />
        <Tooltip title="Attendu"><Tag color="processing" style={{ fontWeight: 'bold' }}>{String(expected)}{unit}</Tag></Tooltip>
      </div>
    );
  };

  const sortedStylesToCheck = wordConfig ? [...wordConfig.stylesToCheck].sort((a, b) => a.name.localeCompare(b.name)) : [];

  const wordComparisonColumns = (studentStyles: StyleRequirement[]) => [
    { title: 'Style', dataIndex: 'name', key: 'name', width: 150, render: (t:string) => <Text strong>{t}</Text> },
    { title: 'Police', key: 'font', render: (_: any, req: StyleRequirement) => <StyleDiff expected={req.fontName} actual={studentStyles.find(s => s.id === req.id)?.fontName} /> },
    { title: 'Taille', key: 'size', render: (_: any, req: StyleRequirement) => <StyleDiff expected={req.fontSize} actual={studentStyles.find(s => s.id === req.id)?.fontSize} unit=" pt" /> },
    { title: 'Couleur', key: 'color', render: (_: any, req: StyleRequirement) => <StyleDiff expected={req.color} actual={studentStyles.find(s => s.id === req.id)?.color} /> },
    { title: 'Gras', key: 'bold', render: (_: any, req: StyleRequirement) => req.isBold !== undefined ? <StyleDiff expected={req.isBold ? "OUI" : "NON"} actual={studentStyles.find(s => s.id === req.id)?.isBold ? "OUI" : "NON"} /> : null }
  ];

  const mainColumns = [
    { title: 'Groupe', dataIndex: 'group', key: 'group', sorter: (a: StudentResult, b: StudentResult) => a.group.localeCompare(b.group), render: (t:string) => <Tag color="blue">{t}</Tag> },
    { title: 'Nom', dataIndex: 'name', key: 'name', sorter: (a: StudentResult, b: StudentResult) => a.name.localeCompare(b.name) },
    { title: 'Prénom', dataIndex: 'firstName', key: 'firstName' },
    { title: 'ID Étudiant', key: 'studentId', render: (_:any, r:StudentResult) => r.hasIdentityConflict ? <Button type="primary" danger size="small" icon={<WarningOutlined />} onClick={() => handleResolveConflict(r)}>Résoudre</Button> : <Text>{r.studentId || "Inconnu"}</Text> },
    { title: 'Note / 20', key: 'finalScore', render: (_:any, r:StudentResult) => {
        const final = Math.min(20, Math.max(0, r.globalScore + (r.manualAdjustment || 0)));
        return <Tag color={final < 10 ? 'red' : final===20 ? 'gold' : 'green'} style={{fontSize: '1.1em', fontWeight: 'bold'}}>{final.toFixed(2)}</Tag>;
    }},
    { title: 'Action', key: 'action', render: (_:any, r:StudentResult) => <Button icon={<EyeOutlined />} onClick={() => setSelectedStudent(r)}>Voir</Button> },
  ];

  const classAverage = results.length > 0 ? (results.reduce((acc, curr) => acc + curr.globalScore, 0) / results.length).toFixed(2) : "0";

  return (
    <div style={{ marginTop: -20 }}>
      {loading ? <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" tip="Correction en cours..." /></div> : (
        <>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={8}><Card><Statistic title="Copies" value={results.length} prefix={<ReloadOutlined />} /></Card></Col>
            <Col span={8}><Card><Statistic title="Moyenne" value={classAverage} suffix="/ 20" precision={2} /></Card></Col>
            <Col span={8}><Card style={{display:'flex', alignItems:'center', justifyContent:'center', height:'100%'}}><Button type="primary" size="large" icon={<DownloadOutlined />} onClick={handleExport}>Exporter</Button></Card></Col>
          </Row>
          <Table columns={mainColumns} dataSource={results} rowKey="id" pagination={{ pageSize: 10 }} bordered />
          
          {conflictStudent && (
            <Modal title="Conflit d'identité" open={conflictModalOpen} onOk={saveConflictResolution} onCancel={() => setConflictModalOpen(false)}>
              <Radio.Group onChange={e => setResolvedId(e.target.value)} value={resolvedId} style={{width:'100%'}}>
                <Space direction="vertical" style={{width:'100%'}}>
                  <Radio value={conflictStudent.idFromFileName}>Fichier : <Tag color="blue">{conflictStudent.idFromFileName}</Tag></Radio>
                  <Radio value={conflictStudent.idFromSheet}>Feuille : <Tag color="green">{conflictStudent.idFromSheet}</Tag></Radio>
                  <Radio value="manual">Manuel : <Input style={{width:150}} disabled={resolvedId !== 'manual'} onChange={e => resolvedId === 'manual' && setResolvedId(e.target.value)} /></Radio>
                </Space>
              </Radio.Group>
            </Modal>
          )}

          <Modal title={`Correction : ${selectedStudent?.name}`} open={!!selectedStudent} onCancel={() => setSelectedStudent(null)} footer={[<Button key="ok" onClick={() => setSelectedStudent(null)}>Fermer</Button>]} width={1000} style={{top:20}}>
            {selectedStudent && (
              <Tabs defaultActiveKey="1" items={[
                { key: '1', label: 'Détails', children: (
                  <div style={{maxHeight:'60vh', overflow:'auto'}}>
                    <div style={{ marginBottom: 20, background: '#f5f5f5', padding: 15, borderRadius: 5 }}>
                        <Space size="large">
                            <Text>Calculé: <b>{selectedStudent.globalScore}</b></Text>
                            <Text>+</Text>
                            <Space><Text>Ajustement:</Text><InputNumber value={selectedStudent.manualAdjustment || 0} onChange={handleManualAdjustment} step={0.5} /></Space>
                            <Text>=</Text>
                            <Tag color="geekblue" style={{fontSize:16}}>{Math.min(20, Math.max(0, selectedStudent.globalScore + (selectedStudent.manualAdjustment || 0))).toFixed(2)} / 20</Tag>
                        </Space>
                    </div>
                    {projectType === 'word' && selectedStudent.detectedStyles ? (
                        <Table dataSource={sortedStylesToCheck} columns={wordComparisonColumns(selectedStudent.detectedStyles)} rowKey="id" pagination={false} bordered size="small" />
                    ) : (
                        <List dataSource={selectedStudent.sheetResults} renderItem={item => (
                            <List.Item><List.Item.Meta title={item.sheetName} description={<ul style={{color:'red'}}>{item.details.map((e,i)=><li key={i}>{e}</li>)}</ul>} /><Tag color={item.score>10?'green':'red'}>{item.score}/20</Tag></List.Item>
                        )} />
                    )}
                  </div>
                )}
              ]} />
            )}
          </Modal>
        </>
      )}
    </div>
  );
}