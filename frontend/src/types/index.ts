// Tipos para autenticação
export interface User {
  id: number;
  nome: string;
  login: string;
  categoria: number;
  categoriaNome: string;
}

export interface Acao {
  ach_id: number,
  ach_descricao: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
}

export interface LoginCredentials {
  login: string;
  senha: string;
}

// Tipos para API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

// Tipos para Dispositivos
export interface Dispositivo extends Record<string, unknown> {
  dis_id: number;
  dis_descricao: string;
  dis_cliente: number | null;
  dis_nota_fiscal_atual: number | null;
  dis_com_manutencao: number;
  dis_info_manutencao: number | null;
  dis_data_cadastro: string;
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
  // Campos relacionados
  cliente_nome?: string;
  status_descricao?: string;
}

// Tipos para Dispositivos
export interface Dispositivo extends Record<string, unknown> {
  dis_id: number;
  dis_descricao: string;
  dis_cliente: number | null;
  dis_nota_fiscal_atual: number | null;
  dis_com_manutencao: number;
  dis_info_manutencao: number | null;
  dis_data_cadastro: string;
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
  // Campos relacionados
  cliente_nome?: string;
  status_descricao?: string;
}

// Tipos para Chamados
export interface Chamado extends Record<string, unknown> {
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
  // Campos relacionados
  tipo_chamado?: string;
  status_chamado?: string;
  cliente_nome?: string;
  produto_nome?: string;
  colaborador_nome?: string;
  acao_descricao?: string;
}

// Tipos para componentes
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  children: React.ReactNode;
  className?: string;
  title?: string; // Adicionar esta linha
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

// Tipos para filtros e paginação
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

// Tipos para erros
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

// Enums
export const StatusDispositivo = {
  ATIVO: 1,
  INATIVO: 2,
  MANUTENCAO: 3
} as const;

export type StatusDispositivo = typeof StatusDispositivo[keyof typeof StatusDispositivo];

export const StatusChamado = {
  ABERTO: 1,
  EM_ANDAMENTO: 2,
  FECHADO: 3
} as const;

export type StatusChamado = typeof StatusChamado[keyof typeof StatusChamado];

export const CategoriaColaborador = {
  TECNICO: 1,
  ENGENHEIRO: 2,
  SUPERVISOR: 3,
  ADMINISTRADOR: 4,
  GERENTE: 5
} as const;

export interface UsuarioOnline {
  id: number;
  nome: string;
  categoria: number;
  connectedAt: string;
}

export interface TransferirChamadoData {
  novoColaboradorId: number;
  novoColaboradorNome: string;
}

export type CategoriaColaborador = typeof CategoriaColaborador[keyof typeof CategoriaColaborador];