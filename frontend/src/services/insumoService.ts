import { ApiService } from './api';

// Interfaces para Insumos
export interface Insumo {
  ins_id: number;
  cai_id: number;
  ins_cod_sap: string | null;
  ins_nome: string;
  ins_descricao: string | null;
  ins_qtd: number;
  ins_valor_unit: number;
  ins_estoque_minimo: number;
  ins_status_estoque: 'SUFICIENTE' | 'NECESSIDADE DE COMPRA';
  ins_data_cadastro: string;
  ins_data_atualizacao: string;
  ins_ativo: number;
  ins_localizacao: string | null;
  ins_observacoes: string | null;
  // Campos relacionados
  categoria_nome?: string;
  valor_total_estoque?: number;
  status_analise?: string;
  solicitacoes_pendentes?: number;
}

export interface MovimentacaoEstoque {
  mov_id: number;
  ins_id: number;
  mov_tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'TRANSFERENCIA';
  mov_quantidade: number;
  mov_quantidade_anterior: number;
  mov_quantidade_atual: number;
  mov_motivo: string | null;
  mov_observacao: string | null;
  mov_data_hora: string;
  mov_colaborador: number;
  mov_documento: string | null;
  mov_centro_custo: string | null;
  // Campos relacionados
  colaborador_nome?: string;
  insumo_nome?: string;
}

export interface CategoriaInsumo {
  cai_id: number;
  cai_nome: string;
  cai_descricao: string | null;
}

export interface EstatisticasInsumos {
  totalInsumos: number;
  valorTotalEstoque: number;
  itensBaixoEstoque: number;
  itensEmFalta: number;
  movimentacoesHoje: number;
}

export interface InsumosResponse {
  insumos: Insumo[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface MovimentacoesResponse {
  movimentacoes: MovimentacaoEstoque[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class InsumoService {
  // Buscar insumos com filtros e paginação
  static async getInsumos(
    page: number = 1,
    limit: number = 20,
    filters: {
      search?: string;
      categoria?: number;
      status?: string;
      estoqueBaixo?: boolean;
    } = {}
  ): Promise<InsumosResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters.search) params.append('search', filters.search);
    if (filters.categoria) params.append('categoria', filters.categoria.toString());
    if (filters.status) params.append('status', filters.status);
    if (filters.estoqueBaixo) params.append('estoqueBaixo', 'true');

    return await ApiService.get<InsumosResponse>(`/insumos?${params}`);
  }

  // Buscar insumo por ID
  static async getInsumo(id: number): Promise<Insumo> {
    return await ApiService.get<Insumo>(`/insumos/${id}`);
  }

  // Criar insumo
  static async createInsumo(insumo: Partial<Insumo>): Promise<{ id: number }> {
    return await ApiService.post<{ id: number }>('/insumos', insumo);
  }

  // Atualizar insumo
  static async updateInsumo(id: number, insumo: Partial<Insumo>): Promise<void> {
    return await ApiService.put<void>(`/insumos/${id}`, insumo);
  }

  // Deletar insumo
  static async deleteInsumo(id: number): Promise<void> {
    return await ApiService.delete<void>(`/insumos/${id}`);
  }

  // Movimentar estoque
  static async movimentarEstoque(
    id: number,
    movimentacao: {
      mov_tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'TRANSFERENCIA';
      mov_quantidade: number;
      mov_motivo?: string;
      mov_observacao?: string;
      mov_documento?: string;
      mov_centro_custo?: string;
    }
  ): Promise<void> {
    return await ApiService.post<void>(`/insumos/${id}/movimentar`, movimentacao);
  }

  // Histórico de movimentações
  static async getHistoricoMovimentacoes(
    insumoId?: number,
    page: number = 1,
    limit: number = 20,
    filtros: {
      dataInicio?: string;
      dataFim?: string;
      tipo?: string;
      colaborador?: number;
    } = {}
  ): Promise<MovimentacoesResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio);
    if (filtros.dataFim) params.append('dataFim', filtros.dataFim);
    if (filtros.tipo) params.append('tipo', filtros.tipo);
    if (filtros.colaborador) params.append('colaborador', filtros.colaborador.toString());

    const endpoint = insumoId 
      ? `/insumos/${insumoId}/movimentacoes?${params}`
      : `/insumos/movimentacoes?${params}`;

    return await ApiService.get<MovimentacoesResponse>(endpoint);
  }

  // Relatório de estoque baixo
  static async getEstoqueBaixo(): Promise<Insumo[]> {
    return await ApiService.get<Insumo[]>('/insumos/relatorios/estoque-baixo');
  }

  // Buscar categorias
  static async getCategorias(): Promise<CategoriaInsumo[]> {
    return await ApiService.get<CategoriaInsumo[]>('/insumos/categorias');
  }

  // Estatísticas
  static async getEstatisticas(): Promise<EstatisticasInsumos> {
    return await ApiService.get<EstatisticasInsumos>('/insumos/dashboard/estatisticas');
  }

  // Buscar insumos para autocomplete
  static async getInsumosAutocomplete(search: string): Promise<Insumo[]> {
    const params = new URLSearchParams({ search });
    return await ApiService.get<Insumo[]>(`/insumos/autocomplete?${params}`);
  }
}