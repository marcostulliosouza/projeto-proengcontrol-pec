/* eslint-disable @typescript-eslint/no-explicit-any */
// services/chamadoService.ts - OTIMIZADO
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
  ach_detrator: number;
}

export interface Detrator {
  dtr_id: number;
  dtr_descricao: string;
  dtr_tipo: number;
  dtr_indicador: number;
  dtr_ativo: number;
}

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

// Cache para dados auxiliares
class CacheManager {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  set(key: string, data: any, ttl: number = 300000) { // 5 minutos default
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }
  
  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  clear() {
    this.cache.clear();
  }
}

const cache = new CacheManager();

export class ChamadoService {
  // Finalizar chamado COM descrição do atendimento
  static async finalizarChamado(id: number, detratorId: number, descricaoAtendimento: string): Promise<void> {
    // Validações no frontend também
    if (!descricaoAtendimento?.trim()) {
      throw new Error('Descrição do atendimento é obrigatória');
    }
    
    if (descricaoAtendimento.trim().length > 250) {
      throw new Error('Descrição deve ter no máximo 250 caracteres');
    }
    
    return await ApiService.put<void>(`/chamados/${id}/finalizar`, { 
      detrator_id: detratorId,
      descricao_atendimento: descricaoAtendimento.trim().toUpperCase()
    });
  }

  // Buscar detratores com cache
  static async getDetratoresByTipo(tipoId: number): Promise<Detrator[]> {
    const cacheKey = `detratores_${tipoId}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      console.log('📋 Detratores servidos do cache');
      return cached;
    }
    
    try {
      const detratores = await ApiService.get<Detrator[]>(`/chamados/detratores/${tipoId}`);
      cache.set(cacheKey, detratores, 600000); // 10 minutos
      return detratores;
    } catch (error) {
      console.error('Erro ao buscar detratores:', error);
      throw error;
    }
  }

  // Buscar ações com cache
  static async getAcoesByDetrator(detratorId: number): Promise<Acao[]> {
    const cacheKey = `acoes_${detratorId}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const acoes = await ApiService.get<Acao[]>(`/chamados/acoes/detrator/${detratorId}`);
    cache.set(cacheKey, acoes, 300000); // 5 minutos
    return acoes;
  }

  // Buscar histórico de atendimentos
  static async getHistoricoAtendimentos(id: number): Promise<AtendimentoHistorico[]> {
    return await ApiService.get<AtendimentoHistorico[]>(`/chamados/${id}/historico`);
  }

  // Relatório de detratores
  static async getRelatorioDetratores(dataInicio: string, dataFim: string): Promise<any[]> {
    const params = new URLSearchParams({
      dataInicio,
      dataFim
    });
    return await ApiService.get<any[]>(`/chamados/relatorio/detratores?${params}`);
  }

  // Buscar chamados com filtros e paginação OTIMIZADO
  static async getChamados(
    page: number = 1,
    limit: number = 10,
    filters: Partial<FilterState> = {}
  ): Promise<ChamadosResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    // Apenas adicionar filtros não vazios
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    try {
      return await ApiService.get<ChamadosResponse>(`/chamados?${params}`);
    } catch (error) {
      console.error('Erro ao buscar chamados:', error);
      throw error;
    }
  }

  // Buscar chamado por ID com cache
  static async getChamado(id: number): Promise<Chamado> {
    const cacheKey = `chamado_${id}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const chamado = await ApiService.get<Chamado>(`/chamados/${id}`);
    cache.set(cacheKey, chamado, 30000); // 30 segundos para chamados individuais
    return chamado;
  }

  // Criar chamado
  static async createChamado(chamado: Partial<Chamado>): Promise<{ id: number }> {
    const result = await ApiService.post<{ id: number }>('/chamados', chamado);
    
    // Limpar cache relacionado
    cache.clear();
    
    return result;
  }

  // Atualizar chamado
  static async updateChamado(id: number, chamado: Partial<Chamado>): Promise<void> {
    await ApiService.put<void>(`/chamados/${id}`, chamado);
    
    // Limpar cache do chamado específico
    cache.clear();
  }

  // Iniciar atendimento
  static async iniciarAtendimento(id: number): Promise<void> {
    return await ApiService.put<void>(`/chamados/${id}/iniciar`);
  }

  // Transferir chamado
  static async transferirChamado(id: number, novoUsuarioId: number): Promise<void> {
    if (!novoUsuarioId) {
      throw new Error('Usuário de destino é obrigatório');
    }
    
    return await ApiService.put<void>(`/chamados/${id}/transferir`, { 
      novoUsuarioId 
    });
  }

  // Buscar usuários disponíveis com cache
  static async getUsuariosDisponiveis(): Promise<any[]> {
    try {
      console.log('🔍 Service: Buscando usuários disponíveis...');
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
      const response = await fetch(`${apiUrl}/chamados/usuarios-disponiveis`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Erro ao buscar usuários disponíveis');
      }
      
      console.log('✅ Service: Usuários disponíveis obtidos:', data.data?.length || 0);
      return data.data || [];
    } catch (error) {
      console.error('❌ Service: Erro ao buscar usuários disponíveis:', error);
      throw new Error('Erro ao carregar usuários disponíveis. Verifique sua conexão e tente novamente.');
    }
  }

  // Buscar apenas usuários online e disponíveis
  static async getUsuariosOnlineDisponiveis(): Promise<any[]> {
    try {
      console.log('🔍 Service: Buscando usuários online e disponíveis...');
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
      const response = await fetch(`${apiUrl}/chamados/usuarios-online-disponiveis`);
      
      if (!response.ok) {
        // Fallback para rota antiga se nova não funcionar
        console.log('⚠️ Tentando rota fallback...');
        return await this.getUsuariosDisponiveis();
      }
      
      const data = await response.json();
      
      if (!data.success) {
        // Fallback para rota antiga
        console.log('⚠️ Usando fallback para todos os usuários...');
        return await this.getUsuariosDisponiveis();
      }
      
      console.log('✅ Service: Usuários online e disponíveis obtidos:', data.data?.length || 0);
      return data.data || [];
    } catch (error) {
      console.error('❌ Service: Erro ao buscar usuários online, usando fallback:', error);
      // Fallback para usuários disponíveis normais
      try {
        return await this.getUsuariosDisponiveis();
      } catch (fallbackError) {
        console.error('❌ Service: Fallback também falhou:', fallbackError);
        throw new Error('Erro ao carregar usuários. Verifique sua conexão.');
      }
    }
  }

  // Endpoints auxiliares com cache
  static async getTipos(): Promise<TipoChamado[]> {
    const cacheKey = 'tipos_chamado';
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const tipos = await ApiService.get<TipoChamado[]>('/chamados/tipos');
    cache.set(cacheKey, tipos, 1800000); // 30 minutos - dados estáticos
    return tipos;
  }

  static async getStatus(): Promise<StatusChamado[]> {
    const cacheKey = 'status_chamado';
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const status = await ApiService.get<StatusChamado[]>('/chamados/status');
    cache.set(cacheKey, status, 1800000); // 30 minutos
    return status;
  }

  static async getClientes(): Promise<Cliente[]> {
    const cacheKey = 'clientes';
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const clientes = await ApiService.get<Cliente[]>('/dispositivos/clientes');
    cache.set(cacheKey, clientes, 900000); // 15 minutos
    return clientes;
  }

  static async getProdutosByCliente(clienteId: number): Promise<Produto[]> {
    const cacheKey = `produtos_${clienteId}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const produtos = await ApiService.get<Produto[]>(`/chamados/produtos/${clienteId}`);
    cache.set(cacheKey, produtos, 900000); // 15 minutos
    return produtos;
  }

  static async getAcoes(): Promise<Acao[]> {
    const cacheKey = 'acoes_chamado';
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const acoes = await ApiService.get<Acao[]>('/chamados/acoes');
    cache.set(cacheKey, acoes, 900000); // 15 minutos
    return acoes;
  }

  // Método para limpar cache manualmente
  static clearCache(): void {
    cache.clear();
    console.log('📋 Cache do ChamadoService limpo');
  }
}