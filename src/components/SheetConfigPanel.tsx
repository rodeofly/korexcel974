// src/components/SheetConfigPanel.tsx
import { Modal, Typography } from 'antd';

const { Title } = Typography;

interface SheetConfigPanelProps {
  visible: boolean;
  onClose: () => void;
  sheetName?: string;
}

export function SheetConfigPanel({ visible, onClose, sheetName }: SheetConfigPanelProps) {
  return (
    <Modal
      title={<Title level={5}>Configurer la feuille "{sheetName}"</Title>}
      visible={visible}
      onCancel={onClose}
      footer={null} // Pour l'instant, pas de footer
      width={800}
    >
      <p>Options de configuration pour la feuille {sheetName} à venir ici...</p>
    </Modal>
  );
}
