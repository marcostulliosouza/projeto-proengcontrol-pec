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
    if (state.isAuthenticated && state.user) {
      console.log('=== CONECTANDO WEBSOCKET ===');
      console.log('User:', state.user);
      
      // Conectar ao WebSocket
      const socketUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';
      console.log('Socket URL:', socketUrl);
      
      socketRef.current = io(socketUrl);
      const socket = socketRef.current;

      socket.on('connect', () => {
        console.log('✅ WebSocket conectado! Socket ID:', socket.id);
        
        // Autenticar usuário
        if (state.user) {
          socket.emit('authenticate', {
            id: state.user.id,
            nome: state.user.nome,
            categoria: state.user.categoria
          });
          console.log('📡 Dados de autenticação enviados');
        } else {
          console.error('Usuário não autenticado');
        }
      });

      socket.on('disconnect', () => {
        console.log('❌ WebSocket desconectado');
      });

      socket.on('connect_error', (error) => {
        console.error('🔥 Erro de conexão WebSocket:', error);
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
        // Se eu estava em atendimento mas meu timer sumiu
        if (currentAttendance) {
          const meuTimer = timersData.find(timer => timer.chamadoId === currentAttendance.chamadoId);
          if (!meuTimer) {
            console.log('⏰ Meu timer sumiu - atendimento finalizado');
            setIsUserInAttendance(false);
            setCurrentAttendance(null);
          }
        }
      });

      socket.on('active_attendances_updated', (atendimentos: AttendanceData[]) => {
        // Atualizar lista de atendimentos ativos
        console.log('Atendimentos atualizados:', atendimentos);
      });

      socket.on('user_cancelled_attendance', (data) => {
        // Alguém cancelou atendimento
        console.log('Atendimento cancelado:', data);
      });

      socket.on('user_finished_attendance', (data) => {
        // Se é meu atendimento que foi finalizado
        if (currentAttendance && data.chamadoId === currentAttendance.chamadoId) {
          console.log('🏁 Meu atendimento foi finalizado via API');
          setIsUserInAttendance(false);
          setCurrentAttendance(null);
        }
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
        console.log('🧹 Limpando conexão WebSocket');
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
      console.log('=== INICIANDO STARTATTENDANCE ===');
      console.log('Socket atual:', socketRef.current);
      console.log('Socket conectado:', socketRef.current?.connected);
      console.log('User:', state.user);
      
      if (!socketRef.current || !state.user) {
        console.error('❌ Socket ou usuário não disponível');
        console.error('Socket:', !!socketRef.current);
        console.error('User:', !!state.user);
        resolve(null);
        return;
      }

      if (!socketRef.current.connected) {
        console.error('❌ Socket não está conectado');
        resolve(null);
        return;
      }

      const socket = socketRef.current;
      
      const timeout = setTimeout(() => {
        console.error('⏰ Timeout ao iniciar atendimento');
        resolve(null);
      }, 10000);

      // Limpar listeners anteriores
      socket.off('attendance_started');
      socket.off('attendance_blocked');

      socket.once('attendance_started', (data: AttendanceData) => {
        console.log('✅ Atendimento iniciado com sucesso:', data);
        clearTimeout(timeout);
        resolve(data);
      });

      socket.once('attendance_blocked', (error: { message?: string; reason?: string }) => {
        console.error('🚫 Atendimento bloqueado:', error);
        clearTimeout(timeout);
        resolve(null);
      });

      const emitData = {
        chamadoId,
        userId: state.user.id,
        userName: state.user.nome
      };
      
      console.log('📤 Emitindo start_attendance:', emitData);
      socket.emit('start_attendance', emitData);
    });
  };

  const cancelAttendance = (chamadoId: number) => {
  if (socketRef.current && state.user) {
    console.log(`🚫 Emitindo cancelamento via socket: chamado ${chamadoId}`);
    
    socketRef.current.emit('cancel_attendance', {
      chamadoId,
      userId: state.user.id
    });
    
    // Atualizar estado local imediatamente
    setIsUserInAttendance(false);
    setCurrentAttendance(null);
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