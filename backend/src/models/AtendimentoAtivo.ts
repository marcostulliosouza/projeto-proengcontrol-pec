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
}

export class AtendimentoAtivoModel {
  // Iniciar atendimento
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

      // Inserir novo atendimento (sem data_hora_termino = ativo)
      const query = `
        INSERT INTO atendimentos_chamados (
          atc_chamado, atc_colaborador, atc_data_hora_inicio
        ) VALUES (?, ?, NOW())
      `;

      await executeQuery(query, [chamadoId, colaboradorId]);
      
      // Atualizar status do chamado para "Em Andamento"
      await executeQuery(
        'UPDATE chamados SET cha_status = 2, cha_data_hora_atendimento = NOW() WHERE cha_id = ?',
        [chamadoId]
      );

      return true;
    } catch (error) {
      console.error('Erro ao iniciar atendimento:', error);
      throw error;
    }
  }

  // Finalizar atendimento
  static async finalizar(chamadoId: number, acaoId?: number): Promise<boolean> {
    try {
      // Finalizar atendimento ativo
      const query = `
        UPDATE atendimentos_chamados 
        SET atc_data_hora_termino = NOW()
        WHERE atc_chamado = ? AND atc_data_hora_termino IS NULL
      `;

      const result = await executeQuery(query, [chamadoId]);

      if (result.affectedRows > 0) {
        // Atualizar status do chamado para "Fechado" se tiver ação
        if (acaoId) {
          await executeQuery(
            'UPDATE chamados SET cha_status = 3, cha_data_hora_termino = NOW(), cha_acao = ? WHERE cha_id = ?',
            [acaoId, chamadoId]
          );
        }
      }

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao finalizar atendimento:', error);
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
          cl.cli_nome as cliente_nome,
          TIMESTAMPDIFF(SECOND, ac.atc_data_hora_inicio, NOW()) as tempo_decorrido
        FROM atendimentos_chamados ac
        LEFT JOIN colaboradores c ON ac.atc_colaborador = c.col_id
        LEFT JOIN chamados ch ON ac.atc_chamado = ch.cha_id
        LEFT JOIN clientes cl ON ch.cha_cliente = cl.cli_id
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

  // Listar todos os atendimentos ativos
  static async listarAtivos(): Promise<AtendimentoAtivo[]> {
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

  // Cancelar atendimento (finalizar sem ação)
  static async cancelar(chamadoId: number): Promise<boolean> {
    try {
      // Finalizar atendimento
      const queryAtendimento = `
        UPDATE atendimentos_chamados 
        SET atc_data_hora_termino = NOW()
        WHERE atc_chamado = ? AND atc_data_hora_termino IS NULL
      `;

      // Voltar status do chamado para "Aberto"
      const queryChamado = `
        UPDATE chamados 
        SET cha_status = 1, cha_data_hora_atendimento = NULL
        WHERE cha_id = ?
      `;

      const [result1] = await Promise.all([
        executeQuery(queryAtendimento, [chamadoId]),
        executeQuery(queryChamado, [chamadoId])
      ]);

      return result1.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao cancelar atendimento:', error);
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
}