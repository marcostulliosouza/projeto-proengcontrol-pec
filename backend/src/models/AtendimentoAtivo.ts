import { executeQuery } from '../config/database';

export interface AtendimentoAtivo {
  atc_id: number;
  atc_chamado: number;
  atc_colaborador: number;
  atc_data_hora_inicio: string;
  atc_data_hora_termino: string | null;
  // Campos calculados
  tempo_decorrido?: number;
  colaborador_nome?: string;
  chamado_descricao?: string;
  cliente_nome?: string;
  cha_DT?: string;
  tipo_chamado?: string;
}

export class AtendimentoAtivoModel {
  // Iniciar atendimento (igual ao Python setCallAsBeingAnswered)
  static async iniciar(chamadoId: number, colaboradorId: number): Promise<boolean> {
    try {
      // Verificar se colaborador já está atendendo algo
      const colaboradorAtivo = await this.buscarPorColaborador(colaboradorId);
      if (colaboradorAtivo) {
        throw new Error('Colaborador já está atendendo outro chamado');
      }

      // Verificar se chamado já está sendo atendido
      const chamadoAtivo = await this.buscarPorChamado(chamadoId);
      if (chamadoAtivo) {
        throw new Error('Chamado já está sendo atendido');
      }

      // Verificar se chamado existe e está aberto
      const chamadoQuery = `
        SELECT cha_id, cha_status 
        FROM chamados 
        WHERE cha_id = ? AND cha_status = 1
      `;
      const chamadoResult = await executeQuery(chamadoQuery, [chamadoId]);
      
      if (!chamadoResult || chamadoResult.length === 0) {
        throw new Error('Chamado não encontrado ou não está aberto');
      }

      // === TRANSAÇÃO IGUAL AO PYTHON ===
      
      // 1. Inserir novo atendimento
      const insertQuery = `
        INSERT INTO atendimentos_chamados (
          atc_chamado, atc_colaborador, atc_data_hora_inicio
        ) VALUES (?, ?, NOW())
      `;

      await executeQuery(insertQuery, [chamadoId, colaboradorId]);
      
      // 2. Atualizar status do chamado para "Em Andamento" (status 2)
      const updateQuery = `
        UPDATE chamados 
        SET cha_status = 2, cha_data_hora_atendimento = NOW() 
        WHERE cha_id = ?
      `;
      
      await executeQuery(updateQuery, [chamadoId]);

      console.log(`✅ Atendimento iniciado: Chamado ${chamadoId} por colaborador ${colaboradorId}`);
      return true;
    } catch (error) {
      console.error('Erro ao iniciar atendimento:', error);
      throw error;
    }
  }

  // Finalizar atendimento (igual ao Python closeCall)
  static async finalizar(chamadoId: number, acaoId?: number): Promise<boolean> {
    try {
      // === TRANSAÇÃO IGUAL AO PYTHON ===
      
      // 1. Finalizar atendimento ativo
      const finalizarAtendimentoQuery = `
        UPDATE atendimentos_chamados 
        SET atc_data_hora_termino = NOW()
        WHERE atc_chamado = ? AND atc_data_hora_termino IS NULL
      `;

      const result = await executeQuery(finalizarAtendimentoQuery, [chamadoId]);

      if (result.affectedRows > 0) {
        // 2. Se tem ação, inserir na tabela de ações
        if (acaoId) {
          // Buscar descrição da ação
          const acaoQuery = `
            SELECT ach_descricao FROM acoes_chamados WHERE ach_id = ?
          `;
          const acaoResult = await executeQuery(acaoQuery, [acaoId]);
          
          if (acaoResult && acaoResult.length > 0) {
            // 3. Atualizar chamado para status "Fechado" (status 3)
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
        } else {
          // Finalizar sem ação - só atualiza atendimento
          console.log(`✅ Atendimento finalizado sem fechar chamado: ${chamadoId}`);
        }
      }

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao finalizar atendimento:', error);
      throw error;
    }
  }

  // Cancelar atendimento (igual ao Python giveUpFromCall)
  static async cancelar(chamadoId: number): Promise<boolean> {
    try {
      console.log(`🚫 Cancelando atendimento do chamado ${chamadoId}`);
      
      // === IGUAL AO PYTHON giveUpFromCall ===
      
      // 1. DELETAR atendimento (não finalizar, deletar!)
      const deleteAtendimentoQuery = `
        DELETE FROM atendimentos_chamados 
        WHERE atc_chamado = ? AND atc_data_hora_termino IS NULL
      `;
  
      // 2. Voltar chamado para status "Aberto" (status 1)
      const updateChamadoQuery = `
        UPDATE chamados 
        SET cha_status = 1, 
            cha_data_hora_atendimento = NULL,
            cha_visualizado = 0
        WHERE cha_id = ?
      `;
  
      // Executar ambas as queries
      const [deleteResult] = await Promise.all([
        executeQuery(deleteAtendimentoQuery, [chamadoId]),
        executeQuery(updateChamadoQuery, [chamadoId])
      ]);
  
      console.log(`✅ Atendimento cancelado: ${deleteResult.affectedRows} registros removidos`);
      return deleteResult.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao cancelar atendimento:', error);
      throw error;
    }
  }

  // Buscar atendimento ativo por colaborador
  static async buscarPorColaborador(colaboradorId: number): Promise<AtendimentoAtivo | null> {
    try {
      const query = `
        SELECT 
          ac.*,
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
        WHERE ac.atc_colaborador = ? AND ac.atc_data_hora_termino IS NULL
      `;

      const results = await executeQuery(query, [colaboradorId]);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Erro ao buscar atendimento por colaborador:', error);
      throw error;
    }
  }

  // Buscar atendimento ativo por chamado
  static async buscarPorChamado(chamadoId: number): Promise<AtendimentoAtivo | null> {
    try {
      const query = `
        SELECT 
          ac.*,
          c.col_nome as colaborador_nome,
          TIMESTAMPDIFF(SECOND, ac.atc_data_hora_inicio, NOW()) as tempo_decorrido
        FROM atendimentos_chamados ac
        LEFT JOIN colaboradores c ON ac.atc_colaborador = c.col_id
        WHERE ac.atc_chamado = ? AND ac.atc_data_hora_termino IS NULL
      `;

      const results = await executeQuery(query, [chamadoId]);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Erro ao buscar atendimento por chamado:', error);
      throw error;
    }
  }

  // Listar todos os atendimentos ativos (igual ao Python - para sincronização)
  static async listarAtivos(): Promise<AtendimentoAtivo[]> {
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
        WHERE ac.atc_data_hora_termino IS NULL
        ORDER BY ac.atc_data_hora_inicio ASC
      `;

      const results = await executeQuery(query);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Erro ao listar atendimentos ativos:', error);
      throw error;
    }
  }

  // Obter tempo atual de um atendimento ativo
  static async getTempoAtual(chamadoId: number): Promise<number> {
    try {
      const query = `
        SELECT TIMESTAMPDIFF(SECOND, atc_data_hora_inicio, NOW()) as tempo_decorrido
        FROM atendimentos_chamados
        WHERE atc_chamado = ? AND atc_data_hora_termino IS NULL
      `;

      const results = await executeQuery(query, [chamadoId]);
      return results.length > 0 ? results[0].tempo_decorrido : 0;
    } catch (error) {
      console.error('Erro ao obter tempo atual:', error);
      return 0;
    }
  }

  // Verificar se algum colaborador está atendendo algum chamado (para verificação inicial)
  static async verificarAtendimentoAtivo(colaboradorId: number): Promise<{ chamado: number; tempo: number } | null> {
    try {
      const query = `
        SELECT 
          atc_chamado as chamado,
          TIMESTAMPDIFF(SECOND, atc_data_hora_inicio, NOW()) as tempo
        FROM atendimentos_chamados
        WHERE atc_colaborador = ? AND atc_data_hora_termino IS NULL
        LIMIT 1
      `;

      const results = await executeQuery(query, [colaboradorId]);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Erro ao verificar atendimento ativo:', error);
      return null;
    }
  }

  // Limpar atendimentos órfãos (útil para manutenção)
  static async limparAtendimentosOrfaos(horasLimite: number = 2): Promise<number> {
    try {
      const query = `
        UPDATE atendimentos_chamados 
        SET atc_data_hora_termino = NOW() 
        WHERE atc_data_hora_termino IS NULL 
        AND atc_data_hora_inicio < DATE_SUB(NOW(), INTERVAL ? HOUR)
      `;
      
      const result = await executeQuery(query, [horasLimite]);
      
      if (result.affectedRows > 0) {
        console.log(`🧹 Limpados ${result.affectedRows} atendimentos órfãos`);
      }
      
      return result.affectedRows;
    } catch (error) {
      console.error('Erro ao limpar atendimentos órfãos:', error);
      return 0;
    }
  }

  // Transferir chamado (igual ao Python transferCallFromTo)
  static async transferir(chamadoId: number, deColaborador: number, paraColaborador: number): Promise<boolean> {
    try {
      // === IGUAL AO PYTHON transferCallFromTo ===
      
      // 1. Finalizar atendimento do colaborador atual
      const finalizarAtualQuery = `
        UPDATE atendimentos_chamados 
        SET atc_data_hora_termino = NOW()
        WHERE atc_chamado = ? AND atc_colaborador = ? AND atc_data_hora_termino IS NULL
      `;

      // 2. Criar novo atendimento para o novo colaborador
      const novoAtendimentoQuery = `
        INSERT INTO atendimentos_chamados (
          atc_chamado, atc_colaborador, atc_data_hora_inicio
        ) VALUES (?, ?, NOW())
      `;

      // Executar ambas as operações
      await Promise.all([
        executeQuery(finalizarAtualQuery, [chamadoId, deColaborador]),
        executeQuery(novoAtendimentoQuery, [chamadoId, paraColaborador])
      ]);

      console.log(`🔄 Chamado ${chamadoId} transferido de ${deColaborador} para ${paraColaborador}`);
      return true;
    } catch (error) {
      console.error('Erro ao transferir chamado:', error);
      throw error;
    }
  }

  // Estatísticas de atendimento (para dashboard)
  static async getEstatisticas(dataInicio?: string, dataFim?: string) {
    try {
      let whereClause = 'WHERE ac.atc_data_hora_termino IS NOT NULL';
      const params: any[] = [];

      if (dataInicio) {
        whereClause += ' AND DATE(ac.atc_data_hora_inicio) >= ?';
        params.push(dataInicio);
      }

      if (dataFim) {
        whereClause += ' AND DATE(ac.atc_data_hora_inicio) <= ?';
        params.push(dataFim);
      }

      const query = `
        SELECT 
          COUNT(*) as total_atendimentos,
          AVG(TIMESTAMPDIFF(SECOND, ac.atc_data_hora_inicio, ac.atc_data_hora_termino)) as tempo_medio_segundos,
          MIN(TIMESTAMPDIFF(SECOND, ac.atc_data_hora_inicio, ac.atc_data_hora_termino)) as tempo_minimo_segundos,
          MAX(TIMESTAMPDIFF(SECOND, ac.atc_data_hora_inicio, ac.atc_data_hora_termino)) as tempo_maximo_segundos,
          COUNT(DISTINCT ac.atc_colaborador) as colaboradores_distintos
        FROM atendimentos_chamados ac
        ${whereClause}
      `;

      const results = await executeQuery(query, params);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      throw error;
    }
  }
}