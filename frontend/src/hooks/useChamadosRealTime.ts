import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';
import type { Chamado } from '../types';

interface Timer {
  chamadoId: number;
  seconds: number;
  startedAt: string;
  startedBy: string;
  userId: number;
  userName: string;
}

interface ChamadoLock {
  chamadoId: number;
  lockedBy: {
    userId: number;
    userName: string;
  };
}

export const useChamadosRealTime = (initialChamados: Chamado[]) => {
  const [chamados, setChamados] = useState<Chamado[]>(initialChamados);
  const [timers, setTimers] = useState<Timer[]>([]);
  const [lockedChamados, setLockedChamados] = useState<ChamadoLock[]>([]);
  const { socket } = useSocket();

  // Atualizar quando chamados iniciais mudarem
  useEffect(() => {
    setChamados(initialChamados);
  }, [initialChamados]);

  useEffect(() => {
    if (!socket) return;

    console.log('🔌 Socket conectado, configurando listeners...');
  
    // === LISTENERS PRINCIPAIS ===
    
    // 1. Sincronização de timers do servidor (a cada 5 segundos)
    const handleTimersSync = (timersData: Timer[]) => {
      console.log('📊 TIMERS SYNC RECEBIDOS:', timersData.length, 'timers');
      
      timersData.forEach((timer, index) => {
        console.log(`⏱️ Timer ${index + 1}:`, {
          chamadoId: timer.chamadoId,
          seconds: timer.seconds,
          userName: timer.userName,
          userId: timer.userId
        });
      });
      
      setTimers(timersData);
    };

    // 2. Atendimentos ativos atualizados (quando há mudanças)
    const handleActiveAttendances = (atendimentos: any[]) => {
      console.log('🔄 ATENDIMENTOS ATIVOS RECEBIDOS:', atendimentos.length, 'atendimentos');
      
      // Converter atendimentos para formato Timer
      const newTimers = atendimentos.map((atendimento, index) => {
        console.log(`👤 Atendimento ${index + 1}:`, {
          chamadoId: atendimento.atc_chamado,
          colaborador: atendimento.colaborador_nome,
          tempo: atendimento.tempo_decorrido
        });
        
        return {
          chamadoId: atendimento.atc_chamado,
          seconds: atendimento.tempo_decorrido || 0,
          startedAt: atendimento.atc_data_hora_inicio,
          startedBy: atendimento.colaborador_nome || 'Usuário',
          userId: atendimento.atc_colaborador,
          userName: atendimento.colaborador_nome || 'Usuário'
        };
      });
      
      console.log('🔄 Timers convertidos:', newTimers);
      setTimers(newTimers);
    };

    // === EVENTOS DE USUÁRIOS ===

    // 3. Usuário iniciou atendimento
    const handleUserStartedAttendance = (data: { 
      chamadoId: number; 
      startTime: string; 
      userName: string; 
      userId: number 
    }) => {
      console.log('🚀 Usuário iniciou atendimento:', data);
      
      const newTimer: Timer = {
        chamadoId: data.chamadoId,
        seconds: 0,
        startedAt: data.startTime,
        startedBy: data.userName,
        userId: data.userId,
        userName: data.userName
      };
      
      setTimers(prev => {
        // Remove timer existente para este chamado e adiciona o novo
        const filtered = prev.filter(timer => timer.chamadoId !== data.chamadoId);
        return [...filtered, newTimer];
      });
    };

    // 4. Usuário finalizou atendimento
    const handleUserFinishedAttendance = (data: { chamadoId: number; userId?: number }) => {
      console.log('✅ Usuário finalizou atendimento:', data);
      
      setTimers(prev => 
        prev.filter(timer => timer.chamadoId !== data.chamadoId)
      );
    };

    // 5. Usuário cancelou atendimento
    const handleUserCancelledAttendance = (data: { chamadoId: number; userId?: number }) => {
      console.log('🚫 Usuário cancelou atendimento:', data);
      
      setTimers(prev => 
        prev.filter(timer => timer.chamadoId !== data.chamadoId)
      );
    };

    // === EVENTOS DE LOCK (se implementados) ===

    // 6. Chamado foi locked para visualização
    const handleChamadoLocked = (data: { 
      chamadoId: number; 
      lockedBy: { userId: number; userName: string } 
    }) => {
      console.log('🔒 Chamado locked:', data);
      
      setLockedChamados(prev => {
        const filtered = prev.filter(lock => lock.chamadoId !== data.chamadoId);
        return [...filtered, {
          chamadoId: data.chamadoId,
          lockedBy: data.lockedBy
        }];
      });
    };

    // 7. Chamado foi unlocked
    const handleChamadoUnlocked = (data: { chamadoId: number }) => {
      console.log('🔓 Chamado unlocked:', data);
      
      setLockedChamados(prev => 
        prev.filter(lock => lock.chamadoId !== data.chamadoId)
      );
    };

    // 8. Chamado foi atualizado por outro usuário
    const handleChamadoChanged = (updatedChamado: Chamado) => {
      console.log('📝 Chamado atualizado:', updatedChamado.cha_id);
      
      setChamados(prev => 
        prev.map(chamado => 
          chamado.cha_id === updatedChamado.cha_id ? updatedChamado : chamado
        )
      );
    };

    // === REGISTRAR TODOS OS LISTENERS ===
    socket.on('timers_sync', handleTimersSync);
    socket.on('active_attendances_updated', handleActiveAttendances);
    socket.on('user_started_attendance', handleUserStartedAttendance);
    socket.on('user_finished_attendance', handleUserFinishedAttendance);
    socket.on('user_cancelled_attendance', handleUserCancelledAttendance);
    socket.on('chamado_locked', handleChamadoLocked);
    socket.on('chamado_unlocked', handleChamadoUnlocked);
    socket.on('chamado_changed', handleChamadoChanged);

    // === CLEANUP ===
    return () => {
      console.log('🧹 Limpando listeners do real-time...');
      
      socket.off('timers_sync', handleTimersSync);
      socket.off('active_attendances_updated', handleActiveAttendances);
      socket.off('user_started_attendance', handleUserStartedAttendance);
      socket.off('user_finished_attendance', handleUserFinishedAttendance);
      socket.off('user_cancelled_attendance', handleUserCancelledAttendance);
      socket.off('chamado_locked', handleChamadoLocked);
      socket.off('chamado_unlocked', handleChamadoUnlocked);
      socket.off('chamado_changed', handleChamadoChanged);
    };
  }, [socket]);

  // === FUNÇÕES AUXILIARES ===

  const getTimer = useCallback((chamadoId: number): Timer | undefined => {
    const timer = timers.find(timer => timer.chamadoId === chamadoId);
    console.log(`🔍 Buscando timer para chamado ${chamadoId}:`, timer ? 'ENCONTRADO' : 'NÃO ENCONTRADO');
    return timer;
  }, [timers]);

  const isLocked = useCallback((chamadoId: number): ChamadoLock | undefined => {
    return lockedChamados.find(lock => lock.chamadoId === chamadoId);
  }, [lockedChamados]);

  const formatTimer = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getTimersByUser = useCallback((userId: number): Timer[] => {
    return timers.filter(timer => timer.userId === userId);
  }, [timers]);

  const isUserAttending = useCallback((chamadoId: number): string | null => {
    const timer = getTimer(chamadoId);
    return timer ? timer.userName : null;
  }, [getTimer]);

  const getTotalActiveAttendances = useCallback((): number => {
    return timers.length;
  }, [timers]);

  const getActiveAttendancesByStatus = useCallback(() => {
    return {
      total: timers.length,
      byUser: timers.reduce((acc, timer) => {
        acc[timer.userName] = (acc[timer.userName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }, [timers]);

  // === DEBUG INFO ===
  useEffect(() => {
    console.log('📊 Estado atual do real-time:', {
      chamados: chamados.length,
      timers: timers.length,
      lockedChamados: lockedChamados.length,
      socketConnected: !!socket?.connected
    });
  }, [chamados.length, timers.length, lockedChamados.length, socket?.connected]);

  return {
    // Estados principais
    chamados,
    setChamados,
    timers,
    lockedChamados,
    
    // Funções de consulta
    getTimer,
    isLocked,
    formatTimer,
    isUserAttending,
    
    // Funções de análise
    getTimersByUser,
    getTotalActiveAttendances,
    getActiveAttendancesByStatus,
  };
};