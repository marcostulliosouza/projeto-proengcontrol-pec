/* eslint-disable @typescript-eslint/no-explicit-any */
// contexts/SocketContext.tsx - COMPLETO E CORRIGIDO
import React, { createContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import type { AttendanceInfo } from '../types';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  isUserInAttendance: boolean;
  currentAttendance: AttendanceInfo | null;
  startAttendance: (chamadoId: number) => Promise<AttendanceInfo | null>;
  cancelAttendance: (chamadoId: number) => void;
  finishAttendance: () => void;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
}

interface AtendimentoAtivoAPI {
  atc_chamado: number;
  atc_colaborador: number;
  colaborador_nome: string;
  atc_data_hora_inicio: string;
}

// EXPORTAR APENAS O CONTEXT
export const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [isUserInAttendance, setIsUserInAttendance] = useState(false);
  const [currentAttendance, setCurrentAttendance] = useState<AttendanceInfo | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'disconnected'>('disconnected');
  const { state: authState } = useAuth();
  
  const socketRef = useRef<Socket | null>(null);
  const isInitializing = useRef(false);
  const lastUserId = useRef<number | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const checkConnectionQuality = useCallback(() => {
    if (!socketRef.current?.connected) {
      setConnectionQuality('disconnected');
      return;
    }

    const start = Date.now();
    socketRef.current.emit('ping', start, (ackTime: number) => {
      const latency = Date.now() - ackTime;
      
      if (latency < 100) {
        setConnectionQuality('excellent');
      } else if (latency < 300) {
        setConnectionQuality('good');
      } else {
        setConnectionQuality('poor');
      }
    });
  }, []);

  const checkForActiveAttendance = useCallback(async () => {
    if (!authState.user || isInitializing.current) return;

    try {
      console.log('🔍 Verificando atendimento ativo...');
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${apiUrl}/chamados/atendimentos-ativos`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        const myAttendance = data.data.find((att: AtendimentoAtivoAPI) => 
          att.atc_colaborador === authState.user?.id
        );
        
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
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Erro ao verificar atendimento ativo:', error);
      }
    }
  }, [authState.user]);

  useEffect(() => {
    if (!authState.isAuthenticated || !authState.user) {
      if (socketRef.current) {
        console.log('🔌 Limpando socket - usuário não autenticado');
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
        setIsUserInAttendance(false);
        setCurrentAttendance(null);
        setConnectionQuality('disconnected');
      }
      return;
    }

    if (lastUserId.current === authState.user.id && socketRef.current?.connected) {
      console.log('🔌 Socket já conectado para este usuário');
      return;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    console.log('🔌 Inicializando socket para:', authState.user.nome);
    isInitializing.current = true;
    lastUserId.current = authState.user.id;
    reconnectAttempts.current = 0;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const socketUrl = apiUrl.replace('/api/v1', '');

    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      autoConnect: true,
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: maxReconnectAttempts,
    });

    newSocket.on('connect', () => {
      console.log('🔌 Conectado ao servidor');
      setConnected(true);
      isInitializing.current = false;
      reconnectAttempts.current = 0;

      // IMPORTANTE: Armazenar dados do usuário no socket
      if (authState.user) {
        (newSocket as any).userData = {
          id: authState.user.id,
          nome: authState.user.nome,
          login: authState.user.login,
          categoria: authState.user.categoria
        };
      }
        
      newSocket.emit('authenticate', {
        id: authState.user?.id,
        nome: authState.user?.nome,
        login: authState.user?.login,
        categoria: authState.user?.categoria
      });
      
      setTimeout(checkForActiveAttendance, 1000);
      checkConnectionQuality();
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Desconectado do servidor:', reason);
      setConnected(false);
      setConnectionQuality('disconnected');
      
      if (reason === 'io server disconnect') {
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Erro de conexão:', error);
      setConnected(false);
      setConnectionQuality('disconnected');
      isInitializing.current = false;
      
      reconnectAttempts.current++;
      
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.error('❌ Máximo de tentativas de reconexão atingido');
        newSocket.disconnect();
      }
    });

    newSocket.on('force_disconnect', (reason: string) => {
      console.log('🔄 Forçando desconexão:', reason);
      newSocket.disconnect();
    });

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

    newSocket.on('call_transferred_to_you', (data: {
      chamadoId: number;
      fromUserName: string;
      toUserName: string;
      timestamp: string;
    }) => {
      console.log('📨 Chamado transferido para você:', data);
      
      // Atualizar estado local
      setCurrentAttendance({
        chamadoId: data.chamadoId,
        userId: authState.user?.id || 0,
        userName: authState.user?.nome || '',
        startTime: data.timestamp
      });
      setIsUserInAttendance(true);
      
      // Mostrar notificação
      if (window.Notification && Notification.permission === 'granted') {
        new Notification(`Chamado #${data.chamadoId} transferido para você`, {
          body: `Transferido por ${data.fromUserName}`,
          icon: '/favicon.ico'
        });
      }
      
      // Mostrar alert como fallback
      setTimeout(() => {
        alert(`📨 Chamado #${data.chamadoId} foi transferido para você por ${data.fromUserName}`);
      }, 1000);
    });

    newSocket.on('transfer_completed', (data: any) => {
      console.log('✅ Transferência concluída:', data);
      // Para o usuário que transferiu - limpar estado
      setCurrentAttendance(null);
      setIsUserInAttendance(false);
    });

    newSocket.on('transfer_error', (data: { message: string }) => {
      console.error('❌ Erro na transferência:', data);
      alert(`Erro ao transferir: ${data.message}`);
    });

    const heartbeatInterval = setInterval(() => {
      if (newSocket.connected) {
        checkConnectionQuality();
      }
    }, 30000);

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      console.log('🧹 Limpando socket...');
      clearInterval(heartbeatInterval);
      
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      isInitializing.current = false;
    };
  }, [authState.isAuthenticated, authState.user, checkForActiveAttendance, checkConnectionQuality]);

  const startAttendance = useCallback(async (chamadoId: number): Promise<AttendanceInfo | null> => {
    if (!socketRef.current?.connected || !authState.user) {
      console.error('❌ Socket não conectado');
      alert('Conexão perdida. Tente novamente.');
      return null;
    }

    if (isUserInAttendance) {
      alert(`Você já está atendendo o chamado #${currentAttendance?.chamadoId}`);
      return null;
    }

    return new Promise((resolve) => {
      const socket = socketRef.current!;
      const timeoutDuration = 10000;
      
      const onSuccess = (data: AttendanceInfo) => {
        socket.off('attendance_started', onSuccess);
        socket.off('attendance_blocked', onError);
        clearTimeout(timeoutId);
        resolve(data);
      };

      const onError = (data: { reason: string }) => {
        socket.off('attendance_started', onSuccess);
        socket.off('attendance_blocked', onError);
        clearTimeout(timeoutId);
        alert(`Erro: ${data.reason}`);
        resolve(null);
      };

      const timeoutId = setTimeout(() => {
        socket.off('attendance_started', onSuccess);
        socket.off('attendance_blocked', onError);
        console.error('❌ Timeout ao iniciar atendimento');
        alert('Timeout ao iniciar atendimento. Tente novamente.');
        resolve(null);
      }, timeoutDuration);

      socket.once('attendance_started', onSuccess);
      socket.once('attendance_blocked', onError);

      socket.emit('start_attendance', {
        chamadoId,
        userId: authState.user!.id,
        userName: authState.user!.nome
      });
    });
  }, [authState.user, isUserInAttendance, currentAttendance?.chamadoId]);

  const cancelAttendance = useCallback((chamadoId: number) => {
    if (!socketRef.current?.connected || !authState.user || !isUserInAttendance) {
      console.error('❌ Não é possível cancelar: socket desconectado ou não em atendimento');
      return;
    }

    console.log(`🚫 Cancelando atendimento ${chamadoId}...`);
    socketRef.current.emit('cancel_attendance', {
      chamadoId,
      userId: authState.user.id
    });
  }, [authState.user, isUserInAttendance]);

  const finishAttendance = useCallback(() => {
    if (!socketRef.current?.connected || !authState.user || !isUserInAttendance) {
      console.error('❌ Não é possível finalizar: socket desconectado ou não em atendimento');
      return;
    }

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
    connectionQuality,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};