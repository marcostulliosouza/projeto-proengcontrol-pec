import { ApiService } from './api';
import type { Chamado, PaginationInfo, FilterState } from '../types';

export interface ChamadosResponse {
  chamados: Chamado[];
  pagination: PaginationInfo;
}

export interface TipoChamado {
  tch_id: number;
  tch_descricao: string;
}

export interface StatusChamado {
  stc_id: number;
  stc_descricao: string;
}

export interface Cliente {
  cli_id: number;
  cli_nome: string;
}

export interface Produto {
  pro_id: number;
  pro_nome: string;
}

export interface Acao {
  ach_id: number;
  ach_descricao: string;
}

export class ChamadoService {
  // Buscar chamados com filtros e paginação
  static async getChamados(
    page: number = 1,
    limit: number = 10,
    filters: Partial<FilterState> = {}
  ): Promise<ChamadosResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status.toString());
    if (filters.cliente) params.append('cliente', filters.cliente.toString());
    if (filters.categoria) params.append('tipo', filters.categoria.toString());
    if (filters.dataInicio) params.append('dataInicio', filters.dataInicio);
    if (filters.dataFim) params.append('dataFim', filters.dataFim);

    return await ApiService.get<ChamadosResponse>(`/chamados?${params}`);
  }

  // Buscar chamado por ID
  static async getChamado(id: number): Promise<Chamado> {
    return await ApiService.get<Chamado>(`/chamados/${id}`);
  }

  // Criar chamado
  static async createChamado(chamado: Partial<Chamado>): Promise<{ id: number }> {
    return await ApiService.post<{ id: number }>('/chamados', chamado);
  }

  // Atualizar chamado
  static async updateChamado(id: number, chamado: Partial<Chamado>): Promise<void> {
    return await ApiService.put<void>(`/chamados/${id}`, chamado);
  }

  // Iniciar atendimento
  static async iniciarAtendimento(id: number): Promise<void> {
    return await ApiService.put<void>(`/chamados/${id}/iniciar`);
  }

  // Finalizar chamado
  static async finalizarChamado(id: number, acaoId: number): Promise<void> {
    return await ApiService.put<void>(`/chamados/${id}/finalizar`, { acao_id: acaoId });
  }

  // Endpoints auxiliares
  static async getTipos(): Promise<TipoChamado[]> {
    return await ApiService.get<TipoChamado[]>('/chamados/tipos');
  }

  static async getStatus(): Promise<StatusChamado[]> {
    return await ApiService.get<StatusChamado[]>('/chamados/status');
  }

  static async getClientes(): Promise<Cliente[]> {
    return await ApiService.get<Cliente[]>('/dispositivos/clientes');
  }

  static async getProdutosByCliente(clienteId: number): Promise<Produto[]> {
    return await ApiService.get<Produto[]>(`/chamados/produtos/${clienteId}`);
  }

  static async getAcoes(): Promise<Acao[]> {
    return await ApiService.get<Acao[]>('/chamados/acoes');
  }
}