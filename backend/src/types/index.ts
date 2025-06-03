import { Request } from 'express';

// Tipos básicos da aplicação
export interface User {
  col_id: number;
  col_nome: string;
  col_categoria: number;
  col_ativo: number;
  col_senha: string;
  col_login: string;
}

export interface AuthUser {
  id: number;
  nome: string;
  login: string;
  categoria: number;
}

// Extensão do Request do Express para incluir user autenticado
export interface AuthRequest extends Request {
  user?: AuthUser;
}

// Tipos para Dispositivos
export interface Dispositivo {
  dis_id: number;
  dis_descricao: string;
  dis_cliente: number | null;
  dis_nota_fiscal_atual: number | null;
  dis_com_manutencao: number;
  dis_info_manutencao: number | null;
  dis_data_cadastro: Date;
  dis_codigo_sap: string | null;
  dis_com_imagem: number;
  dis_status: number;
  dis_observacao: string | null;
  dis_ciclos_de_vida: number;
  dis_ciclos_executados: number;
  dis_doc_enviado: number;
  dis_extensao_imagem: string | null;
  dis_posicao_estoque: string | null;
  dis_local: string | null;
}

// Tipos para Chamados
export interface Chamado {
  cha_id: number;
  cha_tipo: number;
  cha_cliente: number;
  cha_produto: number;
  cha_DT: string;
  cha_descricao: string;
  cha_status: number;
  cha_data_hora_abertura: Date;
  cha_data_hora_termino: Date | null;
  cha_data_hora_atendimento: Date | null;
  cha_acao: number | null;
  cha_operador: string;
  cha_visualizado: number;
  cha_plano: number;
}

// Tipos para Manutenção
export interface LogManutencao {
  lmd_id: number;
  lmd_dispositivo: number;
  lmd_data_hora_inicio: Date;
  lmd_data_hora_fim: Date | null;
  lmd_tipo_manutencao: 'PREVENTIVA' | 'CORRETIVA';
  lmd_ciclos_totais_executados: number;
  lmd_data_hora_ultima_manutencao: Date | null;
  lmd_tipo_intervalo_manutencao: 'DIA' | 'PLACA';
  lmd_intervalo_dias: number;
  lmd_intervalo_placas: number;
  lmd_placas_executadas: number;
  lmd_observacao: string | null;
  lmd_colaborador: number;
  lmd_status: number;
}

// Tipos para API Response
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

// Tipos para filtros e paginação
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface FilterParams {
  search?: string;
  status?: number;
  cliente?: number;
  tipo?: number;
  dataInicio?: string;
  dataFim?: string;
}

// Tipos para Dashboard
export interface DashboardStats {
  totalDispositivos: number;
  dispositivosAtivos: number;
  chamadosAbertos: number;
  manutencoesPendentes: number;
  indicadorMensal: {
    minutos: number;
    atendimentos: number;
    atrasos: number;
  };
}

// Enum para Status de Dispositivos
export enum StatusDispositivo {
  ATIVO = 1,
  INATIVO = 2,
  MANUTENCAO = 3
}

// Enum para Status de Chamados
export enum StatusChamado {
  ABERTO = 1,
  EM_ANDAMENTO = 2,
  FECHADO = 3
}

// Enum para Categorias de Colaboradores
export enum CategoriaColaborador {
  TECNICO = 1,
  ENGENHEIRO = 2,
  SUPERVISOR = 3,
  ADMINISTRADOR = 4
}