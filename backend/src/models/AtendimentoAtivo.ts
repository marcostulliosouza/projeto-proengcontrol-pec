import { executeQuery,pool } from '../config/database';

export interface AtendimentoAtivo {
  atc_id: number;
  atc_chamado: number;
  atc_colaborador: number;
  atc_data_hora_inicio: string;
  atc_data_hora_termino: string | null;
  tempo_decorrido?: number;
  colaborador_nome?: string;
  chamado_descricao?: string;
  cliente_nome?: string;
  cha_DT?: string;
  tipo_chamado?: string;
}

export class AtendimentoAtivoModel {
  // Limpar registros órfãos/duplicados ANTES de iniciar
  static async limparRegistrosOrfaos(chamadoId?: number): Promise<void> {
  try {
    if (chamadoId) {
      // Limpar registros específicos do chamado
      const query = `
        DELETE FROM atendimentos_chamados 
        WHERE atc_chamado = ? AND atc_data_hora_termino IS NULL
      `;
      await executeQuery(query, [chamadoId]);
      console.log(`🧹 Limpados registros do chamado ${chamadoId}`);
    } else {
      // Limpar registros muito antigos (mais de 1 dia)
      const query = `
        UPDATE atendimentos_chamados 
        SET atc_data_hora_termino = NOW() 
        WHERE atc_data_hora_termino IS NULL 
        AND (
          atc_data_hora_inicio < DATE_SUB(NOW(), INTERVAL 1 DAY) 
          OR atc_data_hora_inicio > NOW()
        )
      `;
      
      const result = await executeQuery(query);
      console.log(`🧹 Limpados ${result.affectedRows} registros órfãos/futuros`);
    }
  } catch (error) {
    console.error('Erro ao limpar registros órfãos:', error);
  }
  }

  // Iniciar atendimento (com limpeza prévia)
  static async iniciar(chamadoId: number, colaboradorId: number): Promise<boolean> {
    try {
      console.log(`🚀 Iniciando atendimento: Chamado ${chamadoId} por colaborador ${colaboradorId}`);
      
      // 1. LIMPAR registros órfãos deste chamado primeiro
      await this.limparRegistrosOrfaos(chamadoId);
      
      // 2. Verificar se colaborador já está atendendo algo
      const colaboradorAtivo = await this.buscarPorColaborador(colaboradorId);
      if (colaboradorAtivo) {
        throw new Error(`Colaborador já está atendendo chamado ${colaboradorAtivo.atc_chamado}`);
      }

      // 3. Verificar se chamado já está sendo atendido (após limpeza)
      const chamadoAtivo = await this.buscarPorChamado(chamadoId);
      if (chamadoAtivo) {
        throw new Error(`Chamado já está sendo atendido por ${chamadoAtivo.colaborador_nome}`);
      }

      // 4. Verificar se chamado existe e está aberto
      const chamadoQuery = `
        SELECT cha_id, cha_status 
        FROM chamados 
        WHERE cha_id = ? AND cha_status = 1
      `;
      const chamadoResult = await executeQuery(chamadoQuery, [chamadoId]);
      
      if (!chamadoResult || chamadoResult.length === 0) {
        throw new Error('Chamado não encontrado ou não está aberto');
      }

      // 5. INSERIR novo atendimento
      const insertQuery = `
        INSERT INTO atendimentos_chamados (
          atc_chamado, atc_colaborador, atc_data_hora_inicio
        ) VALUES (?, ?, NOW())
      `;

      await executeQuery(insertQuery, [chamadoId, colaboradorId]);
      
      // 6. Atualizar status do chamado
      const updateQuery = `
        UPDATE chamados 
        SET cha_status = 2, cha_data_hora_atendimento = NOW() 
        WHERE cha_id = ?
      `;
      
      await executeQuery(updateQuery, [chamadoId]);

      console.log(`✅ Atendimento iniciado com sucesso: Chamado ${chamadoId}`);
      return true;
    } catch (error) {
      console.error('Erro ao iniciar atendimento:', error);
      throw error;
    }
  }

  // Finalizar atendimento (com busca mais específica)
  static async finalizar(chamadoId: number, acaoId?: number): Promise<boolean> {
    try {
      console.log(`🏁 Finalizando atendimento: Chamado ${chamadoId}, Ação: ${acaoId}`);
      
      // 1. Buscar atendimento ativo específico
      const atendimentoAtivo = await this.buscarPorChamado(chamadoId);
      if (!atendimentoAtivo) {
        throw new Error('Nenhum atendimento ativo encontrado para este chamado');
      }

      // 2. Finalizar atendimento específico por ID
      const finalizarQuery = `
        UPDATE atendimentos_chamados 
        SET atc_data_hora_termino = NOW()
        WHERE atc_id = ?
      `;

      const result = await executeQuery(finalizarQuery, [atendimentoAtivo.atc_id]);

      if (result.affectedRows > 0) {
        // 3. Atualizar chamado
        if (acaoId) {
          const updateChamadoQuery = `
            UPDATE chamados 
            SET cha_status = 3, 
                cha_data_hora_termino = NOW(), 
                cha_acao = ? 
            WHERE cha_id = ?
          `;
          
          await executeQuery(updateChamadoQuery, [acaoId, chamadoId]);
          console.log(`✅ Chamado ${chamadoId} finalizado com ação ${acaoId}`);
        }
      }

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao finalizar atendimento:', error);
      throw error;
    }
  }

  // Cancelar atendimento (mais específico)
  static async cancelar(chamadoId: number): Promise<boolean> {
    try {
      console.log(`🚫 Cancelando atendimento do chamado ${chamadoId}`);
      
      // 1. Buscar atendimento ativo específico
      const atendimentoAtivo = await this.buscarPorChamado(chamadoId);
      if (!atendimentoAtivo) {
        console.log(`⚠️ Nenhum atendimento ativo encontrado para chamado ${chamadoId}`);
        return false;
      }

      // 2. DELETAR atendimento específico por ID
      const deleteQuery = `
        DELETE FROM atendimentos_chamados 
        WHERE atc_id = ?
      `;
  
      // 3. Voltar chamado para status aberto
      const updateQuery = `
        UPDATE chamados 
        SET cha_status = 1, 
            cha_data_hora_atendimento = NULL,
            cha_visualizado = 0
        WHERE cha_id = ?
      `;
  
      const [deleteResult] = await Promise.all([
        executeQuery(deleteQuery, [atendimentoAtivo.atc_id]),
        executeQuery(updateQuery, [chamadoId])
      ]);
  
      console.log(`✅ Atendimento cancelado: ${deleteResult.affectedRows} registros removidos`);
      return deleteResult.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao cancelar atendimento:', error);
      throw error;
    }
  }

  // Buscar com JOIN mais específico
  static async buscarPorColaborador(colaboradorId: number): Promise<AtendimentoAtivo | null> {
    try {
      const query = `
        SELECT 
          ac.atc_id,
          ac.atc_chamado,
          ac.atc_colaborador,
          ac.atc_data_hora_inicio,
          ac.atc_data_hora_termino,
          c.col_nome as colaborador_nome,
          ch.cha_descricao as chamado_descricao,
          ch.cha_DT,
          cl.cli_nome as cliente_nome,
          tc.tch_descricao as tipo_chamado,
          TIMESTAMPDIFF(SECOND, ac.atc_data_hora_inicio, NOW()) as tempo_decorrido
        FROM atendimentos_chamados ac
        LEFT JOIN colaboradores c ON ac.atc_colaborador = c.col_id
        LEFT JOIN chamados ch ON ac.atc_chamado = ch.cha_id
        LEFT JOIN clientes cl ON ch.cha_cliente = cl.cli_id
        LEFT JOIN tipos_chamado tc ON ch.cha_tipo = tc.tch_id
        WHERE ac.atc_colaborador = ? 
        AND ac.atc_data_hora_termino IS NULL
        ORDER BY ac.atc_data_hora_inicio DESC
        LIMIT 1
      `;

      const results = await executeQuery(query, [colaboradorId]);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Erro ao buscar atendimento por colaborador:', error);
      throw error;
    }
  }

  static async buscarPorChamado(chamadoId: number): Promise<AtendimentoAtivo | null> {
    try {
      const query = `
        SELECT 
          ac.atc_id,
          ac.atc_chamado,
          ac.atc_colaborador,
          ac.atc_data_hora_inicio,
          ac.atc_data_hora_termino,
          c.col_nome as colaborador_nome,
          TIMESTAMPDIFF(SECOND, ac.atc_data_hora_inicio, NOW()) as tempo_decorrido
        FROM atendimentos_chamados ac
        LEFT JOIN colaboradores c ON ac.atc_colaborador = c.col_id
        WHERE ac.atc_chamado = ? 
        AND ac.atc_data_hora_termino IS NULL
        ORDER BY ac.atc_data_hora_inicio DESC
        LIMIT 1
      `;

      const results = await executeQuery(query, [chamadoId]);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Erro ao buscar atendimento por chamado:', error);
      throw error;
    }
  }

  // Listar ativos SEM duplicatas e COM nomes
  static async listarAtivos(): Promise<AtendimentoAtivo[]> {
    try {
      const query = `
        SELECT 
          latest_atendimento.atc_id,
          latest_atendimento.atc_chamado,
          latest_atendimento.atc_colaborador,
          latest_atendimento.atc_data_hora_inicio,
          latest_atendimento.atc_data_hora_termino,
          c.col_nome as colaborador_nome,
          ch.cha_descricao as chamado_descricao,
          ch.cha_DT,
          cl.cli_nome as cliente_nome,
          tc.tch_descricao as tipo_chamado,
          TIMESTAMPDIFF(SECOND, latest_atendimento.atc_data_hora_inicio, NOW()) as tempo_decorrido
        FROM (
          SELECT 
            atc_chamado,
            MAX(atc_id) as latest_atc_id
          FROM atendimentos_chamados
          WHERE atc_data_hora_termino IS NULL
          GROUP BY atc_chamado
        ) latest
        JOIN atendimentos_chamados latest_atendimento ON latest_atendimento.atc_id = latest.latest_atc_id
        LEFT JOIN colaboradores c ON latest_atendimento.atc_colaborador = c.col_id
        LEFT JOIN chamados ch ON latest_atendimento.atc_chamado = ch.cha_id
        LEFT JOIN clientes cl ON ch.cha_cliente = cl.cli_id
        LEFT JOIN tipos_chamado tc ON ch.cha_tipo = tc.tch_id
        ORDER BY latest_atendimento.atc_data_hora_inicio ASC
      `;

      const results = await executeQuery(query);
      const atendimentos = Array.isArray(results) ? results : [];
      
      console.log('📋 Atendimentos ativos encontrados:', atendimentos.length);
      atendimentos.forEach(atendimento => {
        console.log(`- Chamado ${atendimento.atc_chamado} por ${atendimento.colaborador_nome} (ID: ${atendimento.atc_colaborador})`);
      });
      
      return atendimentos;
    } catch (error) {
      console.error('Erro ao listar atendimentos ativos:', error);
      throw error;
    }
  }

  // NOVA FUNÇÃO: Finalizar com detrator (seguindo lógica do closeCall)
  static async finalizarComDetrator(
      chamadoId: number, 
      detratorId: number,
      descricaoAtendimento: string
    ): Promise<boolean> {
      try {
        console.log(`🏁 Finalizando chamado: ${chamadoId}, Detrator: ${detratorId}`);
        
        // Validar descrição
        if (!descricaoAtendimento || descricaoAtendimento.trim().length === 0) {
          throw new Error('Descrição do atendimento é obrigatória');
        }
        
        if (descricaoAtendimento.trim().length > 250) {
          throw new Error('Descrição do atendimento deve ter no máximo 250 caracteres');
        }

        if (isNaN(chamadoId) || isNaN(detratorId)) {
          throw new Error('IDs devem ser números válidos');
        }

        
        // 1. Buscar atendimento ativo específico
        const atendimentoAtivo = await this.buscarPorChamado(chamadoId);
        if (!atendimentoAtivo) {
          throw new Error('Nenhum atendimento ativo encontrado para este chamado');
        }

        // 2. EXECUTAR AS 3 QUERIES EM TRANSAÇÃO (como no Python)
        const queries = [];
        const params = [];

        // Query 1: Atualizar atendimentos_chamados (finalizar atendimento)
        queries.push(`
          UPDATE atendimentos_chamados 
          SET atc_data_hora_termino = NOW()
          WHERE atc_chamado = ? AND atc_data_hora_termino IS NULL
        `);
        params.push([chamadoId]);

        // Query 2: Inserir nova ação (como no Python)
        queries.push(`
          INSERT INTO acoes_chamados (ach_descricao, ach_detrator) 
          VALUES (?, ?)
        `);
        params.push([descricaoAtendimento.trim().toUpperCase(), detratorId]);

        // Query 3: Atualizar chamado com LAST_INSERT_ID() (como no Python)
        queries.push(`
          UPDATE chamados 
          SET cha_status = 3, 
              cha_data_hora_termino = NOW(), 
              cha_acao = LAST_INSERT_ID()
          WHERE cha_id = ?
        `);
        params.push([chamadoId]);

        // Executar todas as queries em transação
        await this.executeTransaction(queries, params);

        console.log(`✅ Chamado ${chamadoId} finalizado com detrator ${detratorId} e nova ação criada`);
        return true;
      } catch (error) {
        console.error('Erro ao finalizar atendimento:', error);
        throw error;
      }
    }

  // Helper para executar transação
  static async executeTransaction(queries: string[], params: any[][]): Promise<void> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      for (let i = 0; i < queries.length; i++) {
        console.log(`Executando query ${i + 1}:`, queries[i]);
        console.log(`Com parâmetros:`, params[i]);
        await connection.execute(queries[i], params[i]);
      }
      
      await connection.commit();
      console.log('✅ Transação executada com sucesso');
    } catch (error) {
      await connection.rollback();
      console.error('❌ Erro na transação, rollback executado:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
}