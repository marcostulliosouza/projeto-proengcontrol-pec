import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalAttendance } from '../../hooks/useGlobalAttendance';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';

interface HeaderProps {
  onMenuClick: () => void;
  onToggleCollapse: () => void;
  sidebarCollapsed: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  onMenuClick, 
  onToggleCollapse, 
  sidebarCollapsed 
}) => {
  const { logout, state } = useAuth();
  const { isInAttendance, attendanceChamado } = useGlobalAttendance();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (window.confirm('Tem certeza que deseja sair?')) {
      await logout();
    }
  };

  return (
    <header className="bg-white border-b border-secondary-200 px-4 py-2.5 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-1.5 rounded-md hover:bg-secondary-100 transition-all duration-200"
            title="Abrir menu"
          >
            <svg className="w-5 h-5 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* Desktop collapse button */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-md hover:bg-secondary-100 transition-all duration-200"
            title={sidebarCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
          >
            {sidebarCollapsed ? (
              <svg className="w-4 h-4 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            )}
          </button>
          
          {/* Page title - compacto */}
          <div>
            <h1 className="text-lg font-semibold text-secondary-900">
              ProEngControl
            </h1>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-3">
          {/* Indicador de Atendimento - compacto */}
          {isInAttendance && attendanceChamado && (
            <div 
              onClick={() => navigate('/chamados')}
              className="flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1.5 rounded-lg cursor-pointer hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-md"
              title="Clique para voltar ao atendimento"
              key={attendanceChamado.cha_id} // Novo: forçar re-renderização ao mudar de chamado
            >
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="font-medium text-sm">
                🔥 Atendendo o Chamado #{attendanceChamado.cha_id} | {attendanceChamado.produto_nome}
              </span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </div>
          )}

          {/* Notificações - compacto */}
          <button className="relative p-1.5 rounded-md hover:bg-secondary-100 transition-all duration-200">
            <svg className="w-5 h-5 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM15 17H9a4 4 0 01-4-4V9a4 4 0 014-4h6a4 4 0 014 4v4a4 4 0 01-4 4z" />
            </svg>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
          </button>

          {/* User menu - compacto */}
          <div className="flex items-center space-x-2 bg-secondary-50 rounded-lg px-2 py-1.5">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-medium text-secondary-900 leading-tight">
                {state.user?.nome}
              </p>
              <p className="text-xs text-secondary-500 leading-tight">
                {state.user?.categoriaNome}
              </p>
            </div>
            
            <div className="w-7 h-7 bg-primary-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">
                {state.user?.nome?.charAt(0) || 'U'}
              </span>
            </div>
            
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={handleLogout}
              className="!px-2 !py-1 !text-xs"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sair
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;