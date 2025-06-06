import React, { useState } from 'react';
import { Button } from '../ui';
import TransferirChamadoModal from './TransferirChamadoModal';
import type { Chamado } from '../../types';

interface TransferButtonProps {
  chamado: Chamado;
  onTransfer: () => void;
  disabled?: boolean;
}

const TransferButton: React.FC<TransferButtonProps> = ({
  chamado,
  onTransfer,
  disabled = false
}) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button
        variant="warning"
        size="sm"
        onClick={() => setShowModal(true)}
        disabled={disabled}
        title="Transferir chamado"
      >
        🔄 Transferir
      </Button>

      {showModal && (
        <TransferirChamadoModal
          isOpen={true}
          onClose={() => setShowModal(false)}
          chamado={chamado}
          onTransfer={() => {
            setShowModal(false);
            onTransfer();
          }}
        />
      )}
    </>
  );
};

export default TransferButton;
