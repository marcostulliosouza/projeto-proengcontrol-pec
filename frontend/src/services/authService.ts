import { ApiService } from './api';
import type { LoginCredentials, User } from '../types';

export interface LoginResponse {
  user: User;
  token: string;
  expiresIn: string;
}

export class AuthService {
  // Fazer login
  static async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await ApiService.post<LoginResponse>('/auth/login', credentials);
    
    // Salvar token e usuário no localStorage
    if (response.token) {
      localStorage.setItem('token', response.token);
      // Normalizar usuário antes de salvar
      const normalizedUser: User = {
        id: response.user.id,
        nome: response.user.nome,
        login: response.user.login,
        categoria: response.user.categoria,
        categoriaNome: response.user.categoriaNome
      };
      localStorage.setItem('user', JSON.stringify(normalizedUser));
    }
    
    return response;
  }

  // Fazer logout
  static async logout(): Promise<void> {
    try {
      await ApiService.post('/auth/logout');
    } catch (error) {
      // Mesmo se der erro na API, limpar dados locais
      console.error('Erro no logout:', error);
    } finally {
      // Limpar dados do localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }

  // Obter dados do usuário atual
  static async me(): Promise<User> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await ApiService.get<any>('/auth/me');
    
    // Normalizar resposta do backend para frontend
    return {
      id: response.id,
      nome: response.nome,
      login: response.login,
      categoria: response.categoria,
      categoriaNome: response.categoriaNome
    };
  }

  // Verificar se usuário está logado
  static isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return !!(token && user);
  }

  // Obter token armazenado
  static getToken(): string | null {
    return localStorage.getItem('token');
  }

  // Obter usuário armazenado
  static getUser(): User | null {
    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        const userData = JSON.parse(userString);
        // Normalizar para garantir consistência
        return {
          id: userData.id || userData.col_id,
          nome: userData.nome || userData.col_nome,
          login: userData.login || userData.col_login,
          categoria: userData.categoria || userData.col_categoria,
          categoriaNome: userData.categoriaNome
        };
      } catch (error) {
        console.error('Erro ao parsear usuário do localStorage:', error);
        return null;
      }
    }
    return null;
  }

  // Verificar se usuário tem permissão (categoria)
  static hasPermission(requiredCategories: number[]): boolean {
    const user = this.getUser();
    if (!user) return false;
    return requiredCategories.includes(user.categoria);
  }
}