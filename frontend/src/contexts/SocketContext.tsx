import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface AttendanceInfo {
  chamadoId: number;
  userId: number;
  userName: string;
  startTime: string;
}

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  isUserInAttendance: boolean;
  currentAttendance: AttendanceInfo | null;
  startAttendance: (chamadoId: number) => Promise<AttendanceInfo | null>;
  cancelAttendance: (chamadoId: number) => void;
  finishAttendance: () => void;
}

interface AtendimentoAtivoAPI {
  atc_chamado: number;
  atc_colaborador: number;
  colaborador_nome: string;
  atc_data_hora_inicio: string;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [isUserInAttendance, setIsUserInAttendance] = useState(false);
  const [currentAttendance, setCurrentAttendance] = useState<AttendanceInfo | null>(null);
  const { state: authState } = useAuth();
  
  // Refs para evitar loops infinitos
  const socketRef = useRef<Socket | null>(null);
  const isInitializing = useRef(false);
  const lastUserId = useRef<number | null>(null);

  // Verificar atendimento ativo via API - MEMOIZED
  const checkForActiveAttendance = useCallback(async () => {
    if (!authState.user || isInitializing.current) return;

    try {
      console.log('🔍 Verificando atendimento ativo...');
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
      const response = await fetch(`${apiUrl}/chamados/atendimentos-ativos`);
      const data = await response.json();
      
      if (data.success && data.data) {
        const myAttendance = data.data.find((att: AtendimentoAtivoAPI) => att.atc_colaborador === authState.user?.id);
        
        if (myAttendance) {
          const attendanceInfo: AttendanceInfo = {
            chamadoId: myAttendance.atc_chamado,
            userId: myAttendance.atc_colaborador,
            userName: myAttendance.colaborador_nome || authState.user.nome,
            startTime: myAttendance.atc_data_hora_inicio
          };
          
          setCurrentAttendance(attendanceInfo);
          setIsUserInAttendance(true);
          console.log('✅ Atendimento ativo encontrado:', attendanceInfo.chamadoId);
        } else {
          setCurrentAttendance(null);
          setIsUserInAttendance(false);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar atendimento ativo:', error);
    }
  }, [authState.user]);

  // Inicializar socket APENAS uma vez por usuário
  useEffect(() => {
    // Evitar re-inicialização desnecessária
    if (!authState.isAuthenticated || !authState.user) {
      if (socketRef.current) {
        console.log('🔌 Limpando socket - usuário não autenticado');
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
        setIsUserInAttendance(false);
        setCurrentAttendance(null);
      }
      return;
    }

    // Evitar reconexão se for o mesmo usuário
    if (lastUserId.current === authState.user.id && socketRef.current?.connected) {
      console.log('🔌 Socket já conectado para este usuário');
      return;
    }

    // Limpar socket anterior
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    console.log('🔌 Inicializando socket para:', authState.user.nome);
    isInitializing.current = true;
    lastUserId.current = authState.user.id;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const socketUrl = apiUrl.replace('/api/v1', '');

    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      autoConnect: true,
      forceNew: true, // Força nova conexão
    });

    // Eventos de conexão
    newSocket.on('connect', () => {
      console.log('🔌 Conectado ao servidor');
      setConnected(true);
      isInitializing.current = false;
      
      // Autenticar
      newSocket.emit('authenticate', {
        id: authState.user?.id,
        nome: authState.user?.nome,
        login: authState.user?.login,
        categoria: authState.user?.categoria
      });
      
      // Verificar atendimento após conectar
      setTimeout(checkForActiveAttendance, 1000);
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Desconectado do servidor');
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Erro de conexão:', error);
      setConnected(false);
      isInitializing.current = false;
    });

    // Eventos de atendimento - SIMPLIFICADOS
    newSocket.on('user_in_attendance', (data: AttendanceInfo) => {
      console.log('✅ Em atendimento:', data);
      setCurrentAttendance(data);
      setIsUserInAttendance(true);
    });

    newSocket.on('attendance_started', (data: AttendanceInfo) => {
      console.log('🚀 Atendimento iniciado:', data);
      setCurrentAttendance(data);
      setIsUserInAttendance(true);
    });

    newSocket.on('attendance_finished', () => {
      console.log('🏁 Atendimento finalizado');
      setCurrentAttendance(null);
      setIsUserInAttendance(false);
    });

    newSocket.on('attendance_cancelled', () => {
      console.log('🚫 Atendimento cancelado');
      setCurrentAttendance(null);
      setIsUserInAttendance(false);
    });

    newSocket.on('attendance_blocked', (data: { reason: string }) => {
      console.log('🚫 Atendimento bloqueado:', data.reason);
      alert(`Erro: ${data.reason}`);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      console.log('🧹 Limpando socket...');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      isInitializing.current = false;
    };
  }, [authState.isAuthenticated, authState.user, checkForActiveAttendance]);

  // Funções memoized
  const startAttendance = useCallback(async (chamadoId: number): Promise<AttendanceInfo | null> => {
    if (!socketRef.current || !authState.user) {
      console.error('❌ Socket não conectado');
      return null;
    }

    if (isUserInAttendance) {
      alert(`Você já está atendendo o chamado #${currentAttendance?.chamadoId}`);
      return null;
    }

    return new Promise((resolve) => {
      const socket = socketRef.current!;
      
      const onSuccess = (data: AttendanceInfo) => {
        socket.off('attendance_started', onSuccess);
        socket.off('attendance_blocked', onError);
        resolve(data);
      };

      const onError = (data: { reason: string }) => {
        socket.off('attendance_started', onSuccess);
        socket.off('attendance_blocked', onError);
        alert(`Erro: ${data.reason}`);
        resolve(null);
      };

      socket.once('attendance_started', onSuccess);
      socket.once('attendance_blocked', onError);

      socket.emit('start_attendance', {
        chamadoId,
        userId: authState.user!.id,
        userName: authState.user!.nome
      });

      // Timeout
      setTimeout(() => {
        socket.off('attendance_started', onSuccess);
        socket.off('attendance_blocked', onError);
        resolve(null);
      }, 10000);
    });
  }, [authState.user, isUserInAttendance, currentAttendance?.chamadoId]);

  const cancelAttendance = useCallback((chamadoId: number) => {
    if (!socketRef.current || !authState.user || !isUserInAttendance) return;

    console.log(`🚫 Cancelando atendimento ${chamadoId}...`);
    socketRef.current.emit('cancel_attendance', {
      chamadoId,
      userId: authState.user.id
    });
  }, [authState.user, isUserInAttendance]);

  const finishAttendance = useCallback(() => {
    if (!socketRef.current || !authState.user || !isUserInAttendance) return;

    console.log('🏁 Finalizando atendimento...');
    socketRef.current.emit('finish_attendance', {
      userId: authState.user.id
    });
  }, [authState.user, isUserInAttendance]);

  const value: SocketContextType = {
    socket,
    connected,
    isUserInAttendance,
    currentAttendance,
    startAttendance,
    cancelAttendance,
    finishAttendance,
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
    throw new Error('useSocket deve ser usado dentro de um SocketProvider');
  }
  return context;
};