/* eslint-disable @typescript-eslint/no-explicit-any */
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

const MAX_NOTIFICATIONS = 50; // Máximo de notificações armazenadas

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
      } catch (error) {
        console.error('Erro ao carregar notificações:', error);
      }
    }
  }, []);

  // Salvar notificações no localStorage
  useEffect(() => {
    localStorage.setItem('app_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      read: false
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      return updated.slice(0, MAX_NOTIFICATIONS); // Manter apenas as mais recentes
    });
  }, []);

  // Listeners dos eventos socket
  useEffect(() => {
    if (!socket || !authState.user) return;

    // Novo chamado criado
    const handleNewChamado = (data: {
      chamado: any;
      createdBy: string;
      createdById?: number;
      timestamp: string;
    }) => {
      // Não notificar para quem criou o chamado
      if (data.createdById === authState.user?.id) return;

      addNotification({
        type: 'new_chamado',
        title: '🆕 Novo Chamado Aberto',
        message: `${data.createdBy} abriu um chamado para ${data.chamado.cliente_nome}`,
        chamadoId: data.chamado.cha_id,
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

    // Chamado finalizado (opcional - para casos específicos)
    const handleChamadoFinalizado = (data: {
      chamadoId: number;
      finalizedBy: string;
      clienteNome?: string;
      timestamp: string;
    }) => {
      // Exemplo: notificar supervisor quando chamado for finalizado
      if ((authState.user?.categoria ?? 0) >= 3) { // Supervisor+
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

    socket.on('new_chamado_notification', handleNewChamado);
    socket.on('transfer_notification', handleTransferNotification);
    socket.on('chamado_finalizado_notification', handleChamadoFinalizado);

    return () => {
      socket.off('new_chamado_notification', handleNewChamado);
      socket.off('transfer_notification', handleTransferNotification);
      socket.off('chamado_finalizado_notification', handleChamadoFinalizado);
    };
  }, [socket, authState.user, addNotification]); // CORRIGIDO: Adicionado addNotification

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