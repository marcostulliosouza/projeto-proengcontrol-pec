import { executeQuery, pool } from '../config/database';
import { ResultSetHeader } from 'mysql2';

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

export class InsumoModel {
  // Listar insumos com filtros e paginação
  static async findAll(filtros: {
    search?: string;
    categoria?: number;
    status?: string;
    estoqueBaixo?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<{ insumos: Insumo[]; total: number }> {
    try {
      const {
        search,
        categoria,
        status,
        estoqueBaixo,
        page = 1,
        limit = 20
      } = filtros;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE i.ins_ativo = 1';
      const params: any[] = [];

      // Filtros
      if (search) {
        whereClause += ` AND (i.ins_nome LIKE ? OR i.ins_cod_sap LIKE ? OR i.ins_descricao LIKE ?)`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (categoria) {
        whereClause += ` AND i.cai_id = ?`;
        params.push(categoria);
      }

      if (status) {
        whereClause += ` AND i.ins_status_estoque = ?`;
        params.push(status);
      }

      if (estoqueBaixo) {
        whereClause += ` AND i.ins_qtd <= i.ins_estoque_minimo`;
      }

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM insumos i
        LEFT JOIN categorias_insumos c ON i.cai_id = c.cai_id
        ${whereClause}
      `;

      // Query para buscar dados
      const dataQuery = `
        SELECT 
          i.*,
          c.cai_nome as categoria_nome,
          (i.ins_qtd * i.ins_valor_unit) as valor_total_estoque,
          CASE 
            WHEN i.ins_qtd <= 0 THEN 'SEM_ESTOQUE'
            WHEN i.ins_qtd <= i.ins_estoque_minimo THEN 'ESTOQUE_BAIXO' 
            ELSE 'ESTOQUE_OK'
          END as status_analise,
          (SELECT COUNT(*) FROM solicitacoes_compra s 
           WHERE s.ins_id = i.ins_id AND s.sol_status = 'PENDENTE') as solicitacoes_pendentes
        FROM insumos i
        LEFT JOIN categorias_insumos c ON i.cai_id = c.cai_id
        ${whereClause}
        ORDER BY 
          CASE WHEN i.ins_qtd <= i.ins_estoque_minimo THEN 0 ELSE 1 END,
          i.ins_nome ASC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const [countResult, insumos] = await Promise.all([
        executeQuery(countQuery, params),
        executeQuery(dataQuery, params)
      ]);

      return {
        insumos: Array.isArray(insumos) ? insumos : [],
        total: Array.isArray(countResult) && countResult[0] ? countResult[0].total : 0
      };
    } catch (error) {
      console.error('Erro ao buscar insumos:', error);
      throw error;
    }
  }

  // Buscar insumo por ID
  static async findById(id: number): Promise<Insumo | null> {
    try {
      const query = `
        SELECT 
          i.*,
          c.cai_nome as categoria_nome,
          (i.ins_qtd * i.ins_valor_unit) as valor_total_estoque,
          CASE 
            WHEN i.ins_qtd <= 0 THEN 'SEM_ESTOQUE'
            WHEN i.ins_qtd <= i.ins_estoque_minimo THEN 'ESTOQUE_BAIXO' 
            ELSE 'ESTOQUE_OK'
          END as status_analise
        FROM insumos i
        LEFT JOIN categorias_insumos c ON i.cai_id = c.cai_id
        WHERE i.ins_id = ? AND i.ins_ativo = 1
      `;

      const results = await executeQuery(query, [id]);
      return Array.isArray(results) && results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Erro ao buscar insumo:', error);
      throw error;
    }
  }

  // Criar novo insumo
  static async create(insumo: Partial<Insumo>): Promise<number> {
    try {
      const query = `
        INSERT INTO insumos (
          cai_id, ins_cod_sap, ins_nome, ins_descricao, ins_qtd,
          ins_valor_unit, ins_estoque_minimo, ins_localizacao, ins_observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        insumo.cai_id,
        insumo.ins_cod_sap || null,
        insumo.ins_nome,
        insumo.ins_descricao || null,
        insumo.ins_qtd || 0,
        insumo.ins_valor_unit || 0,
        insumo.ins_estoque_minimo || 0,
        insumo.ins_localizacao || null,
        insumo.ins_observacoes || null
      ];

      const result = await executeQuery(query, params);
      return (result as ResultSetHeader).insertId;
    } catch (error) {
      console.error('Erro ao criar insumo:', error);
      throw error;
    }
  }

  // Atualizar insumo
  static async update(id: number, insumo: Partial<Insumo>): Promise<boolean> {
    try {
      const query = `
        UPDATE insumos SET
          cai_id = ?,
          ins_cod_sap = ?,
          ins_nome = ?,
          ins_descricao = ?,
          ins_valor_unit = ?,
          ins_estoque_minimo = ?,
          ins_localizacao = ?,
          ins_observacoes = ?
        WHERE ins_id = ? AND ins_ativo = 1
      `;

      const params = [
        insumo.cai_id,
        insumo.ins_cod_sap || null,
        insumo.ins_nome,
        insumo.ins_descricao || null,
        insumo.ins_valor_unit || 0,
        insumo.ins_estoque_minimo || 0,
        insumo.ins_localizacao || null,
        insumo.ins_observacoes || null,
        id
      ];

      const result = await executeQuery(query, params);
      return (result as ResultSetHeader).affectedRows > 0;
    } catch (error) {
      console.error('Erro ao atualizar insumo:', error);
      throw error;
    }
  }

  // Deletar insumo (soft delete)
  static async delete(id: number): Promise<boolean> {
    try {
      const query = 'UPDATE insumos SET ins_ativo = 0 WHERE ins_id = ?';
      const result = await executeQuery(query, [id]);
      return (result as ResultSetHeader).affectedRows > 0;
    } catch (error) {
      console.error('Erro ao deletar insumo:', error);
      throw error;
    }
  }

  // Movimentar estoque
  static async movimentarEstoque(movimentacao: {
    ins_id: number;
    mov_tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'TRANSFERENCIA';
    mov_quantidade: number;
    mov_motivo?: string;
    mov_observacao?: string;
    mov_colaborador: number;
    mov_documento?: string;
    mov_centro_custo?: string;
  }): Promise<boolean> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 1. Buscar estoque atual
      const [insumoAtual] = await connection.execute(
        'SELECT ins_qtd FROM insumos WHERE ins_id = ? AND ins_ativo = 1',
        [movimentacao.ins_id]
      ) as any;

      if (!insumoAtual || insumoAtual.length === 0) {
        throw new Error('Insumo não encontrado');
      }

      const estoqueAtual = insumoAtual[0].ins_qtd;
      let novoEstoque: number;

      // 2. Calcular novo estoque
      switch (movimentacao.mov_tipo) {
        case 'ENTRADA':
          novoEstoque = estoqueAtual + movimentacao.mov_quantidade;
          break;
        case 'SAIDA':
          novoEstoque = estoqueAtual - movimentacao.mov_quantidade;
          if (novoEstoque < 0) {
            throw new Error('Estoque insuficiente para a operação');
          }
          break;
        case 'AJUSTE':
          novoEstoque = movimentacao.mov_quantidade; // Quantidade absoluta
          break;
        case 'TRANSFERENCIA':
          novoEstoque = estoqueAtual - movimentacao.mov_quantidade;
          if (novoEstoque < 0) {
            throw new Error('Estoque insuficiente para transferência');
          }
          break;
        default:
          throw new Error('Tipo de movimentação inválido');
      }

      // 3. Inserir movimentação
      const insertMovQuery = `
        INSERT INTO movimentacoes_estoque (
          ins_id, mov_tipo, mov_quantidade, mov_quantidade_anterior,
          mov_quantidade_atual, mov_motivo, mov_observacao, mov_colaborador,
          mov_documento, mov_centro_custo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await connection.execute(insertMovQuery, [
        movimentacao.ins_id,
        movimentacao.mov_tipo,
        movimentacao.mov_quantidade,
        estoqueAtual,
        novoEstoque,
        movimentacao.mov_motivo || null,
        movimentacao.mov_observacao || null,
        movimentacao.mov_colaborador,
        movimentacao.mov_documento || null,
        movimentacao.mov_centro_custo || null
      ]);

      // 4. Atualizar estoque do insumo
      await connection.execute(
        'UPDATE insumos SET ins_qtd = ? WHERE ins_id = ?',
        [novoEstoque, movimentacao.ins_id]
      );

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('Erro ao movimentar estoque:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Histórico de movimentações
  static async getHistoricoMovimentacoes(
    insumoId?: number,
    filtros: {
      dataInicio?: string;
      dataFim?: string;
      tipo?: string;
      colaborador?: number;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ movimentacoes: MovimentacaoEstoque[]; total: number }> {
    try {
      const { dataInicio, dataFim, tipo, colaborador, page = 1, limit = 20 } = filtros;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (insumoId) {
        whereClause += ' AND m.ins_id = ?';
        params.push(insumoId);
      }

      if (dataInicio) {
        whereClause += ' AND DATE(m.mov_data_hora) >= ?';
        params.push(dataInicio);
      }

      if (dataFim) {
        whereClause += ' AND DATE(m.mov_data_hora) <= ?';
        params.push(dataFim);
      }

      if (tipo) {
        whereClause += ' AND m.mov_tipo = ?';
        params.push(tipo);
      }

      if (colaborador) {
        whereClause += ' AND m.mov_colaborador = ?';
        params.push(colaborador);
      }

      const countQuery = `
        SELECT COUNT(*) as total
        FROM movimentacoes_estoque m
        ${whereClause}
      `;

      const dataQuery = `
        SELECT 
          m.*,
          c.col_nome as colaborador_nome,
          i.ins_nome as insumo_nome
        FROM movimentacoes_estoque m
        LEFT JOIN colaboradores c ON m.mov_colaborador = c.col_id
        LEFT JOIN insumos i ON m.ins_id = i.ins_id
        ${whereClause}
        ORDER BY m.mov_data_hora DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const [countResult, movimentacoes] = await Promise.all([
        executeQuery(countQuery, params),
        executeQuery(dataQuery, params)
      ]);

      return {
        movimentacoes: Array.isArray(movimentacoes) ? movimentacoes : [],
        total: Array.isArray(countResult) && countResult[0] ? countResult[0].total : 0
      };
    } catch (error) {
      console.error('Erro ao buscar histórico de movimentações:', error);
      throw error;
    }
  }

  // Relatório de estoque baixo
  static async getEstoqueBaixo(): Promise<Insumo[]> {
    try {
      const query = `
        SELECT 
          i.*,
          c.cai_nome as categoria_nome,
          (i.ins_qtd * i.ins_valor_unit) as valor_total_estoque,
          'ESTOQUE_BAIXO' as status_analise
        FROM insumos i
        LEFT JOIN categorias_insumos c ON i.cai_id = c.cai_id
        WHERE i.ins_ativo = 1 AND i.ins_qtd <= i.ins_estoque_minimo
        ORDER BY (i.ins_qtd - i.ins_estoque_minimo) ASC
      `;

      const results = await executeQuery(query);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Erro ao buscar estoque baixo:', error);
      throw error;
    }
  }

  // Buscar categorias
  static async getCategorias(): Promise<CategoriaInsumo[]> {
    try {
      const query = 'SELECT * FROM categorias_insumos ORDER BY cai_nome';
      const results = await executeQuery(query);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      throw error;
    }
  }

  // Dashboard - estatísticas gerais
  static async getEstatisticas(): Promise<{
    totalInsumos: number;
    valorTotalEstoque: number;
    itensBaixoEstoque: number;
    itensEmFalta: number;
    movimentacoesHoje: number;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_insumos,
          SUM(ins_qtd * ins_valor_unit) as valor_total_estoque,
          SUM(CASE WHEN ins_qtd <= ins_estoque_minimo THEN 1 ELSE 0 END) as itens_baixo_estoque,
          SUM(CASE WHEN ins_qtd <= 0 THEN 1 ELSE 0 END) as itens_em_falta,
          (SELECT COUNT(*) FROM movimentacoes_estoque WHERE DATE(mov_data_hora) = CURDATE()) as movimentacoes_hoje
        FROM insumos 
        WHERE ins_ativo = 1
      `;

      const results = await executeQuery(query);
      const stats = Array.isArray(results) && results[0] ? results[0] : {};

      return {
        totalInsumos: stats.total_insumos || 0,
        valorTotalEstoque: parseFloat(stats.valor_total_estoque) || 0,
        itensBaixoEstoque: stats.itens_baixo_estoque || 0,
        itensEmFalta: stats.itens_em_falta || 0,
        movimentacoesHoje: stats.movimentacoes_hoje || 0
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      throw error;
    }
  }
}