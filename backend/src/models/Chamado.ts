import { executeQuery } from '../config/database';
import { Chamado, PaginationParams, FilterParams } from '../types';

export class ChamadoModel {
  // Listar chamados com filtros e paginação
  static async findAll(
    pagination: PaginationParams,
    filters: FilterParams = {}
  ): Promise<{ chamados: Chamado[]; total: number }> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: unknown[] = [];

      // Aplicar filtros
      if (filters.search) {
        whereClause += ` AND (c.cha_descricao LIKE ? OR c.cha_DT LIKE ? OR c.cha_operador LIKE ?)`;
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (filters.status) {
        whereClause += ` AND c.cha_status = ?`;
        params.push(filters.status);
      }

      if (filters.cliente) {
        whereClause += ` AND c.cha_cliente = ?`;
        params.push(filters.cliente);
      }

      if (filters.tipo) {
        whereClause += ` AND c.cha_tipo = ?`;
        params.push(filters.tipo);
      }

      if (filters.dataInicio) {
        whereClause += ` AND DATE(c.cha_data_hora_abertura) >= ?`;
        params.push(filters.dataInicio);
      }

      if (filters.dataFim) {
        whereClause += ` AND DATE(c.cha_data_hora_abertura) <= ?`;
        params.push(filters.dataFim);
      }

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM chamados c
        ${whereClause}
      `;

      // Query para buscar dados
      const dataQuery = `
        SELECT 
          c.cha_id,
          c.cha_tipo,
          c.cha_cliente,
          c.cha_produto,
          c.cha_DT,
          c.cha_descricao,
          c.cha_status,
          c.cha_data_hora_abertura,
          c.cha_data_hora_termino,
          c.cha_data_hora_atendimento,
          c.cha_acao,
          c.cha_operador,
          c.cha_visualizado,
          c.cha_plano,
          tc.tch_descricao as tipo_chamado,
          sc.stc_descricao as status_chamado,
          cl.cli_nome as cliente_nome,
          p.pro_nome as produto_nome,
          ac.ach_descricao as acao_descricao
        FROM chamados c
        LEFT JOIN tipos_chamado tc ON c.cha_tipo = tc.tch_id
        LEFT JOIN status_chamado sc ON c.cha_status = sc.stc_id
        LEFT JOIN clientes cl ON c.cha_cliente = cl.cli_id
        LEFT JOIN produtos p ON c.cha_produto = p.pro_id
        LEFT JOIN acoes_chamados ac ON c.cha_acao = ac.ach_id
        ${whereClause}
        ORDER BY c.cha_data_hora_abertura DESC
        LIMIT ${pagination.limit} OFFSET ${pagination.offset}
      `;

      const [countResult, chamados] = await Promise.all([
        executeQuery(countQuery, params),
        executeQuery(dataQuery, params)
      ]);

      return {
        chamados: Array.isArray(chamados) ? chamados : [],
        total: countResult[0]?.total || 0
      };
    } catch (error) {
      console.error('Erro ao buscar chamados:', error);
      throw error;
    }
  }

  // Buscar chamado por ID
  static async findById(id: number): Promise<Chamado | null> {
    try {
      const query = `
        SELECT 
          c.*,
          tc.tch_descricao as tipo_chamado,
          sc.stc_descricao as status_chamado,
          cl.cli_nome as cliente_nome,
          p.pro_nome as produto_nome,
          ac.ach_descricao as acao_descricao
        FROM chamados c
        LEFT JOIN tipos_chamado tc ON c.cha_tipo = tc.tch_id
        LEFT JOIN status_chamado sc ON c.cha_status = sc.stc_id
        LEFT JOIN clientes cl ON c.cha_cliente = cl.cli_id
        LEFT JOIN produtos p ON c.cha_produto = p.pro_id
        LEFT JOIN acoes_chamados ac ON c.cha_acao = ac.ach_id
        WHERE c.cha_id = ?
      `;

      const results = await executeQuery(query, [id]);
      
      if (Array.isArray(results) && results.length > 0) {
        return results[0] as Chamado;
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao buscar chamado por ID:', error);
      throw error;
    }
  }

  // Criar novo chamado
  static async create(chamado: Partial<Chamado>, operador: string): Promise<number> {
    try {
      const query = `
        INSERT INTO chamados (
          cha_tipo, cha_cliente, cha_produto, cha_DT, cha_descricao,
          cha_status, cha_data_hora_abertura, cha_operador, cha_visualizado, cha_plano
        ) VALUES (?, ?, ?, ?, ?, 1, NOW(), ?, 0, 0)
      `;

      const params = [
        chamado.cha_tipo,
        chamado.cha_cliente,
        chamado.cha_produto,
        chamado.cha_DT || '',
        chamado.cha_descricao,
        operador
      ];

      const result = await executeQuery(query, params);
      return result.insertId;
    } catch (error) {
      console.error('Erro ao criar chamado:', error);
      throw error;
    }
  }

  // Atualizar chamado
  static async update(id: number, chamado: Partial<Chamado>): Promise<boolean> {
    try {
      const query = `
        UPDATE chamados SET
          cha_tipo = ?,
          cha_cliente = ?,
          cha_produto = ?,
          cha_DT = ?,
          cha_descricao = ?,
          cha_status = ?,
          cha_acao = ?
        WHERE cha_id = ?
      `;

      const params = [
        chamado.cha_tipo,
        chamado.cha_cliente,
        chamado.cha_produto,
        chamado.cha_DT || '',
        chamado.cha_descricao,
        chamado.cha_status,
        chamado.cha_acao || null,
        id
      ];

      const result = await executeQuery(query, params);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao atualizar chamado:', error);
      throw error;
    }
  }

  // Iniciar atendimento do chamado
  static async iniciarAtendimento(id: number, colaboradorId: number): Promise<boolean> {
    try {
      // Atualizar status e data de atendimento
      const updateQuery = `
        UPDATE chamados SET 
          cha_status = 2,
          cha_data_hora_atendimento = NOW()
        WHERE cha_id = ?
      `;

      // Registrar atendimento
      const atendimentoQuery = `
        INSERT INTO atendimentos_chamados (atc_chamado, atc_colaborador, atc_data_hora_inicio)
        VALUES (?, ?, NOW())
      `;

      await Promise.all([
        executeQuery(updateQuery, [id]),
        executeQuery(atendimentoQuery, [id, colaboradorId])
      ]);

      return true;
    } catch (error) {
      console.error('Erro ao iniciar atendimento:', error);
      throw error;
    }
  }

  // Finalizar chamado
  static async finalizar(id: number, acaoId: number): Promise<boolean> {
    try {
      const query = `
        UPDATE chamados SET
          cha_status = 3,
          cha_data_hora_termino = NOW(),
          cha_acao = ?
        WHERE cha_id = ?
      `;

      const result = await executeQuery(query, [acaoId, id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao finalizar chamado:', error);
      throw error;
    }
  }

  // Buscar tipos de chamado
  static async getTipos() {
    try {
      const query = `
        SELECT tch_id, tch_descricao 
        FROM tipos_chamado 
        ORDER BY tch_descricao
      `;
      
      const results = await executeQuery(query);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Erro ao buscar tipos de chamado:', error);
      throw error;
    }
  }

  // Buscar status de chamado
  static async getStatus() {
    try {
      const query = `
        SELECT stc_id, stc_descricao 
        FROM status_chamado 
        ORDER BY stc_id
      `;
      
      const results = await executeQuery(query);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Erro ao buscar status de chamado:', error);
      throw error;
    }
  }

  // Buscar produtos por cliente
  static async getProdutosByCliente(clienteId: number) {
    try {
      const query = `
        SELECT pro_id, pro_nome 
        FROM produtos 
        WHERE pro_cliente = ? AND pro_ativo = 1
        ORDER BY pro_nome
      `;
      
      const results = await executeQuery(query, [clienteId]);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Erro ao buscar produtos por cliente:', error);
      throw error;
    }
  }

  // Buscar ações disponíveis
  static async getAcoes() {
    try {
      const query = `
        SELECT ach_id, ach_descricao 
        FROM acoes_chamados 
        ORDER BY ach_descricao
        LIMIT 50
      `;
      
      const results = await executeQuery(query);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Erro ao buscar ações:', error);
      throw error;
    }
  }

  // Dashboard - Chamados por status
  static async getChamadosPorStatus() {
    try {
      const query = `
        SELECT 
          sc.stc_descricao as status,
          COUNT(*) as total
        FROM chamados c
        LEFT JOIN status_chamado sc ON c.cha_status = sc.stc_id
        GROUP BY c.cha_status, sc.stc_descricao
        ORDER BY c.cha_status
      `;
      
      const results = await executeQuery(query);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Erro ao buscar chamados por status:', error);
      throw error;
    }
  }

  // Dashboard - Chamados recentes
  static async getChamadosRecentes(limit: number = 10) {
    try {
      const query = `
        SELECT 
          c.cha_id,
          c.cha_DT,
          c.cha_descricao,
          c.cha_data_hora_abertura,
          c.cha_operador,
          tc.tch_descricao as tipo_chamado,
          sc.stc_descricao as status_chamado,
          cl.cli_nome as cliente_nome
        FROM chamados c
        LEFT JOIN tipos_chamado tc ON c.cha_tipo = tc.tch_id
        LEFT JOIN status_chamado sc ON c.cha_status = sc.stc_id
        LEFT JOIN clientes cl ON c.cha_cliente = cl.cli_id
        ORDER BY c.cha_data_hora_abertura DESC
        LIMIT ${limit}
      `;
      
      const results = await executeQuery(query);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Erro ao buscar chamados recentes:', error);
      throw error;
    }
  }
}