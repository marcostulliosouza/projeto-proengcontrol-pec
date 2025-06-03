import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  lockChamado: (chamadoId: number) => Promise<boolean>;
  unlockChamado: (chamadoId: number) => void;
  emitChamadoUpdate: (chamado: { id: number; status: string; additionalData?: Record<string, unknown> }) => void;
  startTimer: (chamadoId: number) => void;
  updateTimer: (chamadoId: number, seconds: number) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { state } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (state.isAuthenticated && state.user) {
      // Conectar ao WebSocket
      socketRef.current = io(import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:3001');
      
      const socket = socketRef.current;

      // Autenticar usuário
      socket.emit('authenticate', {
        id: state.user.id,
        nome: state.user.nome,
        categoria: state.user.categoria
      });

      // Cleanup na desconexão
      return () => {
        socket.disconnect();
        socketRef.current = null;
      };
    }
  }, [state.isAuthenticated, state.user]);

  const lockChamado = (chamadoId: number): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socketRef.current || !state.user) {
        resolve(false);
        return;
      }

      const socket = socketRef.current;
      
      // Timeout para lock
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

  const emitChamadoUpdate = (chamado: { id: number; status: string; additionalData?: Record<string, unknown> }) => {
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
    if (socketRef.current) {
      socketRef.current.emit('timer_update', { chamadoId, seconds });
    }
  };

  const value: SocketContextType = {
    socket: socketRef.current,
    lockChamado,
    unlockChamado,
    emitChamadoUpdate,
    startTimer,
    updateTimer,
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