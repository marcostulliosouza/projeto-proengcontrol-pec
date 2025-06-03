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

  // Chamado foi locked por outro usuário
  socket.on('chamado_locked', (data: ChamadoLock) => {
    setLockedChamados(prev => {
      const filtered = prev.filter(lock => lock.chamadoId !== data.chamadoId);
      return [...filtered, data];
    });
  });

  // Chamado foi unlocked
  socket.on('chamado_unlocked', (data: { chamadoId: number }) => {
    setLockedChamados(prev => 
      prev.filter(lock => lock.chamadoId !== data.chamadoId)
    );
    setTimers(prev => 
      prev.filter(timer => timer.chamadoId !== data.chamadoId)
    );
  });

  // Chamado foi atualizado por outro usuário - CORRIGIDO
  socket.on('chamado_changed', (updatedChamado: Chamado) => {
    setChamados(prev => 
      prev.map(chamado => 
        chamado.cha_id === updatedChamado.cha_id ? updatedChamado : chamado
      )
    );
  });

  // Timer iniciado
  socket.on('timer_started', (data: Timer) => {
    setTimers(prev => {
      const filtered = prev.filter(timer => timer.chamadoId !== data.chamadoId);
      return [...filtered, { ...data, seconds: 0 }];
    });
  });

  // Timer atualizado
  socket.on('timer_updated', (data: { chamadoId: number; seconds: number }) => {
    setTimers(prev => 
      prev.map(timer => 
        timer.chamadoId === data.chamadoId 
          ? { ...timer, seconds: data.seconds }
          : timer
      )
    );
  });

  return () => {
    socket.off('chamado_locked');
    socket.off('chamado_unlocked');
    socket.off('chamado_changed');
    socket.off('timer_started');
    socket.off('timer_updated');
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