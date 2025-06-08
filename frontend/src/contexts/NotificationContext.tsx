/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-explicit-any */
// contexts/NotificationContext.tsx - BUG CORRIGIDO
import React, { createContext, useState, useCallback, useEffect } from 'react';
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

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { socket } = useSocket();
  const { state: authState } = useAuth();

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
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      read: false
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      const final = updated.slice(0, MAX_NOTIFICATIONS);
      console.log('📱 Notificações atualizadas:', final.length, 'total');
      return final;
    });
  }, []);

  // Listeners dos eventos socket
  useEffect(() => {
    if (!socket || !authState.user) {
      console.log('🔌 Socket ou usuário não disponível para notificações');
      return;
    }

    console.log('🔌 Configurando listeners de notificação para usuário:', authState.user.nome);

    // CORREÇÃO: Novo chamado criado - estrutura de dados corrigida
    const handleNewChamado = (data: {
      chamadoId: number;        // CORRIGIDO: era data.chamado.cha_id
      clienteNome: string;      // CORRIGIDO: era data.chamado.cliente_nome  
      descricao: string;
      createdBy: string;
      createdById?: number;
      timestamp: string;
      chamado?: any;           // Dados completos opcionais
    }) => {
      console.log('🆕 Evento new_chamado_notification recebido:', data);
      
      // Não notificar para quem criou o chamado
      if (data.createdById === authState.user?.id) {
        console.log('🚫 Não notificando criador do chamado');
        return;
      }

      console.log('✅ Processando notificação de novo chamado');
      addNotification({
        type: 'new_chamado',
        title: '🆕 Novo Chamado Aberto',
        message: `${data.createdBy} abriu um chamado para ${data.clienteNome}`,
        chamadoId: data.chamadoId, // CORRIGIDO: usar data.chamadoId diretamente
        createdBy: data.createdBy,
        createdById: data.createdById,
        timestamp: data.timestamp,
        actionUrl: '/chamados'
      });
    };

    // Transferência recebida
    const handleTransferNotification = (data: {
      chamadoId: number;
      clienteNome: string;
      transferredBy: string;
      transferredById: number;
      timestamp: string;
    }) => {
      console.log('🔄 Evento transfer_notification recebido:', data);
      
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

    // NOVO: Listener para broadcast de transferência (estratégia alternativa)
    const handleTransferBroadcast = (data: {
      targetUserId: number;
      chamadoId: number;
      clienteNome: string;
      transferredBy: string;
      transferredById: number;
      timestamp: string;
    }) => {
      console.log('📡 Evento transfer_notification_broadcast recebido:', data);
      
      // Filtrar apenas para o usuário alvo
      if (data.targetUserId === authState.user?.id) {
        console.log('🎯 Broadcast de transferência é para mim!');
        
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
      } else {
        console.log('🚫 Broadcast de transferência não é para mim');
      }
    };

    // DEBUG: Listener para testar se eventos chegam
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
      console.log('🎯 É para mim?', data.forUserId === authState.user?.id);
      console.log('👤 Meu ID:', authState.user?.id);
      console.log('👤 Meu nome:', authState.user?.nome);
      
      // Se for para mim, criar notificação
      if (data.forUserId === authState.user?.id) {
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


    // Registrar listeners
    socket.on('new_chamado_notification', handleNewChamado);
    socket.on('transfer_notification', handleTransferNotification);
    socket.on('transfer_notification_broadcast', handleTransferBroadcast);
    socket.on('transfer_notification_debug', handleTransferDebug);
    socket.on('chamado_finalizado_notification', handleChamadoFinalizado);

    console.log('✅ Listeners de notificação registrados');

    return () => {
      console.log('🧹 Removendo listeners de notificação');
      socket.off('new_chamado_notification', handleNewChamado);
      socket.off('transfer_notification', handleTransferNotification);
      socket.off('transfer_notification_broadcast', handleTransferBroadcast);
      socket.off('transfer_notification_debug', handleTransferDebug); 
      socket.off('chamado_finalizado_notification', handleChamadoFinalizado);
    };
  }, [socket, authState.user, addNotification]);

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