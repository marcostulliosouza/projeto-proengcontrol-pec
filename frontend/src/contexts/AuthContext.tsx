import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { AuthState, User, LoginCredentials } from '../types';
import { AuthService } from '../services/authService';

// Tipos para ações do reducer
type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_FAILURE' }
  | { type: 'LOGOUT' }
  | { type: 'LOAD_USER'; payload: User }
  | { type: 'SET_LOADING'; payload: boolean };

// Estado inicial
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: true,
};

// Reducer para gerenciar estado de autenticação
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        loading: true,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
      };
    case 'LOAD_USER':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload,
        token: AuthService.getToken(),
        loading: false,
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    default:
      return state;
  }
};

// Interface do contexto
interface AuthContextType {
  state: AuthState;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (requiredCategories: number[]) => boolean;
}

// Criar contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider do contexto
interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Função de logout definida antes do useEffect
  const logout = async (): Promise<void> => {
    try {
      await AuthService.logout();
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  };

  // Verificar se usuário já está logado ao carregar a aplicação
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (AuthService.isAuthenticated()) {
          const user = AuthService.getUser();
          if (user) {
            // Verificar se o token ainda é válido fazendo uma requisição
            try {
              const currentUser = await AuthService.me();
              // Garantir que o usuário tem o formato correto
              const normalizedUser: User = {
                id: currentUser.id,
                nome: currentUser.nome,
                login: currentUser.login,
                categoria: currentUser.categoria,
                categoriaNome: currentUser.categoriaNome
              };
              dispatch({ type: 'LOAD_USER', payload: normalizedUser });
            } catch {
              // Token inválido, fazer logout
              await logout();
            }
          } else {
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (error) {
        console.error('Erro ao inicializar autenticação:', error);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Função de login
  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      dispatch({ type: 'LOGIN_START' });
      
      const response = await AuthService.login(credentials);
      
      // Normalizar o usuário
      const normalizedUser: User = {
        id: response.user.id,
        nome: response.user.nome,
        login: response.user.login,
        categoria: response.user.categoria,
        categoriaNome: response.user.categoriaNome
      };
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: normalizedUser,
          token: response.token,
        },
      });
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE' });
      throw error; // Re-throw para o componente tratar
    }
  };

  // Verificar permissões
  const hasPermission = (requiredCategories: number[]): boolean => {
    if (!state.user) return false;
    return requiredCategories.includes(state.user.categoria);
  };

  const value: AuthContextType = {
    state,
    login,
    logout,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook para usar o contexto
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};