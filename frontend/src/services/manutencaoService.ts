/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiService } from './api';

export interface DispositivoDetalhes {
  dis_id: number;
  dis_descricao: string;
  dis_codigo_sap: string;
  cliente_nome: string;
  dim_formulario_manutencao: number;
  formulario_descricao: string;
  dim_tipo_intervalo: 'DIA' | 'PLACA';
  dim_intervalo_dias: number;
  dim_intervalo_placas: number;
  dim_placas_executadas: number;
  dim_data_ultima_manutencao: string | null;
}

export interface DispositivoManutencao {
  dis_id: number;
  dis_descricao: string;
  dim_tipo_intervalo: 'DIA' | 'PLACA';
  dim_intervalo_dias: number;
  dim_intervalo_placas: number;
  dim_placas_executadas: number;
  dim_data_ultima_manutencao: string | null;
  dias_desde_ultima: number;
  necessita_manutencao: boolean;
  percentual_manutencao: number;
}

export interface ManutencaoPreventiva {
  lmd_id: number;
  lmd_dispositivo: number;
  lmd_data_hora_inicio: string;
  lmd_data_hora_fim: string | null;
  lmd_tipo_manutencao: 'PREVENTIVA' | 'CORRETIVA';
  lmd_observacao: string | null;
  lmd_colaborador: number;
  lmd_status: number;
  lmd_ciclos_totais_executados: number;
  
  // Campos de configuração da manutenção (salvos no momento da execução)
  lmd_data_hora_ultima_manutencao?: string | null;
  lmd_tipo_intervalo_manutencao?: 'DIA' | 'PLACA';
  lmd_intervalo_dias?: number;
  lmd_intervalo_placas?: number;
  lmd_placas_executadas?: number;
  
  // Campos relacionados (joins)
  dispositivo_descricao?: string;
  colaborador_nome?: string;
  duracao_total?: number;
}

export interface FormularioManutencao {
  fmp_id: number;
  fmp_descricao: string;
  fmp_data_ultima_modificacao: string;
  modificador_nome?: string;
}

export interface ItemFormulario {
  ifm_id: number;
  ifm_formulario: number;
  ifm_descricao: string;
  ifm_posicao: number;
}

export interface RespostaItem {
  rif_item: number;
  rif_log_manutencao: number;
  rif_ok: number;
  rif_observacao: string;
  item_descricao?: string;
}

export interface MetricasManutencaoType  {
  totalManutencoes: number;
  tempoMedioMinutos: number;
  manutencoesPendentes: number;
  totalDispositivos: number;
  porDispositivo: Array<{ nome: string; total: number }>;
  porColaborador: Array<{ nome: string; total: number }>;
  evolucaoMensal: Array<{ mes: string; total: number; tempo_medio: number }>;
}

export class ManutencaoService {
  // Dispositivos para manutenção
  static async getDispositivosManutencao(): Promise<DispositivoManutencao[]> {
    return await ApiService.get<DispositivoManutencao[]>('/manutencao/dispositivos');
  }

  // Verificar manutenção em andamento
  static async verificarManutencaoAndamento(): Promise<ManutencaoPreventiva | null> {
    return await ApiService.get<ManutencaoPreventiva | null>('/manutencao/minha-manutencao');
  }

   // Buscar detalhes específicos do dispositivo
   static async getDispositivoDetalhes(dispositivoId: number): Promise<DispositivoDetalhes> {
    return await ApiService.get<DispositivoDetalhes>(`/manutencao/dispositivo/${dispositivoId}/detalhes`);
  }

  // Iniciar manutenção
  static async iniciarManutencao(data: {
    dispositivoId: number;
  }): Promise<{ success: boolean; id?: number; error?: string }> {
    try {
      const response = await ApiService.post<{ id: number }>('/manutencao/iniciar', data);
      return { success: true, id: response.id };
    } catch (error: any) {
      // Tratar erro 409 (conflito)
      if (error.response?.status === 409) {
        return {
          success: false,
          error: error.response.data.message || 'Dispositivo já está sendo atendido'
        };
      }
      
      // Tratar erro 404 (dispositivo não encontrado)
      if (error.response?.status === 404) {
        return {
          success: false,
          error: 'Dispositivo não encontrado ou inativo'
        };
      }
      
      // Tratar erro 400 (configuração inválida)
      if (error.response?.status === 400) {
        return {
          success: false,
          error: error.response.data.message || 'Dispositivo não configurado para manutenção'
        };
      }
      
      // Outros erros
      console.error('Erro ao iniciar manutenção:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

   // Obter estatísticas em tempo real
   static async getStatusDispositivos(): Promise<{
    total: number;
    emManutencao: number;
    necessitamManutencao: number;
    emDia: number;
  }> {
    return await ApiService.get('/manutencao/status-dispositivos');
  }

  // Finalizar manutenção
  static async finalizarManutencao(
    manutencaoId: number, 
    observacao: string, 
    respostas: RespostaItem[]
  ): Promise<void> {
    return await ApiService.put<void>(`/manutencao/${manutencaoId}/finalizar`, {
      observacao,
      respostas
    });
  }

  // Cancelar manutenção
  static async cancelarManutencao(manutencaoId: number): Promise<void> {
    return await ApiService.delete<void>(`/manutencao/${manutencaoId}/cancelar`);
  }

  // Histórico de manutenções
  static async getHistoricoManutencoes(filtros: {
    dataInicio?: string;
    dataFim?: string;
    dispositivo?: number;
    colaborador?: number;
    status?: number;
    page?: number;
    limit?: number;
  }): Promise<ManutencaoPreventiva[]> {
    const params = new URLSearchParams();
    
    if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio);
    if (filtros.dataFim) params.append('dataFim', filtros.dataFim);
    if (filtros.dispositivo) params.append('dispositivo', filtros.dispositivo.toString());
    if (filtros.colaborador) params.append('colaborador', filtros.colaborador.toString());
    if (filtros.status) params.append('status', filtros.status.toString());
    if (filtros.page) params.append('page', filtros.page.toString());
    if (filtros.limit) params.append('limit', filtros.limit.toString());
  
    return await ApiService.get<ManutencaoPreventiva[]>(`/manutencao/historico?${params}`);
  }

  // Detalhes de uma manutenção
  static async getDetalhesManutencao(manutencaoId: number): Promise<{
    manutencao: ManutencaoPreventiva;
    respostas: RespostaItem[];
  }> {
    return await ApiService.get<{
      manutencao: ManutencaoPreventiva;
      respostas: RespostaItem[];
    }>(`/manutencao/${manutencaoId}/detalhes`);
  }

  // Formulários
  static async getFormularios(): Promise<FormularioManutencao[]> {
    return await ApiService.get<FormularioManutencao[]>('/manutencao/formularios');
  }

  static async getItensFormulario(formularioId: number): Promise<ItemFormulario[]> {
    return await ApiService.get<ItemFormulario[]>(`/manutencao/formularios/${formularioId}/itens`);
  }

  static async criarFormulario(
    descricao: string, 
    itens: Array<{ descricao: string; posicao: number }>
  ): Promise<{ id: number }> {
    return await ApiService.post<{ id: number }>('/manutencao/formularios', {
      descricao,
      itens
    });
  }

  static async atualizarFormulario(
    formularioId: number,
    descricao: string,
    itensInserir: Array<{ descricao: string; posicao: number }>,
    itensAtualizar: Array<{ id: number; descricao: string; posicao: number }>,
    itensRemover: number[]
  ): Promise<void> {
    return await ApiService.put<void>(`/manutencao/formularios/${formularioId}`, {
      descricao,
      itensInserir,
      itensAtualizar,
      itensRemover
    });
  }

  // Métricas
  static async getMetricas(dataInicio?: string, dataFim?: string): Promise<MetricasManutencaoType> {
    const params = new URLSearchParams();
    if (dataInicio) params.append('dataInicio', dataInicio);
    if (dataFim) params.append('dataFim', dataFim);

    return await ApiService.get<MetricasManutencaoType>(`/manutencao/metricas?${params}`);
  }
}