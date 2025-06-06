import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalAttendance } from '../../hooks/useGlobalAttendance';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { logout, state } = useAuth();
  const { isInAttendance, attendanceChamado } = useGlobalAttendance();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (window.confirm('Tem certeza que deseja sair?')) {
      await logout();
    }
  };

  return (
    <header className="bg-white border-b border-secondary-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Menu button para mobile */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md hover:bg-secondary-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div className="hidden lg:block">
            <h2 className="text-xl font-semibold text-secondary-900">
              Dashboard
            </h2>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-4">
          {/* Indicador de Atendimento Global */}
          {isInAttendance && attendanceChamado && (
            <div 
              onClick={() => navigate('/chamados')}
              className="flex items-center space-x-2 bg-orange-100 text-orange-800 px-3 py-2 rounded-lg text-sm cursor-pointer hover:bg-orange-200 transition-colors"
              title="Clique para voltar ao atendimento"
            >
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
              <span className="font-medium">
                🔥 Atendendo #{attendanceChamado.cha_id}
              </span>
              <span className="text-xs">
                Clique aqui
              </span>
            </div>
          )}

          {/* Notificações */}
          <button className="p-2 rounded-md hover:bg-secondary-100 relative">
            <svg className="w-5 h-5 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM15 17H9a4 4 0 01-4-4V9a4 4 0 014-4h6a4 4 0 014 4v4a4 4 0 01-4 4z" />
            </svg>
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User menu */}
          <div className="flex items-center space-x-3">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-secondary-900">
                {state.user?.nome}
              </p>
              <p className="text-xs text-secondary-500">
                {state.user?.categoriaNome}
              </p>
            </div>
            
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={handleLogout}
            >
              Sair
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;