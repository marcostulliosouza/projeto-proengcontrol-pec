/* eslint-disable @typescript-eslint/no-unused-vars */
// ChamadoAtendimento.tsx - SOLUÇÃO SIMPLIFICADA
import React, { useState, useEffect, useRef } from 'react';
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
  const [showTransferirModal, setShowTransferirModal] = useState(false);

  // NOVA: Flag para controlar se já processou o fechamento
  const isProcessingClose = useRef(false);

  const { socket, cancelAttendance, currentAttendance, finishAttendance } = useSocket();

  const caracteresRestantes = 250 - descricaoAtendimento.length;

  // Função de fechamento controlada
  const handleClose = () => {
    if (isProcessingClose.current) return;
    
    console.log('🔄 Fechando modal de atendimento');
    isProcessingClose.current = true;
    onCancel();
  };

  // Cleanup
  useEffect(() => {
    return () => {
      const keys = Object.keys(sessionStorage).filter(key => 
        key.startsWith('transferred_') || key.startsWith('received_transfer_')
      );
      keys.forEach(key => sessionStorage.removeItem(key));
    };
  }, []);

  // Verificar transferência anterior
  useEffect(() => {
    const wasTransferred = sessionStorage.getItem(`transferred_${chamado.cha_id}`);
    if (wasTransferred) {
      console.log('🔄 Chamado foi transferido anteriormente, fechando modal');
      sessionStorage.removeItem(`transferred_${chamado.cha_id}`);
      handleClose();
    }
  }, [chamado.cha_id]);

  // Inicializar timer
  useEffect(() => {
    const initializeTimer = async () => {
      try {
        console.log(`⏰ Inicializando timer para chamado ${chamado.cha_id}...`);
        
        // Verificar dados de transferência PRIMEIRO
        const checkTransferData = () => {
          const transferKeys = Object.keys(sessionStorage).filter(key => 
            key.startsWith('received_transfer_') && key.includes(chamado.cha_id.toString())
          );
          
          for (const key of transferKeys) {
            try {
              const transferData = JSON.parse(sessionStorage.getItem(key) || '{}');
              if (transferData.chamadoId === chamado.cha_id && transferData.startTime) {
                console.log('🔄 Dados de transferência encontrados:', transferData);
                return transferData;
              }
            } catch (error) {
              sessionStorage.removeItem(key);
            }
          }
          return null;
        };
  
        const transferData = checkTransferData();
        
        if (transferData) {
          const startTime = new Date(transferData.startTime);
          const now = new Date();
          const currentSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
          
          setRealStartTime(startTime);
          setTimer(Math.max(0, currentSeconds));
          
          console.log(`✅ Timer inicializado da transferência: ${currentSeconds}s`);
          
          Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('received_transfer_') && key.includes(chamado.cha_id.toString())) {
              sessionStorage.removeItem(key);
            }
          });
          return;
        }
        
        // Buscar do backend
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
        const response = await fetch(`${apiUrl}/chamados/atendimentos-ativos`);
        const data = await response.json();
        
        if (data.success && data.data) {
          const myAttendance = data.data.find((att: { 
            atc_chamado: number; 
            atc_data_hora_inicio: string;
            atc_colaborador: number;
          }) => att.atc_chamado === chamado.cha_id);
          
          if (myAttendance) {
            const startTime = new Date(myAttendance.atc_data_hora_inicio);
            const now = new Date();
            const diffInMs = now.getTime() - startTime.getTime();
            
            if (diffInMs > 0 && diffInMs < (24 * 60 * 60 * 1000)) {
              setRealStartTime(startTime);
              const currentSeconds = Math.floor(diffInMs / 1000);
              setTimer(Math.max(0, currentSeconds));
              console.log(`✅ Timer inicializado do backend: ${currentSeconds}s`);
              return;
            }
          }
        }
        
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
  }, [chamado.cha_id]);

  // Timer local contínuo
  useEffect(() => {
    if (!realStartTime) return;

    const interval = setInterval(() => {
      const currentSeconds = Math.floor((new Date().getTime() - realStartTime.getTime()) / 1000);
      setTimer(Math.max(0, currentSeconds));
    }, 1000);

    return () => clearInterval(interval);
  }, [realStartTime]);

  // Socket listeners - SIMPLIFICADO
  useEffect(() => {
    if (!socket) return;

    const handleAttendanceFinished = (data: { chamadoId: number; userId?: number }) => {
      console.log('✅ Socket: Atendimento finalizado recebido', data);
      if (data.chamadoId === chamado.cha_id) {
        console.log('✅ Meu atendimento finalizado - fechando modal');
        handleClose();
      }
    };

    const handleAttendanceCancelled = (data: { chamadoId: number; userId?: number }) => {
      console.log('🚫 Socket: Atendimento cancelado recebido', data);
      if (data.chamadoId === chamado.cha_id) {
        console.log('🚫 Meu atendimento cancelado - fechando modal');
        handleClose();
      }
    };

    const handleTransferredOut = (data: { chamadoId: number; userId: number; timestamp: string }) => {
      console.log('🔄 Socket: Chamado transferido (saída) recebido', data);
      if (data.chamadoId === chamado.cha_id && data.userId === currentAttendance?.userId) {
        console.log('🔄 Meu chamado foi transferido - fechando modal');
        
        sessionStorage.setItem(`transferred_${data.chamadoId}`, JSON.stringify({
          transferred: true,
          timestamp: data.timestamp
        }));
        
        handleClose();
      }
    };

    // Registrar apenas os eventos essenciais
    socket.on('user_finished_attendance', handleAttendanceFinished);
    socket.on('user_cancelled_attendance', handleAttendanceCancelled);
    socket.on('user_transferred_out', handleTransferredOut);
    socket.on('attendance_finished', () => handleAttendanceFinished({ chamadoId: chamado.cha_id }));
    socket.on('attendance_cancelled', () => handleAttendanceCancelled({ chamadoId: chamado.cha_id }));

    return () => {
      socket.off('user_finished_attendance', handleAttendanceFinished);
      socket.off('user_cancelled_attendance', handleAttendanceCancelled);
      socket.off('user_transferred_out', handleTransferredOut);
      socket.off('attendance_finished');
      socket.off('attendance_cancelled');
    };
  }, [socket, chamado.cha_id, currentAttendance?.userId]);

  // Event listeners customizados - SIMPLIFICADO
  useEffect(() => {
    // Verificar se transferência foi completada
    const transferCompleted = sessionStorage.getItem(`transfer_completed_${chamado.cha_id}`);
    if (transferCompleted) {
      console.log('✅ Transferência completada detectada - fechando modal');
      sessionStorage.removeItem(`transfer_completed_${chamado.cha_id}`);
      handleClose();
      return;
    }

    const handleTransferCompleted = (event: CustomEvent) => {
      const { chamadoId } = event.detail;
      console.log('✅ Evento transferência completada:', chamadoId);
      
      if (chamadoId === chamado.cha_id) {
        console.log('✅ Minha transferência completada - fechando modal');
        handleClose();
      }
    };

    const handleChamadoFinalizado = (event: CustomEvent) => {
      const { chamadoId } = event.detail;
      console.log(`🎯 Evento customizado: chamado ${chamadoId} finalizado`);
      
      if (chamadoId === chamado.cha_id) {
        console.log('✅ Meu chamado finalizado - fechando modal');
        handleClose();
      }
    };

    window.addEventListener('transferCompleted', handleTransferCompleted as EventListener);
    window.addEventListener('chamadoFinalizado', handleChamadoFinalizado as EventListener);
    
    return () => {
      window.removeEventListener('transferCompleted', handleTransferCompleted as EventListener);
      window.removeEventListener('chamadoFinalizado', handleChamadoFinalizado as EventListener);
    };
  }, [chamado.cha_id]);

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
      
      // 1. Finalizar usando detrator
      await ChamadoService.finalizarChamado(chamado.cha_id, selectedDetrator, descricaoAtendimento.trim());
      
      console.log(`✅ Chamado finalizado com sucesso via API`);
  
      // 2. Fechar modal de confirmação
      setShowFinalizarModal(false);
  
      // 3. Notificar o socket DEPOIS da finalização no banco
      finishAttendance();
  
      // 4. Buscar chamado atualizado
      const updatedChamado = await ChamadoService.getChamado(chamado.cha_id);
            
      // 5. Notificar componente pai
      onFinish(updatedChamado);
      
      // 6. Disparar evento customizado para forçar atualização da lista
      window.dispatchEvent(new CustomEvent('chamadoFinalizado', { 
        detail: { chamadoId: chamado.cha_id, status: 3 } 
      }));

      // 7. NÃO chamar handleClose aqui - deixar os event listeners fazerem isso
      
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
      
      // NÃO chamar handleClose aqui - deixar os event listeners fazerem isso
      
    } catch (error) {
      console.error('Erro ao cancelar atendimento:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimerColor = () => {
    if (timer < 0) return 'text-blue-600'; 
    if (timer > 30 * 60) return 'text-red-600';
    if (timer > 15 * 60) return 'text-yellow-600';
    return 'text-blue-600';
  };

  const getTimerBackgroundColor = () => {
    if (timer < 0) return 'bg-blue-50 border-blue-200';
    if (timer > 30 * 60) return 'bg-red-50 border-red-200';
    if (timer > 15 * 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-blue-50 border-blue-200';
  };

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
          <SeletorDetrator
            tipoChamadoId={chamado.cha_tipo}
            selectedDetrator={selectedDetrator}
            onDetratorChange={setSelectedDetrator}
            disabled={loading}
          />
          
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

      {/* Modal de Transferencia */}
      {showTransferirModal && (
        <TransferirChamadoModal
          isOpen={true}
          onClose={() => setShowTransferirModal(false)}
          chamado={chamado}
          onTransfer={() => {
            setShowTransferirModal(false);
            // NÃO chamar handleClose aqui - deixar os event listeners fazerem isso
          }}
        />
      )}
    </div>
  );
};

export default ChamadoAtendimento;