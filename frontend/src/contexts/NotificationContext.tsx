/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-explicit-any */
// contexts/NotificationContext.tsx - FIXED: Transfer notifications
import React, { createContext, useState, useCallback, useEffect, useRef } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

export interface Notification {
  id: string;
  type: 'new_chamado' | 'transfer_received' | 'chamado_finalizado';
  title: string;
  message: string;
  chamadoId?: number;
  createdBy?: string;
  createdById?: number;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const MAX_NOTIFICATIONS = 50;

// Gerador de ID único melhorado
let notificationCounter = 0;
const generateUniqueId = () => {
  notificationCounter += 1;
  return `notification_${Date.now()}_${notificationCounter}_${Math.random().toString(36).substr(2, 9)}`;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { socket } = useSocket();
  const { state: authState } = useAuth();
  
  // NOVO: Refs para controle de eventos já processados
  const processedEvents = useRef(new Set<string>());
  const lastSocketId = useRef<string | null>(null);

  // Carregar notificações do localStorage
  useEffect(() => {
    const savedNotifications = localStorage.getItem('app_notifications');
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        setNotifications(parsed.slice(0, MAX_NOTIFICATIONS));
        console.log('📱 Notificações carregadas do localStorage:', parsed.length);
      } catch (error) {
        console.error('❌ Erro ao carregar notificações:', error);
      }
    }
  }, []);

  // Salvar notificações no localStorage
  useEffect(() => {
    localStorage.setItem('app_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'read'>) => {
    console.log('➕ Adicionando notificação:', notification);
    
    const newNotification: Notification = {
      ...notification,
      id: generateUniqueId(),
      read: false
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      const final = updated.slice(0, MAX_NOTIFICATIONS);
      console.log('📱 Notificações atualizadas:', final.length, 'total');
      return final;
    });
  }, []);

  // NOVO: Função para gerar chave única de evento
  const generateEventKey = (eventType: string, data: any) => {
    const timestamp = data.timestamp || new Date().toISOString();
    const chamadoId = data.chamadoId || data.chamado?.cha_id || 'unknown';
    const userId = data.createdById || data.transferredById || 'unknown';
    
    return `${eventType}_${chamadoId}_${userId}_${new Date(timestamp).getTime()}`;
  };

  // NOVO: Limpar eventos antigos do cache
  const cleanupOldEvents = useCallback(() => {
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    processedEvents.current.forEach(key => {
      const parts = key.split('_');
      if (parts.length >= 4) {
        const timestamp = parseInt(parts[3]);
        if (now - timestamp > 10 * 60 * 1000) { // 10 minutos
          keysToRemove.push(key);
        }
      }
    });
    
    keysToRemove.forEach(key => {
      processedEvents.current.delete(key);
    });
    
    if (keysToRemove.length > 0) {
      console.log(`🧹 Removed ${keysToRemove.length} old event keys from notification cache`);
    }
  }, []);

  // Listeners dos eventos socket - MELHORADOS
  useEffect(() => {
    if (!socket || !authState.user) {
      console.log('🔌 Socket ou usuário não disponível para notificações');
      return;
    }

    // Reset do cache se mudou de socket
    if (lastSocketId.current !== socket.id) {
      console.log('🔄 Novo socket detectado, limpando cache de eventos');
      processedEvents.current.clear();
      lastSocketId.current = socket.id ?? null;
    }

    console.log('🔌 Configurando listeners de notificação para usuário:', authState.user.nome);
    console.log('🆔 Socket ID:', socket.id);

    // CORREÇÃO: Novo chamado criado
    const handleNewChamado = (data: {
      chamadoId: number;
      clienteNome: string;
      descricao: string;
      createdBy: string;
      createdById?: number;
      timestamp: string;
      chamado?: any;
    }) => {
      console.log('🆕 Evento new_chamado_notification recebido:', data);
      
      const eventKey = generateEventKey('new_chamado', data);
      if (processedEvents.current.has(eventKey)) {
        console.log('🚫 Evento new_chamado já processado, ignorando:', eventKey);
        return;
      }
      
      // Não notificar para quem criou o chamado
      if (data.createdById === authState.user?.id) {
        console.log('🚫 Não notificando criador do chamado');
        return;
      }

      processedEvents.current.add(eventKey);
      console.log('✅ Processando notificação de novo chamado (nova)');
      
      addNotification({
        type: 'new_chamado',
        title: '🆕 Novo Chamado Aberto',
        message: `${data.createdBy} abriu um chamado para ${data.clienteNome}`,
        chamadoId: data.chamadoId,
        createdBy: data.createdBy,
        createdById: data.createdById,
        timestamp: data.timestamp,
        actionUrl: '/chamados'
      });
    };

    // CORREÇÃO: Transferência recebida - MÚLTIPLOS LISTENERS
    const handleTransferNotification = (data: {
      chamadoId: number;
      clienteNome: string;
      transferredBy: string;
      transferredById: number;
      timestamp: string;
    }) => {
      console.log('🔄 Evento transfer_notification recebido:', data);
      
      const eventKey = generateEventKey('transfer_notification', data);
      if (processedEvents.current.has(eventKey)) {
        console.log('🚫 Evento transfer_notification já processado, ignorando:', eventKey);
        return;
      }
      
      processedEvents.current.add(eventKey);
      console.log('✅ Processando notificação de transferência (nova)');
      
      addNotification({
        type: 'transfer_received',
        title: '🔄 Chamado Transferido',
        message: `${data.transferredBy} transferiu um chamado de ${data.clienteNome} para você`,
        chamadoId: data.chamadoId,
        createdBy: data.transferredBy,
        createdById: data.transferredById,
        timestamp: data.timestamp,
        actionUrl: '/chamados'
      });
    };

    // NOVO: Listener para broadcast de transferência
    const handleTransferBroadcast = (data: {
      targetUserId: number;
      chamadoId: number;
      clienteNome: string;
      transferredBy: string;
      transferredById: number;
      timestamp: string;
    }) => {
      console.log('📡 Evento transfer_notification_broadcast recebido:', data);
      console.log('🎯 Target User ID:', data.targetUserId, '/ Meu ID:', authState.user?.id);
      
      // Filtrar apenas para o usuário alvo
      if (data.targetUserId !== authState.user?.id) {
        console.log('🚫 Broadcast de transferência não é para mim');
        return;
      }
      
      const eventKey = generateEventKey('transfer_broadcast', data);
      if (processedEvents.current.has(eventKey)) {
        console.log('🚫 Evento transfer_broadcast já processado, ignorando:', eventKey);
        return;
      }
      
      processedEvents.current.add(eventKey);
      console.log('🎯 Broadcast de transferência é para mim! Criando notificação...');
      
      addNotification({
        type: 'transfer_received',
        title: '🔄 Chamado Transferido',
        message: `${data.transferredBy} transferiu um chamado de ${data.clienteNome} para você`,
        chamadoId: data.chamadoId,
        createdBy: data.transferredBy,
        createdById: data.transferredById,
        timestamp: data.timestamp,
        actionUrl: '/chamados'
      });
    };

    // NOVO: Listener DEBUG para capturar todos os eventos de transferência
    const handleTransferDebug = (data: {
      forUserId: number;
      forUserName: string;
      chamadoId: number;
      clienteNome: string;
      transferredBy: string;
      transferredById: number;
      timestamp: string;
    }) => {
      console.log('🧪 EVENTO transfer_notification_debug recebido:', data);
      console.log('🎯 For User ID:', data.forUserId, '/ Meu ID:', authState.user?.id);
      console.log('👤 For User Name:', data.forUserName, '/ Meu nome:', authState.user?.nome);
      
      // Se for para mim, criar notificação
      if (data.forUserId === authState.user?.id) {
        const eventKey = generateEventKey('transfer_debug', data);
        if (processedEvents.current.has(eventKey)) {
          console.log('🚫 Evento transfer_debug já processado, ignorando:', eventKey);
          return;
        }
        
        processedEvents.current.add(eventKey);
        console.log('✅ DEBUG: Criando notificação de transferência');
        
        addNotification({
          type: 'transfer_received',
          title: '🧪 [DEBUG] Chamado Transferido',
          message: `${data.transferredBy} transferiu um chamado de ${data.clienteNome} para você`,
          chamadoId: data.chamadoId,
          createdBy: data.transferredBy,
          createdById: data.transferredById,
          timestamp: data.timestamp,
          actionUrl: '/chamados'
        });
      }
    };

    // NOVO: Listener direto para transfer_received (do SocketContext)
    const handleTransferReceived = (data: {
      chamadoId: number;
      userId: number;
      userName: string;
      transferredBy: string;
      timestamp: string;
    }) => {
      console.log('🎯 Evento transfer_received recebido no NotificationContext:', data);
      
      // Verificar se é para o usuário atual
      if (data.userId !== authState.user?.id) {
        console.log('🚫 Transfer received não é para mim');
        return;
      }
      
      const eventKey = generateEventKey('transfer_received', data);
      if (processedEvents.current.has(eventKey)) {
        console.log('🚫 Evento transfer_received já processado, ignorando:', eventKey);
        return;
      }
      
      processedEvents.current.add(eventKey);
      console.log('✅ Criando notificação para transfer_received');
      
      // Buscar dados do chamado para obter cliente
      // Por enquanto, usar dados básicos
      addNotification({
        type: 'transfer_received',
        title: '🔄 Chamado Transferido para Você',
        message: `${data.transferredBy} transferiu o chamado #${data.chamadoId} para você`,
        chamadoId: data.chamadoId,
        createdBy: data.transferredBy,
        timestamp: data.timestamp,
        actionUrl: '/chamados'
      });
    };

    // Chamado finalizado (opcional)
    const handleChamadoFinalizado = (data: {
      chamadoId: number;
      finalizedBy: string;
      clienteNome?: string;
      timestamp: string;
    }) => {
      console.log('✅ Evento chamado_finalizado_notification recebido:', data);
      
      // Apenas para supervisores
      if ((authState.user?.categoria) ?? 0 >= 3) {
        const eventKey = generateEventKey('chamado_finalizado', data);
        if (processedEvents.current.has(eventKey)) {
          console.log('🚫 Evento chamado_finalizado já processado, ignorando:', eventKey);
          return;
        }
        
        processedEvents.current.add(eventKey);
        
        addNotification({
          type: 'chamado_finalizado',
          title: '✅ Chamado Finalizado',
          message: `${data.finalizedBy} finalizou chamado${data.clienteNome ? ` de ${data.clienteNome}` : ''}`,
          chamadoId: data.chamadoId,
          createdBy: data.finalizedBy,
          timestamp: data.timestamp,
          actionUrl: '/chamados'
        });
      }
    };

    // Registrar TODOS os listeners possíveis para transferência
    socket.on('new_chamado_notification', handleNewChamado);
    socket.on('transfer_notification', handleTransferNotification);
    socket.on('transfer_notification_broadcast', handleTransferBroadcast);
    socket.on('transfer_notification_debug', handleTransferDebug);
    socket.on('transfer_received', handleTransferReceived); // NOVO
    socket.on('chamado_finalizado_notification', handleChamadoFinalizado);

    console.log('✅ Listeners de notificação registrados para socket:', socket.id);

    return () => {
      console.log('🧹 Removendo listeners de notificação');
      socket.off('new_chamado_notification', handleNewChamado);
      socket.off('transfer_notification', handleTransferNotification);
      socket.off('transfer_notification_broadcast', handleTransferBroadcast);
      socket.off('transfer_notification_debug', handleTransferDebug);
      socket.off('transfer_received', handleTransferReceived); // NOVO
      socket.off('chamado_finalizado_notification', handleChamadoFinalizado);
    };
  }, [socket, authState.user, addNotification]);

  // Cleanup periódico de eventos antigos
  useEffect(() => {
    const cleanupInterval = setInterval(cleanupOldEvents, 60000); // A cada minuto
    return () => clearInterval(cleanupInterval);
  }, [cleanupOldEvents]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notification => notification.id === id ? { ...notification, read: true } : notification)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};