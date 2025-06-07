import { executeQuery } from '../config/database';
import { Chamado, PaginationParams, FilterParams } from '../types';

export class ChamadoModel {
  // Função para enriquecer chamados com dados dos colaboradores
  static async enrichWithCollaborators(chamados: Chamado[]): Promise<Chamado[]> {
    if (!Array.isArray(chamados) || chamados.length === 0) {
      return chamados;
    }
  
    try {
      const chamadoIds = chamados.map(c => c.cha_id);
      const placeholders = chamadoIds.map(() => '?').join(',');
  
      // Query corrigida sem ROW_NUMBER() - compatível com MySQL 5.7 e anterior
      const colaboradoresQuery = `
        SELECT 
          atc.atc_chamado,
          col.col_nome as colaborador_nome,
          atc.atc_colaborador,
          atc.atc_data_hora_inicio,
          atc.atc_data_hora_termino
        FROM atendimentos_chamados atc
        LEFT JOIN colaboradores col ON atc.atc_colaborador = col.col_id
        WHERE atc.atc_chamado IN (${placeholders})
        AND (
          -- Pegar atendimentos ativos (sem data de término) OU
          atc.atc_data_hora_termino IS NULL
          OR 
          -- Se não houver ativo, pegar o mais recente finalizado
          (atc.atc_data_hora_termino IS NOT NULL AND atc.atc_id = (
            SELECT MAX(atc2.atc_id) 
            FROM atendimentos_chamados atc2 
            WHERE atc2.atc_chamado = atc.atc_chamado
          ))
        )
        ORDER BY 
          atc.atc_chamado,
          CASE WHEN atc.atc_data_hora_termino IS NULL THEN 0 ELSE 1 END,
          atc.atc_data_hora_inicio DESC
      `;
  
      const colaboradores = await executeQuery(colaboradoresQuery, chamadoIds);
      
      // Criar mapa de colaboradores (priorizar ativos, depois mais recentes)
      const colaboradorMap = new Map();
      if (Array.isArray(colaboradores)) {
        colaboradores.forEach((col: any) => {
          const chamadoId = col.atc_chamado;
          
          // Se já existe um registro para este chamado
          if (colaboradorMap.has(chamadoId)) {
            const existing = colaboradorMap.get(chamadoId);
            
            // Priorizar: ativo (sem término) > mais recente finalizado
            if (!col.atc_data_hora_termino || 
                (existing.atc_data_hora_termino && !col.atc_data_hora_termino)) {
              colaboradorMap.set(chamadoId, {
                colaborador_nome: col.colaborador_nome,
                atc_colaborador: col.atc_colaborador,
                atc_data_hora_inicio: col.atc_data_hora_inicio
              });
            }
          } else {
            colaboradorMap.set(chamadoId, {
              colaborador_nome: col.colaborador_nome,
              atc_colaborador: col.atc_colaborador,
              atc_data_hora_inicio: col.atc_data_hora_inicio
            });
          }
        });
      }
  
      // Enriquecer chamados com dados dos colaboradores
      return chamados.map(chamado => ({
        ...chamado,
        ...colaboradorMap.get(chamado.cha_id)
      }));
  
    } catch (error) {
      console.error('Erro ao enriquecer com colaboradores:', error);
      // Retornar chamados sem colaboradores em caso de erro
      return chamados;
    }
  }

  // Listar chamados com filtros e paginação
  static async findAll(
    pagination: PaginationParams,
    filters: FilterParams = {}
  ): Promise<{ chamados: Chamado[]; total: number }> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = []; // Garantir que seja sempre um array

      // Aplicar filtros
      if (filters.search && filters.search.trim()) {
        whereClause += ` AND (c.cha_descricao LIKE ? OR c.cha_DT LIKE ? OR c.cha_operador LIKE ?)`;
        const searchTerm = `%${filters.search.trim()}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (filters.status) {
        whereClause += ` AND c.cha_status = ?`;
        params.push(filters.status);
      } else {
        whereClause += ` AND (c.cha_status = 1 OR c.cha_status = 2)`;
      }

      if (filters.cliente) {
        whereClause += ` AND c.cha_cliente = ?`;
        params.push(filters.cliente);
      }

      if (filters.tipo) {
        whereClause += ` AND c.cha_tipo = ?`;
        params.push(filters.tipo);
      }

      if (filters.dataInicio && filters.dataInicio.trim()) {
        whereClause += ` AND DATE(c.cha_data_hora_abertura) >= ?`;
        params.push(filters.dataInicio.trim());
      }

      if (filters.dataFim && filters.dataFim.trim()) {
        whereClause += ` AND DATE(c.cha_data_hora_abertura) <= ?`;
        params.push(filters.dataFim.trim());
      }

      console.log('📋 Parâmetros da query:', {
        whereClause,
        params,
        paramsLength: params.length,
        pagination
      });

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM chamados c
        ${whereClause}
      `;

      // Query principal - SIMPLIFICADA
      // const dataQuery = `
      //   SELECT 
      //     c.cha_id,
      //     c.cha_operador,
      //     c.cha_tipo,
      //     c.cha_cliente,
      //     c.cha_produto,
      //     c.cha_DT,
      //     c.cha_status,
      //     c.cha_descricao,
      //     c.cha_plano,
      //     c.cha_data_hora_abertura,
      //     c.cha_data_hora_atendimento,
      //     c.cha_data_hora_termino,
      //     c.cha_acao,
      //     c.cha_visualizado,
      //     c.cha_local,
          
      //     -- Campos relacionados básicos
      //     tc.tch_descricao AS tipo_chamado,
      //     sc.stc_descricao AS status_chamado,
      //     cl.cli_nome AS cliente_nome,
      //     p.pro_nome AS produto_nome,
      //     loc.loc_nome AS local_chamado,
      //     ac.ach_descricao AS acao_descricao,
          
      //     -- Campos calculados
      //     TIMESTAMPDIFF(MINUTE, c.cha_data_hora_abertura, NOW()) AS duracao_total,
      //     IF(c.cha_status > 1, TIMESTAMPDIFF(MINUTE, c.cha_data_hora_atendimento, NOW()), 0) AS duracao_atendimento

      //   FROM chamados c
      //   LEFT JOIN tipos_chamado tc ON c.cha_tipo = tc.tch_id
      //   LEFT JOIN status_chamado sc ON c.cha_status = sc.stc_id
      //   LEFT JOIN clientes cl ON c.cha_cliente = cl.cli_id
      //   LEFT JOIN produtos p ON c.cha_produto = p.pro_id
      //   LEFT JOIN local_chamado loc ON c.cha_local = loc.loc_id
      //   LEFT JOIN acoes_chamados ac ON c.cha_acao = ac.ach_id
        
      //   ${whereClause}
      //   ORDER BY 
      //     c.cha_status DESC,
      //     duracao_total DESC,
      //     duracao_atendimento DESC
      //   LIMIT ${pagination.limit} OFFSET ${pagination.offset}
      // `;

      const dataQuery = `
        SELECT 
          c.cha_id,
          c.cha_operador,
          c.cha_tipo,
          c.cha_cliente,
          c.cha_produto,
          c.cha_DT,
          c.cha_status,
          c.cha_descricao,
          c.cha_plano,
          c.cha_data_hora_abertura,
          c.cha_data_hora_atendimento,
          c.cha_data_hora_termino,
          c.cha_acao,
          c.cha_visualizado,
          c.cha_local,
          
          -- Campos relacionados básicos
          tc.tch_descricao AS tipo_chamado,
          sc.stc_descricao AS status_chamado,
          cl.cli_nome AS cliente_nome,
          p.pro_nome AS produto_nome,
          loc.loc_nome AS local_chamado,
          ac.ach_descricao AS acao_descricao,
          
          -- Campos calculados (mantendo negativos)
          TIMESTAMPDIFF(MINUTE, c.cha_data_hora_abertura, NOW()) AS duracao_total,
          IF(c.cha_status > 1, TIMESTAMPDIFF(MINUTE, c.cha_data_hora_atendimento, NOW()), 0) AS duracao_atendimento,
          
          -- Campo adicional para ordenação prioritária
          CASE WHEN c.cha_data_hora_abertura <= NOW() THEN 0 ELSE 1 END AS ordenacao_prioritaria

        FROM chamados c
        LEFT JOIN tipos_chamado tc ON c.cha_tipo = tc.tch_id
        LEFT JOIN status_chamado sc ON c.cha_status = sc.stc_id
        LEFT JOIN clientes cl ON c.cha_cliente = cl.cli_id
        LEFT JOIN produtos p ON c.cha_produto = p.pro_id
        LEFT JOIN local_chamado loc ON c.cha_local = loc.loc_id
        LEFT JOIN acoes_chamados ac ON c.cha_acao = ac.ach_id
        
        ${whereClause}
        ORDER BY 
          ordenacao_prioritaria,  -- Primeiro os ativos (tempo positivo), depois os futuros
          c.cha_data_hora_abertura DESC,  -- Dentro de cada grupo, mais recentes primeiro
          c.cha_status DESC,
          duracao_total DESC,
          duracao_atendimento DESC
        LIMIT ${pagination.limit} OFFSET ${pagination.offset}
      `;

      console.log('🔍 Executando queries...');

      // Executar queries com tratamento de erro
      let countResult: any;
      let chamados: any;

      try {
        countResult = await executeQuery(countQuery, [...params]); // Spread para criar nova array
        console.log('✅ Count query executada:', countResult);
      } catch (error) {
        console.error('❌ Erro na count query:', error);
        throw new Error('Erro ao contar chamados');
      }

      try {
        chamados = await executeQuery(dataQuery, [...params]); // Spread para criar nova array
        console.log('✅ Data query executada:', Array.isArray(chamados) ? `${chamados.length} registros` : 'Resultado inválido');
      } catch (error) {
        console.error('❌ Erro na data query:', error);
        throw new Error('Erro ao buscar chamados');
      }

      let chamadosResult = Array.isArray(chamados) ? chamados : [];
      
      // Enriquecer com dados dos colaboradores em query separada
      if (chamadosResult.length > 0) {
        chamadosResult = await this.enrichWithCollaborators(chamadosResult);
      }

      return {
        chamados: chamadosResult,
        total: countResult && countResult[0] ? countResult[0].total : 0
      };
    } catch (error) {
      console.error('❌ Erro completo ao buscar chamados:', error);
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
          ac.ach_descricao as acao_descricao,
          loc.loc_nome as local_chamado
        FROM chamados c
        LEFT JOIN tipos_chamado tc ON c.cha_tipo = tc.tch_id
        LEFT JOIN status_chamado sc ON c.cha_status = sc.stc_id
        LEFT JOIN clientes cl ON c.cha_cliente = cl.cli_id
        LEFT JOIN produtos p ON c.cha_produto = p.pro_id
        LEFT JOIN acoes_chamados ac ON c.cha_acao = ac.ach_id
        LEFT JOIN local_chamado loc ON c.cha_local = loc.loc_id
        WHERE c.cha_id = ?
      `;

      const results = await executeQuery(query, [id]);
      
      if (Array.isArray(results) && results.length > 0) {
        let chamado = results[0] as Chamado;
        
        // Enriquecer com dados do colaborador
        const enriched = await this.enrichWithCollaborators([chamado]);
        chamado = enriched[0];
        
        // Debug log
        console.log(`📋 Chamado ${id} carregado:`, {
          id: chamado.cha_id,
          status: chamado.cha_status,
          colaborador_nome: chamado.colaborador_nome,
          atc_colaborador: chamado.atc_colaborador,
          acao_descricao: chamado.acao_descricao
        });
        
        return chamado;
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

  // Buscar tipos de chamado
  static async getTipos() {
    try {
      const query = `
        SELECT tch_id, tch_descricao 
        FROM tipos_chamado 
        ORDER BY tch_descricao
      `;
      
      const results = await executeQuery(query, []);
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
      
      const results = await executeQuery(query, []);
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
      
      const results = await executeQuery(query, []);
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
      
      const results = await executeQuery(query, []);
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
        LIMIT ?
      `;
      
      const results = await executeQuery(query, [limit]);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Erro ao buscar chamados recentes:', error);
      throw error;
    }
  }
}