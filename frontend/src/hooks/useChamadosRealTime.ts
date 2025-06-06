import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import type { Chamado } from '../types';

interface Timer {
  chamadoId: number;
  seconds: number;
  startedAt: string;
  startedBy: string;
  userId: number;
  userName?: string;
  realStartTime: Date;
}

interface TimerSyncData {
  chamadoId: number;
  seconds?: number;
  startedAt?: string;
  startTime?: string;
  startedBy?: string;
  userName?: string;
  userId: number;
}

interface UserAttendanceData {
  chamadoId: number;
  startTime: string;
  userName: string;
  userId: number;
}

interface UserFinishedData {
  chamadoId: number;
  userId?: number;
}

declare global {
  interface Window {
    clearActionLoading?: (chamadoId: number) => void; // NOVO: Função para limpar loading
  }
}

export const useChamadosRealTime = (initialChamados: Chamado[]) => {
  const [chamados, setChamados] = useState<Chamado[]>(initialChamados);
  const [timers, setTimers] = useState<Timer[]>([]);
  const { socket } = useSocket();
  
  // Refs para controle
  const lastUpdateRef = useRef<number>(0);
  const updateTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Atualizar chamados APENAS quando necessário
  useEffect(() => {
    setChamados(initialChamados);
  }, [initialChamados]);

  // Timer local - OTIMIZADO
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prevTimers => {
        if (prevTimers.length === 0) return prevTimers;
        
        return prevTimers.map(timer => ({
          ...timer,
          seconds: Math.floor((new Date().getTime() - timer.realStartTime.getTime()) / 1000)
        }));
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Debounced update para evitar muitas atualizações
  const updateTimersDebounced = useCallback((newTimers: Timer[]) => {
    const now = Date.now();
    if (now - lastUpdateRef.current < 500) return; // Throttle de 500ms
    
    lastUpdateRef.current = now;
    
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      setTimers(prevTimers => {
        // Verificar se realmente mudou
        if (prevTimers.length !== newTimers.length) {
          console.log(`⏰ Timers: ${prevTimers.length} → ${newTimers.length}`);
          return newTimers;
        }
        
        const hasChanges = newTimers.some(newTimer => 
          !prevTimers.find(prev => prev.chamadoId === newTimer.chamadoId && prev.userId === newTimer.userId)
        );
        
        return hasChanges ? newTimers : prevTimers;
      });
    }, 100);
  }, []);

  // Socket listeners - SIMPLIFICADOS
  useEffect(() => {
    if (!socket) return;

    const handleTimersSync = (timersData: TimerSyncData[]) => {
      if (!Array.isArray(timersData)) return;
      
      const syncedTimers = timersData.map((timerData: TimerSyncData) => {
        const startTime = new Date(timerData.startTime || timerData.startedAt || 0);
        const currentSeconds = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
        
        return {
          chamadoId: timerData.chamadoId,
          seconds: Math.max(0, currentSeconds),
          startedAt: timerData.startTime || timerData.startedAt || '',
          startedBy: timerData.userName || timerData.startedBy || 'Unknown',
          userId: timerData.userId,
          userName: timerData.userName || timerData.startedBy || 'Unknown',
          realStartTime: startTime
        };
      });
      
      updateTimersDebounced(syncedTimers);
    };

    const handleUserStarted = (data: UserAttendanceData) => {
      console.log('🚀 Usuário iniciou:', data.chamadoId);

      // Adiconar timer
      setTimers(prev => {
        const filtered = prev.filter(timer => timer.chamadoId !== data.chamadoId);
        return [...filtered, {
          chamadoId: data.chamadoId,
          seconds: 0,
          startedAt: data.startTime,
          startedBy: data.userName,
          userId: data.userId,
          userName: data.userName,
          realStartTime: new Date(data.startTime)
        }];
      });

      // Atualizar status do chamado para em andamento
      setChamados(prev => prev.map(chamado => 
        chamado.cha_id === data.chamadoId 
          ? { 
            ...chamado, 
            cha_status: 2,
            colaborador_nome: data.userName,
            atc_colaborador: data.userId
          }
          : chamado
      ));

      // Limpar loading
      if (window.clearActionLoading) {
        window.clearActionLoading(data.chamadoId);
      }
  };

    const handleUserFinished = (data: UserFinishedData) => {
      console.log('✅ Usuário finalizou:', data.chamadoId);

      // Remover timer
      setTimers(prev => prev.filter(timer => timer.chamadoId !== data.chamadoId));

      setChamados(prev => prev.map(chamado =>
        chamado.cha_id === data.chamadoId
        ? { ...chamado, cha_status: 3 } 
        : chamado
      ));

      // Limpar loading se a função estiver disponível
      if (window.clearActionLoading) {
        window.clearActionLoading(data.chamadoId);
      }
    };

    const handleUserCancelled = (data: UserFinishedData) => {
      console.log('❌ Usuário cancelou:', data.chamadoId);

      // remover timer
      setTimers(prev => prev.filter(timer => timer.chamadoId !== data.chamadoId));

      // IMPORTANTE: Atualizar o status do chamado de volta para aberto
      setChamados(prev => prev.map(chamado =>
        chamado.cha_id === data.chamadoId
          ? { 
            ...chamado, 
            cha_status: 1, 
            colaborador_nome: undefined,
            atc_colaborador: undefined,
          }
          : chamado
      ));

      if (window.clearActionLoading) {
        window.clearActionLoading(data.chamadoId);
      }
    }

    const handleUserTransferredOut = (data: { chamadoId: number; userId: number; motivo?: string }) => {
      console.log('🔄 Chamado transferido (saída):', data.chamadoId);
      
      // Remover timer
      setTimers(prev => prev.filter(timer => timer.chamadoId !== data.chamadoId));
      
      // Atualizar status para aberto
      setChamados(prev => prev.map(chamado =>
        chamado.cha_id === data.chamadoId
          ? { 
            ...chamado, 
            cha_status: 2, // Continua em andamento, mas com novo responsável
            colaborador_nome: 'Transferido',
            atc_colaborador: undefined
          }
          : chamado
      ));
      
      if (window.clearActionLoading) {
        window.clearActionLoading(data.chamadoId);
      }
    };

    const handleUserTransferredIn = (data: UserAttendanceData & { motivo?: string }) => {
      console.log('🔄 Chamado recebido via transferência:', data.chamadoId);
      
      // Mesmo tratamento que iniciar atendimento
      handleUserStarted(data);
    };

    // Registrar listeners
    socket.on('timers_sync', handleTimersSync);
    socket.on('user_started_attendance', handleUserStarted);
    socket.on('user_finished_attendance', handleUserFinished);
    socket.on('user_cancelled_attendance', handleUserCancelled);
    socket.on('user_transferred_out', handleUserTransferredOut);
    socket.on('user_transferred_in', handleUserTransferredIn);

    return () => {
      socket.off('timers_sync', handleTimersSync);
      socket.off('user_started_attendance', handleUserStarted);
      socket.off('user_finished_attendance', handleUserFinished);
      socket.off('user_cancelled_attendance', handleUserCancelled);
      socket.off('user_transferred_out', handleUserTransferredOut);
      socket.off('user_transferred_in', handleUserTransferredIn);
      
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [socket, updateTimersDebounced]);

  // Funções memoized
  const getTimer = useCallback((chamadoId: number): Timer | undefined => {
    return timers.find(timer => timer.chamadoId === chamadoId);
  }, [timers]);

  const formatTimer = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    chamados,
    setChamados,
    timers,
    getTimer,
    formatTimer,
  };
};