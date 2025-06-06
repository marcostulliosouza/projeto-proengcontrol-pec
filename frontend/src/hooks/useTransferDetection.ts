import { useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { ChamadoService } from '../services/chamadoService';
import { useToast } from '../contexts/ToastContext';

interface TransferDetectionProps {
  onTransferReceived: (chamadoId: number) => void;
}

export const useTransferDetection = ({ onTransferReceived }: TransferDetectionProps) => {
  const { socket } = useSocket();
  const { state: authState } = useAuth();
  const { showInfoToast } = useToast();
  const processedTransfers = useRef(new Set<string>());

  useEffect(() => {
    if (!socket || !authState.user) return;

    const handleTransferReceived = async (data: {
      chamadoId: number;
      userId: number;
      userName: string;
      startTime: string;
      motivo?: string;
    }) => {
      // Verificar se é para o usuário atual
      if (data.userId !== authState.user?.id) return;
      
      // Evitar processamento duplicado
      const transferKey = `${data.chamadoId}-${data.startTime}`;
      if (processedTransfers.current.has(transferKey)) {
        console.log('🔄 Transferência já processada, ignorando...');
        return;
      }
      
      processedTransfers.current.add(transferKey);
      
      console.log('🎯 Chamado transferido recebido:', data);
      
      try {
        // Aguardar um pouco para garantir que o backend processou
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verificar se o chamado realmente existe e está ativo
        const chamado = await ChamadoService.getChamado(data.chamadoId);
        
        if (chamado && chamado.cha_status === 2) {
          console.log('✅ Chamado válido recebido, abrindo modal automaticamente');
          
          // Notificar e abrir modal
          showInfoToast(
            '🔔 Novo Chamado Recebido',
            `Chamado #${data.chamadoId} foi transferido para você`
          );
          
          // Trigger para abrir modal
          onTransferReceived(data.chamadoId);
        } else {
          console.log('⚠️ Chamado não está mais ativo ou não existe');
        }
      } catch (error) {
        console.error('❌ Erro ao processar chamado transferido:', error);
      }
    };

    // Escutar apenas o evento específico de transferência recebida
    socket.on('user_transferred_in', handleTransferReceived);

    return () => {
      socket.off('user_transferred_in', handleTransferReceived);
    };
  }, [socket, authState.user, onTransferReceived, showInfoToast]);

  // Limpar cache de transferências processadas periodicamente
  useEffect(() => {
    const cleanup = setInterval(() => {
      processedTransfers.current.clear();
    }, 5 * 60 * 1000); // A cada 5 minutos

    return () => clearInterval(cleanup);
  }, []);
};