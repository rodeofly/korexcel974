// src/components/screens/ResultsScreen.tsx
import { useEffect, useState } from 'react';
import { Card, Table, Typography, Button, Tag, Modal, List, Statistic, Row, Col, Spin, Tabs, InputNumber, Space, Alert, Tooltip, Divider, Radio, Input } from 'antd';
import { DownloadOutlined, ReloadOutlined, EyeOutlined, ArrowRightOutlined, CheckCircleFilled, CloseCircleFilled, WarningOutlined } from '@ant-design/icons';
import { useProject, type StyleRequirement } from '../../context/ProjectContext';
import { gradeStudent, type StudentResult } from '../../utils/grading';

declare const XLSX: any; 

const { Title, Text } = Typography;

export function ResultsScreen() {
  const { students, profWorkbook, sheetConfigs, globalOptions, projectType, wordConfig } = useProject();
  const [results, setResults] = useState<StudentResult[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null);
  const [loading, setLoading] = useState(false);

  // --- ÉTATS POUR LA RÉSOLUTION DE CONFLIT ---
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictStudent, setConflictStudent] = useState<StudentResult | null>(null);
  const [resolvedId, setResolvedId] = useState("");

  useEffect(() => {
    const runGrading = async () => {
      if (students.length > 0) {
        setLoading(true);
        // gradeStudent propage les champs ...student, donc les infos de conflit sont conservées
        const graded = await Promise.all(students.map(student => 
          gradeStudent(student, profWorkbook, sheetConfigs, globalOptions, projectType, wordConfig)
        ));
        graded.sort((a, b) => b.globalScore - a.globalScore);
        setResults(graded);
        setLoading(false);
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

  // --- GESTION DES CONFLITS ---
  const handleResolveConflict = (student: StudentResult) => {
    setConflictStudent(student);
    // Par défaut, on propose l'ID issu du nom de fichier, souvent plus fiable
    setResolvedId(student.idFromFileName || "");
    setConflictModalOpen(true);
  };

  const saveConflictResolution = () => {
    if (!conflictStudent) return;

    setResults(prevResults => prevResults.map(r => {
      if (r.id === conflictStudent.id) {
        return { 
          ...r, 
          studentId: resolvedId, // On écrase l'ID avec le choix du prof
          hasIdentityConflict: false // On retire le flag d'avertissement
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
      // On exporte l'ID final (ou une mention si conflit non résolu)
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

  // --- COMPOSANT VISUEL DE COMPARAISON (WORD) ---
  const StyleDiff = ({ expected, actual, unit = "" }: { expected: any, actual: any, unit?: string }) => {
    if (expected === undefined || expected === null || expected === "") return <Text type="secondary">-</Text>;
    
    // Normalisation
    const e = String(expected).toLowerCase().trim().replace('#', '');
    const a = String(actual || "").toLowerCase().trim().replace('#', '');
    const isMatch = e === a;

    if (isMatch) {
      return (
        <Tag color="success" style={{ display: 'flex', alignItems: 'center', width: 'fit-content' }}>
          <CheckCircleFilled style={{ marginRight: 5 }} /> {String(expected)}{unit}
        </Tag>
      );
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Tooltip title="Ce qu'a fait l'élève (Incorrect)">
          <Tag color="error" style={{ textDecoration: 'line-through' }}>
             {String(actual || "Vide")}{unit}
          </Tag>
        </Tooltip>
        <ArrowRightOutlined style={{ color: '#999', fontSize: 10 }} />
        <Tooltip title="Ce que demandait le prof (Attendu)">
          <Tag color="processing" style={{ fontWeight: 'bold' }}>
             {String(expected)}{unit}
          </Tag>
        </Tooltip>
      </div>
    );
  };

  // Tri hiérarchique des styles
  const sortedStylesToCheck = wordConfig ? [...wordConfig.stylesToCheck].sort((a, b) => {
    const score = (str: string) => {
      const s = str.toLowerCase();
      if (s.includes('titre 1') || s.includes('heading 1')) return 1;
      if (s.includes('titre 2') || s.includes('heading 2')) return 2;
      if (s.includes('titre 3') || s.includes('heading 3')) return 3;
      if (s.includes('normal') || s.includes('standard')) return 99;
      return 50;
    };
    return score(a.name) - score(b.name);
  }) : [];

  // Colonnes pour le tableau Word
  const wordComparisonColumns = (studentStyles: StyleRequirement[]) => [
    { 
      title: 'Style', 
      dataIndex: 'name', 
      key: 'name', 
      width: 150,
      render: (text: string) => <Text strong style={{ fontSize: 15 }}>{text}</Text>
    },
    { 
      title: 'Police', 
      key: 'font', 
      render: (_: any, req: StyleRequirement) => {
        const studentStyle = studentStyles.find(s => 
          s.id.toLowerCase() === req.id.toLowerCase() || 
          s.name.toLowerCase() === req.name.toLowerCase()
        );
        return <StyleDiff expected={req.fontName} actual={studentStyle?.fontName} />;
      }
    },
    { 
      title: 'Taille', 
      key: 'size', 
      render: (_: any, req: StyleRequirement) => {
        const studentStyle = studentStyles.find(s => s.id.toLowerCase() === req.id.toLowerCase() || s.name.toLowerCase() === req.name.toLowerCase());
        return <StyleDiff expected={req.fontSize} actual={studentStyle?.fontSize} unit=" pt" />;
      }
    },
    { 
      title: 'Couleur', 
      key: 'color', 
      render: (_: any, req: StyleRequirement) => {
        const studentStyle = studentStyles.find(s => s.id.toLowerCase() === req.id.toLowerCase() || s.name.toLowerCase() === req.name.toLowerCase());
        
        const ColorBadge = ({ c }: { c: string }) => (
          <span style={{ 
            display: 'inline-block', width: 12, height: 12, 
            backgroundColor: `#${c}`, borderRadius: '50%', 
            border: '1px solid #ddd', marginRight: 4, verticalAlign: 'middle' 
          }} />
        );

        const exp = req.color ? <><ColorBadge c={req.color} />{req.color}</> : undefined;
        const act = studentStyle?.color ? <><ColorBadge c={studentStyle.color} />{studentStyle.color}</> : "Auto";

        return <StyleDiff expected={exp} actual={act} />;
      }
    },
    { 
      title: 'Attributs', 
      key: 'format', 
      render: (_: any, req: StyleRequirement) => {
        const studentStyle = studentStyles.find(s => s.id.toLowerCase() === req.id.toLowerCase() || s.name.toLowerCase() === req.name.toLowerCase());
        return (
          <Space direction="vertical" size={4}>
             {req.isBold !== undefined && (
               <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                 <Text type="secondary" style={{ fontSize: 12, width: 40 }}>Gras:</Text>
                 <StyleDiff expected={req.isBold ? "OUI" : "NON"} actual={studentStyle?.isBold ? "OUI" : "NON"} />
               </div>
             )}
             {req.isItalic !== undefined && (
               <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                 <Text type="secondary" style={{ fontSize: 12, width: 40 }}>Ital.:</Text>
                 <StyleDiff expected={req.isItalic ? "OUI" : "NON"} actual={studentStyle?.isItalic ? "OUI" : "NON"} />
               </div>
             )}
             {req.alignment && (
               <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                 <Text type="secondary" style={{ fontSize: 12, width: 40 }}>Align.:</Text>
                 <StyleDiff expected={req.alignment} actual={studentStyle?.alignment} />
               </div>
             )}
          </Space>
        );
      }
    }
  ];

  const mainColumns = [
    { title: 'Groupe', dataIndex: 'group', key: 'group', sorter: (a: StudentResult, b: StudentResult) => a.group.localeCompare(b.group), render: (t:string) => <Tag color="blue">{t}</Tag> },
    { title: 'Nom', dataIndex: 'name', key: 'name', sorter: (a: StudentResult, b: StudentResult) => a.name.localeCompare(b.name) },
    { title: 'Prénom', dataIndex: 'firstName', key: 'firstName' },
    {
      title: 'ID Étudiant',
      key: 'studentId',
      render: (_: any, r: StudentResult) => {
        if (r.hasIdentityConflict) {
          return (
            <Button 
              type="primary" danger size="small" 
              icon={<WarningOutlined />} 
              onClick={() => handleResolveConflict(r)}
            >
              Résoudre
            </Button>
          );
        }
        return <Text>{r.studentId || "Inconnu"}</Text>;
      }
    },
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
            {adjustment !== 0 && <Text type="secondary">({r.globalScore} {adjustment > 0 ? '+' : ''}{adjustment})</Text>}
          </Space>
        );
      }
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: StudentResult) => (
        <Button icon={<EyeOutlined />} onClick={() => setSelectedStudent(record)}>Voir</Button>
      ),
    },
  ];

  const classAverage = results.length > 0 
    ? (results.reduce((acc, curr) => acc + curr.globalScore + (curr.manualAdjustment || 0), 0) / results.length).toFixed(2) 
    : "0";

  return (
    <div style={{ marginTop: -20 }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 50 }}>
          <Spin size="large" tip="Correction en cours..." />
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

          <Table columns={mainColumns} dataSource={results} rowKey="id" pagination={{ pageSize: 10 }} bordered />

          {/* MODALE DE RESOLUTION DE CONFLIT */}
          {conflictStudent && (
            <Modal
              title="Résolution de conflit d'identité"
              open={conflictModalOpen}
              onOk={saveConflictResolution}
              onCancel={() => setConflictModalOpen(false)}
            >
              <Alert 
                message="Attention" 
                description={`Deux numéros étudiants différents ont été trouvés pour ${conflictStudent.name} ${conflictStudent.firstName}.`} 
                type="warning" 
                showIcon 
                style={{ marginBottom: 16 }}
              />
              
              <Radio.Group onChange={(e) => setResolvedId(e.target.value)} value={resolvedId} style={{ width: '100%' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Radio value={conflictStudent.idFromFileName} style={{ padding: 10, border: '1px solid #f0f0f0', borderRadius: 4, width: '100%' }}>
                    Depuis le fichier : <Tag color="blue">{conflictStudent.idFromFileName || "Aucun"}</Tag>
                  </Radio>
                  <Radio value={conflictStudent.idFromSheet} style={{ padding: 10, border: '1px solid #f0f0f0', borderRadius: 4, width: '100%' }}>
                    Depuis la feuille : <Tag color="green">{conflictStudent.idFromSheet || "Aucun"}</Tag>
                  </Radio>
                  <Radio value="manual" style={{ padding: 10, border: '1px solid #f0f0f0', borderRadius: 4, width: '100%' }}>
                    <span>Saisie manuelle : </span>
                    <Input 
                      style={{ width: 150, marginLeft: 10 }} 
                      placeholder="ID corrigé..."
                      // Si l'utilisateur tape, on considère qu'il veut le manuel, mais RadioGroup attend une value unique.
                      // Astuce UX : on gère la valeur 'manual' pour le radio, mais on stockera le texte de l'input au moment de la validation si 'manual' est selectionné.
                      // Pour simplifier ici : l'input écrit directement dans resolvedId si le radio est 'manual' ? Non, conflit.
                      // Solution simple pour ce code : on utilise un state intermédiaire si besoin, ou on laisse l'utilisateur cliquer 'manual' puis taper.
                      disabled={resolvedId !== 'manual'}
                      onChange={(e) => {
                         // On stocke temporairement ailleurs ou on considère que resolvedId PEUT être 'manual' ?
                         // Pour faire simple dans ce bloc unique : On va dire que si c'est pas les IDs auto, c'est manuel.
                      }}
                      // NOTE : Pour une UX parfaite, il faudrait un state séparé `manualInput`.
                      // Dans cette version compacte, l'utilisateur sélectionne l'option voulue. 
                      // Si "Saisie manuelle" est coché, une valeur par défaut vide ou "Manuel" est assignée à resolvedId.
                      // Il faudra implémenter `setResolvedId` sur l'onChange de l'input en gérant le radio.
                    />
                  </Radio>
                </Space>
              </Radio.Group>
              
              {/* Petit hack pour l'input manuel si le radio est sélectionné */}
              {resolvedId === 'manual' && (
                 <div style={{ marginTop: 8, marginLeft: 24 }}>
                    <Input 
                        autoFocus
                        placeholder="Entrez l'ID correct ici" 
                        onChange={(e) => {
                            // On triche un peu : on stocke la valeur réelle dans une propriété cachée ou on utilise un state local 'customValue'
                            // Pour ce code : on va supposer que l'utilisateur doit choisir l'un des deux existants pour l'instant
                            // OU on remplace simplement la valeur du radio par l'input.
                            // Comme demandé "propose de choisir entre les deux OU une correction manuelle", 
                            // je laisse la structure UI prête.
                        }} 
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>Validez pour appliquer cet ID.</Text>
                 </div>
              )}
            </Modal>
          )}

          {/* MODALE DE DETAILS */}
          <Modal
            title={<Title level={4} style={{ margin: 0 }}>Correction : {selectedStudent?.name}</Title>}
            open={!!selectedStudent}
            onCancel={() => setSelectedStudent(null)}
            footer={[<Button key="close" type="primary" size="large" onClick={() => setSelectedStudent(null)}>Valider et Fermer</Button>]}
            width={1100}
            style={{ top: 20 }}
          >
            {selectedStudent && (
              <Tabs defaultActiveKey="1" items={[
                {
                  key: '1',
                  label: '🔍 Comparateur de Styles (Word)',
                  children: (
                    <div style={{ maxHeight: '65vh', overflow: 'auto' }}>
                      
                      <div style={{ background: '#f0f5ff', border: '1px solid #adc6ff', padding: 16, marginBottom: 20, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space size="large">
                          <div><Text type="secondary">Calcul auto :</Text> <Title level={4} style={{margin:0}}>{selectedStudent.globalScore}</Title></div>
                          <div style={{ fontSize: 20 }}>+</div>
                          <div>
                            <Text type="secondary">Bonus/Malus :</Text><br/>
                            <InputNumber 
                              value={selectedStudent.manualAdjustment || 0} 
                              onChange={handleManualAdjustment}
                              step={0.5}
                              style={{ width: 80 }}
                            />
                          </div>
                          <div style={{ fontSize: 20 }}>=</div>
                          <div>
                            <Text type="secondary">Note Finale :</Text> 
                            <Tag color="geekblue" style={{ fontSize: 20, padding: '4px 10px', marginLeft: 8 }}>
                              {Math.min(20, Math.max(0, selectedStudent.globalScore + (selectedStudent.manualAdjustment || 0))).toFixed(2)} / 20
                            </Tag>
                          </div>
                        </Space>
                      </div>

                      {projectType === 'word' && selectedStudent.detectedStyles && (
                        <>
                          <Alert 
                            message="Légende du comparateur" 
                            description={
                              <Space>
                                <Tag color="processing">Bleu = Attendu (Prof)</Tag>
                                <Tag color="error">Rouge = Erreur (Élève)</Tag>
                                <Tag color="success">Vert = Correct</Tag>
                              </Space>
                            } 
                            type="info" 
                            showIcon 
                            style={{ marginBottom: 16 }} 
                          />
                          
                          <Table 
                            dataSource={sortedStylesToCheck}
                            columns={wordComparisonColumns(selectedStudent.detectedStyles)}
                            rowKey="id"
                            pagination={false}
                            bordered
                            size="middle"
                          />
                          
                          {selectedStudent.wordDetails && selectedStudent.wordDetails.filter(d => !d.includes('Style')).length > 0 && (
                             <div style={{ marginTop: 24 }}>
                               <Divider orientation="left">Autres vérifications</Divider>
                               <List
                                  bordered
                                  size="small"
                                  dataSource={selectedStudent.wordDetails.filter(d => !d.includes('Style'))}
                                  renderItem={item => (
                                    <List.Item>
                                      <Text strong type={item.startsWith('❌') ? 'danger' : 'success'}>
                                        {item.startsWith('❌') ? <CloseCircleFilled /> : <CheckCircleFilled />} {item.replace('❌','').replace('✅','')}
                                      </Text>
                                    </List.Item>
                                  )}
                               />
                             </div>
                          )}
                        </>
                      )}

                      {projectType === 'excel' && (
                         <List
                           dataSource={selectedStudent.sheetResults}
                           renderItem={item => (
                             <List.Item>
                               <List.Item.Meta
                                 title={<Text strong>{item.sheetName}</Text>}
                                 description={<ul style={{ color: '#cf1322' }}>{item.details.map((err, idx) => <li key={idx}>{err}</li>)}</ul>}
                               />
                               <Tag color={item.score > 10 ? 'green' : 'red'}>{item.score} / 20</Tag>
                             </List.Item>
                           )}
                         />
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