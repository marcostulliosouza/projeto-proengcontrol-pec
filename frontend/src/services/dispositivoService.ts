import { ApiService } from './api';
import type { Dispositivo, PaginationInfo, FilterState } from '../types';

export interface DispositivosResponse {
  dispositivos: Dispositivo[];
  pagination: PaginationInfo;
}

export interface Cliente {
  cli_id: number;
  cli_nome: string;
}

export interface Status {
  sdi_id: number;
  sdi_descricao: string;
}

export class DispositivoService {
  // Buscar dispositivos com filtros e paginação
  static async getDispositivos(
    page: number = 1,
    limit: number = 10,
    filters: Partial<FilterState> = {}
  ): Promise<DispositivosResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status.toString());
    if (filters.cliente) params.append('cliente', filters.cliente.toString());

    return await ApiService.get<DispositivosResponse>(`/dispositivos?${params}`);
  }

  // Buscar dispositivo por ID
  static async getDispositivo(id: number): Promise<Dispositivo> {
    return await ApiService.get<Dispositivo>(`/dispositivos/${id}`);
  }

  // Criar dispositivo
  static async createDispositivo(dispositivo: Partial<Dispositivo>): Promise<{ id: number }> {
    return await ApiService.post<{ id: number }>('/dispositivos', dispositivo);
  }

  // Atualizar dispositivo
  static async updateDispositivo(id: number, dispositivo: Partial<Dispositivo>): Promise<void> {
    return await ApiService.put<void>(`/dispositivos/${id}`, dispositivo);
  }

  // Deletar dispositivo
  static async deleteDispositivo(id: number): Promise<void> {
    return await ApiService.delete<void>(`/dispositivos/${id}`);
  }

  // Buscar clientes para dropdown
  static async getClientes(): Promise<Cliente[]> {
    return await ApiService.get<Cliente[]>('/dispositivos/clientes');
  }

  // Buscar status para dropdown
  static async getStatus(): Promise<Status[]> {
    return await ApiService.get<Status[]>('/dispositivos/status');
  }
}