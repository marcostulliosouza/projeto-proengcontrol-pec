import React, { useState, useEffect, useRef } from 'react';
import { Button, Select } from '../ui';
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
  const [loading, setLoading] = useState(false);
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [selectedAcao, setSelectedAcao] = useState<number | ''>('');
  const [observacoes, setObservacoes] = useState('');
  const [timer, setTimer] = useState(0);
  // Removed unused state isTimerRunning
  const [startTime, setStartTime] = useState<Date | null>(null);  
  const { updateTimer, finishAttendance } = useSocket();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Carregar ações disponíveis
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

  // Buscar tempo atual do atendimento e iniciar timer
  useEffect(() => {
    const initializeTimer = async () => {
      try {
        // Buscar tempo atual do banco de dados
        const response = await fetch(`/api/v1/chamados/atendimentos-ativos`);
        const data = await response.json();
        
        if (data.success) {
          const atendimentoAtual = data.data.find(
            (atendimento: { atc_chamado: number }) => atendimento.atc_chamado === chamado.cha_id
          );
          
          if (atendimentoAtual) {
            const tempoDecorrido = atendimentoAtual.tempo_decorrido || 0;
            setTimer(tempoDecorrido);
            setStartTime(new Date(atendimentoAtual.atc_data_hora_inicio));
            
            // Iniciar contagem a partir do tempo já decorrido
            intervalRef.current = setInterval(() => {
              setTimer(prev => {
                const newTime = prev + 1;
                updateTimer(chamado.cha_id, newTime);
                return newTime;
              });
            }, 1000);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar tempo do atendimento:', error);
        // Se der erro, iniciar do zero
        setStartTime(new Date());
        intervalRef.current = setInterval(() => {
          setTimer(prev => {
            const newTime = prev + 1;
            updateTimer(chamado.cha_id, newTime);
            return newTime;
          });
        }, 1000);
      }
    };

    initializeTimer();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [chamado.cha_id, updateTimer]);

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

    const confirmMessage = `Tem certeza que deseja finalizar este atendimento?\n\nTempo total: ${formatTimer(timer)}\nAção: ${acoes.find(a => a.ach_id === selectedAcao)?.ach_descricao}`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Finalizar chamado no backend
      await ChamadoService.finalizarChamado(chamado.cha_id, Number(selectedAcao));

      // Finalizar atendimento no WebSocket
      finishAttendance();

      // Buscar chamado atualizado
      const updatedChamado = await ChamadoService.getChamado(chamado.cha_id);
      
      onFinish(updatedChamado);
    } catch (error) {
      console.error('Erro ao finalizar chamado:', error);
      alert('Erro ao finalizar chamado. Tente novamente.');
      setLoading(false);
    }
  };

  const handleCancelar = async () => {
    const confirmMessage = `⚠️ ATENÇÃO: Você está cancelando um atendimento ativo!\n\nTempo investido: ${formatTimer(timer)}\nO chamado voltará para status "Aberto"\n\nTem certeza que deseja cancelar?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Cancelar atendimento no backend
      await fetch(`/api/v1/chamados/${chamado.cha_id}/cancelar`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      // Finalizar atendimento no WebSocket
      finishAttendance();

      onCancel();
    } catch (error) {
      console.error('Erro ao cancelar atendimento:', error);
      alert('Erro ao cancelar atendimento. Tente novamente.');
      setLoading(false);
    }
  };

  const getTimerColor = () => {
    if (timer > 1800) return 'text-red-600'; // > 30 min
    if (timer > 900) return 'text-yellow-600'; // > 15 min
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      {/* Timer Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Atendimento em Andamento</h3>
            <p className="text-blue-100">Chamado #{chamado.cha_id} - {chamado.cliente_nome}</p>
            {timer > 1800 && (
              <p className="text-red-200 font-medium mt-1">⚠️ ATENÇÃO: Atendimento ultrapassou 30 minutos!</p>
            )}
          </div>
          <div className="text-right">
            <div className={`text-3xl font-mono font-bold ${getTimerColor()}`}>
              {formatTimer(timer)}
            </div>
            <p className="text-blue-100 text-sm">
              Em andamento
            </p>
          </div>
        </div>
        
        {/* Timer Controls */}
        <div className="flex items-center space-x-3 mt-4">
          <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
          <span className="text-sm">
            {startTime && `Iniciado às ${startTime.toLocaleTimeString('pt-BR')}`}
          </span>
        </div>
      </div>

      {/* Detalhes do Chamado */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold text-secondary-900 mb-3">Detalhes do Chamado</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-secondary-700">DT:</span>
            <span className="ml-2">{chamado.cha_DT || 'N/A'}</span>
          </div>
          <div>
            <span className="font-medium text-secondary-700">Tipo:</span>
            <span className="ml-2">{chamado.tipo_chamado}</span>
          </div>
          <div>
            <span className="font-medium text-secondary-700">Produto:</span>
            <span className="ml-2">{chamado.produto_nome || 'N/A'}</span>
          </div>
          <div>
            <span className="font-medium text-secondary-700">Operador:</span>
            <span className="ml-2">{chamado.cha_operador}</span>
          </div>
        </div>
        <div className="mt-3">
          <span className="font-medium text-secondary-700">Descrição:</span>
          <p className="mt-1 text-secondary-900 bg-white p-3 rounded border">
            {chamado.cha_descricao}
          </p>
        </div>
      </div>

      {/* Área de Resolução */}
      <div className="space-y-4">
        <h4 className="font-semibold text-secondary-900">Resolução do Chamado</h4>
        
        <Select
          label="Ação Realizada"
          required
          value={selectedAcao}
          onChange={(value) => setSelectedAcao(value as number | '')}
          options={acoes.map(acao => ({
            value: acao.ach_id,
            label: acao.ach_descricao
          }))}
          placeholder="Selecione a ação realizada"
        />

        <div>
          <label className="form-label">Observações Adicionais</label>
          <textarea
            className="form-input min-h-[100px] resize-y"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Descreva os procedimentos realizados, peças trocadas, orientações dadas ao cliente, etc..."
          />
        </div>
      </div>

      {/* Estatísticas do Atendimento */}
      <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
        <h5 className="font-medium text-green-800 mb-2">Resumo do Atendimento</h5>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-green-700">Tempo Total:</span>
            <div className="font-mono font-semibold text-green-900">{formatTimer(timer)}</div>
          </div>
          <div>
            <span className="text-green-700">Status:</span>
            <div className="font-semibold text-green-900">
              {timer > 0 ? 'Em Andamento' : 'Pausado'}
            </div>
          </div>
          <div>
            <span className="text-green-700">Ação:</span>
            <div className="font-semibold text-green-900">
              {selectedAcao ? acoes.find(a => a.ach_id === selectedAcao)?.ach_descricao : 'Não selecionada'}
            </div>
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-secondary-200">
        <Button
          variant="danger"
          onClick={handleCancelar}
          disabled={loading}
        >
          Cancelar Atendimento
        </Button>
        
        <Button
          variant="success"
          onClick={handleFinalizarChamado}
          loading={loading}
          disabled={loading || !selectedAcao}
        >
          Finalizar Chamado
        </Button>
      </div>

      {/* Warning atualizado */}
      <div className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-800">
        <strong>⚠️ Modal Bloqueado:</strong> Este modal não pode ser fechado durante o atendimento. 
        Use "Cancelar Atendimento" para sair ou "Finalizar Chamado" para concluir.
      </div>
    </div>
  );
};

export default ChamadoAtendimento;