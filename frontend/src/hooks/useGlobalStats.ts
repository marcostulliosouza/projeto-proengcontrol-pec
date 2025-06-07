import { useState, useEffect, useCallback } from 'react';
import { ChamadoService } from '../services/chamadoService';
import { useSocket } from '../contexts/SocketContext';

interface GlobalStats {
  chamadosAbertos: number;
  manutencoesPendentes: number;
  dispositivosInativos: number;
}

export const useGlobalStats = () => {
  const [stats, setStats] = useState<GlobalStats>({
    chamadosAbertos: 0,
    manutencoesPendentes: 0,
    dispositivosInativos: 0
  });
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const loadStats = useCallback(async () => {
    try {
      // Buscar apenas chamados com status 1 (abertos) e 2 (em andamento)
      const [abertosResponse, andamentoResponse] = await Promise.all([
        ChamadoService.getChamados(1, 1, { status: 1 }),
        ChamadoService.getChamados(1, 1, { status: 2 })
      ]);
      
      const totalAbertos = abertosResponse.pagination.totalItems + andamentoResponse.pagination.totalItems;
      
      setStats(prev => ({
        ...prev,
        chamadosAbertos: totalAbertos
      }));
      
      console.log(`📊 Stats atualizadas: ${totalAbertos} chamados abertos/em andamento`);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Atualizar stats baseado em eventos do socket
  useEffect(() => {
    if (!socket) return;

    const handleChamadoFinalizado = () => {
      console.log('📊 Chamado finalizado - atualizando stats');
      setStats(prev => ({
        ...prev,
        chamadosAbertos: Math.max(0, prev.chamadosAbertos - 1)
      }));
    };

    const handleChamadoIniciado = () => {
      console.log('📊 Chamado iniciado - stats mantidas (ainda conta como aberto)');
      // Não alterar stats pois chamado em andamento ainda conta como "aberto" para o usuário
    };

    const handleChamadoCancelado = () => {
      console.log('📊 Chamado cancelado - stats mantidas');
      // Stats mantidas pois chamado volta para status aberto
    };

    const handleChamadoCriado = () => {
      console.log('📊 Novo chamado criado - incrementando stats');
      setStats(prev => ({
        ...prev,
        chamadosAbertos: prev.chamadosAbertos + 1
      }));
    };

    // Escutar eventos do socket
    socket.on('user_finished_attendance', handleChamadoFinalizado);
    socket.on('user_started_attendance', handleChamadoIniciado);
    socket.on('user_cancelled_attendance', handleChamadoCancelado);
    socket.on('chamado_created', handleChamadoCriado); // Se houver este evento

    return () => {
      socket.off('user_finished_attendance', handleChamadoFinalizado);
      socket.off('user_started_attendance', handleChamadoIniciado);
      socket.off('user_cancelled_attendance', handleChamadoCancelado);
      socket.off('chamado_created', handleChamadoCriado);
    };
  }, [socket]);

  useEffect(() => {
    loadStats();
    
    // Atualizar a cada 60 segundos como backup
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, [loadStats]);

  return { stats, loading, refetch: loadStats };
};