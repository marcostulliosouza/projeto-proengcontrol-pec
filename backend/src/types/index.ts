import { Request } from 'express';
import React from 'react';

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
  // Campos relacionados (JOINs)
  cliente_nome?: string;
  status_descricao?: string;
}

// Tipos para Chamados (mantendo nomes do banco)
export interface Chamado {
  cha_id: number;
  cha_tipo: number;
  cha_cliente: number;
  cha_produto: number;
  cha_DT: string;
  cha_descricao: string;
  cha_status: number;
  cha_data_hora_abertura: string;
  cha_data_hora_termino: string | null;
  cha_data_hora_atendimento: string | null;
  cha_acao: number | null;
  cha_operador: string;
  cha_visualizado: number;
  cha_plano: number;
  cha_local?: number;
  // Campos relacionados (JOINs)
  tipo_chamado?: string;
  status_chamado?: string;
  cliente_nome?: string;
  produto_nome?: string;
  local_chamado?: string;
  colaborador_nome?: string;
  acao_descricao?: string;
  atc_colaborador?: number;
  // Campos calculados
  duracao_total?: number;
  duracao_atendimento?: number;
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

// Tipos para Atendimentos Ativos
export interface AtendimentoAtivo {
  atc_id: number;
  atc_chamado: number;
  atc_colaborador: number;
  atc_data_hora_inicio: string;
  atc_data_hora_termino: string | null;
  // Campos calculados/relacionados
  tempo_decorrido?: number;
  colaborador_nome?: string;
  chamado_descricao?: string;
  cliente_nome?: string;
  cha_DT?: string;
  tipo_chamado?: string;
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

// Tipos para componentes UI
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  shadow?: boolean;
}

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

// Tipos para navegação
export interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  path: string;
  requiredCategory?: number[];
}

// Tipos para filtros e paginação (Frontend)
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface FilterState {
  search: string;
  status?: number;
  categoria?: number;
  cliente?: number;
  dataInicio?: string;
  dataFim?: string;
}

// Tipos para autenticação (Frontend)
export interface LoginCredentials {
  login: string;
  senha: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
}

// Tipos para erros
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
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
  ADMINISTRADOR = 4,
  GERENTE = 5
}

// Tipos para tabelas auxiliares
export interface TipoChamado {
  tch_id: number;
  tch_descricao: string;
}

export interface StatusChamadoType {
  stc_id: number;
  stc_descricao: string;
}

export interface Cliente {
  cli_id: number;
  cli_nome: string;
  cli_ativo?: number;
}

export interface Produto {
  pro_id: number;
  pro_nome: string;
  pro_cliente?: number;
  pro_ativo?: number;
}

export interface Acao {
  ach_id: number;
  ach_descricao: string;
  ach_detrator?: number;
}

export interface Colaborador {
  col_id: number;
  col_nome: string;
  col_login: string;
  col_categoria: number;
  col_ativo: number;
}

export interface LocalChamado {
  loc_id: number;
  loc_nome: string;
  loc_descricao?: string;
}

// Tipos para indicadores
export interface Indicador {
  ind_id: number;
  ind_data: string;
  ind_minutos_diario: number;
  ind_atendimento_diario: number;
  ind_atraso_diario: number;
  ind_minutos_semanal: number;
  ind_atendimento_semanal: number;
  ind_atraso_semanal: number;
  ind_minutos_mensal: number;
  ind_atendimento_mensal: number;
  ind_atraso_mensal: number;
}

// Tipos para real-time (WebSocket)
export interface Timer {
  chamadoId: number;
  seconds: number;
  startedAt: string;
  startedBy: string;
  userId: number;
  userName: string;
}

export interface ChamadoLock {
  chamadoId: number;
  lockedBy: {
    userId: number;
    userName: string;
  };
}

// Tipos para formulários
export interface ChamadoFormData {
  cha_tipo: number;
  cha_cliente: number;
  cha_produto?: number;
  cha_DT: string;
  cha_descricao: string;
  cha_local?: number;
}

export interface DispositivoFormData {
  dis_descricao: string;
  dis_cliente?: number;
  dis_codigo_sap?: string;
  dis_status: number;
  dis_observacao?: string;
  dis_ciclos_de_vida: number;
  dis_local?: string;
}

// Tipos para relatórios
export interface RelatorioParams {
  dataInicio: string;
  dataFim: string;
  cliente?: number;
  produto?: string;
  operador?: string;
  status?: number;
  tipo?: number;
  dentroPlano?: boolean;
  foraPlano?: boolean;
  comDetrator?: boolean;
  semDetrator?: boolean;
}

export interface EstatisticaAtendimento {
  total_atendimentos: number;
  tempo_medio_segundos: number;
  tempo_minimo_segundos: number;
  tempo_maximo_segundos: number;
  colaboradores_distintos: number;
}

export interface ActiveUser {
  id: number;
  nome: string;
  categoria: string;
  socketId?: string;
  connectedAt?: Date;
}

export interface RelatorioFiltros {
  dataInicio?: string;
  dataFim?: string;
  cliente?: string;
  status?: string;
  tipo?: string;
  operador?: string;
  tecnico?: string;
}

export interface ChamadoRelatorio {
  id: number;
  cliente: string;
  tipo: string;
  status: string;
  operador: string;
  dataAbertura: string;
  dataAtendimento?: string;
  dataTermino?: string;
  tempoAtendimento: string;
  descricao: string;
  produto?: string;
  acao?: string;
}

export interface DispositivoRelatorio {
  id: number;
  dispositivo: string;
  cliente: string;
  status: string;
  ultimaManutencao?: string;
  proximaManutencao?: string;
  localizacao?: string;
  modelo?: string;
  numeroSerie?: string;
}

export interface ManutencaoRelatorio {
  id: number;
  dispositivo: string;
  cliente: string;
  tipo: 'Preventiva' | 'Corretiva' | 'Preditiva';
  dataAgendada: string;
  dataRealizada?: string;
  tecnico: string;
  status: 'Agendado' | 'Em Andamento' | 'Concluído' | 'Cancelado' | 'Pendente';
  observacoes?: string;
  custos?: number;
}

export interface IndicadorProducao {
  periodo: string;
  chamadosAbertos: number;
  chamadosFechados: number;
  tempoMedioAtendimento: string;
  satisfacaoCliente: string;
  sla: number;
  produtividade: number;
}

export interface RelatorioMetadados {
  tipo: string;
  dataGeracao: string;
  usuario: string;
  filtros: RelatorioFiltros;
  totalRegistros: number;
}

export interface RelatorioResponse<T> {
  dados: T[];
  metadados: RelatorioMetadados;
  success: boolean;
}

export type TipoRelatorio = 
  | 'chamados-periodo'
  | 'dispositivos-status' 
  | 'manutencoes-preventivas'
  | 'producao-indicadores'
  | 'sla-atendimento'
  | 'custos-operacionais';

export interface ConfiguracaoRelatorio {
  id: TipoRelatorio;
  nome: string;
  descricao: string;
  permissao: string;
  formatosExport: ('pdf' | 'excel' | 'csv')[];
  filtrosDisponiveis: string[];
  agendamento?: boolean;
}

// Interfaces para gráficos e dashboards
export interface DadosGrafico {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string[];
  }[];
}

export interface ResumoEstatisticas {
  totalChamados: number;
  chamadosAbertos: number;
  chamadosFechados: number;
  tempoMedioResposta: number;
  satisfacaoMedia: number;
  slaAtendido: number;
}

// Para exportação de relatórios
export interface OpcoesExportacao {
  formato: 'pdf' | 'excel' | 'csv';
  incluirGraficos?: boolean;
  incluirResumo?: boolean;
  orientacao?: 'portrait' | 'landscape';
  titulo?: string;
}
