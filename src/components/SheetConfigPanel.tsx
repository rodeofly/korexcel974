// src/components/SheetConfigPanel.tsx
import { Modal, Typography, Button, Alert } from 'antd';
import { useProject } from '../context/ProjectContext';
import { useState, useEffect } from 'react';
// CORRECTION : Import direct au lieu de variable globale
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;

interface SheetConfigPanelProps {
  visible: boolean;
  onClose: () => void;
  sheetName?: string;
}

export function SheetConfigPanel({ visible, onClose, sheetName }: SheetConfigPanelProps) {
  const { profWorkbook, sheetConfigs, updateSheetConfig, globalOptions } = useProject();
  const [gridData, setGridData] = useState<any[][]>([]);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{r: number, c: number} | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{r: number, c: number} | null>(null);
  const [isAddingMode, setIsAddingMode] = useState(true);

  const currentConfig = sheetConfigs.find(c => c.name === sheetName);
  const selectedCells = currentConfig?.selectedCells || [];

  useEffect(() => {
    if (visible && sheetName && profWorkbook) {
      const sheet = profWorkbook.Sheets[sheetName];
      if (sheet) {
        // Limitation de la zone de scan pour éviter de faire ramer le navigateur
        const range = XLSX.utils.decode_range(sheet['!ref'] || "A1");
        
        const restrictedRange = {
          s: range.s, 
          e: {
            r: Math.min(range.e.r, globalOptions.scanMaxRows - 1), 
            c: Math.min(range.e.c, globalOptions.scanMaxCols - 1)
          }
        };

        const jsonData = XLSX.utils.sheet_to_json(sheet, { 
          header: 1, 
          defval: "",
          range: restrictedRange 
        });
        
        setGridData(jsonData);
      }
    }
  }, [visible, sheetName, profWorkbook, globalOptions.scanMaxRows, globalOptions.scanMaxCols]);

  const handleMouseUp = () => {
    if (isDragging && dragStart && dragCurrent && sheetName) {
      applySelectionRange(dragStart, dragCurrent);
    }
    setIsDragging(false);
    setDragStart(null);
    setDragCurrent(null);
  };

  const handleMouseDown = (r: number, c: number, isCurrentlySelected: boolean) => {
    setIsDragging(true);
    setDragStart({ r, c });
    setDragCurrent({ r, c });
    setIsAddingMode(!isCurrentlySelected);
  };

  const handleMouseEnter = (r: number, c: number) => {
    if (isDragging) {
      setDragCurrent({ r, c });
    }
  };

  const applySelectionRange = (start: {r: number, c: number}, end: {r: number, c: number}) => {
    if (!sheetName) return;

    const minR = Math.min(start.r, end.r);
    const maxR = Math.max(start.r, end.r);
    const minC = Math.min(start.c, end.c);
    const maxC = Math.max(start.c, end.c);

    let newSelection = [...selectedCells];

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const cellAddr = XLSX.utils.encode_cell({ r, c });
        
        if (isAddingMode) {
          if (!newSelection.includes(cellAddr)) {
            newSelection.push(cellAddr);
          }
        } else {
          newSelection = newSelection.filter(addr => addr !== cellAddr);
        }
      }
    }
    updateSheetConfig(sheetName, 'selectedCells', newSelection);
  };

  const isInDragZone = (r: number, c: number) => {
    if (!isDragging || !dragStart || !dragCurrent) return false;
    
    const minR = Math.min(dragStart.r, dragCurrent.r);
    const maxR = Math.max(dragStart.r, dragCurrent.r);
    const minC = Math.min(dragStart.c, dragCurrent.c);
    const maxC = Math.max(dragStart.c, dragCurrent.c);

    return r >= minR && r <= maxR && c >= minC && c <= maxC;
  };

  const handleSelectAll = () => {
    if (!sheetName) return;
    updateSheetConfig(sheetName, 'selectedCells', []);
  };

  return (
    <Modal
      title={<Title level={5}>Sélection pour "{sheetName}"</Title>}
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="reset" onClick={handleSelectAll}>Réinitialiser (Tout corriger)</Button>,
        <Button key="ok" type="primary" onClick={onClose}>Terminé</Button>
      ]}
      width="90%"
      style={{ top: 20 }}
      styles={{ body: { userSelect: 'none' } }}
    >
      <div onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        <Alert 
          message="Sélectionnez les cellules à noter" 
          description="Cliquez-glissez pour sélectionner (Vert). Repassez dessus pour désélectionner."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <div style={{ overflow: 'auto', maxHeight: '60vh', border: '1px solid #f0f0f0', cursor: 'cell' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
            <tbody>
              {gridData.map((row, rIndex) => (
                <tr key={rIndex}>
                  <td style={{ 
                    background: '#f5f5f5', border: '1px solid #d9d9d9', textAlign: 'center', width: 30, color: '#999', userSelect: 'none'
                  }}>
                    {rIndex + 1}
                  </td>
                  
                  {row.map((cellVal: any, cIndex: number) => {
                    const cellAddr = XLSX.utils.encode_cell({ r: rIndex, c: cIndex });
                    const isSelected = selectedCells.includes(cellAddr);
                    const isDragActive = isInDragZone(rIndex, cIndex);

                    let bgColor = 'white';
                    if (isDragActive) {
                      bgColor = isAddingMode ? '#bae7ff' : '#ffccc7'; 
                    } else if (isSelected) {
                      bgColor = '#d9f7be';
                    }

                    return (
                      <td 
                        key={cIndex}
                        onMouseDown={() => handleMouseDown(rIndex, cIndex, isSelected)}
                        onMouseEnter={() => handleMouseEnter(rIndex, cIndex)}
                        style={{
                          border: '1px solid #d9d9d9',
                          padding: '4px 8px',
                          minWidth: 60,
                          maxWidth: 200,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          backgroundColor: bgColor,
                          color: isSelected || isDragActive ? '#000' : '#bfbfbf',
                          userSelect: 'none'
                        }}
                        title={String(cellVal)}
                      >
                        {cellVal !== undefined && cellVal !== "" ? String(cellVal) : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}