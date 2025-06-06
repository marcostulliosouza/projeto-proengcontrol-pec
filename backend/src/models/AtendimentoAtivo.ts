import { executeQuery, pool } from '../config/database';
import { ResultSetHeader } from 'mysql2';

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
        console.log(`🧹 Limpados ${(result as ResultSetHeader).affectedRows} registros órfãos/futuros`);
      }
    } catch (error) {
      console.error('Erro ao limpar registros órfãos:', error);
    }
  }

  // VERIFICAÇÃO RIGOROSA ANTES DE INICIAR
  static async podeIniciarAtendimento(chamadoId: number, colaboradorId: number): Promise<{ pode: boolean; motivo?: string }> {
    try {
      console.log(`🔍 Verificando se pode iniciar atendimento: Chamado ${chamadoId}, Colaborador ${colaboradorId}`);
      
      // 1. Verificar se chamado existe e está aberto
      const chamadoQuery = `
        SELECT cha_id, cha_status, cha_descricao 
        FROM chamados 
        WHERE cha_id = ?
      `;
      const chamadoResult = await executeQuery(chamadoQuery, [chamadoId]);
      
      if (!Array.isArray(chamadoResult) || chamadoResult.length === 0) {
        return { pode: false, motivo: 'Chamado não encontrado' };
      }
      
      if (chamadoResult[0].cha_status !== 1) {
        return { pode: false, motivo: 'Chamado não está aberto' };
      }

      // 2. Verificar se colaborador já está atendendo algo
      const colaboradorAtivoQuery = `
        SELECT atc_chamado, c.cha_descricao
        FROM atendimentos_chamados atc
        LEFT JOIN chamados c ON atc.atc_chamado = c.cha_id
        WHERE atc.atc_colaborador = ? 
        AND atc.atc_data_hora_termino IS NULL
      `;
      const colaboradorAtivo = await executeQuery(colaboradorAtivoQuery, [colaboradorId]);
      
      if (Array.isArray(colaboradorAtivo) && colaboradorAtivo.length > 0) {
        return { 
          pode: false, 
          motivo: `Você já está atendendo o chamado #${colaboradorAtivo[0].atc_chamado}` 
        };
      }

      // 3. Verificar se chamado já está sendo atendido por outro usuário
      const chamadoAtivoQuery = `
        SELECT atc.atc_colaborador, col.col_nome
        FROM atendimentos_chamados atc
        LEFT JOIN colaboradores col ON atc.atc_colaborador = col.col_id
        WHERE atc.atc_chamado = ? 
        AND atc.atc_data_hora_termino IS NULL
      `;
      const chamadoAtivo = await executeQuery(chamadoAtivoQuery, [chamadoId]);
      
      if (Array.isArray(chamadoAtivo) && chamadoAtivo.length > 0) {
        return { 
          pode: false, 
          motivo: `Chamado já está sendo atendido por ${chamadoAtivo[0].col_nome}` 
        };
      }

      return { pode: true };
      
    } catch (error) {
      console.error('Erro ao verificar se pode iniciar atendimento:', error);
      return { pode: false, motivo: 'Erro interno na verificação' };
    }
  }

  // Iniciar atendimento COM TRANSAÇÃO
  static async iniciar(chamadoId: number, colaboradorId: number): Promise<boolean> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      console.log(`🚀 Iniciando transação: Chamado ${chamadoId} por colaborador ${colaboradorId}`);
      
      // 1. VERIFICAÇÃO FINAL na transação
      const verificacao = await this.podeIniciarAtendimento(chamadoId, colaboradorId);
      if (!verificacao.pode) {
        await connection.rollback();
        throw new Error(verificacao.motivo);
      }

      // 2. INSERIR novo atendimento
      const insertQuery = `
        INSERT INTO atendimentos_chamados (
          atc_chamado, atc_colaborador, atc_data_hora_inicio
        ) VALUES (?, ?, NOW())
      `;
      await connection.execute(insertQuery, [chamadoId, colaboradorId]);
      
      // 3. Atualizar status do chamado
      const updateQuery = `
        UPDATE chamados 
        SET cha_status = 2, cha_data_hora_atendimento = NOW() 
        WHERE cha_id = ? AND cha_status = 1
      `;
      const updateResult = await connection.execute(updateQuery, [chamadoId]);
      
      if ((updateResult[0] as ResultSetHeader).affectedRows === 0) {
        await connection.rollback();
        throw new Error('Chamado não pôde ser atualizado (pode ter sido modificado por outro usuário)');
      }

      await connection.commit();
      console.log(`✅ Atendimento iniciado com sucesso: Chamado ${chamadoId}`);
      return true;
      
    } catch (error) {
      await connection.rollback();
      console.error('Erro ao iniciar atendimento:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Buscar atendimento ativo do colaborador
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
      return Array.isArray(results) && results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Erro ao buscar atendimento por colaborador:', error);
      throw error;
    }
  }

  // Buscar atendimento ativo do chamado
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
      return Array.isArray(results) && results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Erro ao buscar atendimento por chamado:', error);
      throw error;
    }
  }

  // Listar TODOS atendimentos ativos
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
      const atendimentos = Array.isArray(results) ? results : [];
      
      console.log('📋 Atendimentos ativos encontrados:', atendimentos.length);
      return atendimentos;
    } catch (error) {
      console.error('Erro ao listar atendimentos ativos:', error);
      throw error;
    }
  }

  // Cancelar atendimento
  static async cancelar(chamadoId: number): Promise<boolean> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      console.log(`🚫 Cancelando atendimento do chamado ${chamadoId}`);
      
      // 1. Buscar atendimento ativo específico
      const atendimentoAtivo = await this.buscarPorChamado(chamadoId);
      if (!atendimentoAtivo) {
        await connection.rollback();
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
  
      await connection.execute(deleteQuery, [atendimentoAtivo.atc_id]);
      await connection.execute(updateQuery, [chamadoId]);

      await connection.commit();
      console.log(`✅ Atendimento cancelado com sucesso`);
      return true;
      
    } catch (error) {
      await connection.rollback();
      console.error('Erro ao cancelar atendimento:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Finalizar com detrator (seguindo lógica do closeCall)
  static async finalizarComDetrator(
    chamadoId: number, 
    detratorId: number,
    descricaoAtendimento: string
  ): Promise<boolean> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      console.log(`🏁 Finalizando chamado: ${chamadoId}, Detrator: ${detratorId}`);
      
      // Validações
      if (!descricaoAtendimento || descricaoAtendimento.trim().length === 0) {
        throw new Error('Descrição do atendimento é obrigatória');
      }
      
      if (descricaoAtendimento.trim().length > 250) {
        throw new Error('Descrição do atendimento deve ter no máximo 250 caracteres');
      }

      // 1. Buscar atendimento ativo
      const atendimentoAtivo = await this.buscarPorChamado(chamadoId);
      if (!atendimentoAtivo) {
        await connection.rollback();
        throw new Error('Nenhum atendimento ativo encontrado para este chamado');
      }

      // 2. Finalizar atendimento
      const finalizarQuery = `
        UPDATE atendimentos_chamados 
        SET atc_data_hora_termino = NOW()
        WHERE atc_chamado = ? AND atc_data_hora_termino IS NULL
      `;
      await connection.execute(finalizarQuery, [chamadoId]);

      // 3. Inserir nova ação
      const insertAcaoQuery = `
        INSERT INTO acoes_chamados (ach_descricao, ach_detrator) 
        VALUES (?, ?)
      `;
      const acaoResult = await connection.execute(insertAcaoQuery, [descricaoAtendimento.trim().toUpperCase(), detratorId]);

      // 4. Atualizar chamado com a nova ação
      const updateChamadoQuery = `
        UPDATE chamados 
        SET cha_status = 3, 
            cha_data_hora_termino = NOW(), 
            cha_acao = ?
        WHERE cha_id = ?
      `;
      await connection.execute(updateChamadoQuery, [(acaoResult[0] as ResultSetHeader).insertId, chamadoId]);

      await connection.commit();
      console.log(`✅ Chamado ${chamadoId} finalizado com sucesso`);
      return true;
      
    } catch (error) {
      await connection.rollback();
      console.error('Erro ao finalizar atendimento:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Transferir atendimento (baseado na lógica Python)
  static async transferir(chamadoId: number, antigoColaboradorId: number, novoColaboradorId: number): Promise<boolean> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      console.log(`🔄 Iniciando transferência: Chamado ${chamadoId}, ${antigoColaboradorId} → ${novoColaboradorId}`);
      
      // 1. Verificar se o chamado está sendo atendido pelo usuário antigo
      const atendimentoAtivo = await this.buscarPorChamado(chamadoId);
      if (!atendimentoAtivo || atendimentoAtivo.atc_colaborador !== antigoColaboradorId) {
        await connection.rollback();
        throw new Error('Chamado não está sendo atendido por você');
      }

      // 2. Verificar se o novo colaborador já está atendendo algo
      const novoColaboradorAtivo = await this.buscarPorColaborador(novoColaboradorId);
      if (novoColaboradorAtivo) {
        await connection.rollback();
        throw new Error('Colaborador destino já está atendendo outro chamado');
      }

      // 3. Finalizar atendimento do usuário antigo
      const finalizarQuery = `
        UPDATE atendimentos_chamados 
        SET atc_data_hora_termino = NOW()
        WHERE atc_chamado = ? AND atc_colaborador = ? AND atc_data_hora_termino IS NULL
      `;
      await connection.execute(finalizarQuery, [chamadoId, antigoColaboradorId]);

      // 4. Criar novo atendimento para o novo colaborador
      const novoAtendimentoQuery = `
        INSERT INTO atendimentos_chamados (atc_chamado, atc_colaborador, atc_data_hora_inicio)
        VALUES (?, ?, NOW())
      `;
      await connection.execute(novoAtendimentoQuery, [chamadoId, novoColaboradorId]);

      // 5. Atualizar data de atendimento do chamado
      const atualizarChamadoQuery = `
        UPDATE chamados 
        SET cha_data_hora_atendimento = NOW()
        WHERE cha_id = ?
      `;
      await connection.execute(atualizarChamadoQuery, [chamadoId]);

      await connection.commit();
      console.log(`✅ Transferência concluída com sucesso`);
      return true;
      
    } catch (error) {
      await connection.rollback();
      console.error('Erro ao transferir chamado:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
}