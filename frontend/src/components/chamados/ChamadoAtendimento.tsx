/* eslint-disable @typescript-eslint/no-explicit-any */
// ChamadoAtendimento.tsx - SOLUÇÃO FINAL
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

  // CHAVE: Flag para marcar que o modal está sendo fechado intencionalmente
  const isClosingIntentionally = useRef(false);

  const { cancelAttendance, finishAttendance } = useSocket();
  const caracteresRestantes = 250 - descricaoAtendimento.length;

  // Inicializar timer
  useEffect(() => {
    const initializeTimer = async () => {
      try {
        // Verificar dados de transferência primeiro
        const transferKeys = Object.keys(sessionStorage).filter(key => 
          key.startsWith('received_transfer_') && key.includes(chamado.cha_id.toString())
        );
        
        for (const key of transferKeys) {
          try {
            const transferData = JSON.parse(sessionStorage.getItem(key) || '{}');
            if (transferData.chamadoId === chamado.cha_id && transferData.startTime) {
              const startTime = new Date(transferData.startTime);
              const currentSeconds = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
              
              setRealStartTime(startTime);
              setTimer(Math.max(0, currentSeconds));
              sessionStorage.removeItem(key);
              return;
            }
          } catch {
            sessionStorage.removeItem(key);
          }
        }
        
        // Buscar do backend
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
        const response = await fetch(`${apiUrl}/chamados/atendimentos-ativos`);
        const data = await response.json();
        
        if (data.success && data.data) {
          const myAttendance = data.data.find((att: any) => att.atc_chamado === chamado.cha_id);
          if (myAttendance) {
            const startTime = new Date(myAttendance.atc_data_hora_inicio);
            const currentSeconds = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
            setRealStartTime(startTime);
            setTimer(Math.max(0, currentSeconds));
            return;
          }
        }
        
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

  // Timer local
  useEffect(() => {
    if (!realStartTime) return;

    const interval = setInterval(() => {
      const currentSeconds = Math.floor((new Date().getTime() - realStartTime.getTime()) / 1000);
      setTimer(Math.max(0, currentSeconds));
    }, 1000);

    return () => clearInterval(interval);
  }, [realStartTime]);

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
  
    try {
      setLoading(true);
      console.log(`🏁 Finalizando chamado ${chamado.cha_id}`);
      
      // Marcar que estamos fechando intencionalmente
      isClosingIntentionally.current = true;
      
      // Finalizar no backend
      await ChamadoService.finalizarChamado(chamado.cha_id, selectedDetrator, descricaoAtendimento.trim());
      
      setShowFinalizarModal(false);
      
      // IMPORTANTE: Notificar socket PRIMEIRO
      finishAttendance();
      
      // NOVO: Forçar limpeza imediata do estado global via evento
      window.dispatchEvent(new CustomEvent('forceCleanAttendance'));
      
      const updatedChamado = await ChamadoService.getChamado(chamado.cha_id);
      onFinish(updatedChamado);
      
      // Disparar evento para lista
      window.dispatchEvent(new CustomEvent('chamadoFinalizado', { 
        detail: { chamadoId: chamado.cha_id, status: 3 } 
      }));
  
      // Fechar modal
      setTimeout(() => {
        onCancel();
      }, 300); // Reduzido para 300ms
      
    } catch (error) {
      console.error('Erro ao finalizar chamado:', error);
      isClosingIntentionally.current = false;
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
      
      // Marcar que estamos fechando intencionalmente
      isClosingIntentionally.current = true;
      
      setShowCancelarModal(false);
      
      // IMPORTANTE: Notificar socket PRIMEIRO
      cancelAttendance(chamado.cha_id);
      
      // NOVO: Forçar limpeza imediata do estado global via evento
      window.dispatchEvent(new CustomEvent('forceCleanAttendance'));
      
      // Fechar modal
      setTimeout(() => {
        onCancel();
      }, 300); // Reduzido para 300ms
      
    } catch (error) {
      console.error('Erro ao cancelar atendimento:', error);
      isClosingIntentionally.current = false;
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
            />
          </div>
        </div>
      </Card>

      {/* Botões */}
      <div className="flex justify-between">
        <Button
          variant="warning"
          onClick={() => setShowTransferirModal(true)}
          disabled={loading}
        >
          🔄 Transferir Chamado
        </Button>

        <Button
          variant="danger"
          onClick={() => setShowCancelarModal(true)}
          disabled={loading}
        >
          🚫 Cancelar Atendimento
        </Button>
        
        <Button
          variant="success"
          onClick={() => setShowFinalizarModal(true)}
          disabled={loading || !selectedDetrator || !descricaoAtendimento.trim() || caracteresRestantes < 0}
          loading={loading}
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
            isClosingIntentionally.current = true;
            setTimeout(() => {
              onCancel();
            }, 500);
          }}
        />
      )}
    </div>
  );
};

export default ChamadoAtendimento;