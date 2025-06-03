import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loading } from '../ui';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredCategories?: number[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredCategories = [],
}) => {
  const { state, hasPermission } = useAuth();
  const location = useLocation();

  // Se ainda está carregando, mostrar loading
  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" text="Carregando..." />
      </div>
    );
  }

  // Se não está autenticado, redirecionar para login
  if (!state.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se tem categorias requeridas e usuário não tem permissão
  if (requiredCategories.length > 0 && !hasPermission(requiredCategories)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-secondary-900 mb-2">
            Acesso Negado
          </h2>
          <p className="text-secondary-600">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;