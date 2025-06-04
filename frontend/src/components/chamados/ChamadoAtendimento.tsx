import React, { useState, useEffect } from 'react';
import { Card, Button, Modal } from '../ui';
import { ChamadoService } from '../../services/chamadoService';
import { useSocket } from '../../contexts/SocketContext';
import type { Chamado } from '../../types';
import SeletorDetrator from '../ui/DetratorActionSelector';

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

  const { socket, cancelAttendance } = useSocket();

  // Contador de caracteres (máximo 250 como no Python)
  const caracteresRestantes = 250 - descricaoAtendimento.length;


  // Fechar modal quando shouldClose for true
  useEffect(() => {
    if (shouldClose) {
      console.log('🔄 Fechando modal devido a shouldClose');
      onCancel();
    }
  }, [shouldClose, onCancel]);

  // Buscar tempo inicial
  useEffect(() => {
    const initializeTimer = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
        const response = await fetch(`${apiUrl}/chamados/atendimentos-ativos`);
        const data = await response.json();
        
        if (data.success && data.data) {
          const myAttendance = data.data.find((att: { atc_chamado: number; atc_data_hora_inicio: string }) => att.atc_chamado === chamado.cha_id);
          
          if (myAttendance) {
            const startTime = new Date(myAttendance.atc_data_hora_inicio);
            const now = new Date();
            const diffInMs = now.getTime() - startTime.getTime();
            
            if (diffInMs > 0 && diffInMs < (7 * 24 * 60 * 60 * 1000)) { // Menor que 7 dias
              setRealStartTime(startTime);
              const currentSeconds = Math.floor(diffInMs / 1000);
              setTimer(Math.max(0, currentSeconds));
              console.log(`⏰ Timer inicializado: ${currentSeconds}s`);
              return;
            }
          }
        }
        
        // Fallback
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

  // Escutar eventos do socket
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

    // Escutar também eventos pessoais
    const handleMyAttendanceFinished = () => {
      console.log('✅ Socket: Meu atendimento finalizado (evento pessoal)');
      setShouldClose(true);
    };

    const handleMyAttendanceCancelled = () => {
      console.log('🚫 Socket: Meu atendimento cancelado (evento pessoal)');
      setShouldClose(true);
    };

    // NOVO: Escutar atualizações de timers para detectar remoção
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleTimersSync = (timersData: any[]) => {
      console.log('⏰ Socket: Timers sincronizados', timersData);
      
      // Se não há mais timer para este chamado, significa que foi finalizado
      const meuTimer = timersData.find(timer => timer.chamadoId === chamado.cha_id);
      if (!meuTimer) {
        console.log('⏰ Meu timer não existe mais - chamado finalizado');
        setShouldClose(true);
      }
    };

    socket.on('user_finished_attendance', handleAttendanceFinished);
    socket.on('user_cancelled_attendance', handleAttendanceCancelled);
    socket.on('attendance_finished', handleMyAttendanceFinished);
    socket.on('attendance_cancelled', handleMyAttendanceCancelled);
    socket.on('timers_sync', handleTimersSync); // NOVO LISTENER

    return () => {
      socket.off('user_finished_attendance', handleAttendanceFinished);
      socket.off('user_cancelled_attendance', handleAttendanceCancelled);
      socket.off('attendance_finished', handleMyAttendanceFinished);
      socket.off('attendance_cancelled', handleMyAttendanceCancelled);
      socket.off('timers_sync', handleTimersSync); // LIMPAR LISTENER
    };
  }, [socket, chamado.cha_id]);

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
      
      // Finalizar usando detrator
      await ChamadoService.finalizarChamado(chamado.cha_id, selectedDetrator, descricaoAtendimento.trim());
      
      // Buscar chamado atualizado
      const updatedChamado = await ChamadoService.getChamado(chamado.cha_id);
      
      console.log('✅ Chamado finalizado com sucesso via API');
      
      // Fechar modal de confirmação
      setShowFinalizarModal(false);
      
      // Notificar componente pai
      onFinish(updatedChamado);
      
      // FORÇAR fechamento do modal principal
      console.log('🔄 Forçando fechamento do modal principal');
      setShouldClose(true);
      
    } catch (error) {
      console.error('Erro ao finalizar chamado:', error);
      alert('Erro ao finalizar chamado');
    } finally {
      setLoading(false);
    }
  };

  // const handleCancelarAtendimento = async () => {
  //   if (loading) return;

  //   try {
  //     setLoading(true);
  //     console.log(`🚫 Cancelando atendimento do chamado ${chamado.cha_id}`);
      
  //     // Fechar modal de confirmação primeiro
  //     setShowCancelarModal(false);
      
  //     // Cancelar via socket
  //     cancelAttendance(chamado.cha_id);
      
  //     // Agendar fechamento
  //     setTimeout(() => {
  //       setShouldClose(true);
  //     }, 1000);
      
  //   } catch (error) {
  //     console.error('Erro ao cancelar atendimento:', error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const getTimerColor = () => {
    if (timer > 30 * 60) return 'text-red-600';
    if (timer > 15 * 60) return 'text-yellow-600';
    return 'text-blue-600';
  };

  // Não renderizar se deve fechar
  if (shouldClose) {
    return null;
  }

 return (
    <div className="space-y-6">
      {/* Timer Grande */}
      <Card>
        <div className="text-center">
          <div className={`text-6xl font-mono font-bold mb-4 ${getTimerColor()}`}>
            {formatTimer(timer)}
          </div>
          <p className="text-gray-600">Tempo de Atendimento</p>
          {realStartTime && (
            <p className="text-xs text-gray-500 mt-1">
              Iniciado em: {realStartTime.toLocaleTimeString('pt-BR')}
            </p>
          )}
          {timer > 30 * 60 && (
            <p className="text-red-600 text-sm mt-2 font-medium">
              ⚠️ Atendimento acima de 30 minutos
            </p>
          )}
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
            <p>{chamado.produto_nome || 'N/A'}</p>
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
          
          {/* Campo de Ação Realizada (como no Python) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="form-label">Ação Realizada *</label>
              <span className={`text-sm font-bold ${caracteresRestantes < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                {caracteresRestantes}
              </span>
            </div>
            <textarea
              className={`form-input min-h-[80px] max-h-[80px] resize-none uppercase ${
                caracteresRestantes < 0 ? 'border-red-500' : ''
              }`}
              value={descricaoAtendimento}
              onChange={(e) => {
                const value = e.target.value;
                if (value.length <= 250) {
                  setDescricaoAtendimento(value.toUpperCase());
                }
              }}
              placeholder="DESCREVA A AÇÃO REALIZADA DURANTE O CHAMADO..."
              maxLength={250}
              disabled={loading}
              style={{ textTransform: 'uppercase' }}
            />
            {!descricaoAtendimento.trim() && (
              <p className="text-gray-500 text-sm mt-1">
                Campo obrigatório para finalizar o chamado
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Botões */}
      <div className="flex justify-between">
        <Button
          variant="danger"
          onClick={() => setShowCancelarModal(true)}
          disabled={loading}
        >
          Cancelar
        </Button>
        
        <Button
          variant="success"
          onClick={() => setShowFinalizarModal(true)}
          disabled={loading || !selectedDetrator || !descricaoAtendimento.trim()}
          loading={loading}
        >
          Finalizar Chamado
        </Button>
      </div>

      {/* Modal de Confirmação Finalizar */}
      {showFinalizarModal && (
        <Modal
          isOpen={true}
          onClose={() => !loading && setShowFinalizarModal(false)}
          title="Finalizar Chamado?"
          size="md"
        >
          <div className="space-y-4">
            <p>Finalizar este chamado?</p>
            <div className="bg-gray-50 p-4 rounded">
              <p><strong>Tempo total:</strong> {formatTimer(timer)}</p>
              <div className="mt-2">
                <p><strong>Ação realizada:</strong></p>
                <p className="text-sm bg-white p-2 rounded border mt-1 max-h-20 overflow-y-auto font-mono">
                  {descricaoAtendimento.trim()}
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setShowFinalizarModal(false)}
                disabled={loading}
              >
                Não
              </Button>
              <Button
                variant="success"
                onClick={handleFinalizarChamado}
                loading={loading}
                disabled={loading}
              >
                Sim
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
            <p>Deseja cancelar este atendimento?</p>
            <p className="text-sm text-gray-600">
              O chamado voltará para status "Aberto".
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setShowCancelarModal(false)}
                disabled={loading}
              >
                Não
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setShowCancelarModal(false);
                  cancelAttendance(chamado.cha_id);
                  setTimeout(() => setShouldClose(true), 1000);
                }}
                disabled={loading}
              >
                Sim
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ChamadoAtendimento;