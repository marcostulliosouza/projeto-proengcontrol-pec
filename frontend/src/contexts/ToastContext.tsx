/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../components/ui/Toast';

interface ToastData {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<ToastData, 'id'>) => void;
  showSuccessToast: (title: string, message: string) => void;
  showWarningToast: (title: string, message: string) => void;
  showErrorToast: (title: string, message: string) => void;
  showInfoToast: (title: string, message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: React.ReactNode;
}

// Criar um contador para IDs únicos
let toastCounter = 0;
const generateUniqueId = () => {
  toastCounter += 1;
  return `toast_${Date.now()}_${toastCounter}_${Math.random().toString(36).substr(2, 9)}`;
};

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = generateUniqueId();
    const newToast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showSuccessToast = useCallback((title: string, message: string) => {
    showToast({ type: 'success', title, message });
  }, [showToast]);

  const showWarningToast = useCallback((title: string, message: string) => {
    showToast({ type: 'warning', title, message });
  }, [showToast]);

  const showErrorToast = useCallback((title: string, message: string) => {
    showToast({ type: 'error', title, message });
  }, [showToast]);

  const showInfoToast = useCallback((title: string, message: string) => {
    showToast({ type: 'info', title, message });
  }, [showToast]);

  const value: ToastContextType = {
    showToast,
    showSuccessToast,
    showWarningToast,
    showErrorToast,
    showInfoToast,
  };

  return (
    <ToastContext.Provider value={value}>
    {children}
    
    {/* FIXED: Renderizar toasts com keys únicas garantidas */}
    <div className="fixed top-0 right-0 z-50 p-4 space-y-4 pointer-events-none">
      {toasts.map((toast) => {
        console.log('🔑 Renderizando toast com key:', toast.id);   
        return (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              type={toast.type}
              title={toast.title}
              message={toast.message}
              duration={toast.duration}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        );
      })}
    </div>
  </ToastContext.Provider>
);
};

export const useToast = () => {
const context = useContext(ToastContext);
if (!context) {
  throw new Error('useToast deve ser usado dentro de ToastProvider');
}
return context;
};