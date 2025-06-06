import React, { useState, useEffect } from 'react';
import { Card, Button, Modal } from '../ui';
import { ChamadoService } from '../../services/chamadoService';
import { useSocket } from '../../contexts/SocketContext';
import type { Chamado } from '../../types';
import SeletorDetrator from '../ui/DetratorActionSelector';
import TransferirChamadoModal from './TransferirChamadoModal';

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
  const [selectedDetrator, setSelectedDetrator] = useState<number | undefined>();
  const [descricaoAtendimento, setDescricaoAtendimento] = useState('');
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [showCancelarModal, setShowCancelarModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [realStartTime, setRealStartTime] = useState<Date | null>(null);
  const [shouldClose, setShouldClose] = useState(false);
  const [showTransferirModal, setShowTransferirModal] = useState(false);

  const { socket, cancelAttendance, currentAttendance, finishAttendance } = useSocket();

  // Contador de caracteres (máximo 250 como no Python)
  const caracteresRestantes = 250 - descricaoAtendimento.length;

  // Fechar modal quando shouldClose for true
  useEffect(() => {
    if (shouldClose) {
      console.log('🔄 Fechando modal devido a shouldClose');
      onCancel();
    }
  }, [shouldClose, onCancel]);

  useEffect(() => {
    return () => {
      // Limpar qualquer flag de transferência ao desmontar
      const keys = Object.keys(sessionStorage).filter(key => 
        key.startsWith('transferred_') || key.startsWith('received_transfer_')
      );
      keys.forEach(key => sessionStorage.removeItem(key));
    };
  }, []);

  useEffect(() => {
    // Se este chamado foi transferido, fechar imediatamente
    const wasTransferred = sessionStorage.getItem(`transferred_${chamado.cha_id}`);
    if (wasTransferred) {
      console.log('🔄 Chamado foi transferido anteriormente, fechando modal');
      setShouldClose(true);
      sessionStorage.removeItem(`transferred_${chamado.cha_id}`);
    }
  }, [chamado.cha_id]);

  // Buscar tempo inicial do atendimento
  useEffect(() => {
    const initializeTimer = async () => {
      try {
        console.log(`⏰ Inicializando timer para chamado ${chamado.cha_id}...`);
        
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
        const response = await fetch(`${apiUrl}/chamados/atendimentos-ativos`);
        const data = await response.json();
        
        if (data.success && data.data) {
          const myAttendance = data.data.find((att: { 
            atc_chamado: number; 
            atc_data_hora_inicio: string;
            atc_colaborador: number;
          }) => att.atc_chamado === chamado.cha_id && att.atc_colaborador === currentAttendance?.userId);
          
          if (myAttendance) {
            const startTime = new Date(myAttendance.atc_data_hora_inicio);
            const now = new Date();
            const diffInMs = now.getTime() - startTime.getTime();
            
            // Validar se a data não é futura ou muito antiga
            if (diffInMs > 0 && diffInMs < (24 * 60 * 60 * 1000)) { // Menor que 24 horas
              setRealStartTime(startTime);
              const currentSeconds = Math.floor(diffInMs / 1000);
              setTimer(Math.max(0, currentSeconds));
              console.log(`✅ Timer inicializado: ${currentSeconds}s (início: ${startTime.toLocaleTimeString()})`);
              return;
            }
          }
        }
        
        // Fallback: usar hora atual
        console.log('⚠️ Usando fallback - definindo início como agora');
        setRealStartTime(new Date());
        setTimer(0);
      } catch (error) {
        console.error('Erro ao buscar tempo inicial:', error);
        setRealStartTime(new Date());
        setTimer(0);
      }
    };

    initializeTimer();
  }, [chamado.cha_id, currentAttendance?.userId]);

  // Timer local contínuo
  useEffect(() => {
    if (!realStartTime) return;

    const interval = setInterval(() => {
      const currentSeconds = Math.floor((new Date().getTime() - realStartTime.getTime()) / 1000);
      setTimer(Math.max(0, currentSeconds));
    }, 1000);

    return () => clearInterval(interval);
  }, [realStartTime]);

  // Escutar eventos do socket para fechamento automático
  useEffect(() => {
    if (!socket) return;

    const handleAttendanceFinished = (data: { chamadoId: number; userId?: number }) => {
      console.log('✅ Socket: Atendimento finalizado recebido', data);
      if (data.chamadoId === chamado.cha_id) {
        console.log('✅ Meu atendimento finalizado - fechando modal');
        setShouldClose(true);
      }
    };

    const handleAttendanceCancelled = (data: { chamadoId: number; userId?: number }) => {
      console.log('🚫 Socket: Atendimento cancelado recebido', data);
      if (data.chamadoId === chamado.cha_id) {
        console.log('🚫 Meu atendimento cancelado - fechando modal');
        setShouldClose(true);
      }
    };

    // Eventos pessoais
    const handleMyAttendanceFinished = () => {
      console.log('✅ Socket: Meu atendimento finalizado (evento pessoal)');
      setShouldClose(true);
    };

    const handleMyAttendanceCancelled = () => {
      console.log('🚫 Socket: Meu atendimento cancelado (evento pessoal)');
      setShouldClose(true);
    };

    const handleTransferredOut = (data: { chamadoId: number; userId: number; timestamp: string }) => {
      console.log('🔄 Socket: Chamado transferido (saída) recebido', data);
      if (data.chamadoId === chamado.cha_id && data.userId === currentAttendance?.userId) {
        console.log('🔄 Meu chamado foi transferido - fechando modal DEFINITIVAMENTE');
        
        // IMPORTANTE: Marcar como transferido para evitar reabertura
        sessionStorage.setItem(`transferred_${data.chamadoId}`, 'true');
        setShouldClose(true);
      }
    };

    // Escutar atualizações de timers para detectar remoção
    const handleTimersSync = (timersData: { chamadoId: number; userId: number }[]) => {
      if (!Array.isArray(timersData)) return;
      
      const meuTimer = timersData.find(timer => 
        timer.chamadoId === chamado.cha_id && timer.userId === currentAttendance?.userId
      );
      
      if (!meuTimer) {
        console.log('⏰ Meu timer não existe mais - chamado finalizado/cancelado');
        setShouldClose(true);
      }
    };

    socket.on('user_finished_attendance', handleAttendanceFinished);
    socket.on('user_cancelled_attendance', handleAttendanceCancelled);
    socket.on('attendance_finished', handleMyAttendanceFinished);
    socket.on('attendance_cancelled', handleMyAttendanceCancelled);
    socket.on('timers_sync', handleTimersSync);
    socket.on('transferred_out', handleTransferredOut);

    return () => {
      socket.off('user_finished_attendance', handleAttendanceFinished);
      socket.off('user_cancelled_attendance', handleAttendanceCancelled);
      socket.off('attendance_finished', handleMyAttendanceFinished);
      socket.off('attendance_cancelled', handleMyAttendanceCancelled);
      socket.off('timers_sync', handleTimersSync);
      socket.off('transferred_out', handleTransferredOut);
    };
  }, [socket, chamado.cha_id, currentAttendance?.userId, shouldClose]);

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
    if (!selectedDetrator || loading) return;
    
    if (!descricaoAtendimento.trim()) {
      alert('Descreva a ação realizada durante o chamado.');
      return;
    }
    
    if (descricaoAtendimento.trim().length > 250) {
      alert('Descrição deve ter no máximo 250 caracteres');
      return;
    }

    try {
      setLoading(true);
      console.log(`🏁 Finalizando chamado ${chamado.cha_id} com detrator ${selectedDetrator}`);
      
      // Notificar o socket Antes de finalizar via API
      finishAttendance();

      // Finalizar usando detrator
      await ChamadoService.finalizarChamado(chamado.cha_id, selectedDetrator, descricaoAtendimento.trim());
      
      console.log(`✅ Chamado finalizado com sucesso via API`);

      // fechar modal de confirmação
      setShowFinalizarModal(false);

      // Buscar chamado atualizado
      const updatedChamado = await ChamadoService.getChamado(chamado.cha_id);
            
      // Notificar componente pai
      onFinish(updatedChamado);
      
      // FORÇAR fechamento do modal principal
      console.log('🔄 Forçando fechamento do modal principal');
      onCancel();
      
    } catch (error) {
      console.error('Erro ao finalizar chamado:', error);
      alert('Erro ao finalizar chamado');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelarAtendimento = async () => {
    if (loading) return;

    try {
      setLoading(true);
      console.log(`🚫 Cancelando atendimento do chamado ${chamado.cha_id}`);
      
      // Fechar modal de confirmação primeiro
      setShowCancelarModal(false);
      
      // Cancelar via socket
      cancelAttendance(chamado.cha_id);
      
      // Agendar fechamento
      setTimeout(() => {
        setShouldClose(true);
      }, 1000);
      
    } catch (error) {
      console.error('Erro ao cancelar atendimento:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimerColor = () => {
    if (timer < 0) return 'text-blue-600'; 
    if (timer > 30 * 60) return 'text-red-600'; // Mais de 30 minutos
    if (timer > 15 * 60) return 'text-yellow-600'; // Mais de 15 minutos
    return 'text-blue-600'; // Normal
  };

  const getTimerBackgroundColor = () => {
    if (timer < 0) return 'bg-blue-50 border-blue-200'; // Timer negativo
    if (timer > 30 * 60) return 'bg-red-50 border-red-200';
    if (timer > 15 * 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-blue-50 border-blue-200';
  };

  // Não renderizar se deve fechar
  if (shouldClose) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Timer Grande */}
      <Card>
        <div className={`text-center p-4 rounded-lg border ${getTimerBackgroundColor()}`}>
          <div className={`text-6xl font-mono font-bold mb-4 ${getTimerColor()}`}>
            {formatTimer(timer)}
          </div>
          <p className="text-gray-700 font-medium">Tempo de Atendimento</p>
          {realStartTime && (
            <p className="text-xs text-gray-500 mt-2">
              Iniciado às {realStartTime.toLocaleTimeString('pt-BR')}
            </p>
          )}
          {timer > 30 * 60 && (
            <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-red-800 text-sm font-medium">
              ⚠️ Atendimento acima de 30 minutos
            </div>
          )}
          {timer > 15 * 60 && timer <= 30 * 60 && (
            <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 text-sm">
              ⏰ Atendimento próximo dos 30 minutos
            </div>
          )}
        </div>
      </Card>

      {/* Informações do Chamado */}
      <Card title="Informações do Chamado">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">DT:</label>
            <p className="font-mono bg-gray-100 px-2 py-1 rounded">{chamado.cha_DT || 'Não informado'}</p>
          </div>
          <div>
            <label className="form-label">Cliente:</label>
            <p className="font-medium">{chamado.cliente_nome || 'Não informado'}</p>
          </div>
          <div>
            <label className="form-label">Produto:</label>
            <p>{chamado.produto_nome || 'N/A'}</p>
          </div>
          <div>
            <label className="form-label">Tipo:</label>
            <p>{chamado.tipo_chamado || 'Não informado'}</p>
          </div>
        </div>
        <div className="mt-4">
          <label className="form-label">Descrição:</label>
          <div className="whitespace-pre-wrap bg-gray-50 p-3 rounded border">
            {chamado.cha_descricao}
          </div>
        </div>
      </Card>

      {/* Finalizar Atendimento */}
      <Card title="Finalizar Chamado">
        <div className="space-y-4">
          {/* Seletor de Detrator */}
          <SeletorDetrator
            tipoChamadoId={chamado.cha_tipo}
            selectedDetrator={selectedDetrator}
            onDetratorChange={setSelectedDetrator}
            disabled={loading}
          />
          
          {/* Campo de Ação Realizada */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="form-label">Ação Realizada</label>
              <span className={`text-sm font-bold ${caracteresRestantes < 0 ? 'text-red-600' : caracteresRestantes < 50 ? 'text-yellow-600' : 'text-gray-500'}`}>
                {caracteresRestantes} restantes
              </span>
            </div>
            <textarea
              className={`form-input min-h-[100px] max-h-[100px] resize-none uppercase ${
                caracteresRestantes < 0 ? 'border-red-500' : ''
              }`}
              value={descricaoAtendimento}
              onChange={(e) => {
                const value = e.target.value;
                if (value.length <= 250) {
                  setDescricaoAtendimento(value.toUpperCase());
                }
              }}
              placeholder="DESCREVA DETALHADAMENTE A AÇÃO REALIZADA DURANTE O CHAMADO..."
              maxLength={250}
              disabled={loading}
              style={{ textTransform: 'uppercase' }}
            />
            {!descricaoAtendimento.trim() && (
              <p className="text-gray-500 text-sm mt-1">
                ⚠️ Campo obrigatório para finalizar o chamado
              </p>
            )}
            {caracteresRestantes < 0 && (
              <p className="text-red-600 text-sm mt-1">
                ❌ Descrição excede o limite de 250 caracteres
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Botões */}
      <div className="flex justify-between">
        <Button
          variant="warning"
          onClick={() => setShowTransferirModal(true)}
          disabled={loading}
          title="Transferir chamado para outro usuário"
        >
          🔄 Transferir Chamado
        </Button>

        <Button
          variant="danger"
          onClick={() => setShowCancelarModal(true)}
          disabled={loading}
          title="Cancelar atendimento"
        >
          🚫 Cancelar Atendimento
        </Button>
        
        <Button
          variant="success"
          onClick={() => setShowFinalizarModal(true)}
          disabled={loading || !selectedDetrator || !descricaoAtendimento.trim() || caracteresRestantes < 0}
          loading={loading}
          title={
            !selectedDetrator ? 'Selecione um detrator' :
            !descricaoAtendimento.trim() ? 'Digite a descrição da ação' :
            caracteresRestantes < 0 ? 'Descrição muito longa' :
            'Finalizar chamado'
          }
        >
          ✅ Finalizar Chamado
        </Button>
      </div>

      {/* Modal de Confirmação Finalizar */}
      {showFinalizarModal && (
        <Modal
          isOpen={true}
          onClose={() => !loading && setShowFinalizarModal(false)}
          title="Confirmar Finalização"
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">📋 Resumo do Atendimento</h4>
              <div className="text-sm text-green-700 space-y-1">
                <p><strong>Chamado:</strong> #{chamado.cha_id} - {chamado.cha_DT}</p>
                <p><strong>Tempo total:</strong> {formatTimer(timer)}</p>
                <p><strong>Cliente:</strong> {chamado.cliente_nome}</p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded border">
              <p className="font-medium mb-2">Ação realizada:</p>
              <div className="text-sm bg-white p-3 rounded border max-h-24 overflow-y-auto font-mono">
                {descricaoAtendimento.trim()}
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
              <p className="text-yellow-800 text-sm">
                ⚠️ Esta ação não pode ser desfeita. Confirma a finalização?
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setShowFinalizarModal(false)}
                disabled={loading}
              >
                ❌ Cancelar
              </Button>
              <Button
                variant="success"
                onClick={handleFinalizarChamado}
                loading={loading}
                disabled={loading}
              >
                ✅ Confirmar Finalização
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Confirmação Cancelar */}
      {showCancelarModal && (
        <Modal
          isOpen={true}
          onClose={() => !loading && setShowCancelarModal(false)}
          title="Cancelar Atendimento?"
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <p className="text-red-800">
                ⚠️ Tem certeza que deseja cancelar este atendimento?
              </p>
            </div>
            
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm text-gray-600">
                • O chamado voltará para status "Aberto"<br/>
                • O tempo de atendimento será perdido<br/>
                • Outros usuários poderão atender este chamado
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setShowCancelarModal(false)}
                disabled={loading}
              >
                Não, continuar atendimento
              </Button>
              <Button
                variant="danger"
                onClick={handleCancelarAtendimento}
                disabled={loading}
                loading={loading}
              >
                🚫 Sim, cancelar atendimento
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {/* Modal de Transferencia de Chamado*/}
      {showTransferirModal && (
        <TransferirChamadoModal
          isOpen={true}
          onClose={() => setShowTransferirModal(false)}
          chamado={chamado}
          onTransfer={() => {
            setShowTransferirModal(false);
            setShouldClose(true); // Fechar modal de atendimento
          }}
        />
      )}
    </div>
  );
};

export default ChamadoAtendimento;