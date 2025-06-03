import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

interface LocationState {
  from: {
    pathname: string;
  };
}

const Login: React.FC = () => {
  const { state, login } = useAuth();
  const location = useLocation();
  
  const [formData, setFormData] = useState({
    login: '',
    senha: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Se já está autenticado, redirecionar
  if (state.isAuthenticated) {
    const from = (location.state as LocationState)?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Limpar erro do campo ao digitar
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.login.trim()) {
      newErrors.login = 'Login é obrigatório';
    }
    
    if (!formData.senha.trim()) {
      newErrors.senha = 'Senha é obrigatória';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      await login(formData);
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Erro ao fazer login'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo e título */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-2xl font-bold text-white">PEC</span>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-secondary-900">
            ProEngControl
          </h2>
          <p className="mt-2 text-sm text-secondary-600">
            Sistema de Gestão de Engenharia de Testes
          </p>
        </div>

        {/* Formulário de login */}
        <Card className="fade-in">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Login"
              name="login"
              type="text"
              value={formData.login}
              onChange={handleChange}
              error={errors.login}
              placeholder="Digite seu login"
              required
              autoComplete="username"
            />

            <Input
              label="Senha"
              name="senha"
              type="password"
              value={formData.senha}
              onChange={handleChange}
              error={errors.senha}
              placeholder="Digite sua senha"
              required
              autoComplete="current-password"
            />

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{errors.submit}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              loading={isLoading}
              disabled={isLoading}
            >
              Entrar
            </Button>
          </form>
        </Card>

        {/* Informações adicionais */}
        <div className="text-center">
          <p className="text-xs text-secondary-500">
            © 2025 HI-MIX ELETRÔNICOS S/A - Todos os direitos reservados
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;