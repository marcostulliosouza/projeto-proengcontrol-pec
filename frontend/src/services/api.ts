import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { ApiResponse } from '../types';

// Configuração base da API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// Criar instância do axios
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token automaticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratamento de respostas
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: unknown) => {
    // Se o token expirou, redirecionar para login
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Classe para gerenciar requisições da API
export class ApiService {
  private static handleResponse<T>(response: AxiosResponse<ApiResponse<T>>): T {
    if (response.data.success) {
      return response.data.data as T;
    } else {
      throw new Error(response.data.message || 'Erro na requisição');
    }
  }

  private static handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message) {
        throw new Error(error.message);
      }
    }
    
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    
    throw new Error('Erro desconhecido na requisição');
  }

  // Método genérico GET
  static async get<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await api.get<ApiResponse<T>>(endpoint, config);
      return this.handleResponse<T>(response);
    } catch (error) {
      this.handleError(error);
    }
  }

  // Método genérico POST
  static async post<T>(endpoint: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await api.post<ApiResponse<T>>(endpoint, data, config);
      return this.handleResponse<T>(response);
    } catch (error) {
      this.handleError(error);
    }
  }

  // Método genérico PUT
  static async put<T>(endpoint: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await api.put<ApiResponse<T>>(endpoint, data, config);
      return this.handleResponse<T>(response);
    } catch (error) {
      this.handleError(error);
    }
  }

  // Método genérico DELETE
  static async delete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await api.delete<ApiResponse<T>>(endpoint, config);
      return this.handleResponse<T>(response);
    } catch (error) {
      this.handleError(error);
    }
  }

  // Método para obter resposta completa (com metadata)
  static async getFullResponse<T>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await api.get<ApiResponse<T>>(endpoint, config);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }
}

export default api;