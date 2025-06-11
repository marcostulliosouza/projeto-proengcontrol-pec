import { ApiService } from './api';

// Interfaces para Compras
export interface Compra {
  com_id: number;
  cav_id: number;
  com_data_abertura: string;
  com_rc: string;
  com_cod_sap: string | null;
  com_descricao: string;
  com_qtd: number;
  com_valor_unit: number;
  com_utilizacao: string | null;
  com_centro_custo: string;
  com_conta_razao: string;
  com_data_aprovacao: string | null;
  com_fornecedor: string | null;
  com_data_recebimento: string | null;
  com_nota_fiscal: string | null;
  com_obs: string | null;
  com_status: 'PENDENTE' | 'APROVADA' | 'RECEBIDA' | 'CANCELADA';
  com_data_cadastro: string;
  com_colaborador_abertura: number | null;
  com_colaborador_aprovacao: number | null;
  for_id: number | null;
  // Campos relacionados
  categoria_verba?: string;
  colaborador_abertura_nome?: string;
  colaborador_aprovacao_nome?: string;
  fornecedor_nome?: string;
  valor_total?: number;
}

export interface SolicitacaoCompra {
  sol_id: number;
  ins_id: number;
  sol_quantidade: number;
  sol_justificativa: string | null;
  sol_urgencia: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  sol_status: 'PENDENTE' | 'APROVADA' | 'REJEITADA' | 'COMPRADA';
  sol_data_solicitacao: string;
  sol_colaborador_solicitante: number;
  sol_colaborador_aprovador: number | null;
  sol_data_aprovacao: string | null;
  sol_observacao_aprovador: string | null;
  // Campos relacionados
  insumo_nome?: string;
  insumo_cod_sap?: string;
  categoria_nome?: string;
  solicitante_nome?: string;
  aprovador_nome?: string;
  estoque_atual?: number;
  estoque_minimo?: number;
}

export interface Fornecedor {
  for_id: number;
  for_nome: string;
  for_cnpj: string | null;
  for_contato: string | null;
  for_telefone: string | null;
  for_email: string | null;
  for_endereco: string | null;
  for_ativo: number;
  for_data_cadastro: string;
}

export interface CategoriaVerba {
  cav_id: number;
  cav_nome: string;
  cav_descricao: string | null;
}

export interface ComprasResponse {
  compras: Compra[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SolicitacoesResponse {
  solicitacoes: SolicitacaoCompra[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface RelatorioCompras {
  compras: Compra[];
  resumo: {
    totalCompras: number;
    valorTotal: number;
    comprasPendentes: number;
    comprasAprovadas: number;
    comprasRecebidas: number;
    comprasCanceladas: number;
  };
}

export class CompraService {
  // ===== COMPRAS =====

  // Buscar compras com filtros e paginação
  static async getCompras(
    page: number = 1,
    limit: number = 20,
    filtros: {
      search?: string;
      status?: string;
      categoria?: number;
      dataInicio?: string;
      dataFim?: string;
      centroCusto?: string;
    } = {}
  ): Promise<ComprasResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filtros.search) params.append('search', filtros.search);
    if (filtros.status) params.append('status', filtros.status);
    if (filtros.categoria) params.append('categoria', filtros.categoria.toString());
    if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio);
    if (filtros.dataFim) params.append('dataFim', filtros.dataFim);
    if (filtros.centroCusto) params.append('centroCusto', filtros.centroCusto);

    return await ApiService.get<ComprasResponse>(`/compras?${params}`);
  }

  // Buscar compra por ID
  static async getCompra(id: number): Promise<Compra> {
    return await ApiService.get<Compra>(`/compras/${id}`);
  }

  // Criar compra
  static async createCompra(compra: Partial<Compra>): Promise<{ id: number }> {
    return await ApiService.post<{ id: number }>('/compras', compra);
  }

  // Atualizar compra
  static async updateCompra(id: number, compra: Partial<Compra>): Promise<void> {
    return await ApiService.put<void>(`/compras/${id}`, compra);
  }

  // Aprovar compra
  static async aprovarCompra(id: number, fornecedorId?: number): Promise<void> {
    return await ApiService.put<void>(`/compras/${id}/aprovar`, { fornecedorId });
  }

  // Receber compra
  static async receberCompra(
    id: number,
    dados: {
      notaFiscal: string;
      dataRecebimento?: string;
      observacoes?: string;
    }
  ): Promise<void> {
    return await ApiService.put<void>(`/compras/${id}/receber`, dados);
  }

  // Cancelar compra
  static async cancelarCompra(id: number): Promise<void> {
    return await ApiService.put<void>(`/compras/${id}/cancelar`);
  }

  // Buscar categorias de verba
  static async getCategoriasVerba(): Promise<CategoriaVerba[]> {
    return await ApiService.get<CategoriaVerba[]>('/compras/categorias-verba');
  }

  // Relatório de compras
  static async getRelatorioCompras(filtros: {
    dataInicio: string;
    dataFim: string;
    categoria?: number;
    status?: string;
    centroCusto?: string;
  }): Promise<RelatorioCompras> {
    const params = new URLSearchParams({
      dataInicio: filtros.dataInicio,
      dataFim: filtros.dataFim,
    });

    if (filtros.categoria) params.append('categoria', filtros.categoria.toString());
    if (filtros.status) params.append('status', filtros.status);
    if (filtros.centroCusto) params.append('centroCusto', filtros.centroCusto);

    return await ApiService.get<RelatorioCompras>(`/compras/relatorio?${params}`);
  }

  // ===== SOLICITAÇÕES =====

  // Buscar solicitações
  static async getSolicitacoes(
    page: number = 1,
    limit: number = 20,
    filtros: {
      status?: string;
      urgencia?: string;
      solicitante?: number;
      dataInicio?: string;
      dataFim?: string;
    } = {}
  ): Promise<SolicitacoesResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filtros.status) params.append('status', filtros.status);
    if (filtros.urgencia) params.append('urgencia', filtros.urgencia);
    if (filtros.solicitante) params.append('solicitante', filtros.solicitante.toString());
    if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio);
    if (filtros.dataFim) params.append('dataFim', filtros.dataFim);

    return await ApiService.get<SolicitacoesResponse>(`/compras/solicitacoes?${params}`);
  }

  // Criar solicitação
  static async createSolicitacao(solicitacao: {
    ins_id: number;
    sol_quantidade: number;
    sol_justificativa?: string;
    sol_urgencia?: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  }): Promise<{ id: number }> {
    return await ApiService.post<{ id: number }>('/compras/solicitacoes', solicitacao);
  }

  // Processar solicitação (aprovar/rejeitar)
  static async processarSolicitacao(
    id: number,
    status: 'APROVADA' | 'REJEITADA',
    observacao?: string
  ): Promise<void> {
    return await ApiService.put<void>(`/compras/solicitacoes/${id}/processar`, {
      status,
      observacao,
    });
  }

  // ===== FORNECEDORES =====

  // Buscar fornecedores
  static async getFornecedores(filtros: {
    search?: string;
    ativo?: boolean;
  } = {}): Promise<Fornecedor[]> {
    const params = new URLSearchParams();

    if (filtros.search) params.append('search', filtros.search);
    if (filtros.ativo !== undefined) params.append('ativo', filtros.ativo.toString());

    return await ApiService.get<Fornecedor[]>(`/compras/fornecedores?${params}`);
  }

  // Criar fornecedor
  static async createFornecedor(fornecedor: Partial<Fornecedor>): Promise<{ id: number }> {
    return await ApiService.post<{ id: number }>('/compras/fornecedores', fornecedor);
  }

  // Atualizar fornecedor
  static async updateFornecedor(id: number, fornecedor: Partial<Fornecedor>): Promise<void> {
    return await ApiService.put<void>(`/compras/fornecedores/${id}`, fornecedor);
  }

  // Desativar fornecedor
  static async desativarFornecedor(id: number): Promise<void> {
    return await ApiService.delete<void>(`/compras/fornecedores/${id}`);
  }
}