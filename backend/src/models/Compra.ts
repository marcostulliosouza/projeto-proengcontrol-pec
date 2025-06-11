import { executeQuery, pool } from '../config/database';
import { ResultSetHeader } from 'mysql2';

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

export interface ItemCompra {
  itc_id: number;
  com_id: number;
  ins_id: number;
  itc_quantidade: number;
  itc_valor_unitario: number;
  itc_valor_total: number;
  // Campos relacionados
  insumo_nome?: string;
  insumo_cod_sap?: string;
}

export interface CategoriaVerba {
  cav_id: number;
  cav_nome: string;
  cav_descricao: string | null;
}

export class CompraModel {
  // Listar compras com filtros e paginação
  static async findAll(filtros: {
    search?: string;
    status?: string;
    categoria?: number;
    dataInicio?: string;
    dataFim?: string;
    centroCusto?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ compras: Compra[]; total: number }> {
    try {
      const {
        search,
        status,
        categoria,
        dataInicio,
        dataFim,
        centroCusto,
        page = 1,
        limit = 20
      } = filtros;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      // Filtros
      if (search) {
        whereClause += ` AND (c.com_rc LIKE ? OR c.com_descricao LIKE ? OR c.com_cod_sap LIKE ? OR f.for_nome LIKE ?)`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      if (status) {
        whereClause += ` AND c.com_status = ?`;
        params.push(status);
      }

      if (categoria) {
        whereClause += ` AND c.cav_id = ?`;
        params.push(categoria);
      }

      if (dataInicio) {
        whereClause += ` AND DATE(c.com_data_abertura) >= ?`;
        params.push(dataInicio);
      }

      if (dataFim) {
        whereClause += ` AND DATE(c.com_data_abertura) <= ?`;
        params.push(dataFim);
      }

      if (centroCusto) {
        whereClause += ` AND c.com_centro_custo = ?`;
        params.push(centroCusto);
      }

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM compras c
        LEFT JOIN categorias_verbas cv ON c.cav_id = cv.cav_id
        LEFT JOIN fornecedores f ON c.for_id = f.for_id
        ${whereClause}
      `;

      // Query para buscar dados
      const dataQuery = `
        SELECT 
          c.*,
          cv.cav_nome as categoria_verba,
          ca.col_nome as colaborador_abertura_nome,
          cp.col_nome as colaborador_aprovacao_nome,
          f.for_nome as fornecedor_nome,
          (c.com_qtd * c.com_valor_unit) as valor_total
        FROM compras c
        LEFT JOIN categorias_verbas cv ON c.cav_id = cv.cav_id
        LEFT JOIN colaboradores ca ON c.com_colaborador_abertura = ca.col_id
        LEFT JOIN colaboradores cp ON c.com_colaborador_aprovacao = cp.col_id
        LEFT JOIN fornecedores f ON c.for_id = f.for_id
        ${whereClause}
        ORDER BY c.com_data_abertura DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const [countResult, compras] = await Promise.all([
        executeQuery(countQuery, params),
        executeQuery(dataQuery, params)
      ]);

      return {
        compras: Array.isArray(compras) ? compras : [],
        total: Array.isArray(countResult) && countResult[0] ? countResult[0].total : 0
      };
    } catch (error) {
      console.error('Erro ao buscar compras:', error);
      throw error;
    }
  }

  // Buscar compra por ID
  static async findById(id: number): Promise<Compra | null> {
    try {
      const query = `
        SELECT 
          c.*,
          cv.cav_nome as categoria_verba,
          ca.col_nome as colaborador_abertura_nome,
          cp.col_nome as colaborador_aprovacao_nome,
          f.for_nome as fornecedor_nome,
          (c.com_qtd * c.com_valor_unit) as valor_total
        FROM compras c
        LEFT JOIN categorias_verbas cv ON c.cav_id = cv.cav_id
        LEFT JOIN colaboradores ca ON c.com_colaborador_abertura = ca.col_id
        LEFT JOIN colaboradores cp ON c.com_colaborador_aprovacao = cp.col_id
        LEFT JOIN fornecedores f ON c.for_id = f.for_id
        WHERE c.com_id = ?
      `;

      const results = await executeQuery(query, [id]);
      return Array.isArray(results) && results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Erro ao buscar compra:', error);
      throw error;
    }
  }

  // Criar nova compra
  static async create(compra: Partial<Compra>): Promise<number> {
    try {
      const query = `
        INSERT INTO compras (
          cav_id, com_data_abertura, com_rc, com_cod_sap, com_descricao,
          com_qtd, com_valor_unit, com_utilizacao, com_centro_custo,
          com_conta_razao, com_colaborador_abertura, for_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        compra.cav_id,
        compra.com_data_abertura || new Date().toISOString().split('T')[0],
        compra.com_rc,
        compra.com_cod_sap || null,
        compra.com_descricao,
        compra.com_qtd || 1,
        compra.com_valor_unit || 0,
        compra.com_utilizacao || null,
        compra.com_centro_custo,
        compra.com_conta_razao,
        compra.com_colaborador_abertura || null,
        compra.for_id || null
      ];

      const result = await executeQuery(query, params);
      return (result as ResultSetHeader).insertId;
    } catch (error) {
      console.error('Erro ao criar compra:', error);
      throw error;
    }
  }

  // Atualizar compra
  static async update(id: number, compra: Partial<Compra>): Promise<boolean> {
    try {
      const query = `
        UPDATE compras SET
          cav_id = ?,
          com_rc = ?,
          com_cod_sap = ?,
          com_descricao = ?,
          com_qtd = ?,
          com_valor_unit = ?,
          com_utilizacao = ?,
          com_centro_custo = ?,
          com_conta_razao = ?,
          for_id = ?,
          com_obs = ?
        WHERE com_id = ?
      `;

      const params = [
        compra.cav_id,
        compra.com_rc,
        compra.com_cod_sap || null,
        compra.com_descricao,
        compra.com_qtd || 1,
        compra.com_valor_unit || 0,
        compra.com_utilizacao || null,
        compra.com_centro_custo,
        compra.com_conta_razao,
        compra.for_id || null,
        compra.com_obs || null,
        id
      ];

      const result = await executeQuery(query, params);
      return (result as ResultSetHeader).affectedRows > 0;
    } catch (error) {
      console.error('Erro ao atualizar compra:', error);
      throw error;
    }
  }

  // Aprovar compra
  static async aprovar(id: number, aprovadorId: number, fornecedorId?: number): Promise<boolean> {
    try {
      const query = `
        UPDATE compras SET
          com_status = 'APROVADA',
          com_data_aprovacao = NOW(),
          com_colaborador_aprovacao = ?,
          for_id = COALESCE(?, for_id)
        WHERE com_id = ? AND com_status = 'PENDENTE'
      `;

      const result = await executeQuery(query, [aprovadorId, fornecedorId, id]);
      return (result as ResultSetHeader).affectedRows > 0;
    } catch (error) {
      console.error('Erro ao aprovar compra:', error);
      throw error;
    }
  }

  // Marcar como recebida e atualizar estoque
  static async receberCompra(id: number, dados: {
    notaFiscal: string;
    dataRecebimento?: string;
    observacoes?: string;
    colaboradorId: number;
  }): Promise<boolean> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 1. Atualizar compra
      const updateCompraQuery = `
        UPDATE compras SET
          com_status = 'RECEBIDA',
          com_data_recebimento = ?,
          com_nota_fiscal = ?,
          com_obs = CONCAT(COALESCE(com_obs, ''), ' - Recebido: ', ?)
        WHERE com_id = ? AND com_status = 'APROVADA'
      `;

      const dataRecebimento = dados.dataRecebimento || new Date().toISOString().split('T')[0];
      await connection.execute(updateCompraQuery, [
        dataRecebimento,
        dados.notaFiscal,
        dados.observacoes || '',
        id
      ]);

      // 2. Buscar dados da compra
      const [compraData] = await connection.execute(
        'SELECT com_cod_sap, com_qtd FROM compras WHERE com_id = ?',
        [id]
      ) as any;

      if (compraData && compraData.length > 0 && compraData[0].com_cod_sap) {
        // 3. Buscar insumo pelo código SAP
        const [insumoData] = await connection.execute(
          'SELECT ins_id FROM insumos WHERE ins_cod_sap = ? AND ins_ativo = 1',
          [compraData[0].com_cod_sap]
        ) as any;

        if (insumoData && insumoData.length > 0) {
          // 4. Dar entrada no estoque
          const insumoId = insumoData[0].ins_id;
          const quantidade = compraData[0].com_qtd;

          // Buscar estoque atual
          const [estoqueAtual] = await connection.execute(
            'SELECT ins_qtd FROM insumos WHERE ins_id = ?',
            [insumoId]
          ) as any;

          const estoqueAnterior = estoqueAtual[0].ins_qtd;
          const novoEstoque = estoqueAnterior + quantidade;

          // Inserir movimentação
          await connection.execute(`
            INSERT INTO movimentacoes_estoque (
              ins_id, mov_tipo, mov_quantidade, mov_quantidade_anterior,
              mov_quantidade_atual, mov_motivo, mov_observacao, mov_colaborador,
              mov_documento
            ) VALUES (?, 'ENTRADA', ?, ?, ?, ?, ?, ?, ?)
          `, [
            insumoId,
            quantidade,
            estoqueAnterior,
            novoEstoque,
            'RECEBIMENTO DE COMPRA',
            `Recebimento da NF: ${dados.notaFiscal}`,
            dados.colaboradorId,
            dados.notaFiscal
          ]);

          // Atualizar estoque
          await connection.execute(
            'UPDATE insumos SET ins_qtd = ? WHERE ins_id = ?',
            [novoEstoque, insumoId]
          );
        }
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('Erro ao receber compra:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Cancelar compra
  static async cancelar(id: number): Promise<boolean> {
    try {
      const query = `
        UPDATE compras SET
          com_status = 'CANCELADA'
        WHERE com_id = ? AND com_status IN ('PENDENTE', 'APROVADA')
      `;

      const result = await executeQuery(query, [id]);
      return (result as ResultSetHeader).affectedRows > 0;
    } catch (error) {
      console.error('Erro ao cancelar compra:', error);
      throw error;
    }
  }

  // Buscar categorias de verba
  static async getCategoriasVerba(): Promise<CategoriaVerba[]> {
    try {
      const query = 'SELECT * FROM categorias_verbas ORDER BY cav_nome';
      const results = await executeQuery(query);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Erro ao buscar categorias de verba:', error);
      throw error;
    }
  }

  // Relatório de compras por período
  static async getRelatorioCompras(filtros: {
    dataInicio: string;
    dataFim: string;
    categoria?: number;
    status?: string;
    centroCusto?: string;
  }): Promise<{
    compras: Compra[];
    resumo: {
      totalCompras: number;
      valorTotal: number;
      comprasPendentes: number;
      comprasAprovadas: number;
      comprasRecebidas: number;
      comprasCanceladas: number;
    };
  }> {
    try {
      let whereClause = 'WHERE DATE(c.com_data_abertura) BETWEEN ? AND ?';
      const params: any[] = [filtros.dataInicio, filtros.dataFim];

      if (filtros.categoria) {
        whereClause += ' AND c.cav_id = ?';
        params.push(filtros.categoria);
      }

      if (filtros.status) {
        whereClause += ' AND c.com_status = ?';
        params.push(filtros.status);
      }

      if (filtros.centroCusto) {
        whereClause += ' AND c.com_centro_custo = ?';
        params.push(filtros.centroCusto);
      }

      // Buscar compras
      const comprasQuery = `
        SELECT 
          c.*,
          cv.cav_nome as categoria_verba,
          ca.col_nome as colaborador_abertura_nome,
          cp.col_nome as colaborador_aprovacao_nome,
          f.for_nome as fornecedor_nome,
          (c.com_qtd * c.com_valor_unit) as valor_total
        FROM compras c
        LEFT JOIN categorias_verbas cv ON c.cav_id = cv.cav_id
        LEFT JOIN colaboradores ca ON c.com_colaborador_abertura = ca.col_id
        LEFT JOIN colaboradores cp ON c.com_colaborador_aprovacao = cp.col_id
        LEFT JOIN fornecedores f ON c.for_id = f.for_id
        ${whereClause}
        ORDER BY c.com_data_abertura DESC
      `;

      // Buscar resumo
      const resumoQuery = `
        SELECT 
          COUNT(*) as total_compras,
          SUM(com_qtd * com_valor_unit) as valor_total,
          SUM(CASE WHEN com_status = 'PENDENTE' THEN 1 ELSE 0 END) as compras_pendentes,
          SUM(CASE WHEN com_status = 'APROVADA' THEN 1 ELSE 0 END) as compras_aprovadas,
          SUM(CASE WHEN com_status = 'RECEBIDA' THEN 1 ELSE 0 END) as compras_recebidas,
          SUM(CASE WHEN com_status = 'CANCELADA' THEN 1 ELSE 0 END) as compras_canceladas
        FROM compras c
        ${whereClause}
      `;

      const [compras, resumoResult] = await Promise.all([
        executeQuery(comprasQuery, params),
        executeQuery(resumoQuery, params)
      ]);

      const resumo = Array.isArray(resumoResult) && resumoResult[0] ? resumoResult[0] : {};

      return {
        compras: Array.isArray(compras) ? compras : [],
        resumo: {
          totalCompras: resumo.total_compras || 0,
          valorTotal: parseFloat(resumo.valor_total) || 0,
          comprasPendentes: resumo.compras_pendentes || 0,
          comprasAprovadas: resumo.compras_aprovadas || 0,
          comprasRecebidas: resumo.compras_recebidas || 0,
          comprasCanceladas: resumo.compras_canceladas || 0
        }
      };
    } catch (error) {
      console.error('Erro ao gerar relatório de compras:', error);
      throw error;
    }
  }
}

// Model para Solicitações de Compra
export class SolicitacaoCompraModel {
  // Listar solicitações
  static async findAll(filtros: {
    status?: string;
    urgencia?: string;
    solicitante?: number;
    dataInicio?: string;
    dataFim?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ solicitacoes: SolicitacaoCompra[]; total: number }> {
    try {
      const { status, urgencia, solicitante, dataInicio, dataFim, page = 1, limit = 20 } = filtros;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (status) {
        whereClause += ' AND s.sol_status = ?';
        params.push(status);
      }

      if (urgencia) {
        whereClause += ' AND s.sol_urgencia = ?';
        params.push(urgencia);
      }

      if (solicitante) {
        whereClause += ' AND s.sol_colaborador_solicitante = ?';
        params.push(solicitante);
      }

      if (dataInicio) {
        whereClause += ' AND DATE(s.sol_data_solicitacao) >= ?';
        params.push(dataInicio);
      }

      if (dataFim) {
        whereClause += ' AND DATE(s.sol_data_solicitacao) <= ?';
        params.push(dataFim);
      }

      const countQuery = `
        SELECT COUNT(*) as total
        FROM solicitacoes_compra s
        ${whereClause}
      `;

      const dataQuery = `
        SELECT 
          s.*,
          i.ins_nome as insumo_nome,
          i.ins_cod_sap as insumo_cod_sap,
          i.ins_qtd as estoque_atual,
          i.ins_estoque_minimo,
          c.cai_nome as categoria_nome,
          cs.col_nome as solicitante_nome,
          ca.col_nome as aprovador_nome
        FROM solicitacoes_compra s
        LEFT JOIN insumos i ON s.ins_id = i.ins_id
        LEFT JOIN categorias_insumos c ON i.cai_id = c.cai_id
        LEFT JOIN colaboradores cs ON s.sol_colaborador_solicitante = cs.col_id
        LEFT JOIN colaboradores ca ON s.sol_colaborador_aprovador = ca.col_id
        ${whereClause}
        ORDER BY 
          CASE s.sol_urgencia 
            WHEN 'CRITICA' THEN 1 
            WHEN 'ALTA' THEN 2 
            WHEN 'MEDIA' THEN 3 
            ELSE 4 
          END,
          s.sol_data_solicitacao DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const [countResult, solicitacoes] = await Promise.all([
        executeQuery(countQuery, params),
        executeQuery(dataQuery, params)
      ]);

      return {
        solicitacoes: Array.isArray(solicitacoes) ? solicitacoes : [],
        total: Array.isArray(countResult) && countResult[0] ? countResult[0].total : 0
      };
    } catch (error) {
      console.error('Erro ao buscar solicitações:', error);
      throw error;
    }
  }

  // Criar solicitação
  static async create(solicitacao: Partial<SolicitacaoCompra>): Promise<number> {
    try {
      const query = `
        INSERT INTO solicitacoes_compra (
          ins_id, sol_quantidade, sol_justificativa, sol_urgencia,
          sol_colaborador_solicitante
        ) VALUES (?, ?, ?, ?, ?)
      `;

      const result = await executeQuery(query, [
        solicitacao.ins_id,
        solicitacao.sol_quantidade,
        solicitacao.sol_justificativa || null,
        solicitacao.sol_urgencia || 'MEDIA',
        solicitacao.sol_colaborador_solicitante
      ]);

      return (result as ResultSetHeader).insertId;
    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
      throw error;
    }
  }

  // Aprovar/Rejeitar solicitação
  static async processarSolicitacao(
    id: number, 
    aprovadorId: number, 
    status: 'APROVADA' | 'REJEITADA',
    observacao?: string
  ): Promise<boolean> {
    try {
      const query = `
        UPDATE solicitacoes_compra SET
          sol_status = ?,
          sol_colaborador_aprovador = ?,
          sol_data_aprovacao = NOW(),
          sol_observacao_aprovador = ?
        WHERE sol_id = ? AND sol_status = 'PENDENTE'
      `;

      const result = await executeQuery(query, [status, aprovadorId, observacao || null, id]);
      return (result as ResultSetHeader).affectedRows > 0;
    } catch (error) {
      console.error('Erro ao processar solicitação:', error);
      throw error;
    }
  }
}

// Model para Fornecedores
export class FornecedorModel {
  // Listar fornecedores
  static async findAll(filtros: {
    search?: string;
    ativo?: boolean;
  } = {}): Promise<Fornecedor[]> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filtros.search) {
        whereClause += ' AND (for_nome LIKE ? OR for_cnpj LIKE ?)';
        const searchTerm = `%${filtros.search}%`;
        params.push(searchTerm, searchTerm);
      }

      if (filtros.ativo !== undefined) {
        whereClause += ' AND for_ativo = ?';
        params.push(filtros.ativo ? 1 : 0);
      }

      const query = `
        SELECT * FROM fornecedores 
        ${whereClause}
        ORDER BY for_nome
      `;

      const results = await executeQuery(query, params);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
      throw error;
    }
  }

  // Criar fornecedor
  static async create(fornecedor: Partial<Fornecedor>): Promise<number> {
    try {
      const query = `
        INSERT INTO fornecedores (
          for_nome, for_cnpj, for_contato, for_telefone, for_email, for_endereco
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;

      const result = await executeQuery(query, [
        fornecedor.for_nome,
        fornecedor.for_cnpj || null,
        fornecedor.for_contato || null,
        fornecedor.for_telefone || null,
        fornecedor.for_email || null,
        fornecedor.for_endereco || null
      ]);

      return (result as ResultSetHeader).insertId;
    } catch (error) {
      console.error('Erro ao criar fornecedor:', error);
      throw error;
    }
  }

  // Atualizar fornecedor
  static async update(id: number, fornecedor: Partial<Fornecedor>): Promise<boolean> {
    try {
      const query = `
        UPDATE fornecedores SET
          for_nome = ?,
          for_cnpj = ?,
          for_contato = ?,
          for_telefone = ?,
          for_email = ?,
          for_endereco = ?
        WHERE for_id = ?
      `;

      const result = await executeQuery(query, [
        fornecedor.for_nome,
        fornecedor.for_cnpj || null,
        fornecedor.for_contato || null,
        fornecedor.for_telefone || null,
        fornecedor.for_email || null,
        fornecedor.for_endereco || null,
        id
      ]);

      return (result as ResultSetHeader).affectedRows > 0;
    } catch (error) {
      console.error('Erro ao atualizar fornecedor:', error);
      throw error;
    }
  }

  // Desativar fornecedor
  static async desativar(id: number): Promise<boolean> {
    try {
      const query = 'UPDATE fornecedores SET for_ativo = 0 WHERE for_id = ?';
      const result = await executeQuery(query, [id]);
      return (result as ResultSetHeader).affectedRows > 0;
    } catch (error) {
      console.error('Erro ao desativar fornecedor:', error);
      throw error;
    }
  }
}