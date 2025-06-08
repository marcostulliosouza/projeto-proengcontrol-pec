import { ApiService } from './api';
import type { Chamado, PaginationInfo, FilterState, UsuarioOnline } from '../types';

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
  ach_detrator: number;
}

export interface Detrator {
  dtr_id: number;
  dtr_descricao: string;
  dtr_tipo: number;
  dtr_indicador: number;
  dtr_ativo: number;
}

export interface LocalChamado {
  loc_id: number;
  loc_nome: string;
}

// export interface FinalizarChamadoData {
//   detrator_id: number
//   descricao_atendimento: string;
// }

export interface AtendimentoHistorico {
  atc_id: number;
  atc_chamado: number;
  atc_colaborador: number;
  atc_data_hora_inicio: string;
  atc_data_hora_termino: string | null;
  atc_descricao_atendimento: string | null;
  colaborador_nome: string;
  tempo_decorrido: number;
}

export class ChamadoService {

  // Finalizar chamado COM descrição do atendimento
  static async finalizarChamado(id: number, detratorId: number, descricaoAtendimento: string): Promise<void> {
    return await ApiService.put<void>(`/chamados/${id}/finalizar`, { 
      detrator_id: detratorId,
      descricao_atendimento: descricaoAtendimento 
    });
  }

  // NOVA: Buscar detratores por tipo de chamado
  static async getDetratoresByTipo(tipoId: number): Promise<Detrator[]> {
    return await ApiService.get<Detrator[]>(`/chamados/detratores/${tipoId}`);
  }

  // NOVA: Buscar ações por detrator
  static async getAcoesByDetrator(detratorId: number): Promise<Acao[]> {
    return await ApiService.get<Acao[]>(`/chamados/acoes/detrator/${detratorId}`);
  }

  // NOVA: Buscar histórico de atendimentos de um chamado
  static async getHistoricoAtendimentos(id: number): Promise<AtendimentoHistorico[]> {
    return await ApiService.get<AtendimentoHistorico[]>(`/chamados/${id}/historico`);
  }

  // NOVA: Relatório de detratores
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async getRelatorioDetratores(dataInicio: string, dataFim: string): Promise<any[]> {
    const params = new URLSearchParams({
      dataInicio,
      dataFim
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await ApiService.get<any[]>(`/chamados/relatorio/detratores?${params}`);
  }

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

  // Buscar usuários online
  static async getUsuariosOnline(): Promise<UsuarioOnline[]> {
    return await ApiService.get<UsuarioOnline[]>('/chamados/usuarios-online');
  }

  // Transferir chamado
  static async transferirChamado(chamadoId: number, novoColaboradorId: number, novoColaboradorNome: string): Promise<void> {
    return await ApiService.put<void>(`/chamados/${chamadoId}/transferir`, {
      novoColaboradorId,
      novoColaboradorNome
    });
  }

  static async getLocaisChamado(): Promise<LocalChamado[]> {
    return await ApiService.get<LocalChamado[]>('/chamados/locais');
  }
}