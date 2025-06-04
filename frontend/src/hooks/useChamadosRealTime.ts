import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';
import type { Chamado } from '../types';

interface Timer {
  chamadoId: number;
  seconds: number;
  startedAt: string;
  startedBy: string;
  userId: number;
  userName?: string;
  realStartTime: Date; // NOVO: tempo real de início
}

export const useChamadosRealTime = (initialChamados: Chamado[]) => {
  const [chamados, setChamados] = useState<Chamado[]>(initialChamados);
  const [timers, setTimers] = useState<Timer[]>([]);
  const { socket } = useSocket();

  useEffect(() => {
    setChamados(initialChamados);
  }, [initialChamados]);

  // Timer local que atualiza a cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prevTimers => 
        prevTimers.map(timer => ({
          ...timer,
          seconds: Math.floor((new Date().getTime() - timer.realStartTime.getTime()) / 1000)
        }))
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket) return;

    console.log('🔌 Configurando listeners do real-time...');
  
    // Sincronização principal
    const handleActiveAttendances = (atendimentos: { 
      atc_chamado: number; 
      atc_data_hora_inicio: string; 
      colaborador_nome?: string; 
      atc_colaborador: number; 
    }[]) => {
      console.log('🔄 ATENDIMENTOS RECEBIDOS:', atendimentos.length);
      
      // Remover duplicatas pelo chamado_id
      const uniqueAtendimentos = atendimentos.reduce((acc: { 
        atc_chamado: number; 
        atc_data_hora_inicio: string; 
        colaborador_nome?: string; 
        atc_colaborador: number; 
      }[], current) => {
        const exists = acc.find(item => item.atc_chamado === current.atc_chamado);
        if (!exists) {
          acc.push(current);
        } else {
          // Manter o mais recente se houver duplicatas
          if (new Date(current.atc_data_hora_inicio) > new Date(exists.atc_data_hora_inicio)) {
            const index = acc.findIndex(item => item.atc_chamado === current.atc_chamado);
            acc[index] = current;
          }
        }
        return acc;
      }, []);

      console.log(`🔄 Processando ${uniqueAtendimentos.length} atendimentos únicos`);
      
      const newTimers = uniqueAtendimentos.map(atendimento => {
        const startTime = new Date(atendimento.atc_data_hora_inicio);
        const currentSeconds = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
        
        return {
          chamadoId: atendimento.atc_chamado,
          seconds: currentSeconds,
          startedAt: atendimento.atc_data_hora_inicio,
          startedBy: atendimento.colaborador_nome || 'Usuário',
          userId: atendimento.atc_colaborador,
          userName: atendimento.colaborador_nome || 'Usuário',
          realStartTime: startTime // TEMPO REAL para cálculo contínuo
        };
      });

      console.log('⏰ Novos timers configurados:', newTimers);
      setTimers(newTimers);
    };

    // Sincronização de timers (mais precisa)
    const handleTimersSync = (timersData: { 
      chamadoId: number; 
      startedAt?: string; 
      startTime?: string; 
      startedBy?: string; 
      userName?: string; 
      userId: number; 
    }[]) => {
      console.log('📊 TIMERS SYNC recebido:', timersData.length);
      
      const syncedTimers = timersData.map(timerData => {
        const startTime = new Date(timerData.startedAt || timerData.startTime || 0);
        const currentSeconds = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
        
        return {
          chamadoId: timerData.chamadoId,
          seconds: currentSeconds, // Recalcular sempre
          startedAt: timerData.startedAt || timerData.startTime || '',
          startedBy: timerData.startedBy || timerData.userName || 'Unknown',
          userId: timerData.userId,
          userName: timerData.userName || timerData.startedBy,
          realStartTime: startTime
        };
      });
      
      setTimers(syncedTimers);
    };

    // Usuário iniciou atendimento
    const handleUserStartedAttendance = (data: { 
      chamadoId: number; 
      startTime: string; 
      userName: string; 
      userId: number 
    }) => {
      console.log('🚀 Usuário iniciou atendimento (evento recebido):', data);
      
      const startTime = new Date(data.startTime);
      const newTimer: Timer = {
        chamadoId: data.chamadoId,
        seconds: 0,
        startedAt: data.startTime,
        startedBy: data.userName,
        userId: data.userId,
        userName: data.userName,
        realStartTime: startTime
      };
      
      setTimers(prev => {
        const filtered = prev.filter(timer => timer.chamadoId !== data.chamadoId);
        const updated = [...filtered, newTimer];
        console.log('⏱️ Timers atualizados após início:', updated);
        return updated;
      });
    };

    // Usuário finalizou/cancelou
    const handleUserFinishedAttendance = (data: { chamadoId: number; userId?: number }) => {
      console.log('✅ Usuário finalizou atendimento (evento recebido):', data);
      setTimers(prev => {
        const updated = prev.filter(timer => timer.chamadoId !== data.chamadoId);
        console.log('⏰ Timers atualizados após finalização:', updated);
        return updated;
      });
    };

    const handleUserCancelledAttendance = (data: { chamadoId: number; userId?: number }) => {
      console.log('🚫 Usuário cancelou atendimento (evento recebido):', data);
      setTimers(prev => {
        const updated = prev.filter(timer => timer.chamadoId !== data.chamadoId);
        console.log('⏰ Timers atualizados após cancelamento:', updated);
        return updated;
      });
    };

    // Registrar listeners
    socket.on('timers_sync', handleTimersSync);
    socket.on('active_attendances_updated', handleActiveAttendances);
    socket.on('active_attendances', handleActiveAttendances); // Também escutar este evento
    socket.on('user_started_attendance', handleUserStartedAttendance);
    socket.on('user_finished_attendance', handleUserFinishedAttendance);
    socket.on('user_cancelled_attendance', handleUserCancelledAttendance);

    return () => {
      socket.off('timers_sync', handleTimersSync);
      socket.off('active_attendances_updated', handleActiveAttendances);
      socket.off('active_attendances', handleActiveAttendances);
      socket.off('user_started_attendance', handleUserStartedAttendance);
      socket.off('user_finished_attendance', handleUserFinishedAttendance);
      socket.off('user_cancelled_attendance', handleUserCancelledAttendance);
    };
  }, [socket]);

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