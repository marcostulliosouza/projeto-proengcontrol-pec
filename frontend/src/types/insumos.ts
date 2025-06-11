// Tipos e Serviços Compra

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
  categoria_verba?: string;
  colaborador_abertura_nome?: string;
  colaborador_aprovacao_nome?: string;
  fornecedor_nome?: string;
  valor_total?: number;
}

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
  categoria_nome?: string;
  valor_total_estoque?: number;
  status_analise?: string;
  solicitacoes_pendentes?: number;
}

export interface Orcamento {
  orc_id: number;
  cav_id: number;
  orc_centro_custo: string;
  orc_ano: number;
  orc_orcado: number;
  orc_gasto: number;
  orc_disponivel?: number;
  orc_percentual_usado?: number;
  orc_status?: 'NO_LIMITE' | 'PROXIMO_LIMITE' | 'LIMITE_EXCEDIDO';
  categoria_verba?: string;
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
    insumo_nome?: string;
    solicitante_nome?: string;
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