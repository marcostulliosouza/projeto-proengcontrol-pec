import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';
import type { Chamado } from '../types';

interface ChamadoLock {
  chamadoId: number;
  lockedBy: {
    userId: number;
    userName: string;
  };
}

interface Timer {
  chamadoId: number;
  seconds: number;
  startedAt: string;
  startedBy: string;
  userId: number;
  userName: string;
}

export const useChamadosRealTime = (initialChamados: Chamado[]) => {
  const [chamados, setChamados] = useState<Chamado[]>(initialChamados);
  const [lockedChamados, setLockedChamados] = useState<ChamadoLock[]>([]);
  const [timers, setTimers] = useState<Timer[]>([]);
  const { socket } = useSocket();

  // Atualizar quando chamados iniciais mudarem
  useEffect(() => {
    setChamados(initialChamados);
  }, [initialChamados]);

  useEffect(() => {
  if (!socket) return;

  // Sincronização de timers do servidor
  socket.on('timers_sync', (timersData: Timer[]) => {
    setTimers(timersData);
  });

  // Atendimentos ativos atualizados
  socket.on('active_attendances_updated', (atendimentos: { atc_chamado: number; tempo_decorrido?: number; atc_data_hora_inicio: string; colaborador_nome?: string; atc_colaborador: number }[]) => {
    // Converter para formato Timer
    const newTimers = atendimentos.map(atendimento => ({
      chamadoId: atendimento.atc_chamado,
      seconds: atendimento.tempo_decorrido || 0,
      startedAt: atendimento.atc_data_hora_inicio,
      startedBy: atendimento.colaborador_nome || 'Usuário',
      userId: atendimento.atc_colaborador,
      userName: atendimento.colaborador_nome || 'Usuário'
    }));
    
    setTimers(newTimers);
  });


  // Chamado foi unlocked
    socket.on('chamado_unlocked', (data: { chamadoId: number }) => {
      setLockedChamados(prev => 
        prev.filter(lock => lock.chamadoId !== data.chamadoId)
      );
    });

  // Chamado foi unlocked
    socket.on('chamado_unlocked', (data: { chamadoId: number }) => {
      setLockedChamados(prev => 
        prev.filter(lock => lock.chamadoId !== data.chamadoId)
      );
    });

  // Chamado foi atualizado por outro usuário
    socket.on('chamado_changed', (updatedChamado: Chamado) => {
      setChamados(prev => 
        prev.map(chamado => 
          chamado.cha_id === updatedChamado.cha_id ? updatedChamado : chamado
        )
      );
    });

    // Usuário iniciou atendimento
    socket.on('user_started_attendance', (data: { chamadoId: number; startTime: string; userName: string; userId: number }) => {
      const newTimer: Timer = {
        chamadoId: data.chamadoId,
        seconds: 0,
        startedAt: data.startTime,
        startedBy: data.userName,
        userId: data.userId,
        userName: data.userName
      };
      
      setTimers(prev => {
        const filtered = prev.filter(timer => timer.chamadoId !== data.chamadoId);
        return [...filtered, newTimer];
      });
    });

    // Usuário finalizou atendimento
    socket.on('user_finished_attendance', (data: { chamadoId: number }) => {
      setTimers(prev => 
        prev.filter(timer => timer.chamadoId !== data.chamadoId)
      );
    });

    // Usuário cancelou atendimento
    socket.on('user_cancelled_attendance', (data: { chamadoId: number }) => {
      setTimers(prev => 
        prev.filter(timer => timer.chamadoId !== data.chamadoId)
      );
    });

  // // Timer iniciado
  // socket.on('timer_started', (data: Timer) => {
  //   setTimers(prev => {
  //     const filtered = prev.filter(timer => timer.chamadoId !== data.chamadoId);
  //     return [...filtered, { ...data, seconds: 0 }];
  //   });
  // });

  // // Timer atualizado
  // socket.on('timer_updated', (data: { chamadoId: number; seconds: number }) => {
  //   setTimers(prev => 
  //     prev.map(timer => 
  //       timer.chamadoId === data.chamadoId 
  //         ? { ...timer, seconds: data.seconds }
  //         : timer
  //     )
  //   );
  // });

  return () => {
     socket.off('timers_sync');
      socket.off('active_attendances_updated');
      socket.off('chamado_locked');
      socket.off('chamado_unlocked');
      socket.off('chamado_changed');
      socket.off('user_started_attendance');
      socket.off('user_finished_attendance');
      socket.off('user_cancelled_attendance');
  };
}, [socket]);

 const isLocked = useCallback((chamadoId: number) => {
    return lockedChamados.find(lock => lock.chamadoId === chamadoId);
  }, [lockedChamados]);

  const getTimer = useCallback((chamadoId: number) => {
    return timers.find(timer => timer.chamadoId === chamadoId);
  }, [timers]);

  const formatTimer = useCallback((seconds: number) => {
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
    lockedChamados,
    timers,
    isLocked,
    getTimer,
    formatTimer,
  };
};