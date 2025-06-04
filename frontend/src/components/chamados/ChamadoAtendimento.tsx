import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, Modal } from '../ui';
import { ChamadoService, type Acao } from '../../services/chamadoService';
import { useSocket } from '../../contexts/SocketContext';
import type { Chamado } from '../../types';

interface ChamadoAtendimentoProps {
  chamado: Chamado;
  onFinish: (updatedChamado: Chamado) => void;
  onCancel: () => void;
}

const ChamadoAtendimento: React.FC<ChamadoAtendimentoProps> = ({
  chamado,
  onFinish,
  onCancel,
}) => {
  const [timer, setTimer] = useState(0);
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [selectedAcao, setSelectedAcao] = useState<number | undefined>();
  const [acaoDescricao, setAcaoDescricao] = useState('');
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const { cancelAttendance } = useSocket();

  // Timer em tempo real
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Carregar ações
  useEffect(() => {
    const loadAcoes = async () => {
      try {
        const acoesData = await ChamadoService.getAcoes();
        setAcoes(acoesData);
      } catch (error) {
        console.error('Erro ao carregar ações:', error);
      }
    };
    loadAcoes();
  }, []);

  const formatTimer = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFinalizarChamado = async () => {
    if (!selectedAcao) {
      alert('Selecione uma ação para finalizar o chamado');
      return;
    }

    try {
      setLoading(true);
      await ChamadoService.finalizarChamado(chamado.cha_id, selectedAcao);
      
      // Buscar chamado atualizado
      const updatedChamado = await ChamadoService.getChamado(chamado.cha_id);
      onFinish(updatedChamado);
    } catch (error) {
      console.error('Erro ao finalizar chamado:', error);
      alert('Erro ao finalizar chamado');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelarAtendimento = () => {
    cancelAttendance(chamado.cha_id);
    onCancel();
  };

  return (
    <div className="space-y-6">
      {/* Timer Grande */}
      <Card>
        <div className="text-center">
          <div className="text-6xl font-mono font-bold text-blue-600 mb-4">
            {formatTimer(timer)}
          </div>
          <p className="text-gray-600">Tempo de Atendimento</p>
        </div>
      </Card>

      {/* Informações do Chamado */}
      <Card title="Informações do Chamado">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">DT:</label>
            <p className="font-mono bg-gray-100 px-2 py-1 rounded">{chamado.cha_DT}</p>
          </div>
          <div>
            <label className="form-label">Cliente:</label>
            <p>{chamado.cliente_nome}</p>
          </div>
          <div>
            <label className="form-label">Produto:</label>
            <p>{chamado.produto_nome}</p>
          </div>
          <div>
            <label className="form-label">Tipo:</label>
            <p>{chamado.tipo_chamado}</p>
          </div>
        </div>
        <div className="mt-4">
          <label className="form-label">Descrição:</label>
          <p className="whitespace-pre-wrap bg-gray-50 p-3 rounded">{chamado.cha_descricao}</p>
        </div>
      </Card>

      {/* Ações */}
      <Card title="Finalizar Atendimento">
        <div className="space-y-4">
          <Select
            label="Ação Realizada"
            placeholder="Selecione a ação realizada..."
            value={selectedAcao || ''}
            onChange={(value) => setSelectedAcao(Number(value))}
            options={acoes.map(acao => ({
              value: acao.ach_id,
              label: acao.ach_descricao
            }))}
          />
          
          <Input
            label="Descrição da Ação (opcional)"
            value={acaoDescricao}
            onChange={(e) => setAcaoDescricao(e.target.value)}
            placeholder="Descreva detalhes da ação realizada..."
          />
        </div>
      </Card>

      {/* Botões */}
      <div className="flex justify-between">
        <Button
          variant="danger"
          onClick={handleCancelarAtendimento}
          disabled={loading}
        >
          🚫 Cancelar Atendimento
        </Button>
        
        <Button
          variant="success"
          onClick={() => setShowFinalizarModal(true)}
          disabled={loading || !selectedAcao}
          loading={loading}
        >
          ✅ Finalizar Chamado
        </Button>
      </div>

      {/* Modal de Confirmação */}
      <Modal
        isOpen={showFinalizarModal}
        onClose={() => setShowFinalizarModal(false)}
        title="Finalizar Chamado"
        size="md"
      >
        <div className="space-y-4">
          <p>Tem certeza que deseja finalizar este chamado?</p>
          <div className="bg-gray-50 p-4 rounded">
            <p><strong>Tempo total:</strong> {formatTimer(timer)}</p>
            <p><strong>Ação:</strong> {acoes.find(a => a.ach_id === selectedAcao)?.ach_descricao}</p>
          </div>
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setShowFinalizarModal(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              variant="success"
              onClick={handleFinalizarChamado}
              loading={loading}
            >
              Confirmar Finalização
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ChamadoAtendimento;