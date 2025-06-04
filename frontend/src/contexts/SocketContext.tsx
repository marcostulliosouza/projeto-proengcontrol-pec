import React, { createContext, useContext, useEffect, useRef, useState } from 'react'; // Adicionar useState
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import type { Chamado } from '../types'; 

interface AttendanceData {
  chamadoId: number;
  userId: number;
  userName: string;
  startTime: string;
}

interface SocketContextType {
  socket: Socket | null;
  lockChamado: (chamadoId: number) => Promise<boolean>;
  unlockChamado: (chamadoId: number) => void;
  emitChamadoUpdate: (chamado: Chamado) => void;
  startTimer: (chamadoId: number) => void;
  updateTimer: (chamadoId: number, seconds: number) => void;
  startAttendance: (chamadoId: number) => Promise<AttendanceData | null>;
  finishAttendance: () => void;
  cancelAttendance: (chamadoId: number) => void;
  isUserInAttendance: boolean;
  currentAttendance: AttendanceData | null;
}

const SocketContext = createContext<SocketContextType | null>(null);

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { state } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  
  // Estados para atendimento
  const [isUserInAttendance, setIsUserInAttendance] = useState(false);
  const [currentAttendance, setCurrentAttendance] = useState<AttendanceData | null>(null);

  // Conectar ao WebSocket
  useEffect(() => {
    if (state.isAuthenticated && state.user && socketRef.current) {
      // Conectar ao WebSocket
      socketRef.current = io(import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:3001');
      
      const socket = socketRef.current;

      // Autenticar usuário
      socket.emit('authenticate', {
        id: state.user.id,
        nome: state.user.nome,
        categoria: state.user.categoria
      });

      // Escutar eventos de atendimento
      socket.on('user_in_attendance', (data) => {
        setIsUserInAttendance(true);
        setCurrentAttendance(data);
      });

      socket.on('attendance_started', (data: AttendanceData) => {
        setIsUserInAttendance(true);
        setCurrentAttendance(data);
      });

      socket.on('attendance_finished', () => {
        setIsUserInAttendance(false);
        setCurrentAttendance(null);
      });

      socket.on('attendance_blocked', (data) => {
        alert(data.reason);
      });

      socket.on('timers_sync', (timersData: { chamadoId: number; seconds: number }[]) => {
        // Processar dados dos timers vindos do servidor
        timersData.forEach(timerData => {
          // Emitir evento interno para atualizar timers
          socket.emit('internal_timer_update', timerData);
        });
      });

      socket.on('active_attendances_updated', (atendimentos: AttendanceData[]) => {
        // Atualizar lista de atendimentos ativos
        console.log('Atendimentos atualizados:', atendimentos);
      });

      socket.on('user_cancelled_attendance', (data) => {
        // Alguém cancelou atendimento
        console.log('Atendimento cancelado:', data);
      });

      // Cleanup na desconexão
      return () => {
        socket.off('user_in_attendance');
        socket.off('attendance_started');
        socket.off('attendance_finished');
        socket.off('attendance_blocked');
        socket.off('timers_sync');
        socket.off('active_attendances_updated');
        socket.off('user_cancelled_attendance');
        socket.disconnect();
        socketRef.current = null;
      };
    }
  }, [state.isAuthenticated, state.user]);

  // Implementar todas as funções necessárias
  const lockChamado = (chamadoId: number): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socketRef.current || !state.user) {
        resolve(false);
        return;
      }

      const socket = socketRef.current;
      
      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000);

      socket.once('lock_success', () => {
        clearTimeout(timeout);
        resolve(true);
      });

      socket.once('lock_failed', () => {
        clearTimeout(timeout);
        resolve(false);
      });

      socket.emit('lock_chamado', {
        chamadoId,
        userId: state.user.id,
        userName: state.user.nome
      });
    });
  };

  const unlockChamado = (chamadoId: number) => {
    if (socketRef.current) {
      socketRef.current.emit('unlock_chamado', { chamadoId });
    }
  };

  const emitChamadoUpdate = (chamado: Chamado) => {
    if (socketRef.current) {
      socketRef.current.emit('chamado_updated', chamado);
    }
  };

  const startTimer = (chamadoId: number) => {
    if (socketRef.current) {
      socketRef.current.emit('start_timer', { 
        chamadoId, 
        startedBy: state.user?.nome,
        startedAt: new Date().toISOString()
      });
    }
  };

  const updateTimer = (chamadoId: number, seconds: number) => {
    if (socketRef.current && state.user) {
      socketRef.current.emit('timer_update', { 
        chamadoId, 
        seconds,
        userId: state.user.id
      });
    }
  };

  const startAttendance = (chamadoId: number): Promise<AttendanceData | null> => {
    return new Promise((resolve) => {
      if (!socketRef.current || !state.user) {
        resolve(null);
        return;
      }

      const socket = socketRef.current;
      
      const timeout = setTimeout(() => {
        resolve(null);
      }, 5000);

      socket.once('attendance_started', (data: AttendanceData) => {
        clearTimeout(timeout);
        resolve(data);
      });

      socket.once('attendance_blocked', () => {
        clearTimeout(timeout);
        resolve(null);
      });

      socket.emit('start_attendance', {
        chamadoId,
        userId: state.user.id,
        userName: state.user.nome
      });
    });
  };

  const cancelAttendance = (chamadoId: number) => {
    if (socketRef.current && state.user) {
      socketRef.current.emit('cancel_attendance', {
        chamadoId,
        userId: state.user.id
      });
    }
  };

  const finishAttendance = () => {
    if (socketRef.current && state.user) {
      socketRef.current.emit('finish_attendance', {
        userId: state.user.id
      });
    }
  };

  const value: SocketContextType = {
    socket: socketRef.current,
    lockChamado,
    unlockChamado,
    emitChamadoUpdate,
    startTimer,
    updateTimer,
    startAttendance,
    finishAttendance,
    isUserInAttendance,
    currentAttendance,
    cancelAttendance
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket deve ser usado dentro de SocketProvider');
  }
  return context;
};