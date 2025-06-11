import { ApiService } from './api';

// Interfaces para Orçamentos
export interface Orcamento {
  orc_id: number;
  cav_id: number;
  orc_centro_custo: string;
  orc_ano: number;
  orc_orcado: number;
  orc_gasto: number;
  // Campos calculados
  orc_disponivel?: number;
  orc_percentual_usado?: number;
  orc_status?: 'NO_LIMITE' | 'PROXIMO_LIMITE' | 'LIMITE_EXCEDIDO';
  // Campos relacionados
  categoria_verba?: string;
}

export interface DisponibilidadeOrcamento {
  disponivel: boolean;
  orcado: number;
  gasto: number;
  disponivel_valor: number;
  percentual_usado: number;
}

export interface ResumoOrcamento {
  resumoPorCategoria: Array<{
    categoria: string;
    orcado_total: number;
    gasto_total: number;
    disponivel_total: number;
    percentual_medio: number;
  }>;
  resumoPorCentro: Array<{
    centro_custo: string;
    orcado_total: number;
    gasto_total: number;
    disponivel_total: number;
    percentual_medio: number;
  }>;
  totais: {
    orcadoTotal: number;
    gastoTotal: number;
    disponivelTotal: number;
    percentualUsadoGeral: number;
  };
}

export interface DashboardOrcamento {
  ano: number;
  totais: {
    orcadoTotal: number;
    gastoTotal: number;
    disponivelTotal: number;
    percentualUsadoGeral: number;
  };
  resumoPorCategoria: Array<{
    categoria: string;
    orcado_total: number;
    gasto_total: number;
    disponivel_total: number;
    percentual_medio: number;
  }>;
  resumoPorCentro: Array<{
    centro_custo: string;
    orcado_total: number;
    gasto_total: number;
    disponivel_total: number;
    percentual_medio: number;
  }>;
  alertas: number;
  alertasDetalhes: Orcamento[];
}

export class OrcamentoService {
  // Buscar orçamentos
  static async getOrcamentos(filtros: {
    ano?: number;
    centroCusto?: string;
    categoria?: number;
  } = {}): Promise<Orcamento[]> {
    const params = new URLSearchParams();

    if (filtros.ano) params.append('ano', filtros.ano.toString());
    if (filtros.centroCusto) params.append('centroCusto', filtros.centroCusto);
    if (filtros.categoria) params.append('categoria', filtros.categoria.toString());

    return await ApiService.get<Orcamento[]>(`/orcamentos?${params}`);
  }

  // Buscar orçamento por ID
  static async getOrcamento(id: number): Promise<Orcamento> {
    return await ApiService.get<Orcamento>(`/orcamentos/${id}`);
  }

  // Criar orçamento
  static async createOrcamento(orcamento: {
    cav_id: number;
    orc_centro_custo: string;
    orc_ano: number;
    orc_orcado: number;
  }): Promise<{ id: number }> {
    return await ApiService.post<{ id: number }>('/orcamentos', orcamento);
  }

  // Atualizar orçamento
  static async updateOrcamento(id: number, orcamento: Partial<Orcamento>): Promise<void> {
    return await ApiService.put<void>(`/orcamentos/${id}`, orcamento);
  }

  // Deletar orçamento
  static async deleteOrcamento(id: number): Promise<void> {
    return await ApiService.delete<void>(`/orcamentos/${id}`);
  }

  // Verificar disponibilidade orçamentária
  static async verificarDisponibilidade(
    categoriaId: number,
    centroCusto: string,
    ano: number,
    valor: number
  ): Promise<DisponibilidadeOrcamento> {
    const params = new URLSearchParams({
      categoriaId: categoriaId.toString(),
      centroCusto,
      ano: ano.toString(),
      valor: valor.toString(),
    });

    return await ApiService.get<DisponibilidadeOrcamento>(`/orcamentos/verificar-disponibilidade?${params}`);
  }

  // Resumo geral
  static async getResumoGeral(ano?: number): Promise<ResumoOrcamento> {
    const params = ano ? new URLSearchParams({ ano: ano.toString() }) : '';
    return await ApiService.get<ResumoOrcamento>(`/orcamentos/resumo?${params}`);
  }

  // Alertas de orçamento
  static async getAlertasOrcamento(limite: number = 80): Promise<Orcamento[]> {
    const params = new URLSearchParams({ limite: limite.toString() });
    return await ApiService.get<Orcamento[]>(`/orcamentos/alertas?${params}`);
  }

  // Dashboard de orçamento
  static async getDashboardOrcamento(): Promise<DashboardOrcamento> {
    return await ApiService.get<DashboardOrcamento>('/orcamentos/dashboard');
  }

  // Obter centros de custo
  static async getCentrosCusto(): Promise<string[]> {
    return await ApiService.get<string[]>('/orcamentos/centros-custo');
  }

  // Obter anos de orçamento
  static async getAnosOrcamento(): Promise<number[]> {
    return await ApiService.get<number[]>('/orcamentos/anos');
  }
}